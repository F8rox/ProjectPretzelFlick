import { redis, scheduler } from '@devvit/web/server';
import { fetchAiring } from '../core/anilist';
import { record } from '../core/history';
import { reconcile, type SyncSummary } from '../core/schedule';

/** Wires the real Devvit clients into the pure reconcile logic. A failure is recorded for mods, then rethrown. */
export const runSync = async (): Promise<SyncSummary> => {
  const nowMs = Date.now();
  try {
    return await reconcile({ store: redis, scheduler, fetchAiring, nowMs, record: (entry) => record(redis, entry) });
  } catch (error) {
    await record(redis, { type: 'failed', reason: `sync with AniList failed: ${error}`.slice(0, 200), at: nowMs });
    throw error;
  }
};

export const describeSync = (s: SyncSummary) =>
  `Sync done: ${s.scheduled} scheduled, ${s.moved} moved, ${s.cancelled} cancelled, ${s.queued} queued.`;
