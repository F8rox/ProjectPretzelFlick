import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { nextAiring } from '../core/anilist';
import { context, reddit, redis } from '@devvit/web/server';
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

// MOCK: week-1 test action that posts one thread for the next airing episode. Replaced by "Post next episode now" in Unit 04.
menu.post('/test-airing-post', async (c) => {
  try {
    const [a] = await nextAiring();
    if (!a) return c.json<UiResponse>({ showToast: 'AniList returned nothing' }, 200);
    const name = a.media.title.english ?? a.media.title.romaji;
    const post = await reddit.submitPost({
      subredditName: context.subredditName,
      title: `${name} - Episode ${a.episode} discussion`,
      text: `Airs ${new Date(a.airingAt * 1000).toUTCString()}. Test post from PretzelFlick.`,
    });
    return c.json<UiResponse>({ showToast: `Posted ${post.id}` }, 200);
  } catch (error) {
    console.error(`test-airing-post failed: ${error}`);
    // 200 so Reddit shows our message instead of its generic "Something went wrong".
    return c.json<UiResponse>({ showToast: String(error).replace(/^.*?(HTTP request)/s, '$1').slice(0, 200) }, 200);
  }
});
