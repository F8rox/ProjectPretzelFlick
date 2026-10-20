import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';

// SPIKE (Unit 08): throwaway endpoints for the rating spike. Replaced by the real rating API in Unit 09.
// Client fetches may only call /api/*, and anyone who can load the post can call these, so every write validates input.
export const api = new Hono();

const KEY = 'spike:ratings';

const state = async () => {
  const all = await redis.hGetAll(KEY);
  const scores = Object.values(all).map(Number);
  const mine = context.userId ? all[context.userId] : undefined;
  return {
    count: scores.length,
    average: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    myScore: mine === undefined ? null : Number(mine),
    seesUser: Boolean(context.userId),
  };
};

api.get('/spike/state', async (c) => c.json(await state()));

api.post('/spike/rate', async (c) => {
  const body: unknown = await c.req.json().catch(() => undefined);
  const score = typeof body === 'object' && body !== null ? Reflect.get(body, 'score') : undefined;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) return c.json({ error: 'score must be an integer from 1 to 5' }, 400);
  if (!context.userId) return c.json({ error: 'log in to vote' }, 401);
  await redis.hSet(KEY, { [context.userId]: String(score) });
  return c.json(await state());
});
