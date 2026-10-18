import { redis, scheduler } from '@devvit/web/server';
import { fetchAiring } from '../core/anilist';
import { reconcile, type SyncSummary } from '../core/schedule';

/** Wires the real Devvit clients into the pure reconcile logic. */
export const runSync = (): Promise<SyncSummary> =>
  reconcile({ store: redis, scheduler, fetchAiring, nowMs: Date.now() });

export const describeSync = (s: SyncSummary) =>
  `Sync done: ${s.scheduled} scheduled, ${s.moved} moved, ${s.cancelled} cancelled, ${s.queued} queued.`;
