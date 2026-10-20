import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keys } from './keys.ts';

test('key helpers match architecture-context.md', () => {
  assert.equal(keys.posted(1, 2), 'posted:1:2');
  assert.equal(keys.episodes(1), 'episodes:1');
  assert.equal(keys.scheduleField(1, 2), '1:2');
  assert.deepEqual([keys.thread('t3_a'), keys.ratings('t3_a'), keys.ratingStats('t3_a')], ['thread:t3_a', 'ratings:t3_a', 'ratingstats:t3_a']);
  assert.deepEqual([keys.config, keys.tracked, keys.history, keys.schedule], ['config', 'tracked', 'history', 'schedule']);
});
