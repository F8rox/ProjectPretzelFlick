Read the 'AGENTS.md' before starting

# Unit 01: Foundation Cleanup

## Goal

Turn the Devvit starter plus the week-1 test app into a clean base: only what PretzelFlick needs, with shared config and key helpers in place.

## Depends On

None.

## Build

- Remove starter leftovers that PretzelFlick does not use: the counter API (`src/server/routes/api.ts` and its client hook and shared types), the example form and its menu item, and the "Create a new post" menu item and `onAppInstall` post creation. Keep `src/client` only if a later unit needs it; otherwise delete the unused files and their `devvit.json` entries.
- Add `src/server/core/config.ts` with the tunable numbers: window size, lateness limit, history length, posts-per-run cap, minimum votes (Phase 2).
- Add `src/server/core/keys.ts` with one function per Redis key from `architecture-context.md`.
- Keep the "test airing post" menu item and the `airing-check` scheduler task, each marked `MOCK:` in a comment, until Unit 04 replaces them.
- Keep the fixture flag (`config.fixtureOnDevSubreddit`) and record it in the tracker.
- Make sure `npm run test:unit` runs from a clean checkout.

## Not In This Unit

Tracked shows, real scheduling, the thread template, any Redis writes beyond the key helpers.

## Acceptance Criteria

- [ ] `npm run test:types`, ESLint, `npm run test:unit`, and `npm run build` pass.
- [ ] No starter code remains that nothing references (counter API, example form, unused entrypoints).
- [ ] Every Redis key in `architecture-context.md` has one helper in `keys.ts`, with a test that checks its string output.
- [ ] No tunable number is a literal outside `config.ts`.
- [ ] `devvit.json` only lists endpoints that exist, and every route is registered.
- [ ] `.gitignore` excludes `.env` files and `.env.example` has names only.

## Verify

Run the four commands, search the source for unused files and literals, and run `npm run dev` on the test subreddit to confirm the menu items still appear.
