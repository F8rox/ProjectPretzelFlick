import { isRecord, safeHttpsUrl } from './parse.ts';
import type { Airing, Stream } from './anilist.ts';
import type { PostJobData } from './types.ts';

export const toJobData = ({ mediaId, episode, airingAt, title, streams }: Airing): PostJobData => ({ mediaId, episode, airingAt, title, streams });

/** Validates thread details that came back from the scheduler or from Redis, like any external input. */
export const parsePostJobData = (data: unknown): PostJobData | undefined => {
  if (!isRecord(data)) return undefined;
  const { mediaId, episode, airingAt, title, streams } = data;
  if (!Number.isInteger(mediaId) || !Number.isInteger(episode) || !Number.isInteger(airingAt) || typeof title !== 'string') return undefined;
  const clean = (Array.isArray(streams) ? streams : []).flatMap((s: unknown): Stream[] => {
    const url = isRecord(s) ? safeHttpsUrl(s.url) : undefined;
    return isRecord(s) && typeof s.site === 'string' && url ? [{ site: s.site, url }] : [];
  });
  return { mediaId: Number(mediaId), episode: Number(episode), airingAt: Number(airingAt), title, streams: clean };
};
