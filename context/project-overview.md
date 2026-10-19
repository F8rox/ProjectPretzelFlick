# PretzelFlick

## Overview

PretzelFlick is a Reddit app built on Devvit. A moderator installs it on a subreddit and chooses which anime to track. When a tracked episode airs, the app posts a spoiler-safe discussion thread at the real air time, with the episode details, official links, and a table of earlier episode threads. It handles delays and breaks on its own. A later phase adds a live "Season Hub" post with per-episode community ratings. It is modeled on r/anime's open-source Holo/Myuri bot, made installable by any subreddit with no hosting.

## Origin And Constraints

- Solo student resume project. Target is 150-240 hours. No hard deadline: pace by phase.
- The real goal is installs on 2-3 real small or mid anime subreddits, not features.
- Reddit no longer issues new classic API keys, so Devvit is the only route. Outbound fetches work only for Reddit-approved domains.
- Council decisions (see `progress-tracker.md` Architecture Decisions) shaped this scope: anime-only first, one scheduled job per air time, two-phase dedup, one edit instead of a 50-thread backfill, ratings built only after the core is reliable.

## Goals

1. Post one discussion thread per tracked anime episode, at the AniList air time, exactly once.
2. Keep posting correct through delays, breaks, missed jobs, and API outages.
3. Make each thread useful: spoiler-safe title, episode details, official links, earlier-episode table, discussion rules.
4. Let mods choose what to track and see what the app did and why.
5. (Phase 2) Give each show a live Season Hub with per-episode community ratings and a season score chart.
6. (Phase 3) Cover TV and movies through TMDB, and add a fuller mod panel.

## Phases

| Phase | Name                 | Contents                                                                                                                                       |
| ----- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Anime core           | AniList client, scheduled posting, dedup, thread format, earlier-episode table, one "next" edit, settings form, history, hardening, release    |
| 2     | Season Hub ratings   | A 2-hour spike, then the hub post with per-episode ratings and the season chart                                                                |
| 3     | TV, movies, panel    | TMDB TV at a mod-set local time, movies, a React mod panel (not prompted until Phase 2 is done)                                                |

Work on Phase 1 only until its success criteria pass. Phase 2 and 3 items are not built early.

## Core User Flow

1. A mod installs the app on their subreddit.
2. The mod opens the tracked-shows form and adds the anime to track, by AniList ID.
3. Each day the app reads AniList airing schedules for tracked shows and schedules one job per upcoming episode.
4. At air time the job posts a thread, records it, and edits only the previous episode's thread to add a "next episode" link.
5. If an episode is delayed, the daily sync moves its job. If a week is skipped, the history shows why.
6. The mod can open the history to see what was posted, skipped, or failed.

## Mod Flow

1. Install the app. Open the subreddit's app menu.
2. Open "Tracked shows" and add or remove a show. Result: the show appears in the tracked list and its next episodes are scheduled.
3. Set the posting options in app settings: posting delay in minutes after air time, and whether threads are posted automatically.
4. Open "Recent activity". Result: a list of posted, skipped, and failed items with reasons.
5. Run "Check now" to trigger a sync on demand.

## Features

### Phase 1

- Tracked shows kept per install in Redis, managed through a Devvit form.
- AniList client behind one function, with a fixture mode used until the domain is approved.
- Daily sync plus one scheduled job per air time, rescheduled when AniList changes the time.
- Two-phase dedup so an episode is never posted twice, even after a crash.
- Thread format with a spoiler-safe title, details, official links, an earlier-episode table (50-link window), and discussion rules.
- One edit on the previous thread to add the "next episode" link. A failed edit is recorded and never retried.
- Activity history and clear failure messages for mods.

### Phase 2

- A Season Hub custom post per show per season: episode list, air times, countdown, and a one-tap rating per aired episode.
- A season score chart. Averages are hidden below a minimum vote count.

## Scope

### In Scope

- Anime only, through AniList
- Mod settings and tracked shows
- Scheduled posting, dedup, the earlier-episode table, the next-episode edit
- Activity history and failure handling
- Security hardening and Reddit app review submission
- (Phase 2) Season Hub ratings

### Out Of Scope

- TV and movies in Phase 1 (TMDB is Phase 3)
- Editing many old threads to backfill links (only the immediately previous thread is edited)
- A full React mod panel in Phase 1
- Per-mod API keys
- Posting anything not tied to a real release, or posting on demand for non-mods
- Hosting, downloading, embedding, or linking unauthorized media
- Any outbound domain other than the approved ones
- Moderation actions on user comments
- Any claim of exact airing precision beyond what AniList provides
- Billing, accounts outside Reddit, and mobile-native apps

## Success Criteria

1. A mod can install the app and add a tracked show from the form.
2. A tracked episode produces exactly one thread, at its air time within one scheduler interval.
3. Running the same job twice, or crashing between submit and record, never produces a second thread.
4. A delayed episode moves its scheduled job, and delays, episodes AniList drops, skips, and failures appear in the activity history. A break the app cannot see in AniList's data is not reported.
5. Each thread shows the earlier-episode table within the 50-link window, and the previous thread gains one "next" link.
6. A failed edit on an archived thread is recorded as locked and does not stop new posts.
7. The activity history shows posted, skipped, and failed items with reasons.
8. The security checklist passes and the Fetch Domains request is approved.
9. The app is installed and has posted real threads on at least one real subreddit.
10. (Phase 2) A user can rate an aired episode once, change the rating, and see the season chart with vote counts.
