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
npm run dev          # http://localhost:3000
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

**The four tools:**

| Tool | Implementation | Notes |
|---|---|---|
| `ask_user` | transport supplied via `toolContext.askUser` | `tools/ask-user.js` has no `inquirer` import — the CLI (`qf.js`) supplies an inquirer-backed callback, the web UI (`app/api/quote/route.js`) supplies an SSE-question/wait-for-answer callback (`lib/quote-runs.js`). This split exists because a static `inquirer` import anywhere reachable from the API route's module graph breaks Vercel's build bundling |
| `identify_materials` | sub-LLM call | Returns `{ materials: [{name, quantity, notes}] }`; results are post-filtered to drop entries that are missing/non-string, too short, contain "or"/multiple commas, or match a skip-keyword list — a code-level backstop for the never-do rules below |
| `draft_section` | sub-LLM call per section | Seven sections: introduction, scope, materials, assumptions, exclusions, next_steps, disclaimers. Pricing is never part of this loop — the materials section always renders every item as `[Price TBC]`; see "Pricing" below for how a trader attaches real prices afterwards |
| `save_quote` | assembles + best-effort `fs.writeFileSync` | Assembles sections in fixed order; returns the assembled `content` plus `file_path`/`filename` (both `null` when the local write didn't happen). The local write to `output/` is wrapped in try/catch (non-fatal) since Vercel's filesystem is read-only outside `/tmp` — `content` is the durable record, persisted to `generated_quotes.content` in Neon by the caller. If a same-day local file for the same trade/job already exists, appends `-2`, `-3`, ... rather than overwriting it |

There used to be a fifth tool, `lookup_price`, called inline during drafting from a static sample-price catalog. It was removed: pricing now happens entirely outside the agent loop, after a quote is saved — see "Pricing" below.

**Multiple tool calls per turn:** Claude may return several `tool_use` blocks in a single response (e.g. batching all seven `draft_section` calls). The loop in `agent.js` handles this correctly — it processes all blocks and returns all `tool_result` entries in one message. If you modify the loop, preserve this behaviour or the API will return a 400.

## Trader profile

Trader identity (business name, contact details, hourly rate, standard T&Cs, voice sample) is a single-row Postgres table (`trader_profile`) via `lib/db.js`. Loaded once per run — in `qf.js` for the CLI, in `app/api/quote/route.js` for the web UI — and passed through `runAgent`'s `toolContext`, never re-read from the DB inside an individual tool.

`lib/trader-context.js`'s `formatTraderContext(profile)` turns that row into a prompt-ready block, appended to `SYSTEM_PROMPT` and passed to `draft_section`'s sub-LLM calls; `save_quote` uses it to fill in the `[BUSINESS NAME]`/`[CONTACT DETAILS]` placeholders automatically. An empty profile degrades gracefully — the same placeholders and `[Price TBC]` materials, just with no business details filled in.

There used to be a second half to this feature: traders importing their own past quotes (CLI `node qf.js import <path>`, a `/profile` upload form, `lib/extract-quote.js` sub-LLM extraction) to build up a `trader_prices` price-history table that `lookup_price` would check first. That whole flow has been removed — there is no `import` CLI command and no upload form today. `trader_prices` and `historical_quotes` still exist in `lib/schema.sql` but nothing in the app reads or writes them any more.

## Pricing (Phase 3a — live price search)

Pricing is deliberately **not** part of the agent loop. `draft_section` always renders every materials line as `[Price TBC]`, and the drafted quote text is never edited afterwards. Instead, once a quote is saved, the trader looks up real prices per material line from the quote-view page — a separate, on-demand feature that layers prices on top of the static quote rather than generating them.

**The search itself** (`app/materials-pricing.js`'s `MaterialsPricing` component, rendered on `/quote/[id]`): each material line gets a "Find prices" button that opens a modal (`PricePickerModal`) pre-filled with the material name. It calls `POST /api/pricing/search`, which goes through `lib/pricing/index.js`'s `getPriceSearchProvider()`:
- Picks a provider by the `PRICE_PROVIDER` env var — `serper` (default, `lib/pricing/providers/SerperPriceSearchProvider.js`, Google Shopping via Serper's API) or `dataforseo` (`DataForSEOPriceSearchProvider.js` — a documented skeleton only, not wired up; `PRICE_PROVIDER=dataforseo` throws `NOT_IMPLEMENTED` on purpose rather than silently doing nothing).
- With no `SERPER_API_KEY` set (or `SERPER_MOCK_MODE=true`), `SerperPriceSearchProvider` returns realistic UK trade-material mock data instead of calling the real API — this is also the local-dev default, so `npm run dev` works out of the box with no key.
- Wraps whichever provider in `createCachedProvider` (`lib/pricing/CachedPriceSearchProvider.js`), backed by `DbCacheStore` (`lib/pricing/cache/DbCacheStore.js`) against the `price_search_cache` Postgres table. Cache key is a hash of the normalized query (lowercased, words sorted — the provider still gets the original) + country + currency + maxResults + merchant filter; TTL is `PRICE_CACHE_TTL_SECONDS` (default 7 days). Errors and zero-result responses are never cached — a transient failure or an empty result today shouldn't be memoized as if it were a real answer.

**Merchant filtering:** `lib/pricing/merchant-category.js`'s `merchantCategory()` buckets each result's free-text merchant name (e.g. Serper's `"Amazon.co.uk - Amazon.co.uk-Seller"`) into one of `MERCHANT_CATEGORIES` (Screwfix, Toolstation, B&Q, Amazon, Other) by substring match, keyed off a single `MERCHANT_NAME_PATTERNS` list so the category names and their matching substrings can't drift apart. Shared by the server (the route's input validation, the provider's merchant filter) and the client (the modal's filter buttons), so both sides can never bucket the same merchant differently. Clicking a merchant filter re-queries the API with `options.merchant` set — a server round-trip, not a client-side filter of the already-fetched page, because a mixed page of `maxResults` results could easily contain far fewer than 10 from any one merchant even when 10+ exist for it; the provider over-fetches and filters server-side before applying `maxResults` so a merchant filter still returns a full page when one exists.

**Sorting**, by contrast, *is* a pure client-side re-sort of the already-fetched page (`sortProducts` in `app/materials-pricing.js`, keyed by a `SORT_COMPARATORS` lookup) — price and rating are already on every result, so reordering them needs no extra fetch, unlike the merchant filter. Options: best match (provider order, the default), price low→high/high→low, rating high→low (unrated items always sort last).

**Persisting a choice:** clicking a product calls `selectLinePrice` (`lib/actions/quote-prices.js`, a Server Action), which upserts into `quote_line_prices` — one row per `(quote_id, material_name)`, storing the chosen `ProductResult` as JSON. This is an overlay the quote-view page joins in by material name to show an inline price badge; it is deliberately separate from `generated_quotes.content` and `tool_call_log`, which stay exactly as originally drafted. Re-selecting a material's price upserts the same row rather than accumulating history.

`/api/pricing/search` also does its own input validation (query length/shape, `options.merchant` against `MERCHANT_CATEGORIES`), a best-effort in-memory per-IP rate limit (soft — see the route's own comment on why this can't be a hard guarantee on Vercel), and maps `PriceSearchError` codes (`RATE_LIMITED`, `NO_RESULTS`, `PROVIDER_DOWN`, `INVALID_QUERY`, `NOT_IMPLEMENTED`, `UNKNOWN`) to HTTP status codes rather than leaking raw provider error messages to the client.

There used to be an earlier pricing system (`data/sample-prices.json`, `lib/fuzzy-match.js`, a Playwright scraper run via GitHub Actions into a `scraped_prices` table) called inline from the agent loop's `lookup_price` tool. All of it has been removed — the JSON catalog and fuzzy-match module are gone, `scripts/scrape-prices.mjs` and `.github/workflows/scrape-prices.yml` don't exist, and `scraped_prices` still exists in `lib/schema.sql` but nothing queries it any more.

## Materials refinement (Phase 3a addendum)

The web UI's job → quote flow is a two-phase pipeline with a mandatory trader review step in between, not a single agent run:

1. **Phase A — clarify, then propose materials.** `POST /api/quote/propose-materials` (`lib/propose-materials.js`) takes `{ trade, jobDescription, priorQuestions }` (`priorQuestions` an array of `{ question, answer }`, empty on the first call) and returns either `{ clarifyingQuestion }` or `{ materials: [{ label, quantity?, description? }] }`. Deliberately ordered this way — clarifying questions **before** materials are proposed, not after — because the original single-loop `SYSTEM_PROMPT` always asked `ask_user` before `identify_materials` for exactly this reason: an answer like "40-year-old consumer unit" or "oil not gas" changes *which* materials are needed, so asking after the trader has already locked in a materials list would be too late for the answer to matter. The ambiguity test the sub-prompt applies mirrors the original `ASK_USER_STEPS` scope too — it's not narrowed to "would this change which materials are needed," but "would this materially change the scope, materials, or assumptions for the job" (property type, existing installation's age/condition, access/site constraints, and similar "which variant of this job is it" questions all qualify, not just material-selection trivia) — so a trader gets genuine job-clarifying questions asked first, not only ones framed around picking a product. Each round is one non-streaming sub-LLM call on `PHASE_A_MODEL` (default Haiku); the client (`app/quote/new/page.js`) re-calls this endpoint with the accumulated Q&A each time a question comes back, capped at `MAX_CLARIFYING_QUESTIONS` (4, matching the "up to four" cap the original `ask_user` guidance always used) — enforced in the prompt *and* in code (a response that still asks after the cap throws, rather than looping the trader forever). The model occasionally drifts to a plural `clarifying_questions` array despite the prompt asking for one singular object — handled by taking the first entry rather than failing the round-trip. It has its own code-level backstop for the never-do rules — `isRejectedLabel` in `lib/material-rules.js`, shared with `tools/identify-materials.js`'s `isRejectedMaterial` so the skip-keyword/bundling/alternative rules can't drift between the CLI's extraction path and this one.
2. **Refinement UI.** `app/quote/new/page.js` holds a `phase` state machine (`form` → [`analysingPhotos` → `reviewingPhotos` →] `keyQuestions` → `proposing` ⇄ `clarifying` → `refining` → `generating` → `running`) instead of the old one-shot submit. `keyQuestions` (`app/key-questions-form.js`) asks the trade's fixed key questions (`lib/key-questions.js`, including an approximate-area range question for area-priced trades) all on one page, with no LLM call; with photos, `lib/analyse-job-photos.js` drops any the site photos answer or that don't apply, and appends up to 3 job-specific gaps of its own. Answers go to Phase A as `priorQuestions` (counting toward its cap) and to Phase B as `followUpAnswers`; skipped/"not sure" topics go as `photoFindings.unclear`, which Phase A never re-asks and Phase B must cover in ASSUMPTIONS or EXCLUSIONS (`lib/photo-findings.js`). Design and rebuild spec: `docs/PHASE_3B_KEY_QUESTIONS.md`. `proposing`/`clarifying` loop against each other for Phase A's round-trip above, rendering the clarifying question inline (full-page, not a dialog — there's no in-flight run to interrupt yet) via the shared `app/ask-question-form.js` component. `refining` renders `app/materials-refinement.js`'s `MaterialsRefinement` — a full-page step (not a modal, since it's a required stage, not an optional interruption), checkbox per proposed material (checked by default) plus a `+ Add material` free-text input for trader-typed items; a proposed material's `quantity` (see Phase A above) is shown alongside its description as read-only caption text, not an editable field — no label editing, no quantity/unit *input* — v1 scope is add/remove only, editing quantity happens later via the Qty input on the quote-view page's price-lookup list (`app/materials-pricing.js`). Going "Back" from either step discards everything gathered so far and returns to the job description form.
3. **Phase B — generate the quote.** `POST /api/quote` (`app/api/quote/route.js`) is now always Phase B: `materials` (the trader-checked list, `{ label, quantity?, description? }[]`, possibly empty for a labour-only job) is a required field, not optional — the route 400s without it rather than falling back to the old single-loop behaviour. `followUpAnswers` (the same `{ question, answer }[]` gathered in Phase A) is optional and threaded straight into `buildInitialMessage` as an "ADDITIONAL DETAILS FROM THE TRADER" block, so Phase B's drafting reflects them without needing to ask anything itself. Both `identify_materials` **and `ask_user`** are excluded from the tools handed to `runAgent` for this run (a stronger guarantee than a prompt instruction that the model can't silently re-derive materials or ask a now-pointless follow-up question), and `toolContext.materials` is pre-populated from the trader's list so `draft_section` uses it directly. The system prompt is `buildPhaseBSystemPrompt()` (`prompts/system.js`) — composed from the same shared prompt pieces as `SYSTEM_PROMPT` (so tone rules, never-do rules, and section-drafting guidance can't drift between the two) minus the ask_user/identify_materials/clarifying-question-by-trade guidance, plus `PHASE_B_MATERIALS_RULES`: treat the materials list as final (never add/omit/reword — trader-typed items like "screws" come through verbatim, never "helpfully" expanded) and don't attempt to ask anything further. Runs on `PHASE_B_MODEL` (default: whatever `CLAUDE_MODEL`/`getModel()` already resolves to).
4. **Phase 3a compatibility.** The refined `{label, quantity?, description?}` list is converted back to the `{name, quantity, notes, confidence: 'trader_confirmed'}` shape `tools/identify-materials.js` has always produced (`quantity` passed straight through, `description` renamed to `notes`), and recorded as a synthetic `identify_materials` `tool_call`/`tool_result` pair pushed onto `steps` before the run starts — purely so `lib/quote-materials.js`'s `extractMaterialsFromToolCallLog` (and everything built on it: the quote-view page, the Phase 3a price-lookup UI, including its editable Qty input) keeps working with zero changes and no knowledge that this phase split exists.
5. **Analytics.** On Continue, the client fires Phase B first, then calls the `recordRefinementEvents` Server Action (`lib/actions/log-refinement.js`) with one event per material the trader saw: `source: 'llm_proposed' | 'trader_added'`, `action: 'accepted' | 'rejected'` (an unchecked trader-added item, never having been "accepted", produces no row at all). Written to `material_refinement_events` via `lib/db.js`'s `logRefinementEvents`, one Postgres transaction (`sql.transaction`). Pure data-collection surface — nothing in the app reads it back; a write failure is logged and swallowed, never surfaced to the trader.

