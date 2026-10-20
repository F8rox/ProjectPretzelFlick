Read the 'AGENTS.md' before starting

# Unit 09: In-Thread Ratings (Phase 2)

## Goal

Each episode thread is an interactive post where a reader rates the episode 1 to 5 once, sees the community score, and still gets the same thread content as before. If the interactive post cannot be created, or a mod turns it off, the thread is the plain-text thread from Phase 1.

## Depends On

Unit 08 with a "proceed" decision (recorded in `progress-tracker.md`: option A, ratings inside every thread).

## Build

- Remove the Unit 08 spike: `src/client/spike.*`, the `/api/spike/*` endpoints, the "spike post" menu item, and `spike:ratings`.
- **Thread data.** When a thread is posted, save its details (`PostJobData`: show, episode, air time, title, streams) in Redis at `thread:{postId}`. The Phase 1 Markdown builder keeps producing the thread text and that text is passed as the post's `textFallback`, so old Reddit, third-party apps, and search get exactly the Phase 1 thread.
- **Interactive posting.** `submitCustomPost` with `entry: 'default'` and `textFallback`. If it throws, post the Phase 1 plain-text thread instead and record the failure in the history. A per-install setting "Interactive ratings" (default on) turns it off.
- **Votes.** `ratings:{postId}` hash of `userId -> score`, plus `ratingStats:{postId}` with `sum` and `count`. A re-vote adjusts the stats by the difference from the old vote and never changes `count`. The average is hidden until `config.minVotesForAverage` votes, and the vote count is always shown.
- **API** (`/api/*`, callable by anyone who loads the post, so every write validates): `GET /api/thread` returns the thread details, the viewer's own vote, the count and average, the earlier episodes (link and average), and the next episode's link, all read live from Redis. `POST /api/vote` takes the score only. `userId` and `postId` come from the server context, never the request.
- **Card.** A compact, theme-aware web view: spoiler reminder, aired time, the 1 to 5 row with the score and vote count, stream links, next and previous episode links, and the earlier-episodes table collapsed. All links use `navigateTo`. No chart library. A line "Previous episodes: 4.2, 3.9, 4.5" gives the season view without a hub.
- **Next-episode link.** The card reads it live from `episodes:{mediaId}`, so no older post is edited for interactive threads. Interactive threads are not edited by `linkPrevious`. Best-effort refreshing of the old Reddit fallback text is not part of this unit.
- Old threads stay plain text. Nothing is migrated.

## Not In This Unit

A Season Hub post, comment features, countdowns, per-character polls, "Watching or Dropped" taps, hiding results until the viewer votes, and migrating old threads.

## Acceptance Criteria

- [ ] A score outside 1 to 5, a non-integer, a missing user, or a post that is not a stored thread is rejected.
- [ ] One vote per user: a re-vote replaces the old vote, the count does not change, and the average updates correctly.
- [ ] The average is hidden below the minimum vote count, and the count is always shown.
- [ ] Thread creation falls back to the plain-text thread when the interactive post throws, and when the setting is off.
- [ ] The text fallback is the Phase 1 thread text.
- [ ] Interactive threads are never passed to the next-episode text edit.
- [ ] The card shows the next episode link and the earlier episodes live.
- [ ] Every control is keyboard-usable and labeled, and the colors follow light and dark themes.
- [ ] Live: a real interactive thread posts, a vote works, and comments work on it.
- [ ] Live: the fallback shows on old Reddit and the card renders in the official phone app (blocked on input until checked).

## Verify

Unit tests for the vote rules, the fallback, and the setting. Then post a real thread on `r/pretzelflick_dev2`, vote from it, and check old Reddit and the phone app.
