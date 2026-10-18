# Code Standards

Write the least code that meets the acceptance criteria, in the place where a reader would look for it. Security rules are in `security-context.md` and apply on top of this file.

## Lean Code

- Build only what the current unit's acceptance criteria require. No speculative features, options, or extension points.
- No dead code, unused imports, unused parameters, unused exports, or commented-out code. Delete it.
- No `TODO` in code. If something is deferred, add it to `progress-tracker.md`. A shortcut with a known limit gets one comment: `shortcut: <the limit>, <when to upgrade>`.
- Prefer the platform or an installed dependency over custom code. Add a dependency only when it removes more code than it adds. Pin versions and commit the lockfile.
- Prefer pure functions, small modules, early returns, and immutable data. Avoid classes.
- Limits: function 40 lines, React component 150 lines, file 300 lines, 4 parameters (use an object beyond that), 3 levels of nesting.
- Comments explain why, never what.

## No Repetition (DRY)

- Single source of truth. Define each status value and threshold once.
- Tunable numbers (window size, lateness limit, history length, minimum votes) live in one `config.ts` in `src/server/core`, never as literals.
- Rule of three: duplication twice is tolerated. On the third use, extract it. Never copy more than 5 lines.
- One shared module per concern: one AniList client, one Redis key builder, one thread renderer.
- Do not create a helper that is used once.

## Naming And Style

- Intention-revealing names. Functions are verbs, booleans start with `is`, `has`, `can`, or `should`.
- Files are `kebab-case.ts`, React components `PascalCase.tsx`.
- No circular imports. No `../../..` chains: use the aliases already in `tsconfig`.
- Formatting is automatic: Prettier and ESLint. Do not hand-format.
- Conventional Commit messages (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`). One logical change per commit.

## TypeScript

- Strict mode throughout. Prefer type aliases over interfaces. Prefer named exports over default exports.
- Never cast types. Avoid `any` and non-null assertions (`!`). Narrow `unknown` instead.
- Validate every external value (AniList responses, form input, request bodies) at the boundary before trusting it. A response that does not match the expected shape is a failure, not a guess.
- Exhaustive `switch` on unions with a `never` check.

## Devvit And Hono

- Routes are thin: parse input, call one function in `core`, return the response shape Devvit expects. No business rules in routes.
- Core functions take their dependencies (`HashStore`, `Poster`, a clock, the AniList client) as arguments so tests can fake them.
- Every endpoint for a menu item, form, trigger, or scheduler task is registered in `devvit.json`.
- A route that fails returns a response with a human-readable message. Reddit shows a generic "Something went wrong" for non-2xx, so mod-facing failures return 200 with a toast message and are also written to the history.
- Scheduler jobs are idempotent: running the same job twice produces the same result.
- No module-level mutable state. Serverless instances do not share memory. All state is in Redis.

## React (Phase 2)

- Function components only. Data comes from the server through one fetch helper. Handle loading, empty, and error states.
- Every interactive element has a visible label or an `aria-label` and works from the keyboard.
- Tokens only. No inline `style` props and no `dangerouslySetInnerHTML`.

## Testing

- Pure logic (window, rendering, dedup, reconcile) has unit tests using `node --test` with fake stores.
- Each unit has at least one negative test (duplicate run, bad input, failed edit).
- Test files end in `.test.ts`, are excluded from the server type-build and ESLint, and run with `npm run test:unit`.

## Folder Layout

```
src/
  server/
    index.ts              Hono app entry
    routes/               menu.ts, forms.ts, triggers.ts, scheduler.ts, api.ts
    core/                 config.ts, anilist.ts, episodes.ts, schedule.ts, post.ts, history.ts, keys.ts
  client/                 Phase 2 web views
  shared/                 types shared by client and server
context/                  specs (this folder)
devvit.json               permissions, menu, forms, triggers, scheduler, settings
```

Files outside this tree need a reason recorded in `progress-tracker.md`.

## Tooling

- `npm run test:types`, `npx eslint "src/**/*.{ts,tsx}"`, `npm run test:unit`, `npm run build`.
- Pre-commit scans for secrets (gitleaks) once the repo has a CI file.
