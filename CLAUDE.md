# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Checkpoint marker (2026-09-03):** `development-phase-2-rebuild` restarted the Phase 2 web UI from the Phase 2a SQLite checkpoint after heavy DB-migration churn on `main`'s original Phase 2b attempt (which bounced through better-sqlite3 → Turso/libSQL → Neon/Postgres mid-project). This rebuild went straight to **Neon Postgres from the first commit**, specifically to avoid repeating that churn. It has since been merged with `main`, which had continued forward independently and — through real production deploys — found and fixed several genuine bugs (an `AbortController`-based cancel-on-disconnect fix, a corrected `ask_user` timeout margin, SSE heartbeat/closed-guards) that this merge adopted. `main` had also built a parallel JSON API (`app/api/import`, `app/api/profile`, `app/api/quotes`, `app/api/quotes/[id]`) and a fuller test suite; the JSON API was dropped as redundant (this rebuild's `/quotes`, `/quote/[id]`, and `/profile` read the database directly, no API layer), and only `agent.test.js` (architecture-agnostic — it tests `agent.js` directly) was kept from the test suite. Everything below describes this merged, current state.

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

Tests:
```bash
npm test        # vitest run
npm run test:watch
```

## Architecture

This is a **true agent** — Claude drives the sequence via tools. There is no hardcoded flow. The agent decides whether to ask follow-up questions, what materials to look up, and in what order to draft sections. The number of turns varies per job.

**Data flow:**

```
qf.js / app/api/quote/route.js  →  runAgent()  →  Claude API  →  tool call(s)
                     ↑                                                ↓
               messages[]  ←  tool_result  ←  executeTool()
```

**Key separation:** `agent.js` is a generic reusable loop with zero QuoteFetch-specific logic, and is genuinely reused as-is by both surfaces — `qf.js` (CLI) and `app/api/quote/route.js` (web). All domain logic lives in `tools/` and `prompts/system.js`. `prompts/system.js`'s `buildInitialMessage({ trade, tone, jobDescription })` is shared by both callers too, so the untrusted-data wrapping around the job description can't drift between them.

`agent.js` and `lib/anthropic-client.js` both accept an optional `signal` (`AbortSignal`), threaded through every `createMessage` call and checked at the top of each turn. `app/api/quote/route.js` wires this to a `ReadableStream`'s `cancel()` hook — without it, a disconnected client (closed tab, navigated away) left the agent loop running to completion regardless, confirmed in production making many outbound API calls nobody was waiting for.

`lib/anthropic-client.js` centralizes all Anthropic API access — `agent.js`, `tools/identify-materials.js`, and `tools/draft-section.js` all call through it instead of constructing their own client. It provides a shared client (with a request timeout), retry with exponential backoff on `429`/`5xx`/network errors (immediate fail on `401`/`403` since retrying a bad key never helps), and detection of `stop_reason === 'max_tokens'` (thrown as `TruncatedResponseError` rather than silently treated as a complete response).

**The five tools:**

