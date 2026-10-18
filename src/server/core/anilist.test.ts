import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAiring } from './anilist.ts';

const ok = { data: { Page: { airingSchedules: [{ airingAt: 100, episode: 3, mediaId: 7, media: { title: { romaji: 'Sono', english: null } } }] } } };

test('parseAiring reads a valid response', () => {
  assert.deepEqual(parseAiring(ok), [{ mediaId: 7, episode: 3, airingAt: 100, title: 'Sono' }]);
});

test('parseAiring rejects malformed responses', () => {
  for (const bad of [null, {}, { data: {} }, { data: { Page: { airingSchedules: 'x' } } }, { data: { Page: { airingSchedules: [{ airingAt: '1', episode: 3, mediaId: 7, media: { title: { romaji: 'x' } } }] } } }, { data: { Page: { airingSchedules: [{ airingAt: 1, episode: 3, mediaId: 7, media: {} }] } } }]) {
    assert.throws(() => parseAiring(bad));
  }
});
