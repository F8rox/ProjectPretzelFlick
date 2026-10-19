import { config } from './config.ts';
import { keys } from './keys.ts';
import { getSettings, type SettingsStore } from './settings.ts';
import type { Airing, Stream } from './anilist.ts';

export const POST_JOB = 'post-episode';

export type PostJobData = { mediaId: number; episode: number; airingAt: number; title: string; streams: Stream[] };

export const toJobData = ({ mediaId, episode, airingAt, title, streams }: Airing): PostJobData => ({ mediaId, episode, airingAt, title, streams });

export type PostStore = SettingsStore & {
  hSetNX(key: string, field: string, value: string): Promise<number>;
  hGet(key: string, field: string): Promise<string | undefined>;
};

export type PostedThread = { id: string; permalink: string };

export type Poster = {
  submit(title: string, text: string): Promise<PostedThread>;
  findByTitle(title: string): Promise<PostedThread | undefined>;
};

export type PostOutcome = 'posted' | 'recovered' | 'duplicate' | 'auto-post-off' | 'too-late';

const escapeMd = (text: string) => text.replace(/([\\`*_[\]])/g, '\\$1');

export const renderTitle = (title: string, episode: number) => `${title} - Episode ${episode} discussion`;

export type EarlierLink = { episode: number; permalink: string };

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

export type PostDeps = { store: PostStore; poster: Poster; nowMs: number };

/**
 * Posts one episode thread at most once. A `pending` record is written before submitting, so a crash
 * between submit and record is recovered by finding the thread by title instead of posting again.
 * shortcut: two runs racing on the same episode can both see `pending` and both post, upgrade if jobs can overlap.
 */
export const postEpisode = async ({ store, poster, nowMs }: PostDeps, job: PostJobData): Promise<PostOutcome> => {
  if (!(await getSettings(store)).autoPostEnabled) return 'auto-post-off';
  if (nowMs - job.airingAt * 1000 > config.latenessLimitHours * 3_600_000) return 'too-late';
  const key = keys.posted(job.mediaId, job.episode);
  if ((await store.hGet(key, 'state')) === 'posted') return 'duplicate';

  const title = renderTitle(job.title, job.episode);
  const claimed = await store.hSetNX(key, 'state', 'pending');
  let thread = claimed ? undefined : await poster.findByTitle(title);
  const outcome: PostOutcome = thread ? 'recovered' : 'posted';
  thread ??= await poster.submit(title, renderBody(job, []));
  await store.hSet(key, { state: 'posted', postId: thread.id, permalink: thread.permalink, at: String(nowMs) });
  return outcome;
};

/** The earliest airing that has no posted record, for the "Post next episode now" mod action. */
export const findNextUnposted = async (store: PostStore, airings: Airing[]): Promise<Airing | undefined> => {
  for (const a of [...airings].sort((x, y) => x.airingAt - y.airingAt)) {
    if ((await store.hGet(keys.posted(a.mediaId, a.episode), 'state')) !== 'posted') return a;
  }
  return undefined;
};
