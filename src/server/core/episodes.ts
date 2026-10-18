import { config } from './config.ts';

export type EpisodeStatus = 'active' | 'frozen' | 'locked';

export type EpisodeEntry = {
  postId: string;
  permalink: string;
  postedAt: number;
  status: EpisodeStatus;
};

/** The slice of Devvit's redis client this module needs. */
export type HashStore = {
  hExists(key: string, field: string): Promise<boolean>;
  hSet(key: string, fields: Record<string, string>): Promise<number>;
  hGetAll(key: string): Promise<Record<string, string>>;
};

export type Poster = {
  submit(title: string, text: string): Promise<{ id: string; permalink: string }>;
  edit(postId: string, text: string): Promise<void>;
};

export const seasonKey = (seriesId: string, season: number) =>
  `series:${seriesId}:season:${season}:episodes`;

/** Inclusive episode range a thread links to: 1-50, then slides by 25 (25-75, 50-100, ...). */
export const windowFor = (ep: number) => {
  const step = config.linkWindowSize / 2;
  const start = Math.max(1, step * Math.floor(ep / step) - step);
  return { start, end: start === 1 ? config.linkWindowSize : start + config.linkWindowSize };
};

const parse = (raw: Record<string, string>) =>
  new Map(Object.entries(raw).map(([ep, v]) => [Number(ep), JSON.parse(v) as EpisodeEntry]));

export const renderBody = (ep: number, header: string, entries: Map<number, EpisodeEntry>) => {
  const { start, end } = windowFor(ep);
  const links = [...entries]
    .filter(([e]) => e !== ep && e >= start && e <= end)
    .sort(([a], [b]) => a - b)
    .map(([e, v]) => `- [Episode ${e}](${v.permalink})`);
  return `${header}\n\n**Previous discussion threads**\n\n${links.join('\n') || '_None yet._'}`;
};

const isRateLimit = (err: unknown) => /rate|429|too many/i.test(String(err));

/** Posts one episode thread (deduped), then backfills its link into earlier threads. */
export const postEpisode = async (
  store: HashStore,
  poster: Poster,
  a: { seriesId: string; season: number; ep: number; title: string; header: string }
): Promise<'posted' | 'duplicate'> => {
  const key = seasonKey(a.seriesId, a.season);
  // shortcut: check-then-set isn't atomic, fine while one scheduler run is in flight; upgrade if runs can overlap.
  if (await store.hExists(key, String(a.ep))) return 'duplicate';

  const entries = parse(await store.hGetAll(key));
  const post = await poster.submit(a.title, renderBody(a.ep, a.header, entries));
  const mine: EpisodeEntry = {
    postId: post.id,
    permalink: post.permalink,
    postedAt: Date.now(),
    status: 'active',
  };
  await store.hSet(key, { [a.ep]: JSON.stringify(mine) });
  entries.set(a.ep, mine);

  for (const [e, entry] of entries) {
    if (e >= a.ep || entry.status !== 'active') continue;
    let next: EpisodeStatus = 'active';
    if (a.ep > windowFor(e).end) next = 'frozen';
    else {
      try {
        await poster.edit(entry.postId, renderBody(e, a.header, entries));
      } catch (err) {
        // A throttled edit stays active (retried on a later episode); anything else (e.g. archived) locks it.
        if (!isRateLimit(err)) next = 'locked';
      }
    }
    if (next !== 'active') await store.hSet(key, { [e]: JSON.stringify({ ...entry, status: next }) });
  }
  return 'posted';
};
