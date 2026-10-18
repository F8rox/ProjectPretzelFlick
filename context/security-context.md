# Security Context

Security rules for every unit. They are requirements, not suggestions. Apply the checklist at the end to every unit before calling it done.

## Threats Covered

| Threat                                              | Where it is handled          |
| --------------------------------------------------- | ---------------------------- |
| Spam or abuse of Reddit posting                     | Posting Rules                |
| Unauthorized use of mod-only actions                | Authorization                |
| Calls to unapproved or user-supplied hosts (SSRF)   | Outbound Calls               |
| Bad or malicious third-party data                   | Outbound Calls               |
| Secret leakage                                      | Data Protection              |
| Vote stuffing and rating manipulation (Phase 2)     | Ratings                      |
| Vulnerable or malicious dependencies                | Supply Chain                 |

## Posting Rules

- The app posts only for a real episode returned by AniList, and only once per episode per install.
- No code path posts on request from a non-mod, in bulk, or to another subreddit.
- A global limit caps posts per sync run (config value) so a data error cannot flood the subreddit.
- If AniList returns data that fails validation, the run stops and writes a failure to the history. It never guesses.
- Posts follow Reddit's content policy. The app account is clearly an app (Devvit marks it).
- Never post, edit, or link anything that hosts or embeds unauthorized media.

## Authorization

- Every menu item that changes state has `forUserType: "moderator"` in `devvit.json`.
- Endpoints under `/internal` are registered only for platform use. Do not accept user-controlled identity from request bodies: identity comes from Devvit `context`.
- Deny by default: a route without an explicit reason to be public is mod-only.

## Outbound Calls

- Fetches go through one client in `core/anilist.ts` that calls only `graphql.anilist.co`. Phase 3 adds `api.themoviedb.org` the same way.
- The server never fetches a user-supplied URL.
- Every response is validated against an expected shape before use. Timeouts on every call. No following redirects to other hosts.
- New domains are added to `devvit.json` deliberately, listed in the README "Fetch Domains" section, and approved in Developer Settings before use.

## Data Protection

- Secrets (Phase 3 TMDB key) are Devvit app-scope secrets set with the CLI. Never in the repo, in `devvit.json`, in chat, or in logs.
- Store only what the product needs. Phase 1 stores no user data beyond what Devvit gives the install. Phase 2 stores a vote as `userId -> score` and nothing else.
- Logs do not contain secrets or user identifiers.
- A root `.gitignore` excludes every `.env` file. `.env.example` has names only.

## Ratings (Phase 2)

- One vote per user per episode. A re-vote overwrites.
- Scores are validated as integers 1 to 5. Anything else is rejected.
- Only aired episodes can be rated. The server checks the air time, not the client.
- Averages are hidden below the minimum vote count, and counts are always shown.
- A mod action can reset an episode's ratings.

## Supply Chain

- Pin versions and commit the lockfile. Add a dependency only when it removes more code than it adds.
- Run `npm audit` before each release and record the result.

## Per-Unit Checklist

1. Does any new route change state? It is mod-only or has a written reason.
2. Does any new fetch go to a domain that is in `devvit.json` and approved?
3. Is every external value validated before use?
4. Can the new code post twice for the same episode? Is there a test?
5. Is any secret, key, or user identifier written to code, config, or logs?
6. Is there at least one negative test (duplicate run, invalid data, non-mod)?
7. Does anything new appear in the Out Of Scope list in `project-overview.md`?
