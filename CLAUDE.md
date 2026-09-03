# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Checkpoint marker (2026-09-03, branch `development-phase-2-rebuild`):** This branch restarted the Phase 2 web UI from the Phase 2a SQLite checkpoint after heavy DB-migration churn on a separate, now-superseded branch (`main`) that bounced through better-sqlite3 → Turso/libSQL → Neon/Postgres mid-project. Persistence here goes straight to **Neon Postgres from the first commit** — never better-sqlite3 — specifically to avoid repeating that churn. Steps 1–6 of the rebuild (Neon storage layer, `scripts/migrate.mjs`, static price-JSON import, `save_quote` content/best-effort-write, pluggable `ask_user` transport, Next.js scaffold) are committed. Steps 7–10 (the `/quotes`, `/quote/[id]`, `/profile`, and `/quote/new` pages, plus the `/api/quote` SSE route and its `ask_user` bridge) are implemented and verified in the working tree but **not yet committed** — awaiting review. Everything below describes this full end state (CLI + web) unless noted otherwise.

## Running the agent

CLI:
```bash
node qf.js --trade=<trade> --tone=<tone> "<job description>"
```
```bash
npm start -- --trade=electrician --tone=professional "Replace consumer unit, 8 MCBs"
```

Web UI:
```bash
npm run db:migrate  # one-off: apply lib/schema.sql to DATABASE_URL, only needed once per database
npm run web:dev      # http://localhost:3000
npm run web:build    # production build (also runs as Vercel's build command, see package.json's vercel-build)
npm run web:start
```

There are no build/lint/test steps for the CLI itself — it's a plain ESM Node.js project. The web UI is a standard Next.js app; `web:dev`/`web:build`/`web:start` wrap `next` via `scripts/web-env.mjs` (see Environment below for why).

## Architecture

This is a **true agent** — Claude drives the sequence via tools. There is no hardcoded flow. The agent decides whether to ask follow-up questions, what materials to look up, and in what order to draft sections. The number of turns varies per job.

**Data flow:**

```
qf.js / app/api/quote/route.js  →  runAgent()  →  Claude API  →  tool call(s)
                     ↑                                                ↓
               messages[]  ←  tool_result  ←  executeTool()
```

**Key separation:** `agent.js` is a generic reusable loop with zero QuoteFetch-specific logic, and is now genuinely reused as-is by both surfaces — `qf.js` (CLI) and `app/api/quote/route.js` (web). All domain logic lives in `tools/` and `prompts/system.js`. `prompts/system.js`'s `buildInitialMessage({ trade, tone, jobDescription })` is shared by both callers too, so the untrusted-data wrapping around the job description can't drift between them.

`lib/anthropic-client.js` centralizes all Anthropic API access — `agent.js`, `tools/identify-materials.js`, and `tools/draft-section.js` all call through it instead of constructing their own client. It provides a shared client (with a request timeout), retry with exponential backoff on `429`/`5xx`/network errors (immediate fail on `401`/`403` since retrying a bad key never helps), and detection of `stop_reason === 'max_tokens'` (thrown as `TruncatedResponseError` rather than silently treated as a complete response).

**The five tools:**

| Tool | Implementation | Notes |
|---|---|---|
| `ask_user` | transport supplied via `toolContext.askUser` | `tools/ask-user.js` has no `inquirer` import — the CLI (`qf.js`) supplies an inquirer-backed callback, the web UI (`app/api/quote/route.js`) supplies an SSE-question/wait-for-answer callback (`lib/quote-runs.js`). This split exists because a static `inquirer` import anywhere reachable from the API route's module graph breaks Vercel's build bundling |
| `identify_materials` | sub-LLM call | Returns `{ materials: [{name, quantity, notes}] }`; results are post-filtered to drop entries that are missing/non-string, too short, contain "or"/multiple commas, or match a skip-keyword list — a code-level backstop for the never-do rules below |
| `lookup_price` | trader history first, then fuzzy match on `data/sample-prices.json` | See "Trader profile & pricing" below. Returns `found`, `cheapest`, `cheapest_supplier`, `verified`, `source`; returns `found: false` gracefully for a non-string/empty `material_name` or a matched entry with no prices, instead of throwing |
| `draft_section` | sub-LLM call per section | Seven sections: introduction, scope, materials, assumptions, exclusions, next_steps, disclaimers |
| `save_quote` | assembles + best-effort `fs.writeFileSync` | Assembles sections in fixed order; returns the assembled `content` plus a `file_written` flag. The local write to `output/` is wrapped in try/catch (non-fatal) since Vercel's filesystem is read-only outside `/tmp` — `content` is the durable record, persisted to `generated_quotes.content` in Neon by the caller. If a same-day local file for the same trade/job already exists, appends `-2`, `-3`, ... rather than overwriting it |

