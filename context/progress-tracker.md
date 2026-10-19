# Progress Tracker

This tracker records verified evidence only. Statuses are not copied from earlier text.

## Current Phase

Phase 1: Anime core. Unit 01 is done pending one live check. Units 02 to 04 are done pending live checks. Units 05 to 07 are not started.

## Current Goal

Clean up the starter (Unit 01), then build tracked shows (02), the AniList client and scheduling (03), and posting with dedup (04), in that order.

## Verified State (as of 2026-10-18)

- [x] Devvit React starter exists at the repo root and `npm run test:types`, `npx eslint "src/**/*.{ts,tsx}"`, `npm run test:unit` (3 tests), and `npm run build` pass. Evidence: run in the build session.
- [x] `src/server/core/episodes.ts` holds the window function (`windowFor`) and a `postEpisode` that edits every in-window earlier thread. This is the OLD design. Unit 05 replaces the edit loop with one edit to the previous thread. The window function is kept.
- [x] Week-1 test: the mod menu item "PretzelFlick: test airing post" posted "Test Show - Episode 3 discussion" on `r/pretzelflick_dev2` as the app account. Evidence: user's screenshot of the sub. It used the fixture (`USE_FIXTURE = true` in `src/server/core/anilist.ts`).
- [x] The week-1 `airing-check` task was removed in Unit 03. Its log line was never confirmed. The daily `daily-sync` task replaces it.
- [ ] AniList fetch from inside Devvit: blocked. Developer Settings shows `graphql.anilist.co` as Pending under Domain exceptions. Without approval the app got "HTTP request to domain: graphql.anilist.co is not allowed".
- [x] Unit 01 cleanup, 2026-10-18: removed the counter API, example form, install trigger post, `src/client`, `src/shared`, `public`, and their tsconfig and ESLint entries. Added `core/config.ts` and `core/keys.ts` with `keys.test.ts`. Evidence: `npm run test:types`, `npx eslint "src/**/*.{ts,tsx}"`, `npm run test:unit` (4 pass), `npm run build` all pass. `devvit.json` lists only `/internal/menu/test-airing-post` and `/internal/scheduler/airing-check`, and both routes exist. `git ls-files` shows no tracked `.env`. `windowFor` now reads its sizes from `config.ts`.
- [x] Unit 02, 2026-10-18: `core/tracked.ts` (add, remove, list with validation), `core/settings.ts` (get, save with 0-60 range), routes in `routes/menu.ts` and `routes/forms.ts`, forms and mod-only menu items registered in `devvit.json`. Evidence: `core/tracked.test.ts` (4 tests: invalid ids, duplicate, list and remove, settings range), `npm run test:types`, ESLint, `npm run test:unit` (8 pass), `npm run build` pass. Menu items verified mod-only by reading `devvit.json`.
- [x] Unit 03, 2026-10-18: `core/anilist.ts` (one batched query, response validation, timeout, one retry, `USE_FIXTURE`), `core/schedule.ts` (`reconcile`), `routes/sync.ts`, daily cron task `daily-sync`, one-off task `post-episode`, mod menu "check now", and a sync after tracked-show changes. Evidence: 16 unit tests pass, covering one job per episode, idempotent rerun, moved air time, cancelled show and removed episode, malformed or failed fetch changing nothing, catch-up queue inside and outside the lateness limit, posted episodes skipped, and the post-delay setting. `npm run test:types`, ESLint, `npm run build` pass, and `devvit.json` endpoints and cron match the Devvit config schema.
- [x] Unit 04, 2026-10-19: `core/post.ts` (`renderTitle`, `renderBody`, `postEpisode` with two-phase dedup and recovery by title, `parseJobData`, `findNextUnposted`), `routes/poster.ts` (Devvit-backed `Poster`, recovery matches only the app's own posts), `post-episode` job handler, and the mod action "post next episode now" replacing the MOCK test item. AniList now also returns official streaming links (https only). Evidence: `core/post.test.ts` (8 tests: title, body and escaping, double run posts once, crash between submit and record recovers without a second post, failed submit retries, auto-post off, too-late, payload validation, next-unposted pick) plus the cap test in `schedule.test.ts`. 25 unit tests, type-check, ESLint, build pass.
- [ ] Unit 04 live check: "post next episode now" posts one thread on `r/pretzelflick_dev2` and a second click reports duplicate. Blocked on input.
- [ ] Unit 03 live fetch from Devvit. Blocked on input: AniList domain approval, then set `USE_FIXTURE = false`.
- [ ] Unit 03 live check: "check now" on `r/pretzelflick_dev2` shows a sync summary and `post-episode fired` appears in the playtest log at the scheduled time. Blocked on input.
- [ ] Unit 02 live check: both forms open and save on `r/pretzelflick_dev2`, and the removal list shows the added ID. Blocked on input.
- [!] `core/episodes.ts` uses `hExists`, which Devvit's Redis does not have. Unit 04 and 05 must switch it to `hGet` or `hSetNX` before any live run.
- [ ] Unit 01 live check: the remaining menu item still appears after `npm run dev` on `r/pretzelflick_dev2`. Blocked on input.
- [ ] `README.md` has a "Fetch Domains" section (added). It still carries the starter's text and needs a rewrite in Unit 07.

## Units

| Unit | Name                              | Status                                   |
| ---- | --------------------------------- | ---------------------------------------- |
| 01   | Foundation cleanup                | Done pending input (live menu check)     |
| 02   | Tracked shows and settings        | Done pending input (live form check)     |
| 03   | AniList client and scheduling     | Done pending input (domain approval, live check) |
| 04   | Thread posting and dedup          | Done pending input (live post check)     |
| 05   | Episode links and next edit       | Not started                              |
| 06   | History and failure handling      | Not started                              |
| 07   | Hardening and release             | Not started                              |
| 08   | Season Hub spike (Phase 2)        | Not started                              |
| 09   | Ratings and season chart (Phase 2)| Not started                              |

## Inputs Needed From User

| Input                                   | Where                                         | Unblocks                                  |
| --------------------------------------- | --------------------------------------------- | ----------------------------------------- |
| AniList domain approval                 | developers.reddit.com app, Developer Settings | Unit 03 live fetch, Unit 04 real data     |
| Run `npm run dev`, confirm the menu items, both forms, "check now", "post next episode now" (twice), and the `post-episode` log | `r/pretzelflick_dev2` | Unit 01 to 04 live checks |
| Fetch Domains README section reviewed   | `README.md`                                   | Unit 07 review submission                 |
| A real subreddit to install on          | Mods of 2-3 anime subs                        | Success criterion 9                       |

## Open Questions

1. Does a Devvit custom post keep normal comments, identify the viewer, and accept a text fallback? (Phase 2 spike, Unit 08.)
2. How many scheduler jobs per installation does Devvit allow? Unit 03 schedules one per episode inside a 48-hour horizon, so a large tracked list could hit a limit. Check in the playtest.
3. What is the maximum run time of a scheduler job and of a menu action?
4. Does Reddit's app review accept an app that posts automatically? (Find out by submitting early in Unit 07.)
5. Is a text search by title needed for adding shows, or are AniList IDs enough for Phase 1?

## Architecture Decisions

- D1. Devvit web only. No Blocks and no `@devvit/public-api`.
- D2. Anime only in Phase 1, through AniList. TMDB is Phase 3 and uses one app-level secret, not per-mod keys.
- D3. One scheduled job per air time plus a daily resync, not polling.
- D4. Two-phase dedup with a `pending` record before posting and recovery by title search.
- D5. Only the immediately previous episode's thread is edited. The 50-link window still shapes the earlier-episode table in each new thread.
- D6. Discussion threads stay plain text posts. Interactive ratings live in a separate Season Hub (Phase 2).
- D7. `USE_FIXTURE` in `src/server/core/anilist.ts` stands in for AniList until the domain is approved. It must be `false` before release.
- D8. Redis history is a sorted set of JSON entries, newest 200 kept. The tracked set holds plain AniList media IDs.
- D10. `react`, `react-dom`, Tailwind and their Vite plugins stay installed although Phase 1 has no client. Unit 09 (Phase 2) needs them. Revisit if Phase 2 is dropped.
- D11. `tools/tsconfig.server.json` sets `rewriteRelativeImportExtensions` so source files can import `./x.ts`, which `node --test` requires, while `tsc --build` still passes.
- D14. A job's payload carries the title, air time, and streaming links, so the posting job needs no AniList call. Links changed after scheduling reach the thread only if the air time also changes.
- D13. The `schedule` key is a hash (`{mediaId}:{episode}` to `{jobId, runAt}`) because Devvit Redis cannot scan string keys to cancel jobs for removed shows. Catch-up posts run `catchUpDelayMs` after the sync.
- D12. `tracked` is a Redis hash, not a set, because Devvit Redis has no set commands (Unit 02). Dedup in Unit 04 uses `hSetNX`.
- D9. Config booleans stay separate fields in the `config` hash (`autoPostEnabled`), not a JSON blob.
- Source: two council runs in the build session (project review, then the X-factor question). All claims about Devvit limits there were unverified.

## Session Notes

- 2026-10-18: Read the doc "PretzelFlick - App Overview & Technical Design". Built the first episode hash logic, then reworked the plan after the council review. Created the Devvit test app, found the domain allowlist block, and set up this spec-driven structure.
