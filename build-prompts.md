# PretzelFlick Build Prompts

Four build prompts in two phases, plus four helper prompts. Each build prompt makes the agent re-read the context folder before it starts and again before every unit, so the rules stay in force for the whole build.

| Prompt | Covers                                              | Feature specs | Notes                                            |
| ------ | --------------------------------------------------- | ------------- | ------------------------------------------------ |
| 1A     | Foundation cleanup, tracked shows, AniList and scheduling | 01, 02, 03 | Live AniList fetch waits for domain approval     |
| 1B     | Thread posting and dedup, episode links, history    | 04, 05, 06    |                                                  |
| 1C     | Hardening and release                               | 07            | Needs your Reddit account for upload and review  |
| 2A     | Season Hub spike, then ratings and season chart     | 08, 09        | Only after Phase 1 passes. Stop after Unit 08 for the decision |

Phase 3 (TMDB TV and movies, React mod panel) is not prompted. It is out of scope until Phase 2 is done.

## How To Use

1. `AGENTS.md` and `context/` are at the repository root (`D:\pretzelflick\pretzelflick`).
2. Do the pre-flight below.
3. Open a new agent conversation for each prompt and paste it.
4. Read the agent's plan. Approve it only if it lists every unit in the prompt and a Context Gate before each one. If not, reply: "Revise the plan to include every unit and a Context Gate before each."
5. When the agent finishes, read its final report. Then run the Audit prompt (helper B) before the next prompt.
6. If the agent drifts or stops mid-way, paste the Re-sync prompt (helper A).
7. You do not need every input up front. The agent keeps building with fixtures, marks affected checks "blocked on input", and asks at the end of each unit and in its final report. Never paste a secret in chat. When inputs are in, use the Inputs Added prompt (helper D).

## Inputs The Agent Will Ask For

None of these block the build. The same list lives in `progress-tracker.md` under "Inputs Needed From User".

- Reddit login for the Devvit CLI (`npm run login`, you do this in the browser).
- Run `npm run dev` on `r/pretzelflick_dev2` when a unit needs a live check.
- AniList domain approval, shown in Developer Settings under Domain exceptions.
- A real subreddit and mod permission to install (Unit 07).
- Phase 3 only: a TMDB key, set as an app secret with the CLI.

---

## Prompt 1A: Foundation Cleanup, Tracked Shows, AniList And Scheduling

