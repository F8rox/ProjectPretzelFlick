import { config } from './config.ts';
import { keys } from './keys.ts';
import { parseJsonRecord } from './parse.ts';
import type { EarlierLink, PostedThread, Poster } from './types.ts';

/** `locked` means the edit that adds this thread's "next episode" link failed, most likely because it is archived. */
export type EpisodeEntry = { postId: string; permalink: string; postedAt: number; status: 'active' | 'locked'; kind: 'text' | 'interactive' };

export type EpisodeStore = {
  hSet(key: string, fields: Record<string, string>): Promise<number>;
  hGetAll(key: string): Promise<Record<string, string>>;
};

const NEXT_MARKER = '**Next episode:**';

/** Inclusive episode range a thread links to: 1-50, then slides by half a window (25-75, 50-100, ...). */
export const windowFor = (ep: number) => {
  const step = config.linkWindowSize / 2;
  const start = Math.max(1, step * Math.floor(ep / step) - step);
  return { start, end: start === 1 ? config.linkWindowSize : start + config.linkWindowSize };
};

const parseEntry = (value: string): EpisodeEntry | undefined => {
  const p = parseJsonRecord(value);
  if (!p) return undefined;
  const { postId, permalink, postedAt, status } = p;
  return typeof postId === 'string' && typeof permalink === 'string' && typeof postedAt === 'number' && (status === 'active' || status === 'locked')
    ? { postId, permalink, postedAt, status, kind: p.kind === 'interactive' ? 'interactive' : 'text' }
    : undefined;
};

export const loadEpisodes = async (store: EpisodeStore, mediaId: number): Promise<Map<number, EpisodeEntry>> => {
  const entries = new Map<number, EpisodeEntry>();
  for (const [field, value] of Object.entries(await store.hGetAll(keys.episodes(mediaId)))) {
    const entry = parseEntry(value);
    if (entry) entries.set(Number(field), entry);
  }
  return entries;
};

/** Earlier threads inside this episode's window, never itself, in episode order. */
export const earlierLinks = (entries: Map<number, EpisodeEntry>, ep: number): EarlierLink[] => {
  const { start, end } = windowFor(ep);
  return [...entries]
    .filter(([e]) => e !== ep && e >= start && e <= end)
    .sort(([a], [b]) => a - b)
    .map(([episode, { permalink }]) => ({ episode, permalink }));
};

export const recordEpisode = (store: EpisodeStore, mediaId: number, ep: number, thread: PostedThread, postedAt: number, kind: EpisodeEntry['kind']) =>
  store.hSet(keys.episodes(mediaId), { [ep]: JSON.stringify({ postId: thread.id, permalink: thread.permalink, postedAt, status: 'active', kind }) });

export type LinkOutcome = 'linked' | 'already-linked' | 'no-previous' | 'locked';

/**
 * Adds "Next episode" to the top of the immediately previous thread. This is the only older thread ever
 * edited. A failure marks it `locked` and is never retried.
 */
export const linkPrevious = async (
  { store, poster }: { store: EpisodeStore; poster: Poster },
  mediaId: number,
  ep: number,
  thread: PostedThread,
  entries: Map<number, EpisodeEntry>,
): Promise<LinkOutcome> => {
  const prev = entries.get(ep - 1);
  // Interactive threads read the next link live from Redis, and have no text body to edit.
  if (!prev || prev.status === 'locked' || prev.kind === 'interactive') return 'no-previous';
  try {
    const body = await poster.getBody(prev.postId);
    if (body.includes(NEXT_MARKER)) return 'already-linked';
    await poster.editBody(prev.postId, `${NEXT_MARKER} [Episode ${ep}](${thread.permalink})\n\n${body}`);
    return 'linked';
  } catch {
    await store.hSet(keys.episodes(mediaId), { [ep - 1]: JSON.stringify({ ...prev, status: 'locked' }) });
    return 'locked';
  }
};
