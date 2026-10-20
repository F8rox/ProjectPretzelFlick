import { config } from './config.ts';
import { keys } from './keys.ts';
import type { RatingSummary } from '../../shared/thread-view.ts';

export type { RatingSummary };

export type RatingStore = {
  hGet(key: string, field: string): Promise<string | undefined>;
  hSet(key: string, fields: Record<string, string>): Promise<number>;
  hGetAll(key: string): Promise<Record<string, string>>;
  hIncrBy(key: string, field: string, value: number): Promise<number>;
};

export const parseScore = (raw: unknown): number | undefined =>
  typeof raw === 'number' && Number.isInteger(raw) && raw >= config.minScore && raw <= config.maxScore ? raw : undefined;

export const getSummary = async (store: RatingStore, postId: string, userId?: string): Promise<RatingSummary> => {
  const stats = await store.hGetAll(keys.ratingStats(postId));
  const count = Number(stats.count ?? 0);
  const sum = Number(stats.sum ?? 0);
  const mine = userId ? await store.hGet(keys.ratings(postId), userId) : undefined;
  return {
    count,
    average: count >= config.minVotesForAverage ? sum / count : null,
    myScore: mine === undefined ? null : Number(mine),
    minVotes: config.minVotesForAverage,
  };
};

/**
 * One vote per user: a re-vote replaces the old score and moves the sum by the difference, never the count.
 * shortcut: read-then-write, so two simultaneous votes from the same user could miscount; use a transaction if that matters.
 */
export const castVote = async (store: RatingStore, postId: string, userId: string, score: number): Promise<RatingSummary> => {
  const old = await store.hGet(keys.ratings(postId), userId);
  await store.hSet(keys.ratings(postId), { [userId]: String(score) });
  if (old === undefined) {
    await store.hIncrBy(keys.ratingStats(postId), 'count', 1);
    await store.hIncrBy(keys.ratingStats(postId), 'sum', score);
  } else if (Number(old) !== score) {
    await store.hIncrBy(keys.ratingStats(postId), 'sum', score - Number(old));
  }
  return getSummary(store, postId, userId);
};
