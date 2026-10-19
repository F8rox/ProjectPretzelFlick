import { config } from './config.ts';
import { keys } from './keys.ts';
import { parseJsonRecord } from './parse.ts';

export type HistoryEntry = {
  type: 'posted' | 'skipped' | 'failed' | 'delayed';
  mediaId?: number;
  episode?: number;
  reason: string;
  at: number;
};

export type HistoryStore = {
  zAdd(key: string, ...members: { member: string; score: number }[]): Promise<number>;
  zRemRangeByRank(key: string, start: number, stop: number): Promise<number>;
  zRange(key: string, start: number, stop: number, options: { by: 'rank'; reverse: boolean }): Promise<{ member: string; score: number }[]>;
};

/** Writes one entry and trims to the newest `historyLength`. Never throws: a history failure must not stop a post. */
export const record = async (store: HistoryStore, entry: HistoryEntry): Promise<void> => {
  try {
    await store.zAdd(keys.history, { member: JSON.stringify(entry), score: entry.at });
    await store.zRemRangeByRank(keys.history, 0, -(config.historyLength + 1));
  } catch (error) {
    console.error(`history write failed: ${error}`);
  }
};

const parse = (member: string): HistoryEntry | undefined => {
  const p = parseJsonRecord(member);
  if (!p) return undefined;
  const { type, mediaId, episode, reason, at } = p;
  const known = type === 'posted' || type === 'skipped' || type === 'failed' || type === 'delayed';
  if (!known || typeof reason !== 'string' || typeof at !== 'number') return undefined;
  return {
    type,
    reason,
    at,
    ...(typeof mediaId === 'number' ? { mediaId } : {}),
    ...(typeof episode === 'number' ? { episode } : {}),
  };
};

/** Newest first. */
export const recent = async (store: HistoryStore, count: number): Promise<HistoryEntry[]> =>
  (await store.zRange(keys.history, 0, count - 1, { by: 'rank', reverse: true })).flatMap(({ member }) => {
    const entry = parse(member);
    return entry ? [entry] : [];
  });

export const formatUtc = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');

export const describeEntry = (e: HistoryEntry) => {
  const what = e.mediaId === undefined ? '' : ` show ${e.mediaId}${e.episode === undefined ? '' : ` ep ${e.episode}`}`;
  return `${formatUtc(e.at)} UTC  ${e.type}${what}: ${e.reason}`;
};
