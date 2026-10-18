# Architecture Context

## Stack

| Layer          | Technology                               | Role                                                              |
| -------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| Platform       | Devvit web (`@devvit/web` 0.14.x)        | Hosting, scheduler, Redis, Reddit client, app review              |
| Server         | Node.js serverless, Hono                 | Endpoints for menu items, forms, triggers, scheduler tasks        |
| Client         | React 19, Tailwind 4, Vite               | Season Hub web view (Phase 2); settings UI only if forms are not enough |
| Storage        | Devvit Redis, scoped per installation    | Config, tracked shows, dedup records, episode index, history      |
| Scheduler      | Devvit scheduler (cron and one-off jobs) | Daily sync, one job per air time                                  |
| Data source    | AniList GraphQL (`graphql.anilist.co`)   | Airing schedules. Public, no key. Needs domain approval           |
| Data source 2  | TMDB (Phase 3)                           | TV and movies. One app-level secret, not per-mod                  |
| Tests          | `node --test` with type stripping        | Pure logic with fake Redis and Reddit                             |

## System Boundaries

- `src/server/routes` — thin Hono routes: menu, forms, triggers, scheduler. They parse input and call one function in `core`.
- `src/server/core` — all rules: AniList client, scheduling, dedup, thread rendering, episode links, history. No Hono types here.
- `src/server/core` talks to Redis and Reddit only through small types (`HashStore`, `Poster`) so rules can be unit tested without Devvit.
- `src/client` — React web views. Phase 2 only: Season Hub.
- `src/shared` — types shared by client and server.
- `devvit.json` — the only place endpoints, permissions, menu items, scheduler tasks, and domains are registered.
- `context` — specs. They are the source of truth for behavior.

## Storage Model

All keys live inside one subreddit's isolated install. Devvit scopes Redis per installation, so no subreddit prefix is used and cross-subreddit linking is impossible.

| Key                                    | Type       | Shape                                                                  | Purpose                                      |
| -------------------------------------- | ---------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| `config`                               | Hash       | `autoPostEnabled`, `postDelayMinutes`                                  | Per-install settings read by every job       |
| `tracked`                              | Set        | AniList media IDs as strings                                           | Shows this install tracks                    |
| `posted:{mediaId}:{episode}`           | Hash       | `state` (pending or posted), `postId`, `permalink`, `at`               | Two-phase dedup, episode to thread lookup    |
| `series:{mediaId}:season:{s}:episodes` | Hash       | field = episode, value = `{postId, permalink, postedAt, status}`       | Earlier-episode table, 50-link window        |
| `schedule:{mediaId}:{episode}`         | String     | scheduler job id                                                       | Cancel and recreate when an air time moves   |
| `history`                              | Sorted set | score = timestamp, member = JSON `{type, mediaId, episode, reason}`    | Mod-visible activity, newest 200 kept        |
| `rating:{mediaId}:{episode}` (Phase 2) | Hash       | field = userId, value = score 1 to 5                                   | One vote per user, re-votes overwrite        |

The `status` on an episode entry is `active`, `frozen` (outside the current window), or `locked` (an edit failed, most likely because the thread is archived).

## Link Window

Each thread links to episodes in a window computed from its own episode number, never stored: `start = max(1, 25 * floor(ep / 25) - 25)`, `end = start === 1 ? 50 : start + 50`. Episodes outside the window are left alone.

## Scheduling Model

- A daily cron task reads AniList for each tracked show and reconciles jobs: create a job for each upcoming episode, move a job whose air time changed, cancel a job for an episode that was removed.
- One job per air time runs at `airingAt + postDelayMinutes`. Jobs are idempotent.
- A missed job is caught by the daily sync, which posts any episode that aired and has no `posted` record, within a configurable lateness limit.

## Dedup Model (two-phase)

1. Set `posted:{mediaId}:{episode}` to `pending` only if it does not exist. If it already exists, stop.
2. Submit the post.
3. Write `posted` with the post id and permalink.
4. If the app crashes between steps 2 and 3, a later run finds `pending` with no post id. It searches the subreddit's recent posts for the exact title before posting again.

## Invariants

1. The app posts only for a real episode from AniList, never speculatively.
2. An episode is posted at most once per install. Dedup is checked before every post.
3. Only the immediately previous episode's thread is edited. A failed edit sets `locked` and is never retried.
4. Core logic has no network or Redis calls except through its injected types.
5. Outbound fetches go only to domains approved for this app.
6. Tunable numbers (window size, lateness limit, history length, minimum votes) live in one config module.
7. No secret appears in the repo or in logs.
8. (Phase 2) A rating chart never shows episodes beyond the current thread's number.
9. (Phase 2) One vote per user per episode. The average is hidden below the minimum vote count.
