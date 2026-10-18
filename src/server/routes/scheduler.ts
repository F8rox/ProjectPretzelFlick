import { Hono } from 'hono';
import { nextAiring } from '../core/anilist';

export const scheduler = new Hono();

// MOCK: week-1 test task that proves cron fires and AniList is reachable. Replaced by the daily sync in Unit 03.
scheduler.post('/airing-check', async (c) => {
  const [first] = await nextAiring();
  console.log(`airing-check ok, next: ${first?.media.title.romaji} ep ${first?.episode}`);
  return c.json({}, 200);
});
