# PretzelFlick: Handoff And Resume Guide

Written 2026-10-20 at the end of a long build session so a new chat can pick up cold. Read this first, then `context/progress-tracker.md` (the source of truth for status and evidence), then `AGENTS.md`.

## 1. What this is

PretzelFlick is a Reddit **Devvit web app** that posts a spoiler-safe discussion thread for each tracked **anime** episode at its air time. Moderators install it on a subreddit and choose shows by **AniList media ID**. It is modeled on r/anime's open-source Holo/Myuri bot, but any subreddit can install it with no hosting (Myuri is a self-hosted Django app). It is a solo student resume project. The success goal is **real installs on small and mid anime subreddits**, not features.

- Repo: `D:\pretzelflick\pretzelflick` (git, branch `main`). GitHub: `https://github.com/F8rox/ProjectPretzelFlick` (public).
- App slug: `pretzelflick`. Developer page: `https://developers.reddit.com/apps/pretzelflick`.
- Dev subreddit (private): `r/pretzelflick_dev2`. Playtest URL: `https://www.reddit.com/r/pretzelflick_dev2/?playtest=pretzelflick`. (`r/pretzelflick_dev` also exists and is unused.)
- Reddit account that owns the app: `u/YunoF8`. Logged in with the Devvit CLI (`npx devvit whoami`).
- The original design doc: `PretzelFlick - App Overview & Technical Design.docx` on the user's Desktop. It has been superseded by `context/`.

## 2. Status snapshot (2026-10-22)

- **Beta feature-complete.** 62 unit tests, types, lint and build clean. Everything below is live-verified on the dev sub except where noted.
- **Phase 1 (anime core): built, live-verified** on the dev sub with real AniList data: tracked shows and settings forms, daily sync and one scheduled job per air time, catch-up of missed episodes, two-phase dedup, thread posting, earlier-episode table, next-episode link, activity history, manual "post next episode now".
- **Phase 2 Unit 09 (in-thread ratings): built and live-verified.** Each thread is an interactive post (a card with the thread content and 1 to 5 voting) with the plain-text thread as fallback. Voting, re-vote, comments, the previous-threads table, the next-episode line, the setting off (plain text), old Reddit fallback and the phone app (reported by a friend) all checked.
- **Title search (2026-10-21):** Tracked shows form has "Add by title"; it searches AniList (airing and upcoming anime) and opens a pick form (`pickForm`, `/internal/form/pick-submit`). Live-verified. After a `devvit.json` change, restart `npm run dev` or Reddit shows the old form.
- **Competitor found:** EpisodeScheduler (23 communities, React dashboard, TVMaze/SIMKL/AniList, hub, pinning, templates; no ratings in its README). Our edge is in-thread ratings and the r/anime-style layout.
- **Not published.** `npm run launch` (publish for Reddit review) has not been run. No real subreddit has installed it yet.
- Last uploaded version: 0.0.3 (playtest builds are v0.0.3.xx). Devvit packages: 0.14.8.
- Git: see section 13 for whether the latest commits are pushed. A local branch `backup-before-rewrite` exists and can be deleted.

## 3. How to resume in a new chat

1. Read this file, `context/progress-tracker.md`, `AGENTS.md`, and the unit spec you are working on in `context/featureSpecs/`.
2. Run the checks (all should pass): `npm run test:types`, `npm run lint`, `npm run test:unit` (60 tests), `npm run build`, `npm run release:check`.
3. For live work, start the playtest in a terminal: `npm run dev` (it takes a few minutes to install). Then open the playtest URL above and refresh. App logs do not stream reliably, so use the **"PretzelFlick: recent activity"** mod menu item, which records every post, skip, delay, and failure with a reason.
4. The mod menu is the **⋯ button next to "Mod Tools"** on the subreddit page. Items: tracked shows, settings, check now, recent activity, post next episode now.

### Working agreements with the user (important)