The CLI (`qf.js`) is untouched by any of this — it still runs the original single-loop flow with `identify_materials` and `ask_user` (in that order) as in-loop tools, since there's no refinement UI to pause for. `ask_user`'s `quote_runs`/`pending_answers`/watchdog plumbing in `app/api/quote/route.js` is also left fully in place, just dormant for Phase B runs now that the tool isn't offered — see `lib/quote-runs.js`.

## Web UI (Phase 2b)

Next.js 15 (App Router), reusing `agent.js` and `tools/index.js` directly. `/quotes`, `/quote/[id]`, and `/profile` read `lib/db.js` directly from a Server Component or Server Action — deliberately **no** separate JSON API for these (an earlier version of this had one; it was dropped as an unused, redundant layer once the direct-read pages existed). `/quote/new` + `app/api/quote/route.js` is the one place a real HTTP layer is unavoidable.

Pages:
- `/profile` — trader identity form
- `/quote/new` — job description form; polls for live progress
- `/quote/[id]` — view a saved quote, including the per-material "Find prices" UI (see "Pricing" above)
- `/quotes` — list of past quotes

`/quotes`, `/quote/[id]`, and `/profile` set `export const dynamic = 'force-dynamic'`: without it, Next statically prerenders them at build time, which would freeze their data and never reflect a later update — including one made through the CLI, which shares this same Neon database but has no way to trigger Next's cache revalidation from outside a Server Action.

