export const config = {
  /** MOCK: stand-in AniList data, used only on the dev subreddit below. Set false once Reddit approves graphql.anilist.co. */
  fixtureOnDevSubreddit: true,
  /** Must match `dev.subreddit` in devvit.json. The fixture can never run anywhere else. */
  devSubreddit: 'pretzelflick_dev2',
  /** Mod settings defaults and limits. */
  defaultAutoPost: true,
  defaultPostDelayMinutes: 0,
  maxPostDelayMinutes: 60,
  /** Links per thread are limited to this many before the window slides. */
  linkWindowSize: 50,
  /** An aired episode with no post is still posted if it aired within this many hours. */
  latenessLimitHours: 24,
  /** Catch-up posts for missed episodes run this many ms after the sync. */
  catchUpDelayMs: 60_000,
  /** Recent subreddit posts searched when recovering from a crash between submit and record. */
  recoveryScanLimit: 50,
  /** AniList request timeout. */
  anilistTimeoutMs: 10_000,
  /** Episodes airing within this many hours get a scheduled job. */
  scheduleHorizonHours: 48,
  /** Newest history entries kept. */
  historyLength: 200,
  /** Entries shown by "Recent activity". */
  historyShown: 20,
  /** Hard cap on threads posted by one sync run. */
  maxPostsPerRun: 10,
  /** Minimum votes before an episode average is shown (Phase 2). */
  minVotesForAverage: 5,
};
