Read the 'AGENTS.md' before starting

# Unit 07: Hardening And Release

## Goal

The Phase 1 app is safe, documented, and uploaded for Reddit review, then installed on a real subreddit.

## Depends On

Units 01 to 06.

## Build

- Run the security checklist in `security-context.md` over every route, menu item, and fetch. Fix defects only.
- Confirm `config.fixtureOnDevSubreddit` is `false` and no `MOCK:` item remains in the production path.
- Rewrite `README.md`: what the app does, install and settings steps for mods, commands, folder layout, the Fetch Domains section, and a link to `context/`.
- Set the app name, description, and listing details in Developer Settings (list this under "needs human").
- Run `npm audit` and record the result. Run a secret scan.
- Upload the app (`npx devvit upload`) and submit it for Reddit review, then record the review state.
- Install on 1 to 3 real subreddits with mod permission and record what happens for a full week of episodes.

## Not In This Unit

New features, Phase 2, Phase 3.

## Acceptance Criteria

- [ ] Every item on the security checklist passes with evidence, including negative tests.
- [ ] No hardcoded fixture or `MOCK:` code is active in production.
- [ ] `README.md` is accurate for a mod installing the app.
- [ ] `npm audit` and the secret scan are recorded and clean, or each finding is explained.
- [ ] The app is uploaded and submitted for review. Blocked on input until approval for the domain and review.
- [ ] Phase 1 success criteria 1 to 9 are each checked with evidence in the tracker.

## Verify

Walk the whole mod flow on the test subreddit, then on a real one. Search the repo for secrets and unused code.
