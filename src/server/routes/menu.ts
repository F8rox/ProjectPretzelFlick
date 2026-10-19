import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { describeEntry, record, recent } from '../core/history';
import { findNextUnposted, runPostJob, toJobData } from '../core/post';
import { describeSync, fetchForThisInstall, runSync } from './sync';
import { poster } from './poster';
import { redis } from '@devvit/web/server';
import { listShows } from '../core/tracked';
import { getSettings } from '../core/settings';
import { config } from '../core/config';

export const menu = new Hono();

menu.post('/tracked-open', async (c) => {
  const shows = await listShows(redis);
  return c.json<UiResponse>({
    showForm: {
      name: 'trackedForm',
      form: {
        title: 'Tracked shows',
        description: shows.length ? `Tracking: ${shows.join(', ')}` : 'No shows tracked yet.',
        acceptLabel: 'Save',
        fields: [
          { type: 'string', name: 'add', label: 'Add AniList media ID', helpText: 'The number in the AniList URL, for example anilist.co/anime/154587' },
          ...(shows.length
            ? [{ type: 'select' as const, name: 'remove', label: 'Stop tracking', multiSelect: true, options: shows.map((id) => ({ label: String(id), value: String(id) })) }]
            : []),
        ],
      },
    },
  });
});

menu.post('/activity-open', async (c) => {
  const entries = await recent(redis, config.historyShown);
  return c.json<UiResponse>({
    showForm: {
      name: 'activityForm',
      form: {
        title: 'Recent activity',
        acceptLabel: 'Close',
        fields: [{ type: 'paragraph', name: 'log', label: 'Newest first', disabled: true, defaultValue: entries.map(describeEntry).join('\n') || 'No activity yet.' }],
      },
    },
  });
});

menu.post('/sync-now', async (c) => {
  try {
    return c.json<UiResponse>({ showToast: describeSync(await runSync()) }, 200);
  } catch (error) {
    console.error(`sync-now failed: ${error}`);
    return c.json<UiResponse>({ showToast: `Sync failed: ${error}`.slice(0, 200) }, 200);
  }
});

menu.post('/settings-open', async (c) => {
  const settings = await getSettings(redis);
  return c.json<UiResponse>({
    showForm: {
      name: 'settingsForm',
      form: {
        title: 'PretzelFlick settings',
        acceptLabel: 'Save',
        fields: [
          { type: 'boolean', name: 'autoPostEnabled', label: 'Post threads automatically', defaultValue: settings.autoPostEnabled },
          { type: 'number', name: 'postDelayMinutes', label: 'Minutes to wait after air time', helpText: `0 to ${config.maxPostDelayMinutes}`, defaultValue: settings.postDelayMinutes },
        ],
      },
    },
  });
});

menu.post('/post-next', async (c) => {
  try {
    const nowMs = Date.now();
    const airing = await findNextUnposted(redis, await fetchForThisInstall(await listShows(redis), nowMs));
    if (!airing) return c.json<UiResponse>({ showToast: 'Nothing to post: every tracked episode in range already has a thread.' }, 200);
    const outcome = await runPostJob({ store: redis, poster, nowMs, record: (entry) => record(redis, entry) }, toJobData(airing));
    return c.json<UiResponse>({ showToast: `${airing.title} episode ${airing.episode}: ${outcome}` }, 200);
  } catch (error) {
    console.error(`post-next failed: ${error}`);
    // 200 so Reddit shows our message instead of its generic "Something went wrong".
    return c.json<UiResponse>({ showToast: `Post failed: ${error}`.slice(0, 200) }, 200);
  }
});
