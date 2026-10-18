Read the 'AGENTS.md' before starting

# Unit 09: Ratings And Season Chart (Phase 2)

## Goal

A live Season Hub post per show per season where users rate aired episodes once and see a season score chart.

## Depends On

Unit 08 with a "proceed" decision.

## Build

- One custom post per show per season, created when the first episode of the season posts, linked from each thread by one line.
- Web view in `src/client`: episode list with air times and thread links, a countdown to the next episode, a 1 to 5 rating per aired episode, and a season chart as hand-rolled SVG with a text table alternative.
- Server endpoints: submit a vote and read the season data. Store `rating:{mediaId}:{episode}` as a hash of `userId -> score`. Compute the average on read from the hash.
- Validate the score as an integer 1 to 5, only for aired episodes, checked on the server.
- Hide an episode's average below the minimum vote count and always show the count.
- A mod-only "Reset ratings" action for one episode.
- The chart never shows episodes beyond what has aired. Threads stay plain text posts.

## Not In This Unit

Comments on ratings, per-character polls, "Watching or Dropped" taps, scoring beyond one number per episode.

## Acceptance Criteria

- [ ] A user can rate an aired episode once, and a re-vote replaces the old one.
- [ ] A score outside 1 to 5, a non-integer, or a vote for an unaired episode is rejected.
- [ ] Averages are hidden below the minimum vote count and the count is always shown.
- [ ] The chart shows only aired episodes.
- [ ] A mod can reset one episode and a non-mod cannot.
- [ ] The text threads work unchanged if the hub is removed.
- [ ] Every control is keyboard-usable and labeled, and the chart has a text alternative.

## Verify

Unit tests for vote rules, then vote from two accounts on the test subreddit and check the chart, a re-vote, a rejected vote, and the reset.