```text
ROLE
You are a senior engineer building PretzelFlick, a Devvit web app, one reviewed unit at a time. The repository's AGENTS.md and context/ folder are the only source of truth. You do not invent product behavior, scope, or design.

THIS PROMPT BUILDS
Unit 01 Foundation cleanup, Unit 02 Tracked shows and settings, Unit 03 AniList client and scheduling. Specs: context/featureSpecs/01-foundation-cleanup.md, 02-tracked-shows-and-settings.md, 03-anilist-client-and-scheduling.md. Nothing else.

STEP 0: READ EVERYTHING FIRST
Before planning or writing code, open and read these completely, in this order:
1. AGENTS.md
2. context/project-overview.md
3. context/architecture-context.md
4. context/design.md
5. context/code-standards.md
6. context/security-context.md
7. context/ai-workflow-rules.md
8. context/progress-tracker.md
Then reply with a summary of at most 12 lines: the product in one sentence, what Phase 1 includes, the full Out Of Scope list, the stack, the invariants that matter for this prompt, and the security musts. If you cannot list Out Of Scope exactly, re-read before continuing.

STEP 1: CHECK THE BASE
- Confirm AGENTS.md and context/ are at the repository root. If not, stop and tell me.
- Run npm run test:types, npx eslint "src/**/*.{ts,tsx}", npm run test:unit, and npm run build. If anything fails, fix it first in its own commit "fix: ..." before starting Unit 01.
- Read progress-tracker.md. Units 01 to 03 must not be marked complete. If one is started, continue from the first unfinished unit.

STEP 2: BUILD THESE UNITS IN ORDER: 01, then 02, then 03
For EACH unit run this loop. Do not skip a step.

A. CONTEXT GATE (mandatory, even if you read the files earlier)
Re-open and re-read: the unit's feature spec, whole; context/ai-workflow-rules.md sections "How To Work A Unit" and "Definition Of Done"; context/progress-tracker.md; context/code-standards.md; context/security-context.md and context/architecture-context.md for any route, key, fetch, or job; the matching flow in context/project-overview.md (Mod Flow for Units 02 and 03). Then write a Unit brief of at most 10 lines: goal, files you will create or change, what is NOT in this unit, the acceptance criteria you will test, and the security checklist items that apply.

B. BUILD only that unit.
- Follow code-standards.md exactly: lean code, no dead code, no duplicated logic, size limits, the folder layout, type aliases, named exports, no type casts.
- Core logic takes its dependencies as arguments so it can be tested with fakes.
- Anything mocked sits behind a named config flag with a "MOCK:" comment.
- Register every endpoint in devvit.json.

C. VERIFY
- Run typecheck, lint, unit tests, and build. Fix failures at the root cause.
- Walk through EVERY acceptance criterion in the spec. Mark each pass or fail and say how you checked it.
- Run at least one negative test (invalid input, duplicate run, malformed AniList response).
- Apply the checklist at the end of context/security-context.md.

D. CLOSE
- Update context/progress-tracker.md: Verified State with evidence, the unit table, Open Questions, Architecture Decisions, Session Notes. It must reflect real state.
- Update any other context file whose facts changed.
- Commit with a conventional message, for example "feat(tracked): add and remove tracked shows".

E. SELF-AUDIT (answer yes or no in your notes)
No dead code or duplicated logic? No literal tunable numbers outside config.ts? No new dependency without justification? Every route registered in devvit.json? Nothing from Out Of Scope built? A negative test exists?
Only continue to the next unit if every answer is yes and every acceptance criterion either passed or is blocked only on my input.

UNIT REMINDERS
- Unit 01: remove starter leftovers nothing references, add config.ts and keys.ts, keep the MOCK: test post and scheduler task until Unit 04.
- Unit 02: forms are mod-only, IDs are validated integers, duplicates keep one entry.
- Unit 03: one batched AniList query, validated response, one job per air time, reconcile is idempotent. AniList is not approved yet, so use USE_FIXTURE and mark the live-fetch criterion "blocked on input". Do not change that flag to false until I confirm approval.

HARD RULES
- Do not build anything listed under Out Of Scope in context/project-overview.md.
- Do not start Phase 2 or Phase 3 work. Do not start Units 04 and later.
- Never fetch a domain that is not in devvit.json and approved.
- If a requirement is ambiguous and blocks you, add it to Open Questions in progress-tracker.md, stop, and ask me. If it does not block you, record it and continue with the safest option the specs allow.
- INPUTS PROTOCOL: never stop the build for a missing approval, login, or secret. Add a row to "Inputs Needed From User" in progress-tracker.md, use the fallback in context/ai-workflow-rules.md, mark every affected criterion "blocked on input", and keep going. Ask me for inputs at the end of each unit (input, where to set it, criteria it unblocks) and in the final report (the full list). Never ask me to paste a secret in chat. When I say inputs were added, re-run the blocked criteria first.
- Do not call a unit done unless every acceptance criterion was actually checked. A criterion that needs one of my inputs is reported as "blocked on input", never as passed.

STOP CONDITION AND FINAL REPORT
Stop after Unit 03. Report:
1. Units completed, with the commit for each.
2. A table: acceptance criterion, how verified, result.
3. Commands run (typecheck, lint, tests, build) and their results.
4. Open questions. Inputs needed from me, as a table: input, where to set it, criteria it unblocks. Anything else that needs me (Developer Settings).
5. Confirmation that progress-tracker.md is updated, and the next prompt to run (1B).
```

---

## Prompt 1B: Thread Posting And Dedup, Episode Links, History

