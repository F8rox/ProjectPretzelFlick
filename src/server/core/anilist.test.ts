import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { config } from './config.ts';
import { fetchAiring, parseAiring, shouldUseFixture } from './anilist.ts';

const ok = { data: { Page: { airingSchedules: [{ airingAt: 100, episode: 3, mediaId: 7, media: { title: { romaji: 'Sono', english: null }, externalLinks: [{ site: 'Crunchyroll', url: 'https://crunchyroll.com/x', type: 'STREAMING' }, { site: 'Official Site', url: 'https://x.jp', type: 'INFO' }, { site: 'Bad', url: 'http://insecure.example', type: 'STREAMING' }] } }] } } };

test('parseAiring reads a valid response', () => {
  assert.deepEqual(parseAiring(ok), [{ mediaId: 7, episode: 3, airingAt: 100, title: 'Sono', streams: [{ site: 'Crunchyroll', url: 'https://crunchyroll.com/x' }] }]);
});

test('parseAiring rejects malformed responses', () => {
  for (const bad of [null, {}, { data: {} }, { data: { Page: { airingSchedules: 'x' } } }, { data: { Page: { airingSchedules: [{ airingAt: '1', episode: 3, mediaId: 7, media: { title: { romaji: 'x' } } }] } } }, { data: { Page: { airingSchedules: [{ airingAt: 1, episode: 3, mediaId: 7, media: {} }] } } }]) {
    assert.throws(() => parseAiring(bad));
  }
});

test('the fixture is only ever used on the dev subreddit', () => {
  assert.equal(shouldUseFixture('pretzelflick_dev2'), true);
  assert.equal(shouldUseFixture('Pretzelflick_Dev2'), true);
  assert.equal(shouldUseFixture('anime'), false);
  assert.equal(shouldUseFixture(''), false);
  config.fixtureOnDevSubreddit = false;
  try {
    assert.equal(shouldUseFixture('pretzelflick_dev2'), false);
  } finally {
    config.fixtureOnDevSubreddit = true;
  }
});

test('fetchAiring returns fixture data only when asked, and nothing for no shows', async () => {
  assert.deepEqual(await fetchAiring([], 0, true), []);
  const [a] = await fetchAiring([5], Date.UTC(2026, 9, 18), true);
  assert.equal(a?.title, 'Test Show 5');
});

test('config.devSubreddit matches the dev subreddit in devvit.json', () => {
  const devvit: unknown = JSON.parse(readFileSync('devvit.json', 'utf8'));
  const sub = typeof devvit === 'object' && devvit !== null ? Reflect.get(Reflect.get(devvit, 'dev') ?? {}, 'subreddit') : undefined;
  assert.equal(sub, config.devSubreddit);
});