**Short-polling, not a held-open stream:** `POST /api/quote` used to hold one long-lived SSE `ReadableStream` response open for the whole agent run. This was replaced after a production incident: a corporate/VPN proxy in a trader's network path killed connections held open more than a few minutes (surfacing to the browser as a bare `502 Could not relay message upstream`, confirmed via response headers showing the proxy itself generated the failure, not Vercel) — exactly the shape of connection an `ask_user` wait plus several sequential `draft_section` calls produces. `POST /api/quote` now just inserts a `quote_runs` row and returns `{ runId }` in well under a second; the actual agent loop runs afterwards via `next/server`'s `after()`, in the same invocation, writing progress (`onStep` output, the pending `ask_user` question, and the terminal `done`/`error`/`aborted` state) to that row. The client (`/quote/new`) polls `GET /api/quote/[runId]/status` every 2s and re-derives its displayed log from the row's `steps` array each time, rather than accumulating incremental events. `after()` does **not** extend `maxDuration` — the background run still shares the same 300s ceiling as before, just decoupled from whether the client's connection is still open.

`ask_user` itself still bridges through `lib/quote-runs.js`'s `waitForAnswer`, unchanged by this — it already polls the Postgres-backed `pending_answers` table (not a `globalThis` Map; an earlier version used one, but Vercel's Node.js functions have no session affinity, so the request posting the answer routinely lands on a different instance than the one still waiting, and an in-memory Map is invisible across that boundary) that `POST /api/quote/[runId]/answer` writes to.

