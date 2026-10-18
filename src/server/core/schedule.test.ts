import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reconcile, type JobScheduler, type ScheduleStore } from './schedule.ts';
import type { Airing } from './anilist.ts';

const NOW = Date.UTC(2026, 9, 18, 12, 0, 0);
const HOUR = 3_600_000;
const air = (mediaId: number, episode: number, offsetHours: number): Airing => ({
  mediaId,
  episode,
  airingAt: Math.floor((NOW + offsetHours * HOUR) / 1000),
  title: `Show ${mediaId}`,
});

const setup = (airings: Airing[] | Error, tracked: number[] = [1]) => {
  const hashes = new Map<string, Map<string, string>>();
  const h = (k: string) => hashes.get(k) ?? hashes.set(k, new Map()).get(k)!;
  const store: ScheduleStore = {
    hSetNX: async (k, f, v) => (h(k).has(f) ? 0 : (h(k).set(f, v), 1)),
    hDel: async (k, fs) => fs.filter((f) => h(k).delete(f)).length,
    hKeys: async (k) => [...h(k).keys()],
    hSet: async (k, fv) => (Object.entries(fv).forEach(([f, v]) => h(k).set(f, v)), 1),
    hGetAll: async (k) => Object.fromEntries(h(k)),
    hGet: async (k, f) => h(k).get(f),
  };
  tracked.forEach((id) => h('tracked').set(String(id), '0'));
  const jobs = new Map<string, Date>();
  let next = 0;
  const scheduler: JobScheduler = {
    runJob: async ({ runAt }) => (jobs.set(`job${++next}`, runAt), `job${next}`),
    cancelJob: async (id) => void jobs.delete(id),
  };
  const state = { airings };
  const run = (nowMs = NOW) =>
    reconcile({ store, scheduler, nowMs, fetchAiring: async () => { if (state.airings instanceof Error) throw state.airings; return state.airings; } });
  return { store, jobs, state, run, h };
};

test('one job per upcoming episode, and a second run adds none', async () => {
  const t = setup([air(1, 5, 2), air(1, 6, 30)]);
  assert.deepEqual(await t.run(), { scheduled: 2, moved: 0, cancelled: 0, queued: 0 });
  assert.equal(t.jobs.size, 2);
  assert.deepEqual(await t.run(), { scheduled: 0, moved: 0, cancelled: 0, queued: 0 });
  assert.equal(t.jobs.size, 2);
});

test('a changed air time moves the job', async () => {
  const t = setup([air(1, 5, 2)]);
  await t.run();
  t.state.airings = [air(1, 5, 4)];
  assert.deepEqual(await t.run(), { scheduled: 0, moved: 1, cancelled: 0, queued: 0 });
  assert.deepEqual([...t.jobs.values()].map((d) => d.getTime()), [NOW + 4 * HOUR]);
});

test('an untracked show and a removed episode cancel their jobs', async () => {
  const t = setup([air(1, 5, 2), air(2, 1, 3)], [1, 2]);
  await t.run();
  t.h('tracked').delete('2');
  t.state.airings = [air(1, 5, 2)];
  assert.equal((await t.run()).cancelled, 1);
  t.state.airings = [];
  assert.equal((await t.run()).cancelled, 1);
  assert.equal(t.jobs.size, 0);
});

test('a malformed or failed fetch changes nothing', async () => {
  const t = setup([air(1, 5, 2)]);
  await t.run();
  t.state.airings = new Error('AniList response has an unexpected shape');
  await assert.rejects(() => t.run());
  assert.equal(t.jobs.size, 1);
});

test('an aired episode inside the lateness limit is queued, outside it is skipped, posted is skipped', async () => {
  const t = setup([air(1, 4, -2), air(1, 3, -30), air(1, 2, -3)]);
  t.h('posted:1:2').set('state', 'posted');
  assert.deepEqual(await t.run(), { scheduled: 0, moved: 0, cancelled: 0, queued: 1 });
  assert.equal(t.jobs.size, 1);
});

test('the post delay setting shifts the run time', async () => {
  const t = setup([air(1, 5, 2)]);
  t.h('config').set('postDelayMinutes', '10');
  await t.run();
  assert.deepEqual([...t.jobs.values()].map((d) => d.getTime()), [NOW + 2 * HOUR + 10 * 60_000]);
});