| Tool | Implementation | Notes |
|---|---|---|
| `ask_user` | transport supplied via `toolContext.askUser` | `tools/ask-user.js` has no `inquirer` import — the CLI (`qf.js`) supplies an inquirer-backed callback, the web UI (`app/api/quote/route.js`) supplies an SSE-question/wait-for-answer callback (`lib/quote-runs.js`). This split exists because a static `inquirer` import anywhere reachable from the API route's module graph breaks Vercel's build bundling |
| `identify_materials` | sub-LLM call | Returns `{ materials: [{name, quantity, notes}] }`; results are post-filtered to drop entries that are missing/non-string, too short, contain "or"/multiple commas, or match a skip-keyword list — a code-level backstop for the never-do rules below |
| `lookup_price` | trader history first, then fuzzy match on `data/sample-prices.json` | See "Trader profile & pricing" below. Returns `found`, `cheapest`, `cheapest_supplier`, `verified`, `source`; returns `found: false` gracefully for a non-string/empty `material_name` or a matched entry with no prices, instead of throwing |
| `draft_section` | sub-LLM call per section | Seven sections: introduction, scope, materials, assumptions, exclusions, next_steps, disclaimers |
| `save_quote` | assembles + best-effort `fs.writeFileSync` | Assembles sections in fixed order; returns the assembled `content` plus `file_path`/`filename` (both `null` when the local write didn't happen). The local write to `output/` is wrapped in try/catch (non-fatal) since Vercel's filesystem is read-only outside `/tmp` — `content` is the durable record, persisted to `generated_quotes.content` in Neon by the caller. If a same-day local file for the same trade/job already exists, appends `-2`, `-3`, ... rather than overwriting it |

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

Next.js 15 (App Router), reusing `agent.js` and `tools/index.js` directly. `/quotes`, `/quote/[id]`, and `/profile` read `lib/db.js` directly from a Server Component or Server Action — deliberately **no** separate JSON API for these (an earlier version of this had one; it was dropped as an unused, redundant layer once the direct-read pages existed). `/quote/new` + `app/api/quote/route.js` is the one place a real HTTP layer is unavoidable.

Pages:
- `/profile` — trader identity form + past-quote upload
- `/quote/new` — job description form; polls for live progress
- `/quote/[id]` — view a saved quote
- `/quotes` — list of past quotes

`/quotes`, `/quote/[id]`, and `/profile` set `export const dynamic = 'force-dynamic'`: without it, Next statically prerenders them at build time, which would freeze their data and never reflect a later update — including one made through the CLI, which shares this same Neon database but has no way to trigger Next's cache revalidation from outside a Server Action.

**Short-polling, not a held-open stream:** `POST /api/quote` used to hold one long-lived SSE `ReadableStream` response open for the whole agent run. This was replaced after a production incident: a corporate/VPN proxy in a trader's network path killed connections held open more than a few minutes (surfacing to the browser as a bare `502 Could not relay message upstream`, confirmed via response headers showing the proxy itself generated the failure, not Vercel) — exactly the shape of connection an `ask_user` wait plus several sequential `draft_section` calls produces. `POST /api/quote` now just inserts a `quote_runs` row and returns `{ runId }` in well under a second; the actual agent loop runs afterwards via `next/server`'s `after()`, in the same invocation, writing progress (`onStep` output, the pending `ask_user` question, and the terminal `done`/`error`/`aborted` state) to that row. The client (`/quote/new`) polls `GET /api/quote/[runId]/status` every 2s and re-derives its displayed log from the row's `steps` array each time, rather than accumulating incremental events. `after()` does **not** extend `maxDuration` — the background run still shares the same 300s ceiling as before, just decoupled from whether the client's connection is still open.

`ask_user` itself still bridges through `lib/quote-runs.js`'s `waitForAnswer`, unchanged by this — it already polls the Postgres-backed `pending_answers` table (not a `globalThis` Map; an earlier version used one, but Vercel's Node.js functions have no session affinity, so the request posting the answer routinely lands on a different instance than the one still waiting, and an in-memory Map is invisible across that boundary) that `POST /api/quote/[runId]/answer` writes to.

Two protections in `app/api/quote/route.js`, each fixing a real production incident:
- **A `last_polled_at` watchdog**, replacing the old `AbortController`-on-stream-`cancel()`. A short-polling transport has no socket-level disconnect signal — a closed tab just stops polling. `GET /api/quote/[runId]/status` stamps `last_polled_at` on every poll; a `setInterval` inside the background run checks it every 15s and aborts (via the same `AbortController`/`signal` plumbing as before) if it's gone stale for 60s, so an abandoned run still stops making Anthropic API calls nobody is waiting on — the incident this was originally built to fix.
- **A 90-second pipeline margin (`PIPELINE_MARGIN_MS`), not just a per-question timeout.** An unanswered question's fallback previously raced Vercel's hard `maxDuration` kill and could lose — the fallback fires, but the *rest* of the pipeline (remaining `draft_section` calls, `save_quote`, the DB write) needs real time too. Each `ask_user` call gets `min(ASK_USER_TIMEOUT_MS, remaining-budget-under-the-margin)`, so a second or third clarifying question later in the run degrades to an immediate fallback rather than re-consuming a fresh full timeout each time (confirmed in production: two stacked unanswered questions hit exactly `maxDuration` with no terminal state ever written, surfacing as a bare 502 under the old SSE architecture).

