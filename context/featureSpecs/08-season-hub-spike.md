Read the 'AGENTS.md' before starting

# Unit 08: Season Hub Spike (Phase 2)

## Goal

In about two hours, find out whether a Devvit custom post can hold the Season Hub: normal comments, a viewer identity, a text fallback, and good behavior on old Reddit and mobile.

## Depends On

Phase 1 complete.

## Build

- A throwaway one-page custom post on the test subreddit with one rating button and a Redis counter.
- Check and write down: do comments work under it, does the server see which user voted, is a text fallback accepted and shown on old Reddit, and how it loads on mobile.
- Record the findings in `progress-tracker.md` Open Questions and Architecture Decisions. Delete the throwaway code afterwards.

## Not In This Unit

Real hub content, charts, any production rating storage.

## Acceptance Criteria

- [ ] Each of the four questions has a written yes or no with how it was checked.
- [ ] The decision for Unit 09 is written down: proceed as designed, change the design, or drop the hub.
- [ ] No throwaway code remains in the repo.

## Verify

Open the test post in the new app, on old Reddit, and on a phone, and record what you see.
