import assert from 'node:assert/strict';
import { test } from 'node:test';
import { postEpisode, windowFor, seasonKey, type HashStore, type Poster } from './episodes.ts';

test('window matches the design table', () => {
  assert.deepEqual(windowFor(1), { start: 1, end: 50 });
  assert.deepEqual(windowFor(49), { start: 1, end: 50 });
  assert.deepEqual(windowFor(50), { start: 25, end: 75 });
  assert.deepEqual(windowFor(75), { start: 50, end: 100 });
  assert.deepEqual(windowFor(99), { start: 50, end: 100 });
  assert.deepEqual(windowFor(100), { start: 75, end: 125 });
});

const fake = () => {
  const h: Record<string, string> = {};
  const store: HashStore = {
    hExists: async (_k, f) => f in h,
    hSet: async (_k, f) => (Object.assign(h, f), 1),
    hGetAll: async () => ({ ...h }),
  };
  const edits: string[] = [];
  let fail: ((id: string) => Error | undefined) | undefined;
  const poster: Poster = {
    submit: async () => ({ id: 'p', permalink: '/l' }),
    edit: async (id) => {
      const err = fail?.(id);
      if (err) throw err;
      edits.push(id);
    },
  };
  return { h, store, poster, edits, setFail: (f: typeof fail) => (fail = f) };
};

const args = (ep: number) => ({ seriesId: 's', season: 1, ep, title: 't', header: 'h' });

test('dedupes, backfills, freezes, locks', async () => {
  const f = fake();
  const k = seasonKey('s', 1);
  assert.equal(await postEpisode(f.store, f.poster, args(1)), 'posted');
  assert.equal(await postEpisode(f.store, f.poster, args(1)), 'duplicate');
  assert.equal(await postEpisode(f.store, f.poster, args(2)), 'posted');
  assert.equal(f.edits.length, 1); // ep 1 got ep 2's link
  assert.equal(k, 'series:s:season:1:episodes');

  f.setFail(() => new Error('post is archived'));
  await postEpisode(f.store, f.poster, args(3));
  assert.equal(JSON.parse(f.h['1']!).status, 'locked');

  f.setFail(undefined);
  await postEpisode(f.store, f.poster, args(51)); // outside ep 2's 1-50 window
  assert.equal(JSON.parse(f.h['3']!).status, 'frozen');
});

test('rate-limited edit is not locked', async () => {
  const f = fake();
  await postEpisode(f.store, f.poster, args(1));
  f.setFail(() => new Error('429 too many requests'));
  await postEpisode(f.store, f.poster, args(2));
  assert.equal(JSON.parse(f.h['1']!).status, 'active');
});
