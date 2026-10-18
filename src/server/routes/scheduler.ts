import { Hono } from 'hono';
import { describeSync, runSync } from './sync';

export const scheduler = new Hono();

scheduler.post('/daily-sync', async (c) => {
  try {
    console.log(describeSync(await runSync()));
  } catch (error) {
    console.error(`daily-sync failed: ${error}`); // Unit 06 moves this into the history
  }
  return c.json({}, 200);
});

// MOCK: Unit 04 replaces this with the real posting job. Until then a fired job only logs.
scheduler.post('/post-episode', async (c) => {
  console.log(`post-episode fired: ${JSON.stringify(await c.req.json().catch(() => ({})))}`);
  return c.json({}, 200);
});
