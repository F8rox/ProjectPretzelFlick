import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from './config.ts';
import { describeEntry, recent, record, type HistoryEntry, type HistoryStore } from './history.ts';

const fakeStore = () => {
  const set = new Map<string, number>();
  const store: HistoryStore = {
    zAdd: async (_k, ...ms) => (ms.forEach((m) => set.set(m.member, m.score)), ms.length),
    zRemRangeByRank: async (_k, start, stop) => {
      const sorted = [...set].sort((a, b) => a[1] - b[1]);
      const end = stop < 0 ? sorted.length + stop : stop;
      if (end < 0) return 0; // like Redis: a range that ends before the start removes nothing
      const doomed = sorted.slice(start, end + 1);
      doomed.forEach(([m]) => set.delete(m));
      return doomed.length;
    },
    zRange: async (_k, start, stop, { reverse }) => {
      const sorted = [...set].sort((a, b) => (reverse ? b[1] - a[1] : a[1] - b[1]));
      return sorted.slice(start, stop + 1).map(([member, score]) => ({ member, score }));
    },
  };
  return { store, set };
};

const entry = (at: number, over: Partial<HistoryEntry> = {}): HistoryEntry => ({ type: 'posted', mediaId: 1, episode: 1, reason: 'ok', at, ...over });

test('history is trimmed to the configured length, keeping the newest', async () => {
  const { store, set } = fakeStore();
  for (let i = 1; i <= config.historyLength + 5; i++) await record(store, entry(i, { episode: i }));
  assert.equal(set.size, config.historyLength);
  const [newest] = await recent(store, 1);
  assert.equal(newest?.episode, config.historyLength + 5);
  assert.equal((await recent(store, 1000)).at(-1)?.episode, 6);
});

test('recent returns newest first and skips corrupt members', async () => {
  const { store, set } = fakeStore();
  await record(store, entry(1, { episode: 1 }));
  await record(store, entry(2, { episode: 2, type: 'failed' }));
  set.set('not json', 3);
  set.set(JSON.stringify({ type: 'bogus', reason: 'x', at: 4 }), 4);
  assert.deepEqual((await recent(store, 10)).map((e) => e.episode), [2, 1]);
});

test('a history write failure never throws', async () => {
  const broken: HistoryStore = {
    zAdd: async () => {
      throw new Error('redis down');
    },
    zRemRangeByRank: async () => 0,
    zRange: async () => [],
  };
  await assert.doesNotReject(() => record(broken, entry(1)));
});

test('describeEntry gives a readable line', () => {
  assert.equal(describeEntry(entry(Date.UTC(2026, 9, 18, 12, 5), { reason: 'thread posted' })), '2026-10-18 12:05 UTC  posted show 1 ep 1: thread posted');
  assert.equal(describeEntry({ type: 'failed', reason: 'sync failed', at: 0 }), '1970-01-01 00:00 UTC  failed: sync failed');
});