`npm run db:migrate` (`scripts/migrate.mjs`) is the only place `lib/schema.sql` is ever read — run it once against a fresh `DATABASE_URL` before first use. `lib/db.js` never executes schema at runtime (a prior version inlined the schema and ran it lazily on first request per cold start, including an `ALTER TABLE ... ADD COLUMN` existence check on every invocation — this was itself a source of churn, replaced by the one-shot migration script).

## Error handling

`tools/index.js`'s `executeTool` is the single choke point for all five tools: it validates required fields per tool before dispatch, then wraps the call in try/catch. A validation failure or caught exception becomes `{ error: true, message }`, returned as a normal tool result so Claude sees a recoverable failure and can adapt (skip an item, ask the user, retry) instead of the whole run crashing. The one exception is `401`/`403` auth errors, which propagate up (to `qf.js`'s top-level handler in the CLI, to the `quote_runs` row's `error` state in the web route) since no amount of retrying or model adaptation fixes a bad API key.

`agent.js`'s `onStep` calls are also wrapped defensively — a bug in the caller's display/formatting code (CLI console output, or the web route's progress-write callback) logs a warning instead of aborting the agent loop mid-turn.

CLI input is validated up front too: `qf.js`'s `--trade` and `--tone` options use yargs `choices` against `VALID_TRADES`/`VALID_TONES` (in `lib/constants.js`, shared with the web UI), so an invalid value fails fast instead of silently flowing into every prompt. The web route validates the same way against a 400 response.

## Prices database

`data/sample-prices.json` — 50 entries, the catalog's canonical `name`/`aliases`/`trade` taxonomy. Imported as a static JSON module (`import db from '../data/sample-prices.json' with { type: 'json' }` in `tools/lookup-price.js`), not read via `fs` at runtime, so it's safely bundled into the Vercel deployment. It remains the single source of truth for *which materials exist and what they're called* — Phase 3 (below) changed where their *prices* come from, not this catalog.

`lookup_price` uses word-overlap fuzzy matching with a score threshold of 40 (see `lib/fuzzy-match.js`; `MATCH_THRESHOLD`) to find the canonical material, checking three sources in order: the trader's own `trader_prices` (see above), then the scraped-price cache (below), then `sample-prices.json`'s own `prices` array as the final placeholder fallback (`verified: false`, `source: 'sample_db'`). The `verified` flag flows through to the agent's system prompt — unverified prices get a note added to the quote automatically.

**Scraped prices (Phase 3):** `scripts/scrape-prices.mjs` populates a `scraped_prices` Postgres table (see `lib/schema.sql`) with real, current prices from Screwfix/Toolstation/B&Q, run out of band via GitHub Actions (`.github/workflows/scrape-prices.yml`, nightly + manual `workflow_dispatch`) — never inside the live agent request path, since Playwright doesn't fit Vercel's serverless functions and `app/api/quote/route.js` already fights a tight `maxDuration` budget (see below). `lookup_price` reads this cache (`source: 'scraped'`, `verified: true`) ahead of the static JSON fallback, ignoring rows older than `SCRAPED_PRICE_MAX_AGE_DAYS` (14 days) so a stalled scrape schedule degrades to the honest placeholder rather than serving an increasingly stale "verified" price.

Each supplier gets its own module in `scripts/scrapers/` (`screwfix.mjs`, `toolstation.mjs`, `bq.mjs`), each returning several top search-result candidates rather than trusting the first one — confirmed necessary in testing, where a literal top result mismatched the target spec (e.g. searching "MCB Type B 6A" ranked a Type A product first; "Consumer unit 10-way RCBO" ranked an 8-way unit first). `scrape-prices.mjs` scores every candidate against the canonical material's `name`/`aliases` with the same `scoreMatch`/`MATCH_THRESHOLD` used everywhere else, and only caches the best match if it clears the threshold — a low-confidence result is skipped, not cached as if verified. Toolstation additionally fronts a Cloudflare JS challenge ("Just a moment…") that a real headless Chromium session clears on its own with an 8s wait (vs. 3s for the other two) — no stealth plugin or proxy needed; confirmed via manual probing that plain Playwright from a datacenter IP isn't blocked by any of the three suppliers.

To update the catalog itself (add/remove a material, change aliases): edit `sample-prices.json` directly, then either wait for the next scheduled scrape or trigger `.github/workflows/scrape-prices.yml` manually to pick it up immediately. The top of the array is sorted priority-first (consumer units, MCBs, copper pipe, emulsion paint, plasterboard).

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

The same `DATABASE_URL` value must also be set as a GitHub Actions repository secret (Settings → Secrets and variables → Actions) for `.github/workflows/scrape-prices.yml` to write to `scraped_prices` — it isn't read from `.env` in that context.

`qf.js` treats an empty-string `ANTHROPIC_API_KEY`/`CLAUDE_MODEL` as unset before calling `dotenv.config()` — this devcontainer's `remoteEnv` pre-sets both to `""` when the host has no value, which would otherwise make `dotenv` skip loading the real value from `.env` (its default `override: false` treats an existing-but-empty var as "already set"). This still means a real operator/CI-supplied value is never silently overridden by a stray local `.env`. `scripts/web-env.mjs` applies the same clearing (plus `DATABASE_URL`) before spawning `next`, since Next's own `.env` loader has the identical behaviour.

`lib/db.js` lazily creates its Neon client inside a `getClient()` function reading `process.env.DATABASE_URL` at call time, not at module load — a module-scope client would permanently capture `undefined` in the CLI, since ESM evaluates static imports (and top-level code in them) before `qf.js`'s own `dotenv.config()` runs.

## Testing

`agent.test.js` (vitest) tests `agent.js`'s loop directly, mocking `lib/anthropic-client.js` — architecture-agnostic, so it applies regardless of how the CLI or web UI evolve. The `.claude/skills/test-impact` skill (`npm run test:impact`) diffs the working tree and reports which tests a change touches, or flags a change with no coverage at all — use it before wrapping up a feature. See its `SKILL.md` for the full workflow.

## Known caveats

- No test coverage for `tools/*.js`, `lib/db.js`, the CLI's interactive commands, or the `app/` web UI — deferred deliberately (originally per the Phase 2 brief, `prompts/05_QF_PHASE_2.md`), and a prior, more extensive suite covering some of this was dropped in the `main` merge since it tested a parallel JSON API that no longer exists. `agent.test.js` is the only test file today.
- `next@15.5.25` pulls in a `postcss` version with published XSS/path-traversal advisories (`npm audit`), fixed only in `next@16` — a breaking bump deliberately not taken here since 15 is the version already proven to deploy correctly.

## Phase roadmap (for context)

- **Phase 2** — Neon Postgres persistence (trader profile, trader prices, quote history) + Next.js web UI, reusing `agent.js`/`tools/` as-is
- **Phase 3** (this) — Real Playwright scraper (`scripts/scrape-prices.mjs`, scheduled via GitHub Actions) replaces `tools/lookup-price.js`'s sample-DB fallback with a live-scraped Postgres cache (same tool interface, different price source — see "Prices database" above)
- **Phase 4** — Optional auth/multi-tenant support (Phase 2 is deliberately single-tenant — one trader per deployment, no login)
