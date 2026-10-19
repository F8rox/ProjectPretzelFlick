import { Hono } from 'hono';
import { redis } from '@devvit/web/server';
import { record, type HistoryEntry } from '../core/history';
import { parseJobData, runPostJob } from '../core/post';
import { poster } from './poster';
import { describeSync, runSync } from './sync';

export const scheduler = new Hono();

scheduler.post('/daily-sync', async (c) => {
  try {
    console.log(describeSync(await runSync()));
  } catch (error) {
    console.error(`daily-sync failed (recorded in history): ${error}`);
  }
  return c.json({}, 200);
});

scheduler.post('/post-episode', async (c) => {
  const job = parseJobData(await c.req.json().catch(() => undefined));
  if (!job) {
    console.error('post-episode ignored: payload failed validation');
    return c.json({}, 200);
  }
  const deps = { store: redis, poster, nowMs: Date.now(), record: (entry: HistoryEntry) => record(redis, entry) };
  console.log(`post-episode ${job.mediaId} ep ${job.episode}: ${await runPostJob(deps, job)}`);
  return c.json({}, 200);
});
