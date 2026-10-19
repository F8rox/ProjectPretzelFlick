# AGENTS.md

Instructions for any AI coding agent working on PretzelFlick. You are writing a Devvit web application that runs on Reddit.com.

## Read First, In This Order

1. `context/project-overview.md` — what the product is, who uses it, flows, scope, and out of scope
2. `context/architecture-context.md` — stack, boundaries, Redis schema, invariants
3. `context/design.md` — thread format, hub UI, tokens
4. `context/code-standards.md` — how code is written, kept lean, and organised
5. `context/security-context.md` — security rules and the per-unit checklist
6. `context/ai-workflow-rules.md` — how to work a unit, and the definition of done
7. `context/progress-tracker.md` — current state and open questions
8. The feature spec you were asked to build in `context/featureSpecs/`

## Rules

- Build only the unit you were asked to build.
- Do not invent behavior. If something is missing or ambiguous, add it to Open Questions in `progress-tracker.md` and ask.
- Do not build anything listed under Out Of Scope in `project-overview.md`.
- Do not start Phase 2 or Phase 3 work during Phase 1.
- Write lean code: no dead code, no duplicated logic, no speculative features, no unneeded dependencies.
- Apply the security checklist to every unit.
- Never stop for a missing key or approval. Use the fallbacks and the "Inputs Needed From The User" process in `context/ai-workflow-rules.md`.
- The app posts only in response to a real release. Never post speculatively, in bulk, or on demand to non-mods.
- Never fetch a domain that is not in `devvit.json` `permissions.http.domains` and approved in Developer Settings.

## Devvit Rules (kept from the starter)

- Backend: Node.js serverless on Devvit with Hono. Access `redis`, `reddit`, and `context` from `@devvit/web/server`. Entry is `src/server/index.ts`.
- Frontend: React 19, Tailwind 4, Vite, in `src/client`, running in an iframe. Entrypoints are HTML files mapped in `devvit.json`.
- Shared code between client and server is in `src/shared`.
- Use `navigateTo` from `@devvit/web/client` instead of `window.location`. Use `showToast` or `showForm` instead of `window.alert`.
- Whenever you add an endpoint for a menu item, form, trigger, or scheduler task, add its mapping to `devvit.json`.
- Do NOT use `@devvit/public-api` or Blocks. This project is Devvit web only.
- Docs: https://developers.reddit.com/docs/llms.txt

## Commands

- `npm run test:types` (app and tests), `npm run lint`, `npm run test:unit`, `npm run build`
- `npm run dev` runs a live playtest on `r/pretzelflick_dev2`.
- `npx devvit upload` uploads a private version.

## Code Style

- Prefer type aliases over interfaces. Prefer named exports. Never cast TypeScript types.

## Lessons From ResidueLoop

- Check the repo actually runs before trusting a "complete" tracker: audit stubs, imports, and config first.
- A root `.gitignore` excludes every `.env` file. Never paste keys into chat or screenshots.
- Test third-party limits early. Here that means the Devvit domain allowlist and AniList rate limits.
- Keep one implementation per feature, and one owner per file.

## Finishing

Do not say a unit is done until every acceptance criterion in its spec has been checked and `progress-tracker.md` is updated. A criterion that needs the user's input is reported as blocked on input, never as passed. Report each criterion as passed or not, and how you checked it.
