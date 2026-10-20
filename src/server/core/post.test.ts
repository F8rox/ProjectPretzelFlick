import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findNextUnposted, parseJobData, postEpisode, runPostJob, renderBody, renderTitle, type PostJobData, type PostStore } from './post.ts';
import type { Poster } from './types.ts';
import type { Airing } from './anilist.ts';
import type { HistoryEntry } from './history.ts';

const NOW = Date.UTC(2026, 9, 18, 12, 0, 0);
const job = (over: Partial<PostJobData> = {}): PostJobData => ({
  mediaId: 7,
  episode: 3,
  airingAt: Math.floor(NOW / 1000) - 60,
  title: 'Sono Show',
  streams: [],
  ...over,
});

const setup = () => {
  const hashes = new Map<string, Map<string, string>>();
  const h = (k: string) => hashes.get(k) ?? hashes.set(k, new Map()).get(k)!;
  const flags = { failNextRecord: false, failInteractive: false };
  const strings = new Map<string, string>();
  h('config').set('interactiveThreads', 'false'); // most tests cover plain-text threads
  const store: PostStore = {
    hSetNX: async (k, f, v) => (h(k).has(f) ? 0 : (h(k).set(f, v), 1)),
    hGet: async (k, f) => h(k).get(f),
    hSet: async (k, fv) => {
      if (flags.failNextRecord && fv.state === 'posted') {
        flags.failNextRecord = false;
        throw new Error('redis down');
      }
      Object.entries(fv).forEach(([f, v]) => h(k).set(f, v));
      return 1;
    },
    hGetAll: async (k) => Object.fromEntries(h(k)),
    set: async (k, v) => void strings.set(k, v),
  };
  const threads: { title: string; text: string; id: string; interactive?: boolean }[] = [];
  const edits: string[] = [];
  const failEdit = new Set<string>();
  const poster: Poster = {
    submit: async (title, text) => {
      threads.push({ title, text, id: `t3_${threads.length + 1}` });
      return { id: `t3_${threads.length}`, permalink: `https://reddit.com/${threads.length}` };
    },
    submitInteractive: async (title, text) => {
      if (flags.failInteractive) throw new Error('custom posts unavailable');
      threads.push({ title, text, id: `t3_${threads.length + 1}`, interactive: true });
      return { id: `t3_${threads.length}`, permalink: `https://reddit.com/${threads.length}` };
    },
    findByTitle: async (title) => {
      const t = threads.find((x) => x.title === title);
      return t && { id: t.id, permalink: `https://reddit.com/${t.id}` };
    },
    getBody: async (id) => threads.find((x) => x.id === id)?.text ?? '',
    editBody: async (id, text) => {
      if (failEdit.has(id)) throw new Error('archived');
      edits.push(id);
      const t = threads.find((x) => x.id === id);
      if (t) t.text = text;
    },
  };
  const records: HistoryEntry[] = [];
  const record = async (e: HistoryEntry) => void records.push(e);
  return { store, poster, threads, edits, failEdit, flags, h, strings, records, deps: { store, poster, nowMs: NOW, record } };
};

test('title has only the show title and episode number', () => {
  assert.equal(renderTitle('Sono Show', 3), 'Sono Show - Episode 3 discussion');
});

test('body lists streams, or says none are listed, and escapes markdown in titles', () => {
  assert.match(renderBody(job(), []), /\*None listed\.\*/);
  assert.match(renderBody(job({ streams: [{ site: 'Crunchyroll', url: 'https://c.example/x' }] }), []), /- \[Crunchyroll\]\(https:\/\/c\.example\/x\)/);
  assert.match(renderBody(job({ title: 'A*B_[C]' }), []), /A\\\*B\\_\\\[C\\\]/);
  assert.match(renderBody(job(), [{ episode: 2, permalink: 'https://r/2' }]), /\| 2 \| \[Link\]\(https:\/\/r\/2\) \|/);
});

test('YouTube links are never listed as streams, and a show with only YouTube links says none listed', () => {
  const yt = [
    { site: 'Youtube', url: 'https://www.youtube.com/watch?v=abc' },
    { site: 'Youtube', url: 'https://youtu.be/abc' },
    { site: 'Youtube', url: 'https://m.youtube.com/watch?v=abc' },
  ];
  const crunchy = { site: 'Crunchyroll', url: 'https://crunchyroll.com/x' };
  const body = renderBody(job({ streams: [...yt, crunchy] }), []);
  assert.match(body, /- \[Crunchyroll\]/);
  assert.doesNotMatch(body, /youtu/i);
  assert.match(renderBody(job({ streams: yt }), []), /\*None listed\.\*/);
  assert.match(renderBody(job({ streams: [{ site: 'Notyoutube', url: 'https://notyoutube.com/x' }] }), []), /notyoutube\.com/);
});