**Multiple tool calls per turn:** Claude may return several `tool_use` blocks in a single response (e.g. batching all `lookup_price` calls). The loop in `agent.js` handles this correctly — it processes all blocks and returns all `tool_result` entries in one message. If you modify the loop, preserve this behaviour or the API will return a 400.

## Trader profile & pricing (Phase 2a)

Trader identity (business name, contact details, hourly rate, standard T&Cs, voice sample) is a single-row Postgres table (`trader_profile`) via `lib/db.js`. Loaded once per run — in `qf.js` for the CLI, in `app/api/quote/route.js` for the web UI — and passed through `runAgent`'s `toolContext`, never re-read from the DB inside an individual tool.

`lib/trader-context.js`'s `formatTraderContext(profile)` turns that row into a prompt-ready block, appended to `SYSTEM_PROMPT` and passed to `draft_section`'s sub-LLM calls; `save_quote` uses it to fill in the `[BUSINESS NAME]`/`[CONTACT DETAILS]` placeholders automatically. An empty profile degrades gracefully back to Phase 1 behaviour (placeholders, sample-DB prices only).

`lookup_price` checks the trader's own `trader_prices` table first (fuzzy-matched with the same `scoreMatch`/`MATCH_THRESHOLD` logic as the sample DB — see `lib/fuzzy-match.js`). A hit there is `source: 'trader_history'` and always `verified: true`, since it's a price the trader actually paid. Only when there's no match does it fall back to `data/sample-prices.json`.

Traders populate `trader_prices` by importing their own past quotes — two entry points, same underlying logic:
- CLI: `node qf.js import <path>` (`.md`/`.txt`/`.pdf`/`.docx`)
- Web: the `/profile` page's upload form (`lib/actions/profile.js`'s `importQuote` Server Action), accepting multiple files in one submission

Both call the same `lib/extract-quote.js` sub-LLM extraction (same never-do rules, no guessed prices) and the same `lib/db.js` writes. They differ only in where the uploaded file physically lives: a real, permanent path on the trader's own machine for the CLI; a `/tmp` file for the lifetime of that one request on the web, since Vercel's filesystem is otherwise read-only. For web uploads, `historical_quotes.file_path` is therefore display-only (the original filename) rather than a working path — `extracted_text` and the derived `trader_prices` rows are the actual durable record.

## Web UI (Phase 2b)

Next.js 15 (App Router), reusing `agent.js` and `tools/index.js` directly — no HTTP layer between them beyond `app/api/quote/route.js` itself, which is unavoidable since it's the one place a genuinely long-lived streaming connection is needed.

Pages:
- `/profile` — trader identity form + past-quote upload
- `/quote/new` — job description form; streams live progress via SSE
- `/quote/[id]` — view a saved quote
- `/quotes` — list of past quotes

`/quotes`, `/quote/[id]`, and `/profile` read `lib/db.js` directly from a Server Component — no Route Handler, no client-side fetch, for these three. All three set `export const dynamic = 'force-dynamic'`: without it, Next statically prerenders them at build time, which would freeze their data and never reflect a later update — including one made through the CLI, which shares this same Neon database but has no way to trigger Next's cache revalidation from outside a Server Action.

**The `ask_user` bridge:** a single long-lived SSE `POST /api/quote` runs the whole agent loop for the lifetime of one request, streaming `onStep`-equivalent events to the client (which reads `response.body` manually via `getReader()` — not the native `EventSource`, since that's GET-only and this needs a POST body to start the run). When the agent calls `ask_user`, the route sends a `question` event and awaits an answer via `lib/quote-runs.js` — a `globalThis`-anchored `Map` (not module-scope; Next bundles each route as its own module graph) that a second, separate `POST /api/quote/[runId]/answer` resolves. An unanswered question falls back to a default text after a timeout capped by the run's overall deadline (`maxDuration`), rather than hanging or getting killed with no terminal event ever sent. The route also sends a periodic SSE heartbeat comment to avoid an intermediate proxy's idle-timeout during a long wait.

`npm run db:migrate` (`scripts/migrate.mjs`) is the only place `lib/schema.sql` is ever read — run it once against a fresh `DATABASE_URL` before first use. `lib/db.js` never executes schema at runtime.

## Error handling

`tools/index.js`'s `executeTool` is the single choke point for all five tools: it validates required fields per tool before dispatch, then wraps the call in try/catch. A validation failure or caught exception becomes `{ error: true, message }`, returned as a normal tool result so Claude sees a recoverable failure and can adapt (skip an item, ask the user, retry) instead of the whole run crashing. The one exception is `401`/`403` auth errors, which propagate up (to `qf.js`'s top-level handler in the CLI, to a `done`/`error` SSE event in the web route) since no amount of retrying or model adaptation fixes a bad API key.