```text
ROLE
You are a senior engineer continuing the PretzelFlick build, one reviewed unit at a time. AGENTS.md and context/ are the only source of truth. You do not invent product behavior, scope, or design.

THIS PROMPT BUILDS
Unit 04 Thread posting and dedup, Unit 05 Episode links and next edit, Unit 06 History and failure handling. Specs: context/featureSpecs/04-thread-posting-and-dedup.md, 05-episode-links-and-next-edit.md, 06-history-and-failure-handling.md. Nothing else.

STEP 0: READ EVERYTHING FIRST
Open and read completely, in this order: AGENTS.md; context/project-overview.md; context/architecture-context.md; context/design.md; context/code-standards.md; context/security-context.md; context/ai-workflow-rules.md; context/progress-tracker.md.
Reply with a summary of at most 12 lines: what is already built (from progress-tracker.md), the Redis keys this prompt uses, the thread format, the Out Of Scope list, and the invariants that matter here (post at most once per episode, only the previous thread is edited, a failed edit is locked and never retried, core logic takes injected dependencies). If you cannot list Out Of Scope exactly, re-read.

STEP 1: CHECK THE BASE
- progress-tracker.md must show Units 01 to 03 complete or done pending input. If not, stop and tell me.
- Run typecheck, lint, unit tests, and build now. If anything fails, fix it first in its own commit "fix: ..." before starting Unit 04.

STEP 2: BUILD THESE UNITS IN ORDER: 04, then 05, then 06
For EACH unit run this loop. Do not skip a step.

A. CONTEXT GATE (mandatory)
Re-open and re-read: the unit's feature spec, whole; context/ai-workflow-rules.md "How To Work A Unit" and "Definition Of Done"; context/progress-tracker.md; context/code-standards.md; context/design.md "Thread Format"; context/security-context.md and context/architecture-context.md (storage model, dedup model, invariants). Then write a Unit brief of at most 10 lines: goal, files to create or change, what is NOT in this unit, acceptance criteria you will test, security items that apply.

B. BUILD only that unit.
- Follow code-standards.md exactly. Reuse existing helpers. Do not create a second version of anything that exists.
- Unit 05 replaces the old edit-every-earlier-thread loop in episodes.ts. Keep windowFor. Delete the old loop and its old tests, and write new tests.
- Tunable numbers come from config.ts.
- Mocked or fixture data stays behind USE_FIXTURE with a "MOCK:" comment.

C. VERIFY
- Run typecheck, lint, unit tests, and build.
- Walk through EVERY acceptance criterion. Mark pass or fail and how you checked it.
- Negative tests: duplicate job run, crash between submit and record then rerun, failed edit on the previous thread, malformed data, auto-post disabled.
- Apply the checklist at the end of context/security-context.md.
- Where the spec says to post on the test subreddit, run the real flow with npm run dev if I have it running. If I do not, mark that criterion "blocked on input" and tell me what to run.

D. CLOSE
Update progress-tracker.md, update any context file whose facts changed, and commit with a conventional message.

E. SELF-AUDIT (yes or no)
No dead code or duplicated logic? Nothing from Out Of Scope built? A negative test exists? No code path can post the same episode twice? Only the previous thread is edited? Every failure writes a reason somewhere a mod can see?
Continue only if all yes and every criterion either passed or is blocked only on my input.

UNIT REMINDERS
- Unit 04: two-phase dedup with recovery by title search, spoiler-safe title, the "Post next episode now" mod action replaces the MOCK: test item and uses the same dedup path.
- Unit 05: the earlier-episode table uses the 50-link window, one edit to episode N-1, failed edit sets locked, seasons never cross.
- Unit 06: history is a sorted set trimmed to the configured length, a delayed episode records one entry across repeated syncs, a history write failure never stops a post.

HARD RULES
- Do not build anything under Out Of Scope: no TV or movies, no editing older threads, no React panel, no ratings.
- Do not start Units 07 and later, Phase 2, or Phase 3.
- Never fetch a domain that is not approved. AniList stays on USE_FIXTURE until I say the domain is approved.
- Ambiguity that blocks: add to Open Questions, stop, ask me. Non-blocking: record and continue with the safest option the specs allow.
- INPUTS PROTOCOL: never stop the build for a missing approval, login, or secret. Add a row to "Inputs Needed From User" in progress-tracker.md, use the fallback in context/ai-workflow-rules.md, mark affected criteria "blocked on input", and keep going. Ask me for inputs at the end of each unit and in the final report. Never ask me to paste a secret in chat.
- Do not call a unit done unless every acceptance criterion was actually checked. A criterion that needs one of my inputs is reported as "blocked on input", never as passed.

STOP CONDITION AND FINAL REPORT
Stop after Unit 06. Report: units completed with commits; a table of acceptance criterion, how verified, result; commands run and results; open questions; inputs needed from me as a table (input, where to set it, criteria it unblocks); confirmation that progress-tracker.md is updated; next prompt (1C).
```

---

## Prompt 1C: Hardening And Release

