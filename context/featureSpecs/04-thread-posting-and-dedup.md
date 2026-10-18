Read the 'AGENTS.md' before starting

# Unit 04: Thread Posting And Dedup

## Goal

When a job fires, post exactly one correct thread for that episode, even if the job runs twice or crashes halfway.

## Depends On

Units 01 to 03.

## Build

- `post.ts`: render the title and body from `design.md` with one template. Spoiler-safe title, details, official links from AniList, discussion reminder. The earlier-episode table is added in Unit 05.
- The scheduler job endpoint calls `postEpisode(deps, mediaId, episode)`.
- Two-phase dedup from `architecture-context.md`: set `posted:{mediaId}:{episode}` to `pending` only if absent, submit, then write `posted` with the post id and permalink.
- Crash recovery: if `pending` exists without a post id, search the subreddit's recent posts for the exact title before posting. If found, record it. If not, post.
- Respect `autoPostEnabled`. If off, record a skip.
- Replace the `MOCK:` test posting menu item with a real "Post next episode now" mod action that uses the same function. It still obeys dedup.
- Enforce the posts-per-run cap.

## Not In This Unit

The earlier-episode table, the "next" edit, history storage, ratings.

## Acceptance Criteria

- [ ] Running the job twice for one episode creates one thread.
- [ ] A simulated crash after submit and before record, then a rerun, creates no second thread.
- [ ] With `autoPostEnabled` off, no thread is posted and a skip is recorded.
- [ ] The title contains only the show title and episode number.
- [ ] A show with no streaming links renders `*None listed.*`.
- [ ] The posts-per-run cap stops extra posts.
- [ ] A real thread posts on the test subreddit (fixture data is acceptable until the domain is approved).

## Verify

Unit tests with a fake `Poster` and store, including the crash case. Then post on the test subreddit and confirm one thread only.