`agent.js`'s `onStep` calls are also wrapped defensively — a bug in the caller's display/formatting code (CLI console output, or the web route's `send()`) logs a warning instead of aborting the agent loop mid-turn.

CLI input is validated up front too: `qf.js`'s `--trade` and `--tone` options use yargs `choices` against `VALID_TRADES`/`VALID_TONES` (now in `lib/constants.js`, shared with the web UI), so an invalid value fails fast instead of silently flowing into every prompt. The web route validates the same way against a 400 response.

## Prices database

`data/sample-prices.json` — 50 entries, all `verified: false` (placeholder prices). Imported as a static JSON module (`import db from '../data/sample-prices.json' with { type: 'json' }` in `tools/lookup-price.js`), not read via `fs` at runtime, so it's safely bundled into the Vercel deployment.

`lookup_price` uses word-overlap fuzzy matching with a score threshold of 40 (see `lib/fuzzy-match.js`; `MATCH_THRESHOLD`). Matches on `name` and `aliases[]`, checking the trader's own `trader_prices` first (see above) before this file. The `verified` flag flows through to the agent's system prompt — unverified prices get a note added to the quote automatically.

To update a sample price: edit the entry in `sample-prices.json`, set `verified: true`. The top of the array is sorted priority-first (consumer units, MCBs, copper pipe, emulsion paint, plasterboard).

## Quote output

Assembled quotes are plain-text, following the knowledge bank spec: all-caps section headings, bullet points only, no markdown tables. Must paste cleanly into an email client. The CLI additionally writes this to `output/` as a `.md` file (best-effort — see `save_quote` above); both surfaces persist the same content to `generated_quotes.content` in Neon.

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
DATABASE_URL=         # required; Neon/Postgres connection string, used by lib/db.js and scripts/migrate.mjs
```

`qf.js` treats an empty-string `ANTHROPIC_API_KEY`/`CLAUDE_MODEL` as unset before calling `dotenv.config()` — this devcontainer's `remoteEnv` pre-sets both to `""` when the host has no value, which would otherwise make `dotenv` skip loading the real value from `.env` (its default `override: false` treats an existing-but-empty var as "already set"). This still means a real operator/CI-supplied value is never silently overridden by a stray local `.env`. `scripts/web-env.mjs` applies the same clearing (plus `DATABASE_URL`) before spawning `next`, since Next's own `.env` loader has the identical behaviour.

`lib/db.js` lazily creates its Neon client inside a `getClient()` function reading `process.env.DATABASE_URL` at call time, not at module load — a module-scope client would permanently capture `undefined` in the CLI, since ESM evaluates static imports (and top-level code in them) before `qf.js`'s own `dotenv.config()` runs.

## Known caveats

- `next@15.5.25` pulls in a `postcss` version with published XSS/path-traversal advisories (`npm audit`), fixed only in `next@16` — a breaking bump deliberately not taken here since 15 is the version already proven to deploy correctly.
- The `ask_user` unanswered-question timeout fallback (see "Web UI" above) is implemented per code review but not exercised by a live multi-minute test — the happy path (question asked, answered promptly via the separate endpoint) is verified end to end.
- No automated test suite yet — deferred deliberately per the Phase 2 brief (`prompts/05_QF_PHASE_2.md`), as a separate follow-on after the web UI itself.

## Phase roadmap (for context)

- **Phase 2** (this) — Neon Postgres persistence (trader profile, trader prices, quote history) + Next.js web UI, reusing `agent.js`/`tools/` as-is
- **Phase 3** — Real Playwright scraper replaces `tools/lookup-price.js`'s sample-DB fallback (same interface, different implementation)
- **Phase 4** — Optional auth/multi-tenant support (Phase 2 is deliberately single-tenant — one trader per deployment, no login)
