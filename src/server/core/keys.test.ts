import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keys } from './keys.ts';

test('key helpers match architecture-context.md', () => {
  assert.equal(keys.posted(1, 2), 'posted:1:2');
  assert.equal(keys.season(1, 3), 'series:1:season:3:episodes');
  assert.equal(keys.scheduleField(1, 2), '1:2');
  assert.equal(keys.rating(1, 2), 'rating:1:2');
  assert.deepEqual([keys.config, keys.tracked, keys.history, keys.schedule], ['config', 'tracked', 'history', 'schedule']);
});
