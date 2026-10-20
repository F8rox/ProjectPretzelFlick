import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reconcile, type JobScheduler, type ScheduleStore } from './schedule.ts';
import type { Airing } from './anilist.ts';
import type { HistoryEntry } from './history.ts';

const NOW = Date.UTC(2026, 9, 18, 12, 0, 0);
const HOUR = 3_600_000;
const air = (mediaId: number, episode: number, offsetHours: number): Airing => ({
  mediaId,
  episode,
  airingAt: Math.floor((NOW + offsetHours * HOUR) / 1000),
  title: `Show ${mediaId}`,
  streams: [],
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
  const records: HistoryEntry[] = [];
  const run = (nowMs = NOW) =>
    reconcile({ store, scheduler, nowMs, record: async (e) => void records.push(e), fetchAiring: async () => { if (state.airings instanceof Error) throw state.airings; return state.airings; } });
  return { store, jobs, state, run, h, records };
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

test('a repeat sync neither cancels nor re-queues a pending catch-up job', async () => {
  const t = setup([air(1, 4, -2), air(1, 5, -1)]);
  assert.equal((await t.run()).queued, 2);
  const [first] = [...t.jobs.keys()];
  assert.deepEqual(await t.run(NOW + 10_000), { scheduled: 0, moved: 0, cancelled: 0, queued: 0 });
  assert.equal(t.jobs.size, 2);
  assert.equal(t.jobs.has(first ?? ''), true);
  assert.deepEqual(t.records, []);
});

test('the post delay setting shifts the run time', async () => {
  const t = setup([air(1, 5, 2)]);
  t.h('config').set('postDelayMinutes', '10');
  await t.run();
  assert.deepEqual([...t.jobs.values()].map((d) => d.getTime()), [NOW + 2 * HOUR + 10 * 60_000]);
});

test('the posts-per-run cap limits catch-up posts', async () => {
  const late = Array.from({ length: 12 }, (_, i) => air(1, i + 1, -2));
  const t = setup(late);
  assert.equal((await t.run()).queued, 10);
});

test('a moved air time is recorded once across repeated syncs', async () => {
  const t = setup([air(1, 5, 2)]);
  await t.run();
  t.state.airings = [air(1, 5, 4)];
  await t.run();
  await t.run();
  assert.deepEqual(t.records.map((r) => r.type), ['delayed']);
  assert.match(t.records[0]!.reason, /moved from .* to .* UTC/);
});

test('an episode dropped from AniList and episodes over the cap are recorded as skipped', async () => {
  const t = setup([air(1, 5, 2)]);
  await t.run();
  t.state.airings = [];
  await t.run();
  assert.deepEqual(t.records.map((r) => [r.type, r.episode]), [['skipped', 5]]);
  const capped = setup(Array.from({ length: 12 }, (_, i) => air(1, i + 1, -2)));
  await capped.run();
  assert.equal(capped.records.filter((r) => r.type === 'skipped').length, 2);
});

test('a leftover pending marker from an interrupted post does not block catch-up or scheduling', async () => {
  const late = setup([air(1, 4, -2)]);
  late.h('posted:1:4').set('state', 'pending');
  assert.equal((await late.run()).queued, 1);
  const upcoming = setup([air(1, 5, 2)]);
  upcoming.h('posted:1:5').set('state', 'pending');
  assert.equal((await upcoming.run()).scheduled, 1);
});

test('catch-up and same-time jobs of one show run in episode order, spaced apart, and other shows are not delayed', async () => {
  const t = setup([air(1, 3, -2), air(1, 1, -2), air(1, 2, -2), air(2, 1, -2), air(1, 9, 1), air(1, 8, 1)], [1, 2]);
  assert.deepEqual(await t.run(), { scheduled: 2, moved: 0, cancelled: 0, queued: 4 });
  const at = (m: number, e: number) => {
    const entry = JSON.parse(t.h('schedule').get(`${m}:${e}`)!) as { runAt: number };
    return entry.runAt;
  };
  assert.ok(at(1, 1) < at(1, 2) && at(1, 2) < at(1, 3));
  assert.equal(at(1, 2) - at(1, 1), 20_000);
  assert.equal(at(2, 1), at(1, 1));
  assert.equal(at(1, 9) - at(1, 8), 20_000);
});
