Read the 'AGENTS.md' before starting

# Unit 02: Tracked Shows And Settings

## Goal

A mod can add and remove tracked anime and set the posting options, using Devvit forms and settings.

## Depends On

Unit 01.

## Build

- Mod-only menu item "Tracked shows" that opens a form. The form adds a show by AniList media ID and removes a show from a select list of current ones.
- Store IDs in the `tracked` Redis set. Validate the ID as a positive integer.
- `config` hash with `autoPostEnabled` (default true) and `postDelayMinutes` (default 0, integer 0 to 60). Edited through a second form.
- When a show is added, call the schedule reconcile function from Unit 03 if it exists. Otherwise record the show only.
- Mod feedback through `showToast` for success and failure.

## Not In This Unit

AniList fetching, title search, posting, history, a React panel.

## Acceptance Criteria

- [ ] A mod can add a media ID and it appears in the removal list.
- [ ] Adding the same ID twice leaves one entry.
- [ ] A non-numeric, zero, or negative ID is rejected with a clear message and nothing is stored.
- [ ] `postDelayMinutes` outside 0 to 60 is rejected.
- [ ] Both menu items are mod-only in `devvit.json`.
- [ ] Unit tests cover add, duplicate, remove, and invalid input with a fake store.

## Verify

Unit tests, then use the forms on the test subreddit and read the stored values back.
