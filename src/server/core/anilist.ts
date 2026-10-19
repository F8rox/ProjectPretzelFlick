import { config } from './config.ts';

export type Stream = { site: string; url: string };

export type Airing = { mediaId: number; episode: number; airingAt: number; title: string; streams: Stream[] };

const QUERY = `query ($ids: [Int], $from: Int, $to: Int) {
  Page(perPage: 50) {
    airingSchedules(mediaId_in: $ids, airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
      airingAt
      episode
      mediaId
      media { title { romaji english } externalLinks { site url type } }
    }
  }
}`;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const bad = () => new Error('AniList response has an unexpected shape');

// Only official streaming links over https are kept. Anything else is dropped, never guessed.
const parseStreams = (links: unknown): Stream[] =>
  (Array.isArray(links) ? links : []).flatMap((l: unknown): Stream[] =>
    isRecord(l) && l.type === 'STREAMING' && typeof l.site === 'string' && typeof l.url === 'string' && l.url.startsWith('https://')
      ? [{ site: l.site, url: l.url }]
      : [],
  );

/** Validates the raw GraphQL response. Any mismatch throws, so a run never acts on guessed data. */
export const parseAiring = (json: unknown): Airing[] => {
  const page = isRecord(json) && isRecord(json.data) ? json.data.Page : undefined;
  const list = isRecord(page) ? page.airingSchedules : undefined;
  if (!Array.isArray(list)) throw bad();
  return list.map((item: unknown) => {
    const title = isRecord(item) && isRecord(item.media) && isRecord(item.media.title) ? item.media.title : undefined;
    const name = title?.english ?? title?.romaji;
    if (!isRecord(item) || typeof name !== 'string') throw bad();
    const { mediaId, episode, airingAt } = item;
    if (!Number.isInteger(mediaId) || !Number.isInteger(episode) || !Number.isInteger(airingAt)) throw bad();
    const streams = parseStreams(isRecord(item.media) ? item.media.externalLinks : undefined);
    return { mediaId: Number(mediaId), episode: Number(episode), airingAt: Number(airingAt), title: name, streams };
  });
};

/** Fake data is allowed only on the dev subreddit, so a published app can never post it elsewhere. */
export const shouldUseFixture = (subredditName: string) =>
  config.fixtureOnDevSubreddit && subredditName.toLowerCase() === config.devSubreddit;

export const fixtureAiring = (ids: number[], nowMs: number): Airing[] =>
  ids.map((mediaId, i) => ({
    mediaId,
    episode: 3,
    airingAt: Math.floor(nowMs / 1000) + 3600 * (i + 1),
    title: `Test Show ${mediaId}`,
    streams: [{ site: 'Example Stream', url: 'https://example.com/watch' }],
  }));

const post = async (body: string): Promise<unknown> => {
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(config.anilistTimeoutMs),
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  return res.json();
};

// One retry for network errors and non-2xx. A malformed body is not retried.
const postWithRetry = async (body: string): Promise<unknown> => {
  try {
    return await post(body);
  } catch {
    return post(body);
  }
};

/**
 * Episodes airing from `lateness` hours ago to `horizon` hours ahead for the given shows.
 * shortcut: first page only (50 episodes), upgrade to paging when a sub tracks enough shows to pass that in one window.
 */
export const fetchAiring = async (ids: number[], nowMs: number, fixture = false): Promise<Airing[]> => {
  if (!ids.length) return [];
  if (fixture) return fixtureAiring(ids, nowMs);
  const nowSec = Math.floor(nowMs / 1000);
  const body = JSON.stringify({
    query: QUERY,
    variables: {
      ids,
      from: nowSec - config.latenessLimitHours * 3600,
      to: nowSec + config.scheduleHorizonHours * 3600,
    },
  });
  return parseAiring(await postWithRetry(body));
};
