import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildThreadView, loadThread, saveThread, type ThreadStore } from './thread.ts';
import type { PostJobData } from './types.ts';

const fakeStore = () => {
  const hashes = new Map<string, Map<string, string>>();
  const strings = new Map<string, string>();
  const h = (k: string) => hashes.get(k) ?? hashes.set(k, new Map()).get(k)!;
  const store: ThreadStore = {
    hGet: async (k, f) => h(k).get(f),
    hSet: async (k, fv) => (Object.entries(fv).forEach(([f, v]) => h(k).set(f, v)), 1),
    hGetAll: async (k) => Object.fromEntries(h(k)),
    hIncrBy: async (k, f, by) => {
      const next = Number(h(k).get(f) ?? 0) + by;
      h(k).set(f, String(next));
      return next;
    },
    get: async (k) => strings.get(k),
    set: async (k, v) => void strings.set(k, v),
  };
  return { store, h };
};

const job = (episode: number, over: Partial<PostJobData> = {}): PostJobData => ({ mediaId: 7, episode, airingAt: 1_000, title: 'Sono Show', streams: [], ...over });
const entry = (n: number, kind: 'text' | 'interactive' = 'interactive') => JSON.stringify({ postId: `t3_${n}`, permalink: `https://r/${n}`, postedAt: 0, status: 'active', kind });

test('a thread that was never saved has no view, and corrupt stored data is rejected', async () => {
  const { store } = fakeStore();
  assert.equal(await buildThreadView(store, 't3_x'), undefined);
  await store.set('thread:t3_x', '{"mediaId":"nope"}');
  assert.equal(await loadThread(store, 't3_x'), undefined);
});

test('the view lists earlier episodes with their averages, the next episode, and no YouTube streams', async () => {
  const { store, h } = fakeStore();
  await saveThread(store, 't3_2', job(2, { streams: [{ site: 'Crunchyroll', url: 'https://c.example/x' }, { site: 'Youtube', url: 'https://youtu.be/x' }] }));
  h('episodes:7').set('1', entry(1)).set('2', entry(2)).set('3', entry(3));
  h('ratingstats:t3_1').set('count', '5').set('sum', '20');
  const view = await buildThreadView(store, 't3_2', 'u1');
  assert.deepEqual(view?.streams, [{ site: 'Crunchyroll', url: 'https://c.example/x' }]);
  assert.deepEqual(view?.earlier, [{ episode: 1, permalink: 'https://r/1', average: 4 }]);
  assert.deepEqual(view?.next, { episode: 3, permalink: 'https://r/3' });
  assert.equal(view?.showUrl, 'https://anilist.co/anime/7');
});

test('the first episode has no earlier episodes and the latest has no next link', async () => {
  const { store, h } = fakeStore();
  await saveThread(store, 't3_1', job(1));
  h('episodes:7').set('1', entry(1));
  const view = await buildThreadView(store, 't3_1');
  assert.deepEqual(view?.earlier, []);
  assert.equal(view?.next, null);
});
