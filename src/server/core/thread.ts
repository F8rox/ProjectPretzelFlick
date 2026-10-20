import { config } from './config.ts';
import { earlierLinks, loadEpisodes, type EpisodeStore } from './episodes.ts';
import { parsePostJobData } from './job-data.ts';
import { keys } from './keys.ts';
import { parseJsonRecord } from './parse.ts';
import { getSummary, type RatingStore } from './rating.ts';
import { visibleStreams } from './streams.ts';
import type { PostJobData } from './types.ts';
import type { ThreadView } from '../../shared/thread-view.ts';

export type ThreadSaveStore = {
  set(key: string, value: string): Promise<unknown>;
};

export type ThreadStore = RatingStore &
  EpisodeStore &
  ThreadSaveStore & {
    get(key: string): Promise<string | undefined>;
  };

export const saveThread = (store: ThreadSaveStore, postId: string, job: PostJobData) => store.set(keys.thread(postId), JSON.stringify(job));

export const loadThread = async (store: { get(key: string): Promise<string | undefined> }, postId: string): Promise<PostJobData | undefined> => {
  const raw = await store.get(keys.thread(postId));
  return raw === undefined ? undefined : parsePostJobData(parseJsonRecord(raw));
};

export const buildThreadView = async (store: ThreadStore, postId: string, userId?: string): Promise<ThreadView | undefined> => {
  const job = await loadThread(store, postId);
  if (!job) return undefined;
  const entries = await loadEpisodes(store, job.mediaId);
  const before = earlierLinks(entries, job.episode).filter((e) => e.episode < job.episode);
  const recent = new Set(before.slice(-config.seasonLineEpisodes).map((e) => e.episode));
  const earlier = await Promise.all(
    before.map(async ({ episode, permalink }) => {
      const entry = entries.get(episode);
      const average = entry && recent.has(episode) ? (await getSummary(store, entry.postId)).average : null;
      return { episode, permalink, average };
    }),
  );
  const next = entries.get(job.episode + 1);
  return {
    title: job.title,
    episode: job.episode,
    airingAt: job.airingAt,
    showUrl: `https://anilist.co/anime/${job.mediaId}`,
    streams: visibleStreams(job.streams),
    rating: await getSummary(store, postId, userId),
    earlier,
    next: next ? { episode: job.episode + 1, permalink: next.permalink } : null,
  };
};
