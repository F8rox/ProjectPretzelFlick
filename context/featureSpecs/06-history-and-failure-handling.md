Read the 'AGENTS.md' before starting

# Unit 06: History And Failure Handling

## Goal

Mods can see what the app posted, skipped, or failed, with a reason, and failures never fail silently.

## Depends On

Units 03 to 05.

## Build

- `history.ts`: `record(store, entry)` writes `{type, mediaId, episode, reason}` to the `history` sorted set with the timestamp as score and trims to the newest entries from `config.ts`.
- Record `posted`, `skipped` (auto-post off, a job that ran more than the lateness limit after air time, over the posts-per-run cap, duplicate, an episode AniList dropped from its schedule), and `failed` (AniList error, invalid data, submit error, edit error) with a short reason.
- Mod-only menu item "Recent activity" that shows the newest entries as a form or toast list.
- Delay and break handling: when AniList moves or removes an episode, record `skipped` or `delayed` once, not on every sync.
- Replace the `console.error` placeholders from earlier units with `record`.

## Not In This Unit

A React history page, notifications, ratings.

## Acceptance Criteria

- [ ] Every post, skip, and failure path writes one history entry with a reason.
- [ ] The history never holds more than the configured length.
- [ ] A delayed episode produces one `delayed` entry across repeated syncs.
- [ ] "Recent activity" is mod-only and shows the newest entries first.
- [ ] A failure to write history never stops a post.
- [ ] Tests cover trimming, the delay dedup, and each reason type.

## Verify

Unit tests, then trigger a post, a duplicate, and a fixture failure on the test subreddit and read the activity list.
