import assert from 'node:assert/strict';
import { test } from 'node:test';
import { config } from './config.ts';
import { castVote, getSummary, parseScore, type RatingStore } from './rating.ts';

const fakeStore = () => {
  const hashes = new Map<string, Map<string, string>>();
  const h = (k: string) => hashes.get(k) ?? hashes.set(k, new Map()).get(k)!;
  const store: RatingStore = {
    hGet: async (k, f) => h(k).get(f),
    hSet: async (k, fv) => (Object.entries(fv).forEach(([f, v]) => h(k).set(f, v)), 1),
    hGetAll: async (k) => Object.fromEntries(h(k)),
    hIncrBy: async (k, f, by) => {
      const next = Number(h(k).get(f) ?? 0) + by;
      h(k).set(f, String(next));
      return next;
    },
  };
  return { store, h };
};

test('parseScore accepts only whole numbers from 1 to 5', () => {
  for (const ok of [1, 2, 3, 4, 5]) assert.equal(parseScore(ok), ok);
  for (const bad of [0, 6, -1, 2.5, '3', null, undefined, Number.NaN, {}]) assert.equal(parseScore(bad), undefined);
});

test('one vote per user: a re-vote replaces the old score and does not change the count', async () => {
  const { store } = fakeStore();
  assert.deepEqual(await castVote(store, 't3_a', 'u1', 5), { count: 1, average: null, myScore: 5, minVotes: config.minVotesForAverage });
  const again = await castVote(store, 't3_a', 'u1', 2);
  assert.equal(again.count, 1);
  assert.equal(again.myScore, 2);
  await castVote(store, 't3_a', 'u1', 2); // same score again changes nothing
  assert.equal((await getSummary(store, 't3_a', 'u1')).count, 1);
});

test('the average stays correct across votes and re-votes, and is hidden until the minimum', async () => {
  const { store } = fakeStore();
  for (let i = 1; i < config.minVotesForAverage; i++) {
    assert.equal((await castVote(store, 't3_a', `u${i}`, 4)).average, null);
  }
  const shown = await castVote(store, 't3_a', 'last', 3);
  assert.equal(shown.count, config.minVotesForAverage);
  assert.equal(shown.average, (4 * (config.minVotesForAverage - 1) + 3) / config.minVotesForAverage);
  const revoted = await castVote(store, 't3_a', 'last', 5);
  assert.equal(revoted.average, (4 * (config.minVotesForAverage - 1) + 5) / config.minVotesForAverage);
});

test('threads do not share votes, and another user sees no vote of their own', async () => {
  const { store } = fakeStore();
  await castVote(store, 't3_a', 'u1', 5);
  assert.equal((await getSummary(store, 't3_b', 'u1')).count, 0);
  assert.equal((await getSummary(store, 't3_a', 'u2')).myScore, null);
  assert.equal((await getSummary(store, 't3_a')).myScore, null);
});
