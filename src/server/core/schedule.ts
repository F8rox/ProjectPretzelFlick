import { config, HOUR_MS, MINUTE_MS } from './config.ts';
import { formatUtc } from './history.ts';
import { keys } from './keys.ts';
import { parseJsonRecord } from './parse.ts';
import type { Airing } from './anilist.ts';
import { POST_JOB, toJobData, type PostJobData, type RecordFn } from './post.ts';
import { listShows, type TrackedStore } from './tracked.ts';
import { getSettings, type SettingsStore } from './settings.ts';

export type JobScheduler = {
  runJob(job: { name: string; data: PostJobData; runAt: Date }): Promise<string>;
  cancelJob(jobId: string): Promise<void>;
};

export type ScheduleStore = TrackedStore &
  SettingsStore & {
    hDel(key: string, fields: string[]): Promise<number>;
    hGet(key: string, field: string): Promise<string | undefined>;
  };

export type SyncDeps = {
  store: ScheduleStore;
  scheduler: JobScheduler;
  fetchAiring: (ids: number[], nowMs: number) => Promise<Airing[]>;
  nowMs: number;
  record: RecordFn;
};

export type SyncSummary = { scheduled: number; moved: number; cancelled: number; queued: number };

type Entry = { jobId: string; runAt: number };
type Wanted = { airing: Airing; runAt: number };
type Plan = { tracked: number[]; existing: Map<string, Entry>; wanted: Map<string, Wanted>; late: Airing[]; horizonMs: number; expected: Set<string> };

const parseEntry = (value: string): Entry | undefined => {
  const p = parseJsonRecord(value);
  return typeof p?.jobId === 'string' && typeof p.runAt === 'number' ? { jobId: p.jobId, runAt: p.runAt } : undefined;
};

const parseEntries = (raw: Record<string, string>) =>
  Object.entries(raw).flatMap(([field, value]): [string, Entry][] => {
    const entry = parseEntry(value);
    return entry ? [[field, entry]] : [];
  });

/** Fetches first, so an AniList failure changes nothing. Then sorts every episode into wanted jobs or late catch-ups. */
const makePlan = async ({ store, fetchAiring, nowMs }: SyncDeps): Promise<Plan> => {
  const tracked = await listShows(store);
  const airings = await fetchAiring(tracked, nowMs);
  const { postDelayMinutes } = await getSettings(store);
  const existing = new Map(parseEntries(await store.hGetAll(keys.schedule)));
  const horizonMs = nowMs + config.scheduleHorizonHours * HOUR_MS;
  const lateFromMs = nowMs - config.latenessLimitHours * HOUR_MS;
  const wanted = new Map<string, Wanted>();
  const late: Airing[] = [];
  for (const airing of airings) {
    if (!tracked.includes(airing.mediaId)) continue;
    const airMs = airing.airingAt * 1000;
    const runAt = airMs + postDelayMinutes * MINUTE_MS;
    if (runAt > nowMs && airMs <= horizonMs) wanted.set(keys.scheduleField(airing.mediaId, airing.episode), { airing, runAt });
    else if (runAt <= nowMs && airMs >= lateFromMs) late.push(airing);
  }
  // A queued catch-up job belongs to a late episode, so it is expected too and must not be mistaken for a dropped one.
  const expected = new Set([...wanted.keys(), ...late.map((a) => keys.scheduleField(a.mediaId, a.episode))]);
  return { tracked, existing, wanted, late, horizonMs, expected };
};

/** Removes jobs that already fired, and cancels jobs for untracked shows or episodes AniList dropped. */
const prune = async ({ store, scheduler, nowMs, record }: SyncDeps, { tracked, existing, expected, horizonMs }: Plan): Promise<number> => {
  let cancelled = 0;
  for (const [field, entry] of existing) {
    if (entry.runAt <= nowMs) {
      await store.hDel(keys.schedule, [field]); // already fired: nothing to cancel
      continue;
    }
    const [mediaId, episode] = field.split(':').map(Number);
    const isTracked = mediaId !== undefined && tracked.includes(mediaId);
    if (isTracked && (expected.has(field) || entry.runAt > horizonMs)) continue;
    await scheduler.cancelJob(entry.jobId);
    await store.hDel(keys.schedule, [field]);
    cancelled++;
    if (isTracked) await record({ type: 'skipped', mediaId, episode, reason: 'no longer on the AniList schedule', at: nowMs });
  }
  return cancelled;
};

const startJob = async ({ store, scheduler }: SyncDeps, field: string, airing: Airing, runAt: number) => {
  const jobId = await scheduler.runJob({ name: POST_JOB, data: toJobData(airing), runAt: new Date(runAt) });
  await store.hSet(keys.schedule, { [field]: JSON.stringify({ jobId, runAt }) });
};

/** Creates a job for every wanted episode, and moves a job whose air time changed. */
const scheduleWanted = async (deps: SyncDeps, { existing, wanted }: Plan) => {
  const { store, scheduler, nowMs, record } = deps;
  let scheduled = 0;
  let moved = 0;
  for (const [field, { airing, runAt }] of wanted) {
    if ((await store.hGet(keys.posted(airing.mediaId, airing.episode), 'state')) === 'posted') continue; // a leftover 'pending' must not block a retry
    const current = existing.get(field);
    const live = current && current.runAt > nowMs ? current : undefined;
    if (live?.runAt === runAt) continue;
    if (live) {
      await scheduler.cancelJob(live.jobId);
      moved++;
      const reason = `air time moved from ${formatUtc(live.runAt)} to ${formatUtc(runAt)} UTC`;
      await record({ type: 'delayed', mediaId: airing.mediaId, episode: airing.episode, reason, at: nowMs });
    } else scheduled++;
    await startJob(deps, field, airing, runAt);
  }
  return { scheduled, moved };
};

/** Aired within the lateness limit and not yet posted: queue now. Dedup at post time keeps repeats safe. */
const queueLate = async (deps: SyncDeps, { late, existing }: Plan): Promise<number> => {
  const { store, nowMs, record } = deps;
  for (const airing of late.slice(config.maxPostsPerRun)) {
    await record({ type: 'skipped', mediaId: airing.mediaId, episode: airing.episode, reason: 'over the per-run posting cap', at: nowMs });
  }
  let queued = 0;
  for (const airing of late.slice(0, config.maxPostsPerRun)) {
    const field = keys.scheduleField(airing.mediaId, airing.episode);
    if ((await store.hGet(keys.posted(airing.mediaId, airing.episode), 'state')) === 'posted') continue; // a leftover 'pending' must not block a retry
    if ((existing.get(field)?.runAt ?? 0) > nowMs) continue; // already queued by an earlier sync
    await startJob(deps, field, airing, nowMs + config.catchUpDelayMs);
    queued++;
  }
  return queued;
};

/**
 * Brings scheduled jobs in line with AniList: one job per upcoming episode, moved when the air time
 * changes, cancelled when the show or episode is gone.
 */
export const reconcile = async (deps: SyncDeps): Promise<SyncSummary> => {
  const plan = await makePlan(deps);
  const cancelled = await prune(deps, plan);
  const { scheduled, moved } = await scheduleWanted(deps, plan);
  const queued = await queueLate(deps, plan);
  return { scheduled, moved, cancelled, queued };
};
