import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { nextAiring } from '../core/anilist';
import { context, reddit } from '@devvit/web/server';

export const menu = new Hono();

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
