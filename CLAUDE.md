# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Checkpoint marker (2026-09-01, branch `development-creating-front-end`):** Phase 2a (trader identity persistence) is implemented, integrated, and **committed** as of `7af5504` on `development-phase-2`. Phase 2b (the Next.js web UI described below) is implemented and verified in the working tree on this branch, but **not committed** — commits on this project are made only when explicitly requested, not automatically per step. The rest of this file describes the full Phase 2a + 2b state as built.

## Running the agent

```bash
node qf.js --trade=<trade> --tone=<tone> "<job description>"
```

Pass CLI args through npm if preferred:
```bash
npm start -- --trade=electrician --tone=professional "Replace consumer unit, 8 MCBs"
```

There are no build, lint, or test steps for the CLI — it's a plain ESM Node.js project with no compilation. The Next.js web UI (below) does have its own build step, scoped entirely to `app/`.

## Running the web UI

```bash
npm run web:dev     # dev server, http://localhost:3000
npm run web:build   # production build
npm run web:start   # serve the production build
```

Always go through these (not `next dev`/`next build`/`next start` directly) — see the Environment section for why. Pages: `/profile` (trader identity + import), `/quotes` (list), `/quote/[id]` (view one), `/quote/new` (generate one, with live progress and inline clarifying questions).

## Architecture

This is a **true agent** — Claude drives the sequence via tools. There is no hardcoded flow. The agent decides whether to ask follow-up questions, what materials to look up, and in what order to draft sections. The number of turns varies per job.

**Data flow:**

```
qf.js  →  runAgent()  →  Claude API  →  tool call(s)
               ↑                              ↓
         messages[]  ←  tool_result  ←  executeTool()
```

**Key separation:** `agent.js` is a generic reusable loop with zero QuoteFetch-specific logic. All domain logic lives in `tools/` and `prompts/system.js`. This is what made the Phase 2b web UI's reuse of `runAgent()` and `executeTool()` a straight import with zero changes to `agent.js` itself — see "Web UI" below.

`lib/anthropic-client.js` centralizes all Anthropic API access — `agent.js`, `tools/identify-materials.js`, and `tools/draft-section.js` all call through it instead of constructing their own client. It provides a shared client (with a request timeout), retry with exponential backoff on `429`/`5xx`/network errors (immediate fail on `401`/`403` since retrying a bad key never helps), and detection of `stop_reason === 'max_tokens'` (thrown as `TruncatedResponseError` rather than silently treated as a complete response).

**The five tools:**

| Tool | Implementation | Notes |
|---|---|---|
| `ask_user` | inquirer prompt, or an injected handler | Used only when job description is genuinely too vague. `tools/ask-user.js` accepts an optional `toolContext.askUser(question, context)` — if absent it falls back to the original `inquirer.prompt()` (CLI behaviour unchanged); the web UI supplies one backed by SSE + a pending-answer map (see "Web UI" below) since there's no TTY to prompt in a web request |
| `identify_materials` | sub-LLM call | Returns `{ materials: [{name, quantity, notes}] }`; results are post-filtered to drop entries that are missing/non-string, too short, contain "or"/multiple commas, or match a skip-keyword list — a code-level backstop for the never-do rules below |
| `lookup_price` | fuzzy match on `data/sample-prices.json` | Returns `found`, `cheapest`, `cheapest_supplier`, `verified`; returns `found: false` gracefully for a non-string/empty `material_name` or a matched entry with no prices, instead of throwing |
| `draft_section` | sub-LLM call per section | Seven sections: introduction, scope, materials, assumptions, exclusions, next_steps, disclaimers |
| `save_quote` | fs.writeFileSync | Assembles sections in fixed order, saves to `output/`; if a same-day file for the same trade/job already exists, appends `-2`, `-3`, ... rather than overwriting it |

**Multiple tool calls per turn:** Claude may return several `tool_use` blocks in a single response (e.g. batching all `lookup_price` calls). The loop in `agent.js` handles this correctly — it processes all blocks and returns all `tool_result` entries in one message. If you modify the loop, preserve this behaviour or the API will return a 400.

