import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { redis } from '@devvit/web/server';
import { addShow, removeShows, type Result } from '../core/tracked';
import { saveSettings } from '../core/settings';
import { searchAnime } from '../core/anilist';
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

const applyChanges = async (add: unknown, remove: unknown): Promise<Result[]> => {
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
  return results;
};

forms.post('/tracked-submit', async (c) => {
  const { add, remove, search } = await readBody(c.req.raw);
  if (typeof search === 'string' && search.trim()) {
    try {
      const matches = await searchAnime(search);
      if (!matches.length) return c.json<UiResponse>({ showToast: `No airing or upcoming anime found for "${search.trim().slice(0, 40)}".` }, 200);
      return c.json<UiResponse>({
        showForm: {
          name: 'pickForm',
          form: {
            title: 'Pick the show to track',
            acceptLabel: 'Track',
            fields: [{ type: 'select', name: 'pick', label: 'Matches', required: true, multiSelect: false, options: matches.map((m) => ({ label: `${m.title}${m.year ? ` (${m.year})` : ''}`, value: String(m.id) })) }],
          },
        },
      }, 200);
    } catch (error) {
      console.error(`title search failed: ${error}`);
      return c.json<UiResponse>({ showToast: 'Search failed. Try again in a moment.' }, 200);
    }
  }
  return c.json<UiResponse>(toast(await applyChanges(add, remove)), 200);
});

forms.post('/pick-submit', async (c) => {
  const { pick } = await readBody(c.req.raw);
  return c.json<UiResponse>(toast(await applyChanges(Array.isArray(pick) ? pick[0] : undefined, undefined)), 200);
});

forms.post('/settings-submit', async (c) => {
  const { autoPostEnabled, interactiveThreads, postDelayMinutes } = await readBody(c.req.raw);
  return c.json<UiResponse>(toast([await saveSettings(redis, { autoPostEnabled, interactiveThreads, postDelayMinutes })]), 200);
});

forms.post('/activity-submit', (c) => c.json<UiResponse>({}, 200));
