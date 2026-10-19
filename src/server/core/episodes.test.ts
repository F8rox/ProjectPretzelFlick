import assert from 'node:assert/strict';
import { test } from 'node:test';
import { earlierLinks, windowFor, type EpisodeEntry } from './episodes.ts';

test('window matches the design table', () => {
  assert.deepEqual(windowFor(1), { start: 1, end: 50 });
  assert.deepEqual(windowFor(49), { start: 1, end: 50 });
  assert.deepEqual(windowFor(50), { start: 25, end: 75 });
  assert.deepEqual(windowFor(75), { start: 50, end: 100 });
  assert.deepEqual(windowFor(99), { start: 50, end: 100 });
  assert.deepEqual(windowFor(100), { start: 75, end: 125 });
});

test('earlierLinks keeps only the window, excludes the episode itself, and sorts', () => {
  const entry = (n: number): EpisodeEntry => ({ postId: `t3_${n}`, permalink: `https://r/${n}`, postedAt: 0, status: 'active' });
  const entries = new Map([30, 1, 60, 50, 26, 101].map((n) => [n, entry(n)]));
  assert.deepEqual(earlierLinks(entries, 50).map((l) => l.episode), [26, 30, 60]);
  assert.deepEqual(earlierLinks(entries, 2).map((l) => l.episode), [1, 26, 30, 50]);
});
