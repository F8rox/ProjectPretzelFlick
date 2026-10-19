import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRecord, parseJsonRecord, safeHttpsUrl } from './parse.ts';

test('parseJsonRecord accepts objects only', () => {
  assert.deepEqual(parseJsonRecord('{"a":1}'), { a: 1 });
  for (const bad of ['', 'nope', '5', '"x"', 'null', '[1]x']) assert.equal(parseJsonRecord(bad), undefined);
  assert.equal(isRecord(null), false);
});

test('safeHttpsUrl keeps https links and neutralizes characters that break markdown links', () => {
  assert.equal(safeHttpsUrl('https://example.com/watch'), 'https://example.com/watch');
  assert.equal(safeHttpsUrl('https://example.com/a (b)'), 'https://example.com/a%20%28b%29');
  assert.equal(safeHttpsUrl('https://example.com/x)[evil](https://bad.example'), 'https://example.com/x%29[evil]%28https://bad.example');
  for (const bad of ['http://example.com', 'javascript:alert(1)', 'ftp://x.example', 'not a url', '', 5, undefined]) {
    assert.equal(safeHttpsUrl(bad), undefined);
  }
});