test('hosts that Reddit rejects as banned domains are never listed, so a post cannot be removed for them', () => {
  const body = renderBody(job({ streams: [{ site: 'iQIYI', url: 'https://www.iqiyi.com/v_abc.html?v' }, { site: 'Crunchyroll', url: 'https://crunchyroll.com/x' }] }), []);
  assert.doesNotMatch(body, /iqiyi/i);
  assert.match(body, /Crunchyroll/);
  assert.match(renderBody(job({ streams: [{ site: 'iQIYI', url: 'https://www.iqiyi.com/v_abc.html?v' }] }), []), /\*None listed\.\*/);
});

test('running the job twice posts once', async () => {
  const t = setup();
  assert.equal(await postEpisode(t.deps, job()), 'posted');
  assert.equal(await postEpisode(t.deps, job()), 'duplicate');
  assert.equal(t.threads.length, 1);
});

test('a crash between submit and record is recovered without a second post', async () => {
  const t = setup();
  t.flags.failNextRecord = true;
  await assert.rejects(() => postEpisode(t.deps, job()));
  assert.equal(t.threads.length, 1);
  assert.equal(await postEpisode(t.deps, job()), 'recovered');
  assert.equal(t.threads.length, 1);
  assert.equal(t.h('posted:7:3').get('state'), 'posted');
});

test('a failed submit leaves pending and the retry posts', async () => {
  const t = setup();
  const submit = t.poster.submit;
  t.poster.submit = async () => {
    throw new Error('reddit down');
  };
  await assert.rejects(() => postEpisode(t.deps, job()));
  t.poster.submit = submit;
  assert.equal(await postEpisode(t.deps, job()), 'posted');
  assert.equal(t.threads.length, 1);
});

test('a manual post ignores the auto-post setting, a scheduled one still obeys it', async () => {
  const t = setup();
  t.h('config').set('autoPostEnabled', 'false');
  assert.equal(await postEpisode(t.deps, ep(1)), 'auto-post-off');
  assert.equal(t.threads.length, 0);
  assert.equal(await postEpisode({ ...t.deps, manual: true }, ep(1)), 'posted');
  assert.equal(t.threads.length, 1);
  assert.equal(await postEpisode({ ...t.deps, manual: true }, ep(1)), 'duplicate'); // manual still obeys dedup
  assert.equal(t.threads.length, 1);
});

test('auto-post off and too-late episodes post nothing', async () => {
  const t = setup();
  t.h('config').set('autoPostEnabled', 'false');
  assert.equal(await postEpisode(t.deps, job()), 'auto-post-off');
  t.h('config').set('autoPostEnabled', 'true');
  assert.equal(await postEpisode(t.deps, job({ airingAt: Math.floor(NOW / 1000) - 25 * 3600 })), 'too-late');
  assert.equal(t.threads.length, 0);
});

test('parseJobData validates the scheduler payload and drops non-https streams', () => {
  const ok = { name: 'post-episode', data: { ...job(), streams: [{ site: 'A', url: 'https://a.example' }, { site: 'B', url: 'http://b.example' }] } };
  assert.deepEqual(parseJobData(ok)?.streams, [{ site: 'A', url: 'https://a.example/' }]);
  for (const bad of [undefined, {}, { data: {} }, { data: { ...job(), episode: 'x' } }, { data: { ...job(), title: 5 } }]) {
    assert.equal(parseJobData(bad), undefined);
  }
});

test('findNextUnposted picks the earliest episode without a thread', async () => {
  const t = setup();
  t.h('posted:1:1').set('state', 'posted');
  const air = (mediaId: number, episode: number, airingAt: number): Airing => ({ mediaId, episode, airingAt, title: 'x', streams: [] });
  const now = 1_000_000;
  const next = await findNextUnposted(t.store, [air(1, 2, 300), air(1, 1, 100), air(2, 1, 200)], now);
  assert.deepEqual([next?.mediaId, next?.episode], [2, 1]);
  assert.equal(await findNextUnposted(t.store, [], now), undefined);
  // not yet aired: never offered, so "post next episode now" cannot post early
  assert.equal(await findNextUnposted(t.store, [air(3, 1, now / 1000 + 60)], now), undefined);
});

const ep = (episode: number) => job({ episode });

test('posting an episode edits exactly one older thread, the previous one', async () => {
  const t = setup();
  for (const n of [1, 2, 3, 4]) await postEpisode(t.deps, ep(n));
  assert.deepEqual(t.edits, ['t3_1', 't3_2', 't3_3']);
  assert.match(t.threads[0]!.text, /^\*\*Next episode:\*\* \[Episode 2\]\(https:\/\/reddit.com\/2\)/);
});

test('each new thread carries a table of earlier threads but never itself', async () => {
  const t = setup();
  for (const n of [1, 2, 3]) await postEpisode(t.deps, ep(n));
  const third = t.threads[2]!.text;
  assert.match(third, /\| 1 \| \[Link\]\(https:\/\/reddit.com\/1\) \|/);
  assert.match(third, /\| 2 \| \[Link\]\(https:\/\/reddit.com\/2\) \|/);
  assert.doesNotMatch(third, /\| 3 \|/);
});