Two protections in `app/api/quote/route.js`, each fixing a real production incident:
- **A `last_polled_at` watchdog**, replacing the old `AbortController`-on-stream-`cancel()`. A short-polling transport has no socket-level disconnect signal — a closed tab just stops polling. `GET /api/quote/[runId]/status` stamps `last_polled_at` on every poll; a `setInterval` inside the background run checks it every 15s and aborts (via the same `AbortController`/`signal` plumbing as before) if it's gone stale for 60s, so an abandoned run still stops making Anthropic API calls nobody is waiting on — the incident this was originally built to fix.
- **A 90-second pipeline margin (`PIPELINE_MARGIN_MS`), not just a per-question timeout.** An unanswered question's fallback previously raced Vercel's hard `maxDuration` kill and could lose — the fallback fires, but the *rest* of the pipeline (remaining `draft_section` calls, `save_quote`, the DB write) needs real time too. Each `ask_user` call gets `min(ASK_USER_TIMEOUT_MS, remaining-budget-under-the-margin)`, so a second or third clarifying question later in the run degrades to an immediate fallback rather than re-consuming a fresh full timeout each time (confirmed in production: two stacked unanswered questions hit exactly `maxDuration` with no terminal state ever written, surfacing as a bare 502 under the old SSE architecture).

