import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addShow, listShows, parseMediaId, removeShows, type TrackedStore } from './tracked.ts';
import { getSettings, saveSettings } from './settings.ts';

const fakeStore = () => {
  const h = new Map<string, string>();
  const config = new Map<string, string>();
  const store: TrackedStore & Parameters<typeof saveSettings>[0] = {
    hSetNX: async (_k, f, v) => (h.has(f) ? 0 : (h.set(f, v), 1)),
    hDel: async (_k, fs) => fs.filter((f) => h.delete(f)).length,
    hKeys: async () => [...h.keys()],
    hSet: async (_k, fv) => (Object.entries(fv).forEach(([f, v]) => config.set(f, v)), 1),
    hGetAll: async () => Object.fromEntries(config),
  };
  return { store, h, config };
};

test('parseMediaId accepts only positive integers', () => {
  assert.equal(parseMediaId(' 154587 '), 154587);
  for (const bad of ['0', '-5', '1.5', 'abc', '', '12e3', '99999999999', undefined, 7]) {
    assert.equal(parseMediaId(bad), undefined);
  }
});

test('add, duplicate, list, remove', async () => {
  const { store, h } = fakeStore();
  assert.equal((await addShow(store, '20')).ok, true);
  assert.equal((await addShow(store, '3')).ok, true);
  assert.equal((await addShow(store, '20')).ok, false);
  assert.equal(h.size, 2);
  assert.deepEqual(await listShows(store), [3, 20]);
  assert.equal((await removeShows(store, ['3'])).ok, true);
  assert.deepEqual(await listShows(store), [20]);
  assert.equal((await removeShows(store, [])).ok, false);
});

test('invalid id stores nothing', async () => {
  const { store, h } = fakeStore();
  assert.equal((await addShow(store, 'nope')).ok, false);
  assert.equal(h.size, 0);
});

test('settings: defaults, save, and range check', async () => {
  const { store, config } = fakeStore();
  assert.deepEqual(await getSettings(store), { autoPostEnabled: true, postDelayMinutes: 0 });
  assert.equal((await saveSettings(store, { autoPostEnabled: false, postDelayMinutes: 15 })).ok, true);
  assert.deepEqual(await getSettings(store), { autoPostEnabled: false, postDelayMinutes: 15 });
  for (const bad of [-1, 61, 1.5, '5', Number.NaN]) {
    assert.equal((await saveSettings(store, { postDelayMinutes: bad })).ok, false);
  }
  assert.equal(config.get('postDelayMinutes'), '15');
});
