export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;

export const config = {
  /** MOCK: stand-in AniList data, used only on the dev subreddit below. Set false once Reddit approves graphql.anilist.co. */
  fixtureOnDevSubreddit: false,
  /** Must match `dev.subreddit` in devvit.json. The fixture can never run anywhere else. */
  devSubreddit: 'pretzelflick_dev2',
  /** Mod settings defaults and limits. */
  defaultAutoPost: true,
  defaultInteractive: true,
  defaultPostDelayMinutes: 0,
  maxPostDelayMinutes: 60,
  /** Streaming links on these hosts (and their subdomains) are never shown: YouTube, to keep to official releases, and hosts Reddit's spam filter rejects. */
  blockedStreamHosts: ['youtube.com', 'youtu.be', 'iqiyi.com'], // iqiyi.com got a live thread removed as a "Banned Domain" on 2026-10-20
  /** Links per thread are limited to this many before the window slides. */
  linkWindowSize: 50,
  /** An aired episode with no post is still posted if it aired within this many hours. */
  latenessLimitHours: 24,
  /** Catch-up posts for missed episodes run this many ms after the sync. */
  catchUpDelayMs: MINUTE_MS,
  /** Recent subreddit posts searched when recovering from a crash between submit and record. */
  recoveryScanLimit: 50,
  /** AniList request timeout. */
  anilistTimeoutMs: 10_000,
  /** Episodes airing within this many hours get a scheduled job. */
  scheduleHorizonHours: 48,
  /** Newest history entries kept. */
  historyLength: 200,
  /** Rating scale and when an average is shown. */
  minScore: 1,
  maxScore: 5,
  minVotesForAverage: 5,
  /** How many of the most recent earlier episodes show their average on the card. */
  seasonLineEpisodes: 6,
  /** Entries shown by "Recent activity". */
  historyShown: 20,
  /** Visible lines in the "Recent activity" box, so entries can be read without scrolling. */
  historyBoxLines: 20,
  /** Hard cap on threads posted by one sync run. */
  maxPostsPerRun: 10,
};
