import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { config } from './config.ts';
import { fetchAiring, parseAiring, parseSearch, shouldUseFixture } from './anilist.ts';

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
  const original = config.fixtureOnDevSubreddit;
  try {
    config.fixtureOnDevSubreddit = true;
    assert.equal(shouldUseFixture('pretzelflick_dev2'), true);
    assert.equal(shouldUseFixture('Pretzelflick_Dev2'), true);
    assert.equal(shouldUseFixture('anime'), false);
    assert.equal(shouldUseFixture(''), false);
    config.fixtureOnDevSubreddit = false;
    assert.equal(shouldUseFixture('pretzelflick_dev2'), false);
  } finally {
    config.fixtureOnDevSubreddit = original;
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

test('parseSearch reads matches, prefers the English title, and rejects bad shapes', () => {
  const ok = { data: { Page: { media: [{ id: 9, title: { romaji: 'Sono', english: 'That' }, seasonYear: 2026, status: 'RELEASING' }, { id: 10, title: { romaji: 'Nashi', english: null }, seasonYear: null, status: 'NOT_YET_RELEASED' }] } } };
  assert.deepEqual(parseSearch(ok), [{ id: 9, title: 'That', year: 2026, status: 'RELEASING' }, { id: 10, title: 'Nashi', year: null, status: 'NOT_YET_RELEASED' }]);
  for (const bad of [null, {}, { data: { Page: { media: 'x' } } }, { data: { Page: { media: [{ id: 'a', title: { romaji: 'x' }, status: 'RELEASING' }] } } }]) assert.throws(() => parseSearch(bad));
});
