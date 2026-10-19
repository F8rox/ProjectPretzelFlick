Read the 'AGENTS.md' before starting

# Unit 03: AniList Client And Scheduling

## Goal

Read upcoming episodes for tracked shows and keep one scheduled job per air time, rescheduled when AniList changes it.

## Depends On

Units 01 and 02.

## Build

- `anilist.ts`: one function returning the next airing episodes for a list of media IDs, using one batched query. Validate the response shape. Timeout and one retry. the fixture flag returns recorded fixtures (dev subreddit only).
- `schedule.ts`: a `reconcile` function. For each tracked show and upcoming episode it creates a one-off job at `airingAt + postDelayMinutes`, moves a job whose air time changed, and cancels a job for a removed show. The job id is stored at `schedule:{mediaId}:{episode}`.
- A daily cron task registered in `devvit.json` that runs `reconcile`. It also finds episodes that already aired, have no `posted` record, and are inside the lateness limit, and queues them for Unit 04.
- A "Check now" mod menu item that runs the same function.
- If AniList fails, write a failure to history (Unit 06 provides the store; until then, `console.error`) and change nothing.

## Not In This Unit

Posting threads, dedup records, the earlier-episode table.

## Acceptance Criteria

- [ ] With fixtures, `reconcile` creates one job per upcoming episode.
- [ ] Running `reconcile` twice creates no duplicate jobs.
- [ ] A changed air time moves the job. A removed show cancels its jobs.
- [ ] A malformed AniList response makes the run stop and change nothing.
- [ ] An aired episode with no `posted` record inside the lateness limit is queued. One outside the limit is skipped.
- [ ] The live fetch works from Devvit. This is blocked on input until the domain is approved.

## Verify

Unit tests with fixtures and a fake scheduler and store. Then, once approved, `config.fixtureOnDevSubreddit = false` and "Check now" on the test subreddit.
