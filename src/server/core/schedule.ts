import { config } from './config.ts';
import { keys } from './keys.ts';
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

const parseEntry = (value: string): Entry | undefined => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const { jobId, runAt } = { jobId: Reflect.get(parsed, 'jobId'), runAt: Reflect.get(parsed, 'runAt') };
    return typeof jobId === 'string' && typeof runAt === 'number' ? { jobId, runAt } : undefined;
  } catch {
    return undefined;
  }
};

const parseEntries = (raw: Record<string, string>) =>
  Object.entries(raw).flatMap(([field, value]): [string, Entry][] => {
    const entry = parseEntry(value);
    return entry ? [[field, entry]] : [];
  });

/**
 * Brings scheduled jobs in line with AniList: one job per upcoming episode, moved when the air time
 * changes, cancelled when the show or episode is gone. Fetches first, so a failure changes nothing.
 */
export const reconcile = async ({ store, scheduler, fetchAiring, nowMs, record }: SyncDeps): Promise<SyncSummary> => {
  const summary: SyncSummary = { scheduled: 0, moved: 0, cancelled: 0, queued: 0 };
  const tracked = await listShows(store);
  const airings = await fetchAiring(tracked, nowMs);
  const { postDelayMinutes } = await getSettings(store);
  const existing = new Map(parseEntries(await store.hGetAll(keys.schedule)));
  const horizonMs = nowMs + config.scheduleHorizonHours * 3_600_000;
  const lateFromMs = nowMs - config.latenessLimitHours * 3_600_000;
  const wanted = new Map<string, { airing: Airing; runAt: number }>();
  const late: Airing[] = [];

  for (const airing of airings) {
    if (!tracked.includes(airing.mediaId)) continue;
    const airMs = airing.airingAt * 1000;
    const runAt = airMs + postDelayMinutes * 60_000;
    if (runAt > nowMs && airMs <= horizonMs) wanted.set(keys.scheduleField(airing.mediaId, airing.episode), { airing, runAt });
    else if (runAt <= nowMs && airMs >= lateFromMs) late.push(airing);
  }

  const drop = async (field: string, entry: Entry) => {
    await scheduler.cancelJob(entry.jobId);
    await store.hDel(keys.schedule, [field]);
  };

  for (const [field, entry] of existing) {
    const isTracked = tracked.includes(Number(field.split(':')[0]));
    if (entry.runAt <= nowMs) await store.hDel(keys.schedule, [field]); // already fired: nothing to cancel
    else if (!isTracked || (!wanted.has(field) && entry.runAt <= horizonMs)) {
      await drop(field, entry);
      summary.cancelled++;
      const [mediaId, episode] = field.split(':').map(Number);
      if (isTracked) await record({ type: 'skipped', mediaId, episode, reason: 'no longer on the AniList schedule', at: nowMs });
    }
  }

  const schedule = async (field: string, airing: Airing, runAt: number) => {
    const jobId = await scheduler.runJob({ name: POST_JOB, data: toJobData(airing), runAt: new Date(runAt) });
    await store.hSet(keys.schedule, { [field]: JSON.stringify({ jobId, runAt }) });
  };

  for (const [field, { airing, runAt }] of wanted) {
    if (await store.hGet(keys.posted(airing.mediaId, airing.episode), 'state')) continue;
    const current = existing.get(field);
    if (current && current.runAt > nowMs && current.runAt === runAt) continue;
    if (current && current.runAt > nowMs) {
      await scheduler.cancelJob(current.jobId);
      summary.moved++;
      const iso = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
      await record({ type: 'delayed', mediaId: airing.mediaId, episode: airing.episode, reason: `air time moved from ${iso(current.runAt)} to ${iso(runAt)} UTC`, at: nowMs });
    } else summary.scheduled++;
    await schedule(field, airing, runAt);
  }

  // Aired within the lateness limit and not yet posted: queue now. Dedup at post time keeps this safe to repeat.
  for (const airing of late.slice(config.maxPostsPerRun)) {
    await record({ type: 'skipped', mediaId: airing.mediaId, episode: airing.episode, reason: 'over the per-run posting cap', at: nowMs });
  }
  for (const airing of late.slice(0, config.maxPostsPerRun)) {
    if (await store.hGet(keys.posted(airing.mediaId, airing.episode), 'state')) continue;
    await schedule(keys.scheduleField(airing.mediaId, airing.episode), airing, nowMs + config.catchUpDelayMs);
    summary.queued++;
  }
  return summary;
};
