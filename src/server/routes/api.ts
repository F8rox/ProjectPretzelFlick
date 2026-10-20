import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import { castVote, parseScore } from '../core/rating';
import { buildThreadView, loadThread } from '../core/thread';

// Client fetches may only call /api/*, and anyone who can load a thread can call these directly.
// So identity and the post come from the server context, never from the request, and every write is validated.
export const api = new Hono();

api.get('/thread', async (c) => {
  const { postId, userId } = context;
  const view = postId ? await buildThreadView(redis, postId, userId) : undefined;
  return view ? c.json(view) : c.json({ error: 'This is not a PretzelFlick thread.' }, 404);
});

api.post('/vote', async (c) => {
  const { postId, userId } = context;
  if (!userId) return c.json({ error: 'Log in to vote.' }, 401);
  const body: unknown = await c.req.json().catch(() => undefined);
  const score = parseScore(typeof body === 'object' && body !== null ? Reflect.get(body, 'score') : undefined);
  if (score === undefined) return c.json({ error: 'The score must be a whole number from 1 to 5.' }, 400);
  if (!postId || !(await loadThread(redis, postId))) return c.json({ error: 'This is not a PretzelFlick thread.' }, 404);
  return c.json(await castVote(redis, postId, userId, score));
});
