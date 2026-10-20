# Progress Tracker

This tracker records verified evidence only. Statuses are not copied from earlier text.

## Current Phase

Phase 1: Anime core. Unit 01 is done pending one live check. Units 01 to 06 passed their live checks on fixture data (2026-10-19). The real AniList fetch is blocked by the domain rejection. Unit 07's code and checks are done. Upload, review, domain approval, and installing on a real subreddit need you.

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
- [x] Unit 03, 2026-10-18: `core/anilist.ts` (one batched query, response validation, timeout, one retry, the fixture flag), `core/schedule.ts` (`reconcile`), `routes/sync.ts`, daily cron task `daily-sync`, one-off task `post-episode`, mod menu "check now", and a sync after tracked-show changes. Evidence: 16 unit tests pass, covering one job per episode, idempotent rerun, moved air time, cancelled show and removed episode, malformed or failed fetch changing nothing, catch-up queue inside and outside the lateness limit, posted episodes skipped, and the post-delay setting. `npm run test:types`, ESLint, `npm run build` pass, and `devvit.json` endpoints and cron match the Devvit config schema.
- [x] Unit 04, 2026-10-19: `core/post.ts` (`renderTitle`, `renderBody`, `postEpisode` with two-phase dedup and recovery by title, `parseJobData`, `findNextUnposted`), `routes/poster.ts` (Devvit-backed `Poster`, recovery matches only the app's own posts), `post-episode` job handler, and the mod action "post next episode now" replacing the MOCK test item. AniList now also returns official streaming links (https only). Evidence: `core/post.test.ts` (8 tests: title, body and escaping, double run posts once, crash between submit and record recovers without a second post, failed submit retries, auto-post off, too-late, payload validation, next-unposted pick) plus the cap test in `schedule.test.ts`. 25 unit tests, type-check, ESLint, build pass.
- [x] Unit 05, 2026-10-19: `core/episodes.ts` rewritten (`windowFor`, `loadEpisodes`, `earlierLinks`, `recordEpisode`, `linkPrevious`). The old loop that edited every earlier thread and its `hExists` use are gone, which also fixes the `hExists` problem recorded above. `postEpisode` loads the table before submitting, writes the table entry before the posted record, then makes exactly one edit, to episode N-1. A failed edit sets that entry `locked` and is never retried. Evidence: `episodes.test.ts` (window table, earlier links), `post.test.ts` (one edit per episode, table contents, failed edit locks and is not retried, missing previous episode, recovered post is linked, separate media IDs do not share links). 30 unit tests, type-check, ESLint, build pass.
- [x] Unit 06, 2026-10-19: `core/history.ts` (`record` never throws, trims to `historyLength`; `recent`, `describeEntry`). `postEpisode` records every post, skip, and locked edit through an injected `record`; `runPostJob` records a failure instead of throwing; `reconcile` records `delayed` (once, at the moment the job moves), episodes dropped from AniList, and episodes over the per-run cap; `routes/sync.ts` records a failed sync. Mod-only menu item "recent activity" shows the newest 20. The `console.error` placeholders from Units 03 and 04 are gone. Evidence: `history.test.ts` (4 tests), history cases in `post.test.ts` and `schedule.test.ts`. 39 unit tests, type-check, ESLint, build pass.
- [ ] Unit 06 live check: "recent activity" lists the entries from the earlier live checks, newest first. Blocked on input.
- [ ] Not unit-tested: the route wiring in `routes/sync.ts` that records a failed sync, and the menu and form handlers. They are thin and are covered by the live checks.
- [ ] Unit 05 live check: post two consecutive episodes on `r/pretzelflick_dev2` and confirm the "Next episode" line on the first and the table on the second. Blocked on input.
- [ ] Unit 04 live check: "post next episode now" posts one thread on `r/pretzelflick_dev2` and a second click reports duplicate. Blocked on input.
- [ ] Unit 03 live fetch from Devvit. Blocked on input: AniList domain approval, then set `config.fixtureOnDevSubreddit = false`.
- [ ] Unit 03 live check: "check now" on `r/pretzelflick_dev2` shows a sync summary and `post-episode fired` appears in the playtest log at the scheduled time. Blocked on input.
- [ ] Unit 02 live check: both forms open and save on `r/pretzelflick_dev2`, and the removal list shows the added ID. Blocked on input.
- [ ] Unit 01 live check: the remaining menu item still appears after `npm run dev` on `r/pretzelflick_dev2`. Blocked on input.
- [x] `README.md` was rewritten (audit finding 11) and has a "Fetch Domains" section. Unit 07 only needs to re-check it is accurate at release.

## Live Checks On r/pretzelflick_dev2 (2026-10-19, fixture data, playtest v0.0.3.5)

Evidence I saw myself is marked (seen). Evidence the user reported is marked (reported).

- [x] Menus and forms (Units 01, 02): the user ran menu, tracked shows (add 154587), settings, check now, and recent activity and said all worked (reported, no toast texts given).
- [x] Unit 03 sync: "check now" toast `0 scheduled, 0 moved, 1 cancelled, 2 queued` (seen, screenshot). The catch-up jobs fired about a minute later.
- [x] Unit 04 scheduled posting: the playtest log showed `post-episode 154587 ep 2: posted` and `post-episode 154587 ep 3: posted` (seen).
- [x] Unit 06 history: "recent activity" opened and listed `posted show 154587 ep 3` at 2026-10-19 17:40 UTC (seen, screenshot). The visible box is small, so further lines may need scrolling (not checked).
- [x] Bug found live and fixed: a repeat "check now" cancelled and re-queued pending catch-up jobs (toast `2 cancelled, 2 queued`) and wrote false "no longer on the AniList schedule" entries. Cause: pending catch-up jobs were not counted as expected. Fixed in `1b4fb56` with a regression test (45 unit tests).
- [x] After the fix, the user confirmed (reported): the repeat "check now" reports 0 queued and 0 cancelled, there is exactly one thread per episode, the threads show the earlier-episode table and the "Next episode" line, and "post next episode now" says nothing to post.
- [ ] Not yet confirmed: the `daily-sync` cron at 04:00 UTC fires, and the history shows more than one entry (the box is small).
- [x] 2026-10-20: Reddit approved `graphql.anilist.co`. `config.fixtureOnDevSubreddit` is now `false`. With real AniList data the playtest posted BLEACH: Thousand-Year Blood War ep 9 and PSYREN ep 3 on `pretzelflick_dev2` (seen in the log and a screenshot: real Crunchyroll link under Streams, AniList link, correct air time). The overnight `daily-sync` cron also fired (seen in the log).
- [x] 2026-10-20 Devvit 0.14.8 live check: on playtest v0.0.3.12 (new packages) adding show 209219 posted episode 4 (aired 15.6h earlier), shown in the playtest log as `post-episode 209219 ep 4: posted`. The follow-up "check now" correctly reported 0 scheduled, 0 moved, 0 cancelled, 0 queued, because adding a show already runs a sync.
- [x] 2026-10-20 live check of the manual-post and history changes (playtest v0.0.3.18; user ran all 7 steps and sent a screenshot, seen): with auto-post off the scheduled catch-up recorded `skipped show 207191 ep 3: auto-post is off`; "post next episode now" then posted the thread anyway; a repeat attempt recorded `skipped … already posted`; the "recent activity" box shows about 8 entries at once (`config.historyBoxLines`). YouTube filtering has a unit test but was not seen on a real thread (the show had no YouTube link).
- [ ] Terms and Privacy form: saved (the links show on the app page).

## Unit 08 Spike Results (2026-10-20, playtest v0.0.3.20, screenshots seen)

- [x] An interactive custom post renders in the feed with working 1 to 5 buttons.
- [x] The server sees the viewer: `context.userId` is set (the page showed "Server sees a logged-in user: true").
- [x] Voting works and re-voting replaces the old vote (count 1, average 5.00, your vote 5). Votes are stored per user in a Redis hash.
- [x] Normal comments work under the custom post (a comment was posted and shown with its own vote and Reply controls).
- [ ] Old Reddit shows the text fallback: not yet checked.
- [ ] Mobile app rendering: not yet checked.
- Finding: in the new Reddit feed a custom post shows only its web view, not the post text. If an episode thread itself became the custom post, the streams list, earlier-episode table, and spoiler reminder would have to be drawn inside the web view, with the same text kept as `textFallback` for old Reddit and third-party apps. The default frame is a tall white box and needs a compact, theme-aware card.
- Decision pending: ratings inside every thread (thread becomes a custom post) versus one Season Hub post per show linked from plain-text threads.

## Unit 07: Hardening And Release (2026-10-19)

Security checklist, every item run against the final code:

| # | Check | Evidence | Result |
| - | ----- | -------- | ------ |
| 1 | Every state-changing route is mod-only or has a reason | All 5 menu items are `forUserType: moderator` in `devvit.json`. Forms and scheduler tasks are `/internal/*` platform endpoints and there are no triggers. 10 of 10 routes in `src/server/routes` match `devvit.json`. | Pass |
| 2 | Every fetch goes to an approved domain | The only `fetch` in `src` is `graphql.anilist.co` in `core/anilist.ts`, and the domain is in `permissions.http.domains`. Approval is Pending in Developer Settings. | Pass in code. Blocked on input (approval) |
| 3 | External values are validated | `parseAiring`, `parseJobData`, `parseMediaId`, `saveSettings`, `safeHttpsUrl`, and `parseJsonRecord` at every boundary, with negative tests. | Pass |
| 4 | The code cannot post the same episode twice | `post.test.ts`: double run, crash between submit and record, failed submit then retry. Known shortcut: two jobs racing at the same instant (comment in `post.ts`). | Pass with the noted shortcut |
| 5 | No secret or user identifier in code, config, or logs | Pattern scan over the working tree and every commit found nothing. gitleaks is not installed, so this is a pattern scan only. `.env` is ignored, empty, and never committed. `console.*` lines log only media IDs and error text. | Pass |
| 6 | At least one negative test per unit | Invalid IDs and delays (02), malformed AniList data (03), duplicate and too-late (04), failed edit (05), failed history write (06). | Pass |
| 7 | Nothing from Out Of Scope exists | Search of `src` for TMDB, movies, ratings, React, notifications, certificates, payments found nothing. | Pass |

Other release checks:

- [x] Active `MOCK:` code: only `config.fixtureOnDevSubreddit` (and it can only run on `pretzelflick_dev2`). `npm run release:check` (new, `scripts/release-check.mjs`) fails while the flag is `true` and is now part of `npm run launch`. Verified both ways: it failed on the real config and passed on a copy with the flag `false`.
- [x] No function over 40 lines, no file over 300 lines, and no file outside the folder layout.
- [x] `npm audit`: full 44 findings (13 high, all in the Devvit CLI chain, dev-only). Runtime (`--omit=dev`) 19 findings (18 moderate, 1 high), from `brace-expansion` and `protobufjs` through `@devvit/web`. The fix is the non-breaking bump of `@devvit/web` and `devvit` 0.14.2 to 0.14.8, not applied (see finding 7).
- [x] `README.md` is accurate for the current behavior.

Phase 1 success criteria (`project-overview.md`):

| # | Criterion | Evidence | Result |
| - | --------- | -------- | ------ |
| 1 | A mod can install the app and add a tracked show from the form | `tracked.test.ts`; forms registered | Logic passes. Live form check blocked on input |
| 2 | A tracked episode produces exactly one thread at its air time | One-job-per-episode and dedup tests | Logic passes. Timing live check blocked on input |
| 3 | A rerun or a crash never produces a second thread | `post.test.ts` | Pass |
| 4 | A delayed episode moves its job and appears in the history | `schedule.test.ts` | Pass |
| 5 | Each thread has the 50-link table, and the previous thread gains one "next" link | `post.test.ts`, `episodes.test.ts` | Logic passes. Live check blocked on input |
| 6 | A failed edit is recorded as locked and does not stop new posts | `post.test.ts` | Pass |
| 7 | The history shows posted, skipped, and failed items with reasons | `post.test.ts`, `history.test.ts` | Logic passes. Live check blocked on input |
| 8 | Security checklist passes and the Fetch Domains request is approved | Checklist above | Checklist passes. Approval pending, blocked on input |
| 9 | Installed and posted real threads on a real subreddit | Not started | Blocked on you |

Needs human (I cannot do these):

1. Run `npm run dev` on `r/pretzelflick_dev2` and walk the live checks listed in the Inputs table.
2. Wait for the AniList domain approval, then set `config.fixtureOnDevSubreddit` to `false` and re-run "check now" and "post next episode now".
3. Fill in the app description and listing details in Developer Settings.
4. Upload with `npx devvit upload`, then publish for review with `npm run launch` (it runs `release:check` first). Submitting for review sends the app to Reddit, so that decision and the click are yours.
5. Ask a real subreddit's mods for permission, install, and watch a week of episodes.
6. After the live checks, bump `@devvit/web` and `devvit` to 0.14.8 and re-run everything.

## Audit Fixes (2026-10-19)

- [x] Audit finding 1 (High): the fixture could have posted fake "Test Show" threads on any subreddit. `fetchAiring` now takes an explicit `fixture` flag that defaults to false, and `shouldUseFixture(subredditName)` is true only when `config.fixtureOnDevSubreddit` is on AND the install is `config.devSubreddit` (`pretzelflick_dev2`). `routes/sync.ts` is the single place that decides, used by the sync and "post next episode now". Evidence: `anilist.test.ts` (dev sub on, other subs and empty name off, flag off, fixture only when asked, `config.devSubreddit` equals `dev.subreddit` in `devvit.json`); 42 unit tests, type-check, ESLint, build pass. Unit 07 still sets `config.fixtureOnDevSubreddit` to `false`.
- [x] Finding 2 (Medium): "post next episode now" only offers episodes that have aired (`findNextUnposted` takes `nowMs`). Test covers a not-yet-aired episode.
- [x] Finding 3 (Medium): tests are now type-checked and linted (`tools/tsconfig.test.json`, `test:types` runs both, ESLint has a test block). Doing so found a stale `Poster` import in `post.test.ts`, now fixed. `no-floating-promises` is off for test files only because `node:test` runs the promises `test()` returns.
- [x] Finding 4 (Medium): `reconcile` split into `makePlan`, `prune`, `scheduleWanted`, `queueLate`. All functions are under 40 lines. Existing schedule tests unchanged and green.
- [x] Finding 5 (Medium): stream and job-payload links go through `safeHttpsUrl` (`core/parse.ts`): https only, normalized by `URL`, parentheses encoded. `parse.test.ts` covers markdown-breaking input.
- [x] Finding 6 (Medium): `.github/workflows/ci.yaml` rewritten as plain steps (the starter's `parallel:` key is not valid) using `npm ci`. Not run on GitHub, so the workflow itself is unverified.
- [x] Finding 7 RESOLVED (2026-10-20): `@devvit/web`, `devvit`, and `@devvit/start` upgraded 0.14.2 to 0.14.8 and `npm audit fix` applied. Runtime audit (`--omit=dev`): 0 vulnerabilities. Full audit: 19 (2 low, 6 moderate, 11 high), all in the Devvit CLI and build tooling, which does not ship in the app. 45 unit tests, type-check, lint, build, and `release:check` pass. Live re-check on playtest pending. Earlier note: 
- [~] (superseded) Finding 7 (Medium): `devvit` and `@devvit/start` moved to `devDependencies` (440 packages now flagged dev-only in the lockfile). `hono` bumped to 4.13.13, which fixes its advisory. `npm audit --omit=dev` went from 20 to 19 findings (18 moderate, 1 high: `brace-expansion` and `protobufjs`, both through `@devvit/web`). Full audit is 44 (13 high, all in the Devvit CLI chain). Both need `@devvit/web` and `devvit` 0.14.2 to 0.14.8, a non-breaking bump that was NOT applied because it is a platform upgrade that cannot be tested without the live app. Do it after the live checks.
- [x] Finding 8 (Low): `core/parse.ts` (`isRecord`, `parseJsonRecord`, `safeHttpsUrl`) replaces four copies of the JSON-record parsing.
- [x] Finding 9 (Low): `HOUR_MS` and `MINUTE_MS` in `config.ts` replace repeated time literals, and `formatUtc` replaces a duplicated date format.
- [x] Finding 10 (Low): the unused `keys.rating` and `config.minVotesForAverage` were removed. Unit 09 adds them back.
- [x] Finding 11 (Low): `README.md` rewritten for moderators and developers. It states the app is unpublished and the domain request is pending.
- [x] Finding 12 (Low): the `as const` in `menu.ts` is gone (the form fields are typed with `Form['fields']`).
- [~] Finding 13 (Low): the `lint` script uses a Windows-safe quoted glob and `AGENTS.md` and the README use it. `engines` still says Node 24 and the starter's `AGENTS.md` said Node 22. The Devvit runtime version is unverified.
- [x] Finding 14 (Low): mod-facing toasts no longer show raw error text. They say "Open recent activity for details", and the detail goes to the history.
- Evidence for the group: 44 unit tests, `npm run test:types` (app and tests), `npm run lint`, `npm run build` all pass.

## Units

| Unit | Name                              | Status                                   |
| ---- | --------------------------------- | ---------------------------------------- |
| 01   | Foundation cleanup                | Done. Live check passed                  |
| 02   | Tracked shows and settings        | Done. Live check passed (reported)       |
| 03   | AniList client and scheduling     | Done on fixture data. Real AniList fetch blocked (domain rejected) |
| 04   | Thread posting and dedup          | Done. Live check passed on fixture data  |
| 05   | Episode links and next edit       | Done. Live check passed on fixture data  |
| 06   | History and failure handling      | Done. Live check passed (history box is small) |
| 07   | Hardening and release             | Code work done. Release steps need you (see Unit 07 below) |
| 08   | Season Hub spike (Phase 2)        | Not started                              |
| 09   | Ratings and season chart (Phase 2)| Not started                              |

## Inputs Needed From User

| Input                                   | Where                                         | Unblocks                                  |
| --------------------------------------- | --------------------------------------------- | ----------------------------------------- |
| AniList domain approval: REJECTED (2026-10-19, no reason shown). Find the reason, appeal or re-request, or choose a fallback (see Open Questions) | developers.reddit.com app, Developer Settings | Unit 03 live fetch, Unit 04 real data |
| Run `npm run dev`, confirm the menu items, both forms, "check now", "post next episode now" (twice), post two consecutive episodes, "recent activity", and the `post-episode` log | `r/pretzelflick_dev2` | Unit 01 to 06 live checks |
| Fetch Domains README section reviewed   | `README.md`                                   | Unit 07 review submission                 |
| App description, listing details, and links to the Terms and Privacy Policy (drafts in `legal/`, contact must be added and published at a public URL) | Developer Settings | Unit 07 review submission, domain approval |
| Upload and publish for review           | `npx devvit upload`, then `npm run launch`    | Unit 07 review criterion                  |
| A real subreddit to install on          | Mods of 2-3 anime subs                        | Success criterion 9                       |

## Open Questions

0. Likely cause, from Reddit's HTTP fetch docs: "Any app that uses `fetch` must upload Terms and Conditions and a Privacy Policy" and save their links in the app details form. Both fields were empty. Drafts are in `legal/`. Not confirmed as the reason. The global fetch allowlist has no anime data source (checked 2026-10-19). App version 0.0.2 was uploaded privately on 2026-10-19 to resubmit the domain.
0b. Reddit rejected `graphql.anilist.co` under Domain exceptions (2026-10-19). Unknown reason. No official appeal process was found. Next: read the "here" and "globally allowlisted domain" links on that page, ask the App Review team why, and re-request with a justification. Fallback options if it stays rejected: a globally allowlisted data source, or mod-entered schedules (loses automatic delay handling). The dev subreddit keeps using the fixture meanwhile.

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
- D7. `config.fixtureOnDevSubreddit` stands in for AniList until the domain is approved. It only takes effect when `context.subredditName` is `config.devSubreddit` (`pretzelflick_dev2`), so fake data can never be posted on another subreddit even if the flag is left on. Set it to `false` before release (Unit 07).
- D8. Redis history is a sorted set of JSON entries, newest 200 kept. The tracked set holds plain AniList media IDs.
- D10. `react`, `react-dom`, Tailwind and their Vite plugins stay installed although Phase 1 has no client. Unit 09 (Phase 2) needs them. Revisit if Phase 2 is dropped.
- D11. `tools/tsconfig.server.json` sets `rewriteRelativeImportExtensions` so source files can import `./x.ts`, which `node --test` requires, while `tsc --build` still passes.
- D16. History is written by core code through an injected `record` function, so tests can assert exact entries. A break that AniList does not report (a week with no episode) is not visible to the app and is not recorded.
- D15. AniList media ID = one season, so the episodes hash is `episodes:{mediaId}` with no season in the key. The `frozen` status was dropped: with a single edit to the previous thread it could never be set. `locked` is the only non-active status.
- D14. A job's payload carries the title, air time, and streaming links, so the posting job needs no AniList call. Links changed after scheduling reach the thread only if the air time also changes.
- D13. The `schedule` key is a hash (`{mediaId}:{episode}` to `{jobId, runAt}`) because Devvit Redis cannot scan string keys to cancel jobs for removed shows. Catch-up posts run `catchUpDelayMs` after the sync.
- D12. `tracked` is a Redis hash, not a set, because Devvit Redis has no set commands (Unit 02). Dedup in Unit 04 uses `hSetNX`.
- D9. Config booleans stay separate fields in the `config` hash (`autoPostEnabled`), not a JSON blob.
- Source: two council runs in the build session (project review, then the X-factor question). All claims about Devvit limits there were unverified.

## Session Notes

- 2026-10-18: Read the doc "PretzelFlick - App Overview & Technical Design". Built the first episode hash logic, then reworked the plan after the council review. Created the Devvit test app, found the domain allowlist block, and set up this spec-driven structure.
