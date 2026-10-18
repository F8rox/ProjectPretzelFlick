# Progress Tracker

This tracker records verified evidence only. Statuses are not copied from earlier text.

## Current Phase

Phase 1: Anime core. Unit 01 is done pending one live check. Unit 02 is done pending one live check. Units 03 to 07 are not started.

## Current Goal

Clean up the starter (Unit 01), then build tracked shows (02), the AniList client and scheduling (03), and posting with dedup (04), in that order.

## Verified State (as of 2026-10-18)

- [x] Devvit React starter exists at the repo root and `npm run test:types`, `npx eslint "src/**/*.{ts,tsx}"`, `npm run test:unit` (3 tests), and `npm run build` pass. Evidence: run in the build session.
- [x] `src/server/core/episodes.ts` holds the window function (`windowFor`) and a `postEpisode` that edits every in-window earlier thread. This is the OLD design. Unit 05 replaces the edit loop with one edit to the previous thread. The window function is kept.
- [x] Week-1 test: the mod menu item "PretzelFlick: test airing post" posted "Test Show - Episode 3 discussion" on `r/pretzelflick_dev2` as the app account. Evidence: user's screenshot of the sub. It used the fixture (`USE_FIXTURE = true` in `src/server/core/anilist.ts`).
- [ ] Scheduler task `airing-check` (cron every 10 minutes): registered in `devvit.json`. Log line `airing-check ok` NOT yet confirmed.
- [ ] AniList fetch from inside Devvit: blocked. Developer Settings shows `graphql.anilist.co` as Pending under Domain exceptions. Without approval the app got "HTTP request to domain: graphql.anilist.co is not allowed".
- [x] Unit 01 cleanup, 2026-10-18: removed the counter API, example form, install trigger post, `src/client`, `src/shared`, `public`, and their tsconfig and ESLint entries. Added `core/config.ts` and `core/keys.ts` with `keys.test.ts`. Evidence: `npm run test:types`, `npx eslint "src/**/*.{ts,tsx}"`, `npm run test:unit` (4 pass), `npm run build` all pass. `devvit.json` lists only `/internal/menu/test-airing-post` and `/internal/scheduler/airing-check`, and both routes exist. `git ls-files` shows no tracked `.env`. `windowFor` now reads its sizes from `config.ts`.
- [x] Unit 02, 2026-10-18: `core/tracked.ts` (add, remove, list with validation), `core/settings.ts` (get, save with 0-60 range), routes in `routes/menu.ts` and `routes/forms.ts`, forms and mod-only menu items registered in `devvit.json`. Evidence: `core/tracked.test.ts` (4 tests: invalid ids, duplicate, list and remove, settings range), `npm run test:types`, ESLint, `npm run test:unit` (8 pass), `npm run build` pass. Menu items verified mod-only by reading `devvit.json`.
- [ ] Unit 02 live check: both forms open and save on `r/pretzelflick_dev2`, and the removal list shows the added ID. Blocked on input.
- [!] `core/episodes.ts` uses `hExists`, which Devvit's Redis does not have. Unit 04 and 05 must switch it to `hGet` or `hSetNX` before any live run.
- [ ] Unit 01 live check: the remaining menu item still appears after `npm run dev` on `r/pretzelflick_dev2`. Blocked on input.
- [ ] `README.md` has a "Fetch Domains" section (added). It still carries the starter's text and needs a rewrite in Unit 07.

## Units

| Unit | Name                              | Status                                   |
| ---- | --------------------------------- | ---------------------------------------- |
| 01   | Foundation cleanup                | Done pending input (live menu check)     |
| 02   | Tracked shows and settings        | Done pending input (live form check)     |
| 03   | AniList client and scheduling     | Not started                              |
| 04   | Thread posting and dedup          | Not started                              |
| 05   | Episode links and next edit       | Not started                              |
| 06   | History and failure handling      | Not started                              |
| 07   | Hardening and release             | Not started                              |
| 08   | Season Hub spike (Phase 2)        | Not started                              |
| 09   | Ratings and season chart (Phase 2)| Not started                              |

## Inputs Needed From User

| Input                                   | Where                                         | Unblocks                                  |
| --------------------------------------- | --------------------------------------------- | ----------------------------------------- |
| AniList domain approval                 | developers.reddit.com app, Developer Settings | Unit 03 live fetch, Unit 04 real data     |
| Confirm `airing-check` log line         | Playtest terminal output                      | Unit 01 scheduler criterion               |
| Run `npm run dev`, confirm the menu items and both forms | `r/pretzelflick_dev2`               | Unit 01 and 02 live checks                |
| Fetch Domains README section reviewed   | `README.md`                                   | Unit 07 review submission                 |
| A real subreddit to install on          | Mods of 2-3 anime subs                        | Success criterion 9                       |

## Open Questions

1. Does a Devvit custom post keep normal comments, identify the viewer, and accept a text fallback? (Phase 2 spike, Unit 08.)
2. How many scheduler jobs per installation does Devvit allow? (Check before Unit 03 finalizes the one-job-per-air-time design.)
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
- D12. `tracked` is a Redis hash, not a set, because Devvit Redis has no set commands (Unit 02). Dedup in Unit 04 uses `hSetNX`.
- D9. Config booleans stay separate fields in the `config` hash (`autoPostEnabled`), not a JSON blob.
- Source: two council runs in the build session (project review, then the X-factor question). All claims about Devvit limits there were unverified.

## Session Notes

- 2026-10-18: Read the doc "PretzelFlick - App Overview & Technical Design". Built the first episode hash logic, then reworked the plan after the council review. Created the Devvit test app, found the domain allowlist block, and set up this spec-driven structure.
