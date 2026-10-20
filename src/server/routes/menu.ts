import { Hono } from 'hono';
import type { Form, UiResponse } from '@devvit/web/shared';
import { describeEntry, record, recent } from '../core/history';
import { findNextUnposted, runPostJob, toJobData } from '../core/post';
import { describeSync, fetchForThisInstall, runSync } from './sync';
import { poster } from './poster';
import { redis } from '@devvit/web/server';
import { listShows } from '../core/tracked';
import { getSettings } from '../core/settings';
import { config } from '../core/config';

export const menu = new Hono();

// Reddit shows its own generic error for non-2xx, so every handler answers 200 with a short message.
// Details go to the history (mod-only) and never into the toast.
const toast = (message: string): UiResponse => ({ showToast: message });

menu.post('/tracked-open', async (c) => {
  const shows = await listShows(redis);
  const fields: Form['fields'] = [
    { type: 'string', name: 'add', label: 'Add AniList media ID', helpText: 'The number in the AniList URL, for example anilist.co/anime/154587' },
  ];
  if (shows.length) {
    fields.push({ type: 'select', name: 'remove', label: 'Stop tracking', multiSelect: true, options: shows.map((id) => ({ label: String(id), value: String(id) })) });
  }
  return c.json<UiResponse>({
    showForm: {
      name: 'trackedForm',
      form: { title: 'Tracked shows', description: shows.length ? `Tracking: ${shows.join(', ')}` : 'No shows tracked yet.', acceptLabel: 'Save', fields },
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
        fields: [{ type: 'paragraph', name: 'log', label: 'Newest first', disabled: true, lineHeight: config.historyBoxLines, defaultValue: entries.map(describeEntry).join('\n') || 'No activity yet.' }],
      },
    },
  });
});

menu.post('/sync-now', async (c) => {
  try {
    return c.json<UiResponse>(toast(describeSync(await runSync())), 200);
  } catch (error) {
    console.error(`sync-now failed: ${error}`); // runSync already wrote the details to the history
    return c.json<UiResponse>(toast('Sync failed. Open "recent activity" for details.'), 200);
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
          { type: 'boolean', name: 'interactiveThreads', label: 'Interactive ratings in threads', helpText: 'Off posts plain-text threads. A thread also falls back to plain text if the interactive post cannot be created.', defaultValue: settings.interactiveThreads },
          { type: 'number', name: 'postDelayMinutes', label: 'Minutes to wait after air time', helpText: `0 to ${config.maxPostDelayMinutes}`, defaultValue: settings.postDelayMinutes },
        ],
      },
    },
  });
});

menu.post('/post-next', async (c) => {
  const nowMs = Date.now();
  try {
    const airing = await findNextUnposted(redis, await fetchForThisInstall(await listShows(redis), nowMs), nowMs);
    if (!airing) return c.json<UiResponse>(toast('Nothing to post: no tracked episode has aired without a thread yet.'), 200);
    const outcome = await runPostJob({ store: redis, poster, nowMs, manual: true, record: (entry) => record(redis, entry) }, toJobData(airing));
    return c.json<UiResponse>(toast(outcome === 'failed' ? 'Post failed. Open "recent activity" for details.' : `${airing.title} episode ${airing.episode}: ${outcome}`), 200);
  } catch (error) {
    console.error(`post-next failed: ${error}`);
    await record(redis, { type: 'failed', reason: `post next episode now failed: ${error}`.slice(0, 200), at: nowMs });
    return c.json<UiResponse>(toast('Post failed. Open "recent activity" for details.'), 200);
  }
});
