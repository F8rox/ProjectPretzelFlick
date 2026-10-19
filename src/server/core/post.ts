import { config } from './config.ts';
import { keys } from './keys.ts';
import { getSettings, type SettingsStore } from './settings.ts';
import type { Airing, Stream } from './anilist.ts';
import { earlierLinks, linkPrevious, loadEpisodes, recordEpisode } from './episodes.ts';
import type { HistoryEntry } from './history.ts';
import type { EarlierLink, Poster } from './types.ts';

export const POST_JOB = 'post-episode';

export type PostJobData = { mediaId: number; episode: number; airingAt: number; title: string; streams: Stream[] };

export const toJobData = ({ mediaId, episode, airingAt, title, streams }: Airing): PostJobData => ({ mediaId, episode, airingAt, title, streams });

export type PostStore = SettingsStore & {
  hSetNX(key: string, field: string, value: string): Promise<number>;
  hGet(key: string, field: string): Promise<string | undefined>;
};

export type PostOutcome = 'posted' | 'recovered' | 'duplicate' | 'auto-post-off' | 'too-late';

export type RecordFn = (entry: HistoryEntry) => Promise<void>;

const escapeMd = (text: string) => text.replace(/([\\`*_[\]])/g, '\\$1');

export const renderTitle = (title: string, episode: number) => `${title} - Episode ${episode} discussion`;

export const renderBody = (job: PostJobData, earlier: EarlierLink[]) => {
  const streams = job.streams.length ? job.streams.map((s) => `- [${escapeMd(s.site)}](${s.url})`).join('\n') : '*None listed.*';
  const rows = earlier.length
    ? ['| Episode | Link |', '| --- | --- |', ...earlier.map((e) => `| ${e.episode} | [Link](${e.permalink}) |`)].join('\n')
    : '*None yet.*';
  return [
    `*${escapeMd(job.title)}*, episode ${job.episode}`,
    `Aired at ${new Date(job.airingAt * 1000).toUTCString()}.`,
    "**Reminder:** Please do not discuss plot points not yet seen or skipped in the show. Use Reddit's spoiler formatting in comments for anything beyond this episode.",
    '---',
    `**Streams**\n\n${streams}`,
    `**Show information**\n\n- [AniList](https://anilist.co/anime/${job.mediaId})`,
    `**Previous discussion threads**\n\n${rows}`,
  ].join('\n\n');
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** The job payload comes back from the scheduler, so it is validated like any external input. */
export const parseJobData = (raw: unknown): PostJobData | undefined => {
  if (!isRecord(raw) || !isRecord(raw.data)) return undefined;
  const { mediaId, episode, airingAt, title, streams } = raw.data;
  if (!Number.isInteger(mediaId) || !Number.isInteger(episode) || !Number.isInteger(airingAt) || typeof title !== 'string') return undefined;
  const clean = (Array.isArray(streams) ? streams : []).flatMap((s: unknown): Stream[] =>
    isRecord(s) && typeof s.site === 'string' && typeof s.url === 'string' && s.url.startsWith('https://') ? [{ site: s.site, url: s.url }] : [],
  );
  return { mediaId: Number(mediaId), episode: Number(episode), airingAt: Number(airingAt), title, streams: clean };
};

export type PostDeps = { store: PostStore; poster: Poster; nowMs: number; record: RecordFn };

/**
 * Posts one episode thread at most once. A `pending` record is written before submitting, so a crash
 * between submit and record is recovered by finding the thread by title instead of posting again.
 * shortcut: two runs racing on the same episode can both see `pending` and both post, upgrade if jobs can overlap.
 */
export const postEpisode = async ({ store, poster, nowMs, record }: PostDeps, job: PostJobData): Promise<PostOutcome> => {
  const { mediaId, episode } = job;
  const note = (type: HistoryEntry['type'], reason: string) => record({ type, mediaId, episode, reason, at: nowMs });
  if (!(await getSettings(store)).autoPostEnabled) {
    await note('skipped', 'auto-post is off');
    return 'auto-post-off';
  }
  if (nowMs - job.airingAt * 1000 > config.latenessLimitHours * 3_600_000) {
    await note('skipped', `aired more than ${config.latenessLimitHours} hours ago`);
    return 'too-late';
  }
  const key = keys.posted(job.mediaId, job.episode);
  if ((await store.hGet(key, 'state')) === 'posted') {
    await note('skipped', 'already posted');
    return 'duplicate';
  }

  const title = renderTitle(job.title, job.episode);
  const entries = await loadEpisodes(store, job.mediaId);
  const claimed = await store.hSetNX(key, 'state', 'pending');
  let thread = claimed ? undefined : await poster.findByTitle(title);
  const outcome: PostOutcome = thread ? 'recovered' : 'posted';
  thread ??= await poster.submit(title, renderBody(job, earlierLinks(entries, job.episode)));
  // The table entry is written before the posted record, so a crash between them is repaired by the recovery path.
  await recordEpisode(store, job.mediaId, job.episode, thread, nowMs);
  await store.hSet(key, { state: 'posted', postId: thread.id, permalink: thread.permalink, at: String(nowMs) });
  await note('posted', outcome === 'recovered' ? `recovered after an interrupted run: ${thread.permalink}` : thread.permalink);
  if ((await linkPrevious({ store, poster }, job.mediaId, job.episode, thread, entries)) === 'locked') {
    await record({ type: 'failed', mediaId, episode: episode - 1, reason: 'could not add the next-episode link (thread may be archived)', at: nowMs });
  }
  return outcome;
};

/** Runs one posting job. A failure is recorded for mods instead of being thrown. */
export const runPostJob = async (deps: PostDeps, job: PostJobData): Promise<PostOutcome | 'failed'> => {
  try {
    return await postEpisode(deps, job);
  } catch (error) {
    await deps.record({ type: 'failed', mediaId: job.mediaId, episode: job.episode, reason: `${error}`.slice(0, 200), at: deps.nowMs });
    return 'failed';
  }
};

/** The earliest airing that has no posted record, for the "Post next episode now" mod action. */
export const findNextUnposted = async (store: PostStore, airings: Airing[]): Promise<Airing | undefined> => {
  for (const a of [...airings].sort((x, y) => x.airingAt - y.airingAt)) {
    if ((await store.hGet(keys.posted(a.mediaId, a.episode), 'state')) !== 'posted') return a;
  }
  return undefined;
};
