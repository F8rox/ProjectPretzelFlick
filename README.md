# PretzelFlick

A Reddit app built on [Devvit](https://developers.reddit.com/) that posts a spoiler-safe discussion thread for each tracked anime episode when it airs. Moderators install it on their subreddit and choose which shows to track. It is modeled on the r/anime Holo and Myuri bots, made installable by any subreddit with no hosting.

> Status: in development. It runs on a test subreddit only. It is not published, and the AniList request below is still waiting for Reddit's approval.

## What it does

- Reads airing times from [AniList](https://anilist.co) once a day and schedules one job per upcoming episode, so threads go up at the air time instead of on a polling delay.
- Posts one thread per episode, never twice, even after a crash or a repeated job.
- Each thread has a spoiler-safe title (`Show - Episode N discussion`), the air time, official streaming links from AniList, a discussion reminder, and a table of earlier episode threads (up to 50 links, sliding by 25).
- Adds a "Next episode" link to the immediately previous thread. Older threads are not edited.
- Handles delays: when AniList moves an episode, its job moves, and the change appears in the activity list.

## For moderators

Open the subreddit's mod menu. The app adds these items:

| Item | What it does |
| ---- | ------------ |
| PretzelFlick: tracked shows | Add a show by AniList media ID (the number in `anilist.co/anime/<id>`) or stop tracking one |
| PretzelFlick: settings | Turn automatic posting on or off, and wait 0 to 60 minutes after air time |
| PretzelFlick: check now | Sync with AniList immediately |
| PretzelFlick: recent activity | Newest 20 posts, skips, delays, and failures with reasons |
| PretzelFlick: post next episode now | Post the earliest aired episode that has no thread yet |

The app posts only for a real, already aired episode of a show you track. It never posts on request from non-mods.

## Known limits

- Anime only, through AniList. TV and movies are planned for a later phase.
- It can only report what AniList shows. A break week that AniList does not list is not recorded.
- Two jobs for the same episode running at the same moment could in theory both post. This is a known shortcut noted in `src/server/core/post.ts`.
- Streaming links come from AniList and are per show, not per episode.

## Fetch Domains

- `graphql.anilist.co`: AniList's public GraphQL API. Used to read anime airing schedules (episode numbers, air times, and official streaming links) so the app can post discussion threads when an episode airs. Read-only, no user data sent.

## Development

Requires Node 24 and a Reddit developer account.

```bash
npm install
npm run login          # log in to Reddit's developer tools
npm run dev            # live playtest on r/pretzelflick_dev2
npm run test:types     # type-check the app and the tests
npm run lint
npm run test:unit
npm run build
npx devvit upload      # upload a private version
```

Until the AniList domain is approved, the dev subreddit uses fake fixture data (`config.fixtureOnDevSubreddit` in `src/server/core/config.ts`). The fixture never runs on any other subreddit. Set it to `false` once the domain is approved.

## Project layout

```
src/server/core/      rules: AniList client, scheduling, posting, links, history, settings
src/server/routes/    thin Hono routes for menu items, forms, and scheduler tasks
devvit.json           permissions, menu items, forms, scheduler tasks
context/              specs: overview, architecture, standards, security, feature specs, progress
build-prompts.md      the phased build prompts
```

The specs in [`context/`](context/) are the source of truth for behavior. Start with `context/project-overview.md` and `context/progress-tracker.md`.

## License

BSD-3-Clause