## Error handling

`tools/index.js`'s `executeTool` is the single choke point for all five tools: it validates required fields per tool before dispatch, then wraps the call in try/catch. A validation failure or caught exception becomes `{ error: true, message }`, returned as a normal tool result so Claude sees a recoverable failure and can adapt (skip an item, ask the user, retry) instead of the whole run crashing. The one exception is `401`/`403` auth errors, which propagate up to `qf.js`'s top-level handler and exit the process, since no amount of retrying or model adaptation fixes a bad API key.

`agent.js`'s `onStep` calls are also wrapped defensively — a bug in `qf.js`'s display/formatting code logs a warning instead of aborting the agent loop mid-turn.

CLI input is validated up front too: `qf.js`'s `--trade` and `--tone` options use yargs `choices` against `VALID_TRADES`/`VALID_TONES` (now in `lib/constants.js`, imported by both `qf.js` and the web UI), so an invalid value fails fast instead of silently flowing into every prompt.

The web UI's API routes (`app/api/**/route.js`) follow the same `{ error: true, message }` shape as `executeTool`, just adapted to HTTP status codes (400 for bad input, 404 for a missing resource, 500 for an unexpected failure) instead of a tool result — same philosophy, different transport.

## Prices database

`data/sample-prices.json` — 50 entries, all `verified: false` (placeholder prices).

`lookup_price` uses word-overlap fuzzy matching with a score threshold of 40. Matches on `name` and `aliases[]`. The `verified` flag flows through to the agent's system prompt — unverified prices get a note added to the quote automatically.

To update prices: edit the entry in `sample-prices.json`, set `verified: true`. The top of the array is sorted priority-first (consumer units, MCBs, copper pipe, emulsion paint, plasterboard).

## Quote output

Assembled quotes are written to `output/` as plain-text `.md` files. The format follows the knowledge bank spec: all-caps section headings, bullet points only, no markdown tables. Must paste cleanly into an email client.

Section order: `[BUSINESS NAME]` · `[CONTACT DETAILS]` · Date · introduction · SCOPE OF WORK · MATERIALS & EQUIPMENT · ASSUMPTIONS · EXCLUSIONS · NEXT STEPS · DISCLAIMERS.

## Never-do rules (preserve across all changes)

These are safety guardrails, not style preferences:

- Claude must never invent or estimate material prices — only prices returned by `lookup_price` may appear in a quote
- No regulatory compliance claims (Part P, Gas Safe, BS 7671, etc.)
- No markdown tables anywhere in quote output
- Materials lines must be single specific products — no "X or Y" alternatives, no bundling two items on one line
- `identify_materials` sub-prompt must retain the skip rules for service items (disposal fees, hire costs) and generic terms (sundries, consumables)

These rules are enforced two ways, not just by prompt instruction: `NEVER_DO_RULES` (exported from `prompts/system.js`) is passed as the `system` parameter to the `identify_materials` and `draft_section` sub-LLM calls in addition to being part of the main loop's `SYSTEM_PROMPT`, and the materials skip-rule is additionally enforced in code via a post-filter in `tools/identify-materials.js` (see the tools table above) rather than relying on the model alone.

## Environment

```
ANTHROPIC_API_KEY=    # required
CLAUDE_MODEL=         # optional, defaults to claude-sonnet-4-6
REQUEST_TIMEOUT_MS=   # optional, defaults to 60000; Anthropic client request timeout (lib/anthropic-client.js)
DATABASE_URL=         # required; Neon Postgres connection string (lib/db.js)
```

