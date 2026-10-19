import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { redis } from '@devvit/web/server';
import { addShow, removeShows, type Result } from '../core/tracked';
import { saveSettings } from '../core/settings';
import { runSync } from './sync';

export const forms = new Hono();

const readBody = async (request: Request): Promise<Record<string, unknown>> => {
  const body: unknown = await request.json().catch(() => ({}));
  return typeof body === 'object' && body !== null ? Object.fromEntries(Object.entries(body)) : {};
};

const toast = (results: Result[]): UiResponse => ({
  // 200 even on failure so Reddit shows our message instead of its generic error.
  showToast: results.map((r) => r.message).join(' ') || 'Nothing to do.',
});

forms.post('/tracked-submit', async (c) => {
  const { add, remove } = await readBody(c.req.raw);
  const results: Result[] = [];
  if (typeof add === 'string' && add.trim()) results.push(await addShow(redis, add));
  if (Array.isArray(remove) && remove.length) results.push(await removeShows(redis, remove));
  if (results.some((r) => r.ok)) {
    try {
      await runSync();
    } catch (error) {
      console.error(`sync after tracked change failed: ${error}`);
      results.push({ ok: false, message: 'Saved, but the sync failed. It will retry daily.' });
    }
  }
  return c.json<UiResponse>(toast(results), 200);
});

forms.post('/settings-submit', async (c) => {
  const { autoPostEnabled, postDelayMinutes } = await readBody(c.req.raw);
  return c.json<UiResponse>(toast([await saveSettings(redis, { autoPostEnabled, postDelayMinutes })]), 200);
});

forms.post('/activity-submit', (c) => c.json<UiResponse>({}, 200));
