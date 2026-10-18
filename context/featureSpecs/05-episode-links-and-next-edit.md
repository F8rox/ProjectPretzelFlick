Read the 'AGENTS.md' before starting

# Unit 05: Episode Links And Next Edit

## Goal

Each new thread carries a table of earlier episode threads, and only the immediately previous thread is edited to add a "next episode" link.

## Depends On

Unit 04.

## Build

- Rework `episodes.ts`: keep `windowFor` and the `series:{mediaId}:season:{s}:episodes` hash. Remove the loop that edits every in-window earlier thread.
- Record each posted episode in the season hash with status `active`.
- Add the earlier-episode table to the new thread's body: episodes inside `windowFor(ep)`, excluding the thread itself, sorted by episode, as `Episode | Link` rows.
- After posting, edit only episode `ep - 1`'s thread to put `**Next episode:** [Episode N](permalink)` at the top. If that edit fails, set `ep - 1` to `locked` and continue. Never retry a locked edit.
- A thread outside its own window is marked `frozen` and left alone.
- Seasons are separate hashes. Links never cross a season boundary. Use the AniList season data; if it is missing, record the episode as season 1 and note it in the tracker.

## Not In This Unit

Editing older threads, history storage, ratings.

## Acceptance Criteria

- [ ] `windowFor` returns 1-50 for episodes 1 to 49, 25-75 for 50, 50-100 for 75 to 99, and 75-125 for 100.
- [ ] A new thread's table contains only episodes in its window and never itself.
- [ ] Posting episode N edits exactly one earlier thread (N-1), never more.
- [ ] A failed edit marks N-1 `locked`, does not block the new post, and is not retried.
- [ ] A new season starts a fresh hash with no links to the old season.
- [ ] Tests cover the window table, the single edit, a failed edit, and a season change.

## Verify

Unit tests with fake stores. Then post two consecutive episodes on the test subreddit and confirm the "next" link and the table.