```text
ROLE
You are a senior engineer finishing Phase 1 of PretzelFlick. AGENTS.md and context/ are the only source of truth. You do not invent product behavior, scope, or design.

THIS PROMPT BUILDS
Unit 07 Hardening and release. Spec: context/featureSpecs/07-hardening-and-release.md. Nothing else.

STEP 0: READ EVERYTHING FIRST
Open and read completely, in this order: AGENTS.md; context/project-overview.md; context/architecture-context.md; context/design.md; context/code-standards.md; context/security-context.md; context/ai-workflow-rules.md; context/progress-tracker.md.
Reply with a summary of at most 12 lines: what is built, what Unit 07 requires, the Out Of Scope list, and the security musts.

STEP 1: CHECK THE BASE
- progress-tracker.md must show Units 01 to 06 complete or done pending input. If not, stop and tell me.
- Run typecheck, lint, unit tests, and build. Fix any failure first in its own commit.

STEP 2: BUILD UNIT 07 USING THIS LOOP
A. CONTEXT GATE: re-open and re-read the spec; ai-workflow-rules.md "How To Work A Unit" and "Definition Of Done"; progress-tracker.md; code-standards.md; the whole security-context.md. Write a Unit brief of at most 10 lines.
B. WORK (fix defects only, no new features):
- Run the security checklist over every route, menu item, form, trigger, scheduler task, and fetch. Record each result.
- Search the repo for active MOCK: code and USE_FIXTURE. If the AniList domain is approved, set USE_FIXTURE false only after I confirm. If not, mark that criterion "blocked on input".
- Search for Out Of Scope items, dead code, unused dependencies, unused exports, files over the size limits, and files outside the folder layout.
- Rewrite README.md for a mod: what it does, install and settings steps, commands, folder layout, the Fetch Domains section, and a link to context/.
- Run npm audit and a secret scan. Record results.
- Do not upload or submit for review yourself. List the exact commands and Developer Settings steps for me under "needs human".
C. VERIFY: walk every acceptance criterion with evidence. Check Phase 1 success criteria 1 to 9 one by one and report each as pass, fail, or blocked on input.
D. CLOSE: update progress-tracker.md to the true state, including every mocked item and open question. Commit each fix in its own small commit.
E. SELF-AUDIT: nothing new built? every claim has evidence? mocks listed?

HARD RULES
- No new features. No Phase 2 or Phase 3 work.
- Do not mark anything passed without actually running or checking it.
- INPUTS PROTOCOL as in earlier prompts. Never ask me to paste a secret in chat.

STOP CONDITION AND FINAL REPORT
Stop after Unit 07. Report: commits; acceptance table; success criteria 1 to 9 with evidence; defects found and fixed; defects not fixed and why; mocked items still present; a table of inputs and "needs human" items (upload, review submission, domain approval, installing on a real subreddit); confirmation that progress-tracker.md and README.md are accurate; next prompt (2A) only if Phase 1 criteria pass or are blocked only on my inputs.
```

---

## Prompt 2A: Season Hub Spike, Then Ratings And Season Chart

```text
ROLE
You are a senior engineer adding Phase 2 to PretzelFlick. AGENTS.md and context/ are the only source of truth. You do not invent product behavior, scope, or design.

THIS PROMPT BUILDS
Unit 08 Season Hub spike, then, only if its decision is "proceed", Unit 09 Ratings and season chart. Specs: context/featureSpecs/08-season-hub-spike.md and 09-ratings-and-season-chart.md.

STEP 0: READ EVERYTHING FIRST
Open and read completely, in this order: AGENTS.md; context/project-overview.md; context/architecture-context.md; context/design.md (especially "Season Hub"); context/code-standards.md; context/security-context.md (especially "Ratings"); context/ai-workflow-rules.md; context/progress-tracker.md.
Reply with a summary of at most 12 lines: what Phase 1 delivered, what the hub is, the Out Of Scope list, and the rating rules.

STEP 1: CHECK THE BASE
progress-tracker.md must show Phase 1 complete with the success criteria passing. If not, stop and tell me. Run typecheck, lint, unit tests, and build. Fix any failure first.

STEP 2: UNIT 08 (spike)
Build the throwaway custom post, answer the four questions in the spec with evidence, write the decision in progress-tracker.md, and delete the throwaway code. If any live check needs my Reddit account or the test subreddit, give me the exact steps and mark that question "blocked on input". STOP here and ask me to confirm the decision before Unit 09.

STEP 3: UNIT 09 (only after I confirm "proceed")
Run the unit loop: Context Gate (re-read the spec, workflow rules, tracker, code-standards, design, security, architecture), Unit brief of at most 10 lines, build only the unit, verify every acceptance criterion including negative tests (invalid score, unaired episode, non-mod reset), update the tracker, commit, self-audit.

HARD RULES
- No comments on ratings, no per-character polls, no "Watching or Dropped" taps. One number per episode.
- Discussion threads stay plain text posts and must keep working without the hub.
- Do not start Phase 3. Do not modify applied behavior from Phase 1 except to add the one-line hub link.
- INPUTS PROTOCOL and "never mark passed without checking" as in earlier prompts.

STOP CONDITION AND FINAL REPORT
Stop after Unit 09 (or after Unit 08 if the decision is not "proceed"). Report: commits; acceptance table; commands run and results; open questions; inputs and "needs human" items; confirmation that progress-tracker.md is updated.
```

