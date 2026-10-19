import { Hono } from 'hono';
import { redis } from '@devvit/web/server';
import { parseJobData, postEpisode } from '../core/post';
import { poster } from './poster';
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

scheduler.post('/post-episode', async (c) => {
  const job = parseJobData(await c.req.json().catch(() => undefined));
  if (!job) {
    console.error('post-episode ignored: payload failed validation');
    return c.json({}, 200);
  }
  try {
    console.log(`post-episode ${job.mediaId} ep ${job.episode}: ${await postEpisode({ store: redis, poster, nowMs: Date.now() }, job)}`);
  } catch (error) {
    console.error(`post-episode ${job.mediaId} ep ${job.episode} failed: ${error}`); // Unit 06 moves this into the history
  }
  return c.json({}, 200);
});
