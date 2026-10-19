# Development Workflow

## Approach

Build this project incrementally using a spec-driven workflow. Context files define what to build, how to build it, and what the current state of progress is. Always implement against these specs. Do not infer or invent behavior from scratch.

## How To Work A Unit

When told to build a unit (for example "build featureSpecs/04-thread-posting-and-dedup.md"):

1. Read `AGENTS.md`, then `project-overview.md`, `architecture-context.md`, `design.md`, `code-standards.md`, `security-context.md`, `progress-tracker.md`, and the named feature spec.
2. State the unit's scope and acceptance criteria back in a few lines before writing code.
3. Implement only that unit.
4. Run the checks (typecheck, lint, tests, build) and walk through every acceptance criterion in the spec.
5. Update `progress-tracker.md`.
6. Report which acceptance criteria passed, how each was checked, and anything left open.

## Definition Of Done

A unit is done only when all of these are true:

- Every acceptance criterion in its feature spec is met and was actually checked, not assumed. A criterion that cannot be checked without an input from the user is marked "blocked on input" and listed in `progress-tracker.md`. The unit is then "done pending input", and it is fully done only after the input arrives and that criterion passes.
- Typecheck, lint, tests, and build pass.
- No item in `project-overview.md` Out Of Scope was added.
- No invariant in `architecture-context.md` was violated.
- The security checklist in `security-context.md` passes for this unit, including at least one negative test.
- The code follows `code-standards.md`: no dead code, no duplicated logic, no unused dependencies, within the size limits.
- Anything mocked is behind a config flag and marked `MOCK:`.
- `progress-tracker.md` reflects the real state.

Do not report a unit as done if any criterion is unmet or unchecked. Say which ones and why.

A criterion is recorded as passed only with evidence: command output, a named test, or a recorded manual walk of the real flow in the playtest subreddit, written next to the criterion in `progress-tracker.md`. Statuses are never copied from earlier text.

## Scoping Rules

- Work on one feature unit or subsystem at a time.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in a single implementation step.

## When To Split Work

Split an implementation step if it combines:

- Scheduler changes and thread-format changes
- Redis schema changes and unrelated UI work
- Multiple unrelated endpoints
- Phase 1 behavior and Phase 2 behavior
- Behavior that is not clearly defined in the context files

If a change cannot be verified end to end quickly, the scope is too broad. Split it.

## Handling Missing Requirements

- Do not invent product behavior that is not defined in the context files.
- If a requirement is ambiguous, resolve it in the relevant context file before implementing.
- If a requirement is missing, add it as an open question in `progress-tracker.md` before continuing.
- If a request conflicts with Out Of Scope, stop and ask. Do not build it.

## Inputs Needed From The User

Some work needs something only the user can provide: Reddit login, playtest on the dev subreddit, domain approval, or a secret. Never stop the build for these.

1. **Record it.** Add the variable name to `.env.example` if there is one, and a row to "Inputs Needed From User" in `progress-tracker.md`.
2. **Use a fallback and keep building.**
   - AniList domain not yet approved: fixture mode behind `config.fixtureOnDevSubreddit`, marked `MOCK:`. It runs only on the dev subreddit. Unit tests always use fixtures.
   - No Reddit login or playtest available: write and unit-test the logic with fake `HashStore` and `Poster`, and mark the live checks blocked.
   - Developer Settings changes (domain approval, app description): list them under "needs human".
   - TMDB key (Phase 3): fixture responses until the key is set.
3. **Mark it.** Criteria that need the input are "blocked on input", never "passed".
4. **Ask at the right time.** At the end of each unit, give a short list: input, where to set it, and which criteria it unblocks. Give the full list in the final report.
5. **Never ask for secrets in chat.** The user sets values with the CLI or the portal and says so. Then re-run the blocked criteria first and update the tracker.

## Protected Files

Do not modify these unless a task explicitly requires it:

- Generated third-party code and `node_modules`
- The Devvit starter's build config (`vite.config.ts`, `tools/tsconfig.*.json`), except to add what a unit needs
- `LICENSE`

## Keeping Docs In Sync

Update the relevant context file whenever implementation changes:

- System architecture or boundaries
- Redis schema or key shapes
- Code conventions or standards
- Thread format or hub design
- Feature scope

Progress state must reflect the actual state of the implementation, not the intended state.

## Before Moving To The Next Unit

1. The current unit works end to end within its defined scope.
2. No invariant defined in `architecture-context.md` was violated.
3. `progress-tracker.md` reflects the completed work.