---

## Helper A: Re-Sync Prompt (use when the agent drifts or stops mid-part)

```text
Stop coding. Re-sync with the project before doing anything else.
1. Re-open and re-read, completely: AGENTS.md, context/project-overview.md, context/architecture-context.md, context/design.md, context/code-standards.md, context/security-context.md, context/ai-workflow-rules.md, context/progress-tracker.md, and the feature spec of the unit you are working on.
2. Tell me in at most 10 lines: the unit you are on, what is done, what remains, the Out Of Scope list, and any place where your last changes broke a rule in the files above.
3. Fix those rule breaks first, in a separate commit.
4. Update progress-tracker.md to the true state.
5. Resume from the Context Gate of the current unit. Do not skip any step of the unit loop.
```

## Helper B: Audit Prompt (run after every build prompt, before moving on)

```text
Do not change any code yet. Audit the work from the last prompt.
1. Re-read AGENTS.md and every file in context/, plus the feature specs for the units just built.
2. For each unit built: re-check every acceptance criterion by running the app or tests, not by reading your own earlier report.
3. Search for violations: anything under Out Of Scope, dead code, duplicated logic, unused dependencies, tunable numbers outside config.ts, files or functions over the size limits in code-standards.md, files outside the folder layout, routes or menu items without a mod-only check, fetches to unapproved domains, secrets or user identifiers in code or logs, any path that can post the same episode twice.
4. Run typecheck, lint, unit tests, build, npm audit, and the secret scan.
5. Report findings in a table: severity (high, medium, low), file, rule broken (name the context file and section), proposed fix.
Wait for me to say which findings to fix. Then fix only those, one commit each, and re-run the checks.
```

## Helper C: Bug-Fix Prompt (for any single defect)

```text
Fix one defect. Do not add features.
Defect: [describe what you saw, where, and what you expected]
1. Re-read context/ai-workflow-rules.md, context/code-standards.md, context/security-context.md, and the part of context/project-overview.md or architecture-context.md that describes the expected behavior.
2. Find the root cause. Do not layer a workaround.
3. Write a test that fails because of the defect, then fix the code until it passes.
4. Run typecheck, lint, unit tests, and build. Run the security checklist if a route, fetch, or Redis key was touched.
5. Update progress-tracker.md if the fix changes status, a decision, or an open question.
6. Commit "fix: ..." and tell me the root cause in two lines.
```

## Helper D: Inputs Added Prompt (use after you finish an input)

```text
I completed these inputs: [list, for example "AniList domain approved", "ran npm run dev on r/pretzelflick_dev2"].
1. Re-read context/ai-workflow-rules.md section "Inputs Needed From The User" and the "Inputs Needed From User" table in context/progress-tracker.md.
2. Re-run every acceptance criterion marked "blocked on input" that these inputs unblock. Use the real integration instead of the fixture where the input replaces it, and remove any MOCK: that is no longer needed. If AniList is approved, set USE_FIXTURE to false.
3. Run typecheck, lint, unit tests, build, and the security checklist for the affected units.
4. Update progress-tracker.md: criteria status, the inputs table status, and Architecture Decisions if a fallback was replaced.
5. Report which criteria now pass, which still fail or remain blocked, and any inputs still needed. Then continue the current prompt from where you left off.
```
