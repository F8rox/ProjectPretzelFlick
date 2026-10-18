import { keys } from './keys.ts';

/** The slice of Devvit's redis client used here. Devvit has no set commands, so `tracked` is a hash. */
export type TrackedStore = {
  hSetNX(key: string, field: string, value: string): Promise<number>;
  hDel(key: string, fields: string[]): Promise<number>;
  hKeys(key: string): Promise<string[]>;
};

export type Result = { ok: true; message: string } | { ok: false; message: string };

const MEDIA_ID = /^\d{1,10}$/;

export const parseMediaId = (raw: unknown): number | undefined => {
  const text = typeof raw === 'string' ? raw.trim() : '';
  const id = MEDIA_ID.test(text) ? Number(text) : 0;
  return id > 0 ? id : undefined;
};

export const listShows = async (store: TrackedStore): Promise<number[]> =>
  (await store.hKeys(keys.tracked)).map(Number).sort((a, b) => a - b);

export const addShow = async (store: TrackedStore, raw: unknown, now = Date.now()): Promise<Result> => {
  const id = parseMediaId(raw);
  if (id === undefined) return { ok: false, message: 'Enter a positive AniList media ID (digits only).' };
  const added = await store.hSetNX(keys.tracked, String(id), String(now));
  return added
    ? { ok: true, message: `Now tracking ${id}.` }
    : { ok: false, message: `${id} is already tracked.` };
};

export const removeShows = async (store: TrackedStore, raw: unknown): Promise<Result> => {
  const ids = (Array.isArray(raw) ? raw : []).map(parseMediaId).filter((id) => id !== undefined);
  if (!ids.length) return { ok: false, message: 'Nothing selected to remove.' };
  await store.hDel(keys.tracked, ids.map(String));
  return { ok: true, message: `Stopped tracking ${ids.join(', ')}.` };
};