`DATABASE_URL` is required in every environment — local dev, tests, and production — with no local/embedded fallback (Neon is a remote-only Postgres service; there's no SQLite-style `file:` escape hatch). Use a dedicated Neon branch for local dev, separate from whatever branch production points at. `lib/db.js` reads it lazily inside `getClient()`, not into a module-level `const`: ES modules hoist and fully evaluate a file's static imports before its own top-level statements run, so a module-level read would execute — and permanently capture `undefined` — before `qf.js`'s own `dotenv.config()` call, even though that call appears earlier in `qf.js`'s source. This bug existed in the pre-Neon Turso code in the same shape but was invisible, because the local-dev fallback back then was a hardcoded `file:` path needing no env var at all.

`qf.js` treats an empty-string `ANTHROPIC_API_KEY`/`CLAUDE_MODEL` as unset before calling `dotenv.config()` — this devcontainer's `remoteEnv` pre-sets both to `""` when the host has no value, which would otherwise make `dotenv` skip loading the real value from `.env` (its default `override: false` treats an existing-but-empty var as "already set"). This still means a real operator/CI-supplied value is never silently overridden by a stray local `.env`.

The same workaround is needed for the Next.js web UI (Phase 2b) but can't live in `next.config.mjs` — Next's own `.env` loader runs before that file is evaluated, so it would already have skipped the real value by the time config code ran. Instead, `scripts/web-env.mjs` applies the same empty-string deletion before spawning the `next` binary, and `package.json`'s `web:dev`/`web:build`/`web:start` scripts go through it rather than calling `next` directly.

## Web UI (Phase 2b)

Next.js 15 (App Router), plain JS, `app/` tree. `qf.js` itself is not imported by any route — its yargs parsing and `process.exit` calls are CLI-only. Each route replicates the same orchestration lines `runQuoteCommand` uses (build initial message, load trader context, call `runAgent`, call `insertGeneratedQuote`) without the CLI's `chalk`/`ora` formatting.

**Routes:**

| Route | Purpose |
|---|---|
| `app/api/profile/route.js` | GET/POST trader profile |
| `app/api/import/route.js` | POST multipart upload → `data/uploads/` → `extractQuoteFile` → `trader_prices` |
| `app/api/quote/route.js` | POST → SSE stream of `onStep` events; runs the agent; saves the quote |
| `app/api/quote/[runId]/answer/route.js` | POST → resolves a paused `ask_user` call for that run |
| `app/api/quotes/route.js`, `app/api/quotes/[id]/route.js` | List / view generated quotes |

**Two things worth knowing if you touch this:**

- **`lib/quote-runs.js`'s pending-answer map is anchored on `globalThis`, not module scope.** Next.js bundles each route handler as its own module graph in dev, so a plain module-level `Map` shared via import is *not* actually the same object between `app/api/quote/route.js` and `app/api/quote/[runId]/answer/route.js` — `globalThis` is the one thing guaranteed shared across route bundles within the single Node process. Losing this breaks the whole interactive-question flow silently (the answer endpoint returns 404 "no pending question" even though one exists).
- **A paused `ask_user` call times out after 5 minutes** (`ASK_USER_TIMEOUT_MS` in `app/api/quote/route.js`) and resolves with a synthetic "no answer given — proceed with reasonable assumptions" rather than hanging the request forever if the browser tab closes.

**Single-tenant, no auth, by design** (per the Phase 2 brief — do not add login/JWT/bcrypt here, that's Phase 4): there's one `trader_profile` row and one flat `generated_quotes` table with no user/session column. Every page shows the same data to anyone who can reach the server. That's fine while "the server" means `localhost` on the trader's own machine; it stops being fine the moment this is exposed on a network, since nothing currently isolates one visitor from another.

## Testing

Vitest + React Testing Library. `npm test` (single run) / `npm run test:watch`. Tests are co-located as `*.test.js` next to the file under test.

**Isolation — tests must never touch real trader data.** `QF_OUTPUT_DIR` (`tools/save-quote.js`) and `QF_UPLOADS_DIR` (`app/api/import/route.js`) are env var overrides set to a `mkdtempSync` temp dir before importing the module under test, so tests never write into the real `output/`/`data/uploads/`. This exists because manual browser/curl testing earlier polluted real state and required a manual cleanup pass — the whole point of these overrides is that it can't happen again via the test suite.

DB-touching tests have no equivalent override — Neon has no in-memory/embedded mode, so `DATABASE_URL` must point at a real branch even in tests (`vitest.setup.js` calls `dotenv.config()` so `.env`'s `DATABASE_URL` reaches the test process; nothing else loads `.env` there, since tests import route files directly rather than going through `qf.js`). Point it at a dedicated Neon branch, not production — tests call the exported DB functions directly (`db.query(...)`, matching the Neon client's method name, not libsql's `db.execute(...)`) and wipe their own tables in `beforeEach`, but that cleanup assumes exclusive use of the branch. This is a real, accepted gap from the pre-Neon `QF_DB_PATH=':memory:'` isolation story — not a design goal, a trade-off made when migrating off Turso.

**Three layers:**
- `agent.test.js` — the core loop (`agent.js`) with `lib/anthropic-client.js` mocked. Covers the load-bearing invariants from the Architecture section above: multiple-tool-calls-per-turn, `onStep` sequencing and defensive error handling, max-turns, `toolContext` passthrough.
- `app/api/**/route.test.js` — each API route's exported `GET`/`POST` called directly with a real `Request` object, no server needed. `lib/anthropic-client.js` is mocked wherever a route indirectly triggers a sub-LLM call (`/api/import`, `/api/quote`).
- `app/**/page.test.js` — React Testing Library, `fetch` mocked via `msw` (`test/msw-server.js`), no real backend. `/quote/new`'s test scripts a raw SSE-formatted `ReadableStream` (deliberately splitting one event across two chunks) to exercise the page's own stream-parsing/buffering code.

**Two Vitest/Vite-version-specific gotchas, easy to lose in a config refactor:**
- This project keeps JSX in plain `.js` files (no `.jsx` extension). Vite 8 (pulled in transitively by Vitest 4) defaults to an `oxc` transform that only recognizes JSX by extension, with no working config override for `.js`. `vitest.config.js` works around it with a custom `enforce: 'pre'` plugin that calls `transformWithOxc` itself with `lang: 'jsx'`, converting the file to plain JS before Vite's own built-in oxc plugin ever sees the raw JSX.
- `vitest.config.js` sets `globals: false`, which means `@testing-library/react`'s automatic `afterEach(cleanup)` never registers (it depends on a global `afterEach`). `vitest.setup.js` calls `cleanup()` explicitly instead — removing that silently leaks rendered components between tests in the same file.

**Explicitly out of scope for now**: the CLI's own interactive commands (`qf.js`, `commands/profile.js`, `commands/import.js`) and `tools/*.js` business logic (fuzzy matching, the materials post-filter). Real gaps, not oversights — a natural follow-on.

## `test-impact` skill

`.claude/skills/test-impact/` — `npm run test:impact` (or ask Claude "what tests need checking"). Scans uncommitted changes (`git status --porcelain`), builds a reverse import graph across the repo's `.js`/`.mjs` files, and reports which test files are affected — directly or transitively — by each changed file, then runs them to show current pass/fail. A changed file with zero reachable tests is flagged separately as a coverage gap. Detect-and-report only — it never edits test files itself; see `SKILL.md` for what to do with its output.

## Phase roadmap (for context)

- **Phase 2a** — Trader identity persistence (SQLite profile, trader-price-first lookup, import). Done, committed.
- **Phase 2b** — Next.js web UI reusing `agent.js`/`tools/` unchanged. Done, not yet committed.
- **Phase 3** — Real Playwright scraper replaces `tools/lookup-price.js` (same interface, different implementation). Deliberately deferred — see `prompts/06_QF_ANALYSIS_FINDINGS.md` section 4 for why real prices from the trader's own history matter more than a scraper right now.
- **Phase 4** — Multi-tenant auth/database. Not started; today's single-tenant, no-login design is deliberate, not a gap to quietly patch.