- The workflow is **spec-driven** (copied from the user's ResidueLoop hackathon project): `AGENTS.md`, `context/` files, `context/featureSpecs/NN-*.md`, `build-prompts.md` (phased prompts plus helper prompts: re-sync, audit, bug fix, inputs added). Template: `D:\hackathon\spec-driven-template`. Each unit: Context Gate, brief, build, verify every acceptance criterion, update the tracker, commit, self-audit. Never call a unit done unless every criterion was actually checked. A criterion needing the user is "blocked on input".
- **Do not add `Co-Authored-By: Claude` trailers or any Claude attribution to commits.** The user asked for it to be removed (history was rewritten and force-pushed once).
- The user often asks for the **llm-council** skill on big decisions: five Opus agents answer, five blind-review and rank, then synthesize. The user decides; the council advises. Past council verdicts are in section 6.
- The **ponytail** skill is active (lazy senior dev: smallest change, end replies with what was skipped and the main risk).
- Ask before outward-facing or hard-to-reverse actions: pushing, force-pushing, uploading/publishing, messaging, posting. The auto-mode safety classifier **blocked a force-push** until the user ran it themselves. Do not try to work around a block.
- Never ask for or store secrets. Do not put the user's email or personal data in public files (the legal documents contain a contact email the user explicitly chose).
- Shell notes (Windows): the Bash tool is Git Bash, and big heredocs with mixed quotes sometimes fail to parse, so write files with the Write tool and run Python edit scripts from files. Run Python edits as small scripts; Git warnings about CRLF are harmless.

## 4. How the app works

1. A mod adds an **AniList media ID** (the number in `anilist.co/anime/<id>`) in "tracked shows". There is no title search.
2. Once a day at 04:00 UTC, and whenever a show is added or "check now" is clicked, `reconcile` asks AniList which episodes air from 24 hours ago to 48 hours ahead for the tracked IDs, and keeps **one scheduled job per upcoming episode** (moved if AniList changes the time, cancelled if it disappears). An episode that aired within 24 hours with no thread is queued for catch-up about a minute later.
3. When the job fires, `postEpisode` posts the thread once (two-phase dedup with a `pending` marker and recovery by title). It builds the Phase 1 Markdown body, and if "Interactive ratings in threads" is on it creates an **interactive custom post** whose `textFallback` is that Markdown. If creating it throws, it posts the plain-text thread and records a `failed` history entry.
4. The previous plain-text thread gets a "Next episode" line (the only older post ever edited). Interactive threads read the next link live from Redis instead.
5. Everything that happens is written to the history (posted, skipped, delayed, failed).
6. Timing relies on **AniList's air-time timestamp** (Japan release time). It never checks that an episode actually released on a stream. The mod "wait after air time" setting (0 to 60 minutes) is the only mitigation.

## 5. Code map

```
src/server/core/    rules (pure, take injected stores so they are unit-testable)
  anilist.ts        AniList client, response validation, fixture (dev sub only)
  schedule.ts       reconcile: makePlan, prune, scheduleWanted, queueLate
  post.ts           renderTitle/renderBody, postEpisode, runPostJob, findNextUnposted
  episodes.ts       link window, episodes:{mediaId} hash, linkPrevious
  thread.ts         saveThread/loadThread/buildThreadView (what the card shows)
  rating.ts         castVote, getSummary, parseScore
  history.ts        record (never throws), recent, describeEntry
  settings.ts       autoPostEnabled, interactiveThreads, postDelayMinutes
  tracked.ts        add/remove/list tracked IDs (a Redis hash)
  streams.ts        visibleStreams (drops blocked hosts)
  job-data.ts, parse.ts, keys.ts, config.ts, types.ts
src/server/routes/  thin Hono routes: menu.ts, forms.ts, scheduler.ts, api.ts, sync.ts, poster.ts (Devvit-backed Poster)
src/client/         thread.tsx/.html/.css (the interactive card), module.d.ts
src/shared/         thread-view.ts (types shared by client and server)
devvit.json         permissions, menu items, forms, scheduler tasks, post entrypoint (thread.html, height regular)
scripts/release-check.mjs   blocks `npm run launch` while config.fixtureOnDevSubreddit is true
legal/              privacy-policy.md, terms-and-conditions.md (required by Reddit for apps that use fetch)
context/            project-overview, architecture-context, design, code-standards, security-context, ai-workflow-rules, progress-tracker, featureSpecs/
```

Redis keys (per install): `config`, `tracked`, `schedule`, `history` (sorted set), `posted:{mediaId}:{episode}`, `episodes:{mediaId}`, `thread:{postId}`, `ratings:{postId}`, `ratingstats:{postId}`.

Key tunables are in `src/server/core/config.ts` (lateness limit 24h, horizon 48h, link window 50, history 200, min votes for average 5, blocked stream hosts, `fixtureOnDevSubreddit`).

## 6. Decisions and council verdicts

- **Anime only in Phase 1**, AniList only (no API key). TMDB/TV/movies are Phase 3 and need a Reddit domain approval.
- One job per air time plus a daily resync (not polling). Two-phase dedup. One edit to the previous thread instead of editing up to 50 old threads.
- A per-mod TMDB key was dropped (friction). A React mod panel was deferred (Devvit forms are enough).
- The fixture (fake AniList data) can **only run on `pretzelflick_dev2`** and is now **off** (`fixtureOnDevSubreddit: false`).
- **Rage-bait "controversial statement" per thread: rejected** (5 of 5). Reasons: threads post at air time before anyone has seen the episode, so any claim is generic or a spoiler; it costs mods work; policy and community risk. The salvageable idea: an optional, mod-written, neutral discussion prompt (not built).
- **"Just another Auto Lovepon" worry:** the real differentiator is distribution (any sub can install it), plus the visible in-thread ratings.
- **Ratings go inside every thread (option A), 5 of 5**, after a spike proved the pieces. Conditions that were adopted: plain-text fallback on failure, a mod setting, one data source, validate every write, hide the average below 5 votes, show the count. A separate Season Hub was dropped.
- Costs accepted for A: on new Reddit the thread content lives inside the card, so mods can't hand-edit the body; old Reddit and third-party apps get static fallback text and cannot vote.

## 7. Facts learned the hard way

- **Same-show jobs must be staggered.** Catch-up jobs (and episodes airing at the same moment) used to share one run time, ran concurrently, and each read the episode list before the others saved theirs, so tables and next links were empty. Fixed with `config.sameShowStaggerMs` (20 s) in `schedule.ts`, in episode order. Live-verified with I'm Dating a Dark Summoner (208025).
- The app only looks back `latenessLimitHours` (24) for missed episodes. To test two-episode behaviour with a weekly show, temporarily raise it (to 240) in `config.ts`, then set it back. Do not commit the change.
- A dev playtest that is not running means Reddit shows the last installed version. If a new form or field is missing, restart `npm run dev` (port 5678 in use means one is already running).
- Reddit's developer site is blocked in the built-in browser. Check the Devvit app directory by hand.

- **Devvit Redis has no set commands and no `hExists`.** Use hashes (`hSetNX`, `hGet`, `hKeys`).
- **Domain approval needs Terms and Conditions and a Privacy Policy links** saved in Developer Settings. The first request was rejected until they were added; then it was approved. `graphql.anilist.co` is approved. Each domain needs its own request.
- Custom posts: the new Reddit feed shows only the web view, not the post text. The server sees the viewer (`context.userId`) and post (`context.postId`). Comments work natively. Old Reddit shows the `textFallback` plus its own "view the full post" link. Entrypoint heights are `short`, `regular`, `tall` (default tall).
- **Reddit's spam filter removes posts that link to banned domains.** `iqiyi.com` removed a live thread ("Banned Domain"). `iq.com` and `bilibili.tv` were fine. Removed posts do not show in the feed. Blocked hosts live in `config.blockedStreamHosts` (YouTube, iQIYI).
- Forms and handlers reply HTTP 200 with a short toast, because Reddit shows its own generic error for non-2xx.
- Adding a show that is already tracked does nothing (no sync). Use "check now".
- Adding a show runs a sync, which queues catch-up posts, so "check now" right after reports 0 queued (this is correct).
- Windows: `npm run lint` needs the double-quoted glob (already in `package.json`).
- The Myuri source (reference only, do not copy): per-service scanners (Crunchyroll via an undocumented internal API, YouTube, torrent trackers). We decided not to use Crunchyroll's internal API.

## 8. Live-verified (with evidence in the tracker)

Menus and forms; real AniList fetch and the daily 04:00 sync; scheduled and catch-up posting; dedup; earlier-episode table and "Next episode" edit; history box; manual post ignoring auto-post; the Devvit 0.14.8 upgrade; interactive custom post renders, voting works, native comments work (spike), old Reddit fallback (spike); the new card layout renders with the vote saved.

## 9. Still to verify live (Unit 09 and release)

1. Third-party Reddit apps (not tested). The phone app was only reported by a friend.
2. Banned-domain removals on stream hosts not yet seen. OceanVeil, Bilibili, Netflix, Crunchyroll, HIDIVE stayed in the feed. Still watch `v.qq.com`, `wetv.vip`.
3. A real sub with real traffic (nothing published yet).
4. Edgerunners 2 threads were posted before the stagger fix, so their tables and next links are empty (expected).

## 10. Next steps, in priority order

1. Push to GitHub (user approves), then publish with `npm run launch` (user's call).
2. **Optional hardening:** detect a removed post right after creating it, delete it, repost without streaming links, and record it in the history. Unverified how Reddit reports the removal, so check live first.
3. **Publish:** `npm run launch` (runs `release:check`, `deploy`, then `devvit publish`). This sends the app to Reddit for review, so it is the user's call. Fill in the app description in Developer Settings first.
4. **Get installs:** DM mods of 10 to 15 small anime subs that show currently airing shows (offer to set it up). The council said this is the biggest risk: building more before anyone installs. Offer to draft the pitch.
5. **Idea (Phase 3, not decided):** a community reaction digest, an AI summary of the thread's comments posted about 24 h after air. Needs an LLM host approved by Reddit, an API key, per-sub caps, a mod toggle (off by default) and a privacy policy update. Do not use AI for episode synopses (it invents plot).
5a. Small improvements, all optional: skip catch-up queuing while auto-post is off (it records repeated "auto-post is off" entries on every sync); raise the wait setting past 60 minutes (global releases lag Japan by 1 to 2 hours); best-effort refresh of the old-Reddit fallback text so older interactive threads get the "Next episode" line; a mod-written neutral discussion prompt.
5b. **Parked, held on purpose:** release verification against streaming services (post only when the episode is actually on the stream; needs a public feed per service and a Reddit domain approval each; avoid undocumented APIs); Phase 3 TMDB for TV and movies and a React mod panel.

## 11. Known risks

- Threads post at AniList's Japan air time, not when a stream actually releases. A delay AniList has not recorded will post early.
- Banned-domain removals can hide a thread silently (see section 7).
- On new Reddit the thread content now lives inside the card. If the card fails to load, readers lose the streams and spoiler reminder. The setting and automatic fallback cover creation failures, not rendering failures.
- Phone and third-party rendering are unverified.
- A re-vote is read-then-write, so two simultaneous votes from one user could miscount (marked `shortcut:` in `rating.ts`). Two posting jobs racing for one episode could both post (marked in `post.ts`).
- Unverified Devvit limits: scheduler jobs per install, job run time, behavior of AutoModerator and search on custom posts.
- `npm audit`: runtime dependencies are clean. The remaining dev-only findings are in the Devvit CLI chain.

## 12. Commands

```
npm run test:types      type-check the app and the tests
npm run lint
npm run test:unit       60 tests
npm run build
npm run release:check   fails while the fixture flag is on
npm run dev             live playtest on r/pretzelflick_dev2
npm run deploy          checks, then uploads a private version
npm run launch          release:check + deploy + publish for review (user's call)
npx devvit whoami / npm run login
```

## 13. Recent commits (newest first)

`b240b6c`/`fa90393` title search; `57ff89b` stagger same-show jobs; `3bdc08d` handoff and CLAUDE.md; `d046c21` drop iqiyi.com links; `784d0ef` card mirrors the text layout; `2a81ca3` pending marker no longer blocks catch-up; `ffa5d66` interactive threads with in-thread voting; `2a0d64f` Unit 08 decision and Unit 09 spec; `297f442` spike; `fb4356d` manual post ignores auto-post, taller history box; `1a462e6` drop YouTube links; `55371f6` Devvit 0.14.8; `483e320` fixture off after domain approval; earlier Phase 1 commits back to the initial starter.
