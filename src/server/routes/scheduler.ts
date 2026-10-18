import { Hono } from 'hono';
import { nextAiring } from '../core/anilist';

export const scheduler = new Hono();

// Week-1 test: proves cron fires and the AniList domain is reachable. Posts nothing.
scheduler.post('/airing-check', async (c) => {
  const [first] = await nextAiring();
  console.log(`airing-check ok, next: ${first?.media.title.romaji} ep ${first?.episode}`);
  return c.json({}, 200);
});