`npm run db:migrate` (`scripts/migrate.mjs`) is the only place `lib/schema.sql` is ever read — run it once against a fresh `DATABASE_URL` before first use. `lib/db.js` never executes schema at runtime (a prior version inlined the schema and ran it lazily on first request per cold start, including an `ALTER TABLE ... ADD COLUMN` existence check on every invocation — this was itself a source of churn, replaced by the one-shot migration script).

## Error handling

`tools/index.js`'s `executeTool` is the single choke point for all four tools: it validates required fields per tool before dispatch, then wraps the call in try/catch. A validation failure or caught exception becomes `{ error: true, message }`, returned as a normal tool result so Claude sees a recoverable failure and can adapt (skip an item, ask the user, retry) instead of the whole run crashing. The one exception is `401`/`403` auth errors, which propagate up (to `qf.js`'s top-level handler in the CLI, to the `quote_runs` row's `error` state in the web route) since no amount of retrying or model adaptation fixes a bad API key.

`agent.js`'s `onStep` calls are also wrapped defensively — a bug in the caller's display/formatting code (CLI console output, or the web route's progress-write callback) logs a warning instead of aborting the agent loop mid-turn.

CLI input is validated up front too: `qf.js`'s `--trade` and `--tone` options use yargs `choices` against `VALID_TRADES`/`VALID_TONES` (in `lib/constants.js`, shared with the web UI), so an invalid value fails fast instead of silently flowing into every prompt. The web route validates the same way against a 400 response.

## Quote output

Assembled quotes are plain-text, following the knowledge bank spec: all-caps section headings, bullet points only, no markdown tables. Must paste cleanly into an email client. The CLI additionally writes this to `output/` as a `.md` file (best-effort — see `save_quote` above); both surfaces persist the same content to `generated_quotes.content` in Neon.

Header: `[BUSINESS NAME] | [CONTACT DETAILS] | Date: ...` on one pipe-separated line (`tools/save-quote.js`'s `formatHeaderLine`) — a multi-line `contact_details` value has each of its own lines folded into additional pipe segments, so the header is always exactly one line regardless.

Section order: header · introduction · MATERIALS & EQUIPMENT · SCOPE OF WORK · ASSUMPTIONS · EXCLUSIONS · NEXT STEPS · DISCLAIMERS.

## Never-do rules (preserve across all changes)

These are safety guardrails, not style preferences:

- Claude must never invent or estimate material prices — `draft_section` always renders materials as `[Price TBC]`; the only real prices that can appear come from a trader's own explicit selection in the "Find prices" UI (see "Pricing" above), stored separately in `quote_line_prices` and never written into the drafted quote text itself
- No regulatory compliance claims (Part P, Gas Safe, BS 7671, etc.)
- No markdown tables anywhere in quote output
- Materials lines must be single specific products — no "X or Y" alternatives, no bundling two items on one line
- `identify_materials` sub-prompt must retain the skip rules for service items (disposal fees, hire costs) and generic terms (sundries, consumables)

These rules are enforced two ways, not just by prompt instruction: `NEVER_DO_RULES` (exported from `prompts/system.js`) is passed as the `system` parameter to the `identify_materials`, `propose_materials`, and `draft_section` sub-LLM calls in addition to being part of the main loop's `SYSTEM_PROMPT`, and the materials skip-rule is additionally enforced in code via `isRejectedLabel` (`lib/material-rules.js`) — a post-filter used by both `tools/identify-materials.js`'s `isRejectedMaterial` (the CLI's and old web flow's in-loop extraction) and `lib/propose-materials.js` (the web UI's Phase A, see "Materials refinement" above) rather than relying on the model alone.

## Environment

```
ANTHROPIC_API_KEY=        # required
CLAUDE_MODEL=             # optional, defaults to claude-sonnet-4-6
PHASE_A_MODEL=            # optional, defaults to claude-haiku-4-5-20251001; web UI's materials-proposal step (see "Materials refinement" above)
PHASE_B_MODEL=            # optional, defaults to CLAUDE_MODEL/getModel(); web UI's quote-generation step
IDENTIFY_MATERIALS_MODEL= # optional, defaults to claude-haiku-4-5-20251001; CLI's in-loop identify_materials extraction
PHOTO_ANALYSIS_MODEL=     # optional, defaults to CLAUDE_MODEL/getModel(); one vision call per job over the trader's site photos (lib/analyse-job-photos.js)
BLOB_READ_WRITE_TOKEN=    # optional; private Vercel Blob store for job photos (lib/job-photos.js). Unset = photo routes return 503
REQUEST_TIMEOUT_MS=       # optional, defaults to 60000; Anthropic client request timeout (lib/anthropic-client.js)
DATABASE_URL=             # required; Neon/Postgres connection string, used by lib/db.js and scripts/migrate.mjs
SERPER_API_KEY=           # optional; Google Shopping price search (see "Pricing" above). Unset = mock data
SERPER_MOCK_MODE=         # optional, defaults to unset/false; forces mock price data even with a real key set
PRICE_PROVIDER=           # optional, defaults to 'serper'; 'dataforseo' is an unimplemented skeleton
PRICE_CACHE_TTL_SECONDS=  # optional, defaults to 604800 (7 days); price_search_cache row lifetime
```

`qf.js` treats an empty-string `ANTHROPIC_API_KEY`/`CLAUDE_MODEL` as unset before calling `dotenv.config()` — this devcontainer's `remoteEnv` pre-sets both to `""` when the host has no value, which would otherwise make `dotenv` skip loading the real value from `.env` (its default `override: false` treats an existing-but-empty var as "already set"). This still means a real operator/CI-supplied value is never silently overridden by a stray local `.env`. `scripts/web-env.mjs` applies the same clearing (plus `DATABASE_URL`) before spawning `next`, since Next's own `.env` loader has the identical behaviour.

`lib/db.js` lazily creates its Neon client inside a `getClient()` function reading `process.env.DATABASE_URL` at call time, not at module load — a module-scope client would permanently capture `undefined` in the CLI, since ESM evaluates static imports (and top-level code in them) before `qf.js`'s own `dotenv.config()` runs.

## Testing

`agent.test.js` (vitest) tests `agent.js`'s loop directly, mocking `lib/anthropic-client.js` — architecture-agnostic, so it applies regardless of how the CLI or web UI evolve. `lib/pricing/` has its own suite (`index.test.js`, `CachedPriceSearchProvider.test.js`, `providers/SerperPriceSearchProvider.test.js`, `cache/DbCacheStore.test.js`) covering provider selection, caching behaviour, and Serper response mapping/mock mode. `lib/quote-materials.test.js` and `tools/{draft-section,identify-materials}.test.js` cover their respective modules. `lib/material-rules.test.js` and `lib/propose-materials.test.js` cover the materials-refinement flow's Phase A (see "Materials refinement" above); `app/api/quote/route.js`, `app/quote/new/page.js`, `app/materials-refinement.js`, and `lib/actions/log-refinement.js` have none, consistent with "Known caveats" below. The `.claude/skills/test-impact` skill (`npm run test:impact`) diffs the working tree and reports which tests a change touches, or flags a change with no coverage at all — use it before wrapping up a feature. See its `SKILL.md` for the full workflow.

## Known caveats

- No test coverage for `lib/db.js`, the CLI's interactive commands, or the `app/` web UI's own components (`app/materials-pricing.js` included) — deferred deliberately (originally per the Phase 2 brief, `prompts/05_QF_PHASE_2.md`), and a prior, more extensive suite covering some of this was dropped in the `main` merge since it tested a parallel JSON API that no longer exists. `tools/*.js` and `lib/pricing/**` are the exceptions — both do have coverage now (see "Testing" above).
- `trader_prices`, `historical_quotes`, and `scraped_prices` are all still defined in `lib/schema.sql` but no longer read or written anywhere in the app — leftover schema from removed features (see "Trader profile" and "Pricing" above). Left in place rather than dropped, since a migration to drop columns/tables in a one-shot, no-rollback `db:migrate` script is a separate decision from a docs cleanup.
- `next@15.5.25` pulls in a `postcss` version with published XSS/path-traversal advisories (`npm audit`), fixed only in `next@16` — a breaking bump deliberately not taken here since 15 is the version already proven to deploy correctly.

## Phase roadmap (for context)

- **Phase 2** — Neon Postgres persistence (trader profile, quote history) + Next.js web UI, reusing `agent.js`/`tools/` as-is
- **Phase 3a** (this) — Live price search: a trader looks up real, current prices per material line via Google Shopping (Serper), triggered on demand from the quote-view page rather than during drafting — see "Pricing" above. Superseded an earlier, fully removed Phase 3 attempt (a Playwright scraper feeding an agent-side `lookup_price` tool) and the Phase 2a trader-price-history import feature, neither of which survived into this build
- **Phase 3b** — Trade key questions: 3–4 fixed questions per trade (`lib/key-questions.js`) asked on one page before Phase A, with or without photos; unanswered ones become stated assumptions — see "Materials refinement" step 2 above. Full rebuild spec: `docs/PHASE_3B_KEY_QUESTIONS.md`
- **Phase 3c** (proposal, not started) — Trade knowledge packs: today trade-specific quality rests almost entirely on the model's general knowledge (Phase A/B get little more than the trade name). Proposes reviewed per-trade, per-job packs (diagnostic questions, materials per variant, standard assumptions/exclusions, pitfalls) injected into Phase A/B, plus an eval set per trade; plumber pilot first. See `docs/PHASE_3C_TRADE_KNOWLEDGE.md`
- **Phase 4** — Optional auth/multi-tenant support (Phase 2 is deliberately single-tenant — one trader per deployment, no login)
