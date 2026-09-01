---
name: test-impact
description: Scans QuoteFetch's uncommitted changes and reports which tests are affected (directly or transitively) or missing entirely. Use when the user asks what tests need updating, checking, or reviewing after a change, or before wrapping up a feature.
---

# Test impact scan

QuoteFetch's Vitest + React Testing Library suite (`agent.js` core loop, `app/api/**` routes, RTL page tests) has no CI and no git hooks — nothing else keeps it in sync as the app changes. This skill answers "what tests does my current uncommitted change actually touch?"

## Running it

```bash
npm run test:impact
```

This diffs the working tree (`git status --porcelain`), builds a reverse import graph across the repo's `.js`/`.mjs` files, and for each changed file reports every test file that imports it — directly or transitively (e.g. a change to `lib/db.js` has no `lib/db.test.js` of its own, but is reachable from most of the `app/api/**/route.test.js` files that import it). It then runs the union of all affected tests via `vitest run` and shows current pass/fail. Changed files with **no reachable test at all** are called out separately — that's a coverage gap, not a "may need review."

**This script only detects and reports. It never edits test files.** Deciding what to actually change is the next step, done in the normal conversation with full context — not something to automate blindly.

## What to do with the report

1. **Affected test currently failing** — fix it. Reuse this project's established test conventions:
   - Mock `lib/anthropic-client.js` (`createClient`/`createMessage`/`getModel`) for anything that would otherwise call the real Anthropic API — never let a test hit the network.
   - Use the `QF_DB_PATH` / `QF_OUTPUT_DIR` / `QF_UPLOADS_DIR` env var overrides (set before importing the module under test, ideally to `:memory:` or a `mkdtempSync` temp dir) so tests never touch the real `data/qf.db`, `output/`, or `data/uploads/`.
   - Co-locate as `*.test.js` next to the file under test.
   - For RTL page tests, mock `fetch` via `msw` (see `test/msw-server.js`) rather than a real server; remember `@testing-library/react`'s auto-cleanup does not fire here (`vitest.config.js` has `globals: false`) — cleanup is handled centrally in `vitest.setup.js`, so don't reintroduce a duplicate.
2. **Affected test currently still passing** — don't assume it's fine. A passing test can still be asserting the wrong thing (e.g. UI copy the change just updated but the test's string literal didn't). Skim it against the actual diff before moving on.
3. **No test coverage detected** — flag this to the user explicitly rather than silently deciding whether to add coverage. Some of this may be deliberately out of scope (the CLI's own interactive commands and `tools/*.js` business logic were both explicitly excluded when this suite was built — see `CLAUDE.md`'s "Web UI (Phase 2b)" section and the "No test coverage yet" note).
4. Summarize findings back to the user concisely — this report is a triage aid, not something to paste back verbatim.
