export const config = {
  /** Links per thread are limited to this many before the window slides. */
  linkWindowSize: 50,
  /** An aired episode with no post is still posted if it aired within this many hours. */
  latenessLimitHours: 24,
  /** Newest history entries kept. */
  historyLength: 200,
  /** Hard cap on threads posted by one sync run. */
  maxPostsPerRun: 10,
  /** Minimum votes before an episode average is shown (Phase 2). */
  minVotesForAverage: 5,
};