test('a failed edit locks the previous thread, does not block the new post, and is not retried', async () => {
  const t = setup();
  await postEpisode(t.deps, ep(1));
  t.failEdit.add('t3_1');
  assert.equal(await postEpisode(t.deps, ep(2)), 'posted');
  assert.equal(JSON.parse(t.h('episodes:7').get('1')!).status, 'locked');
  await postEpisode(t.deps, ep(3));
  assert.equal(t.edits.includes('t3_1'), false);
  assert.deepEqual(t.edits, ['t3_2']);
});

test('a missing previous episode means no edit', async () => {
  const t = setup();
  await postEpisode(t.deps, ep(1));
  await postEpisode(t.deps, ep(3));
  assert.deepEqual(t.edits, []);
});

test('a recovered post is still recorded and linked from the previous thread', async () => {
  const t = setup();
  await postEpisode(t.deps, ep(1));
  t.flags.failNextRecord = true;
  await assert.rejects(() => postEpisode(t.deps, ep(2)));
  assert.equal(await postEpisode(t.deps, ep(2)), 'recovered');
  assert.equal(t.threads.length, 2);
  assert.ok(t.h('episodes:7').has('2'));
  assert.equal(t.edits.filter((id) => id === 't3_1').length, 1);
});

test('shows never share links: another season (media id) starts its own table', async () => {
  const t = setup();
  await postEpisode(t.deps, ep(1));
  await postEpisode(t.deps, job({ mediaId: 8, episode: 2 }));
  assert.doesNotMatch(t.threads[1]!.text, /\| 1 \|/);
  assert.deepEqual(t.edits, []);
});

test('every post, skip, and failure writes one history entry with a reason', async () => {
  const t = setup();
  await postEpisode(t.deps, ep(1));
  await postEpisode(t.deps, ep(1));
  t.h('config').set('autoPostEnabled', 'false');
  await postEpisode(t.deps, ep(2));
  t.h('config').set('autoPostEnabled', 'true');
  await postEpisode(t.deps, job({ episode: 9, airingAt: Math.floor(NOW / 1000) - 30 * 3600 }));
  assert.deepEqual(t.records.map((r) => [r.type, r.episode]), [['posted', 1], ['skipped', 1], ['skipped', 2], ['skipped', 9]]);
  assert.ok(t.records.every((r) => r.reason.length > 0 && r.mediaId === 7));
});

test('runPostJob records a failure instead of throwing', async () => {
  const t = setup();
  t.poster.submit = async () => {
    throw new Error('reddit down');
  };
  assert.equal(await runPostJob(t.deps, ep(1)), 'failed');
  assert.deepEqual(t.records.map((r) => [r.type, r.episode]), [['failed', 1]]);
  assert.match(t.records[0]!.reason, /reddit down/);
});

test('a failed next-episode edit is recorded against the previous episode', async () => {
  const t = setup();
  await postEpisode(t.deps, ep(1));
  t.failEdit.add('t3_1');
  await postEpisode(t.deps, ep(2));
  assert.deepEqual(t.records.map((r) => [r.type, r.episode]), [['posted', 1], ['posted', 2], ['failed', 1]]);
});

const interactive = (t: ReturnType<typeof setup>) => t.h('config').set('interactiveThreads', 'true');

test('an interactive thread is created with the plain-text thread as its fallback, and its details are saved', async () => {
  const t = setup();
  interactive(t);
  assert.equal(await postEpisode(t.deps, ep(1)), 'posted');
  assert.equal(t.threads.length, 1);
  assert.equal(t.threads[0]?.interactive, true);
  assert.equal(t.threads[0]?.text, renderBody(ep(1), []));
  assert.equal(JSON.parse(t.strings.get('thread:t3_1') ?? '{}').title, 'Sono Show');
  assert.equal(JSON.parse(t.h('episodes:7').get('1')!).kind, 'interactive');
});

test('if the interactive post cannot be created, the plain-text thread is posted and the failure is recorded', async () => {
  const t = setup();
  interactive(t);
  t.flags.failInteractive = true;
  assert.equal(await postEpisode(t.deps, ep(1)), 'posted');
  assert.equal(t.threads.length, 1);
  assert.equal(t.threads[0]?.interactive, undefined);
  assert.deepEqual(t.records.map((r) => r.type), ['failed', 'posted']);
  assert.match(t.records[0]!.reason, /interactive post failed/);
  assert.equal(JSON.parse(t.h('episodes:7').get('1')!).kind, 'text');
});

test('with the setting off, threads are plain text', async () => {
  const t = setup();
  await postEpisode(t.deps, ep(1));
  assert.equal(t.threads[0]?.interactive, undefined);
});

test('an interactive thread is never passed to the next-episode text edit, but a plain-text one still is', async () => {
  const t = setup();
  interactive(t);
  await postEpisode(t.deps, ep(1));
  await postEpisode(t.deps, ep(2));
  assert.deepEqual(t.edits, []);
  assert.equal(JSON.parse(t.h('episodes:7').get('1')!).status, 'active');
  const mixed = setup();
  await postEpisode(mixed.deps, ep(1)); // plain text
  interactive(mixed);
  await postEpisode(mixed.deps, ep(2)); // interactive
  assert.deepEqual(mixed.edits, ['t3_1']);
});
