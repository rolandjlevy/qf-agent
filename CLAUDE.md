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

**Prompt caching (`agent.js` only):** `@anthropic-ai/sdk` is pinned at `^0.124.0` specifically because caching's top-level automatic `cache_control` field didn't exist on the stable `messages.create()` until `0.78.0` (on the previously-pinned `0.27.3`, `cache_control` only existed in a deprecated `beta.promptCaching` namespace) — this was a deliberate, verified bump (SDK error-class shapes, client constructor options, and `RequestOptions.signal` all confirmed unchanged across the jump; `npm test` and `npm run web:build` both pass). Each turn's request carries two breakpoints: an explicit one on the (only) system text block — render order is `tools` → `system` → `messages`, so this caches the fixed `TOOL_DEFINITIONS` together with the system prompt, both of which are frozen for the life of one quote run — plus a top-level `cache_control` that auto-places a breakpoint on the growing `messages` tail and moves it forward each turn. Both use the default 5-minute TTL (a longer `ttl: '1h'` would help if `ask_user` waits routinely exceeded 5 minutes between turns, but that hasn't been observed in practice — revisit if it is). `identify_materials` and `draft_section`'s sub-LLM calls deliberately don't cache `NEVER_DO_RULES`: at roughly 150 tokens it's well under every current model's minimum cacheable prefix (512–4096 tokens depending on model), so a marker there would be a silent no-op (`cache_creation_input_tokens: 0`), not a saving.

`agent.js`'s `api_end` step carries `response.usage` so callers can verify caching is actually landing hits rather than just being configured — `qf.js` prints a `cache: N read, N written, N uncached` line when either count is nonzero, and `app/api/quote/route.js` logs the same to the server console (not the trader-facing polled progress log). `cache_read_input_tokens` should be 0 on turn 1 and nonzero on every turn after — if it stays 0 throughout a run, something in `systemPrompt`/`tools`/the messages prefix is being rebuilt non-deterministically between turns (see the Anthropic prompt-caching docs' silent-invalidator checklist).

**The five tools:**

| Tool | Implementation | Notes |
|---|---|---|
| `ask_user` | transport supplied via `toolContext.askUser` | `tools/ask-user.js` has no `inquirer` import — the CLI (`qf.js`) supplies an inquirer-backed callback, the web UI (`app/api/quote/route.js`) supplies an SSE-question/wait-for-answer callback (`lib/quote-runs.js`). This split exists because a static `inquirer` import anywhere reachable from the API route's module graph breaks Vercel's build bundling |
| `identify_materials` | sub-LLM call | Returns `{ materials: [{name, quantity, notes}] }`; results are post-filtered to drop entries that are missing/non-string, too short, contain "or"/multiple commas, or match a skip-keyword list — a code-level backstop for the never-do rules below |
| `lookup_price` | trader history, then live scrape (when available), then cache, then fuzzy match on `data/sample-prices.json` | See "Trader profile & pricing" and "Live per-quote scraping" below. Returns `found`, `cheapest`, `cheapest_supplier`, `verified`, `source`; returns `found: false` gracefully for a non-string/empty `material_name` or a matched entry with no prices, instead of throwing |
| `draft_section` | sub-LLM call per section | Seven sections: introduction, scope, materials, assumptions, exclusions, next_steps, disclaimers |
| `save_quote` | assembles + best-effort `fs.writeFileSync` | Assembles sections in fixed order; returns the assembled `content` plus `file_path`/`filename` (both `null` when the local write didn't happen). The local write to `output/` is wrapped in try/catch (non-fatal) since Vercel's filesystem is read-only outside `/tmp` — `content` is the durable record, persisted to `generated_quotes.content` in Neon by the caller. If a same-day local file for the same trade/job already exists, appends `-2`, `-3`, ... rather than overwriting it |

`lookup_price` itself has no `playwright`/`playwright-core` import either, for the same reason as `ask_user`'s `inquirer` split — both the CLI (`qf.js`, via `lib/live-scrape.js`) and the web route (`app/api/quote/route.js`, via `lib/live-scrape-remote.js`) inject a real live-scraping callback into `toolContext.liveScrapePrice` themselves; `tools/lookup-price.js` only ever calls whatever it's handed. See "Live per-quote scraping" below.

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

`data/sample-prices.json` — 119 entries (grown from an initial 50), the catalog's canonical `name`/`aliases`/`trade` taxonomy. Imported as a static JSON module (`import db from '../data/sample-prices.json' with { type: 'json' }` in `tools/lookup-price.js`), not read via `fs` at runtime, so it's safely bundled into the Vercel deployment. It remains the single source of truth for *which materials exist and what they're called* — Phase 3 (below) changed where their *prices* come from, not this catalog.

`lookup_price` uses word-overlap fuzzy matching with a score threshold of 40 (see `lib/fuzzy-match.js`; `MATCH_THRESHOLD`) to find the canonical material, then checks sources in order: the trader's own `trader_prices` (see above), then a live scrape when available (below), then the scraped-price cache (below), then `sample-prices.json`'s own `prices` array as the final placeholder fallback (`verified: false`, `source: 'sample_db'`). The `verified` flag flows through to the agent's system prompt — unverified prices get a note added to the quote automatically.

**A catalog match is no longer required to attempt a live scrape.** It used to be: if `material_name` didn't clear `MATCH_THRESHOLD` against the catalog, `lookup_price` returned `found: false` immediately, before live scraping or the cache ever got a chance to run — even though neither of those actually needs a pre-known canonical name, just something to search suppliers with and score results against. Confirmed in production this was blocking the *majority* of real quotes' materials: `identify_materials` (an LLM) generates far more specific/varied phrasing per job than a ~120-entry fixed catalog can ever cover by word-overlap alone. When there's no confident catalog match and live scraping is available, `lookup_price` now searches suppliers directly using the raw `material_name` text (scored against that same raw text, via `tryLiveWithCacheMerge`) instead of giving up — confirmed in production this alone recovered real prices for roughly two-thirds of materials that previously fell through to `[Price TBC]` in real quotes. A catalog match, when found, still takes priority as the search query (a curated canonical name + aliases beats raw job-specific phrasing), and its live/cache result is merged the same way either path. Two related, narrower fixes landed alongside this: an empty `prices: []` placeholder entry (a catalog row the nightly batch scrape never found a confident match for — roughly 60% of the catalog, confirmed in production) no longer blocks live scraping/the cache either, since that check now only gates the final `sample_db` tier where `prices` is actually read; and `lib/fuzzy-match.js`'s `glueCountedTerms` now recognizes word-form counts ("single", "double", "triple" → "1", "2", "3") before gluing to "gang"/"way", since job descriptions routinely use word form while real supplier product titles almost always use digits — confirmed in production this exact mismatch (e.g. "Single gang" vs "1-Gang") was costing several points of word-overlap score and landing genuine matches just under threshold, in one case letting an unrelated *wrong* product win over the correct one purely because the wrong product's name happened to also contain the literal words "single"/"gang" as coincidentally-separate tokens.

**Scraped prices (Phase 3):** `scripts/scrape-prices.mjs` populates a `scraped_prices` Postgres table (see `lib/schema.sql`) with real, current prices from Screwfix/Toolstation/B&Q, run out of band via GitHub Actions (`.github/workflows/scrape-prices.yml`, nightly + manual `workflow_dispatch`) — never inside the live agent request path, since Playwright doesn't fit Vercel's serverless functions and `app/api/quote/route.js` already fights a tight `maxDuration` budget (see below). `lookup_price` reads this cache (`source: 'scraped'`, `verified: true`) ahead of the static JSON fallback, ignoring rows older than `SCRAPED_PRICE_MAX_AGE_DAYS` (14 days) so a stalled scrape schedule degrades to the honest placeholder rather than serving an increasingly stale "verified" price.

Each supplier gets its own module in `scripts/scrapers/` (`screwfix.mjs`, `toolstation.mjs`, `bq.mjs`), each returning several top search-result candidates rather than trusting the first one — confirmed necessary in testing, where a literal top result mismatched the target spec (e.g. searching "MCB Type B 6A" ranked a Type A product first; "Consumer unit 10-way RCBO" ranked an 8-way unit first). `scrape-prices.mjs` scores every candidate against the canonical material's `name`/`aliases` with the same `scoreMatch`/`MATCH_THRESHOLD` used everywhere else, and only caches the best match if it clears the threshold — a low-confidence result is skipped, not cached as if verified. Toolstation additionally fronts a Cloudflare JS challenge ("Just a moment…") that a real headless Chromium session clears on its own with an 8s wait (vs. 3s for the other two) — no stealth plugin or proxy needed; confirmed via manual probing that plain Playwright from a datacenter IP isn't blocked by any of the three suppliers.

To update the catalog itself (add/remove a material, change aliases): edit `sample-prices.json` directly, then either wait for the next scheduled scrape or trigger `.github/workflows/scrape-prices.yml` manually to pick it up immediately. The top of the array is sorted priority-first (consumer units, MCBs, copper pipe, emulsion paint, plasterboard).

**Live per-quote scraping:** both surfaces scrape only the handful of materials `identify_materials` actually returned for the current job, synchronously, per `lookup_price` call — not the full 50-item catalog — reusing the same `scripts/scrapers/*.mjs` search functions and `scoreMatch`/`MATCH_THRESHOLD` logic as the nightly batch job. The three suppliers are queried in parallel per material (bounding latency to Toolstation's ~8-9s rather than the sum of all three); confirmed in testing at roughly 10-25s per material depending on network conditions. Any failure — no browser available, a timed-out or blocked request, no confident match — resolves to `null`, and `lookup_price` falls straight through to the existing scraped-price cache / `sample-prices.json` chain, exactly as if live scraping weren't available. A result found live is cached into `scraped_prices` (best-effort — a caching failure must not discard a price that was already successfully scraped) so it also benefits a later quote and isn't lost to the next nightly overwrite.

The two surfaces differ only in *how* they get a browser, because of the same Vercel constraint that keeps the nightly batch scrape running via GitHub Actions instead of inside `app/api/quote/route.js` — Vercel's serverless functions can't launch a real headless browser process:
- **CLI:** `lib/live-scrape.js` launches a local headless Chromium via the full `playwright` package. `qf.js` injects it via `toolContext.liveScrapePrice`, launching the browser lazily on first use and reusing it for the rest of the run. `closeLiveScrapeBrowser()` is called from `qf.js`'s `finally`, and again before its `process.exit(1)` on error, since `process.exit()` doesn't unwind to run a `finally` block.
- **Web:** `lib/live-scrape-remote.js` connects instead to a hosted remote browser over CDP (e.g. [Browserless](https://browserless.io)) via `BROWSERLESS_WS_ENDPOINT`, using `playwright-core` (the CDP client only, no bundled browser binaries — keeps the same "no static heavy import in the route's module graph" property `ask_user`/`inquirer` established, confirmed via `npm run web:build`: `/api/quote`'s bundle size is unchanged with this file added). `app/api/quote/route.js`'s `after()` callback creates one `createRemoteScraper()` instance per run (reusing the connection across every `lookup_price` call in that run) and closes it in its own `finally`, alongside the watchdog. Each call's `timeoutMs` is capped by `LIVE_SCRAPE_TIMEOUT_MS` *and* by the same remaining-pipeline-budget math `askUser`'s `ASK_USER_TIMEOUT_MS` already uses (`deadline - Date.now()`) — a run already close to `maxDuration` skips live scraping rather than risk losing the rest of the pipeline (remaining `draft_section` calls, `save_quote`, the DB write) to it. Unset `BROWSERLESS_WS_ENDPOINT` (the default) makes `liveScrapePrice` resolve to `null` immediately, so the web app's behaviour is completely unchanged from before this existed unless an operator deliberately configures it.

**Confirmed in testing against a real Browserless free-tier connection: only Toolstation succeeds.** Screwfix returns a CloudFront 403 ("request blocked") and B&Q returns its own maintenance-style block page — both are WAF/IP-reputation blocks on Browserless's shared datacenter IP range, not a fingerprinting issue (Browserless's `/chromium/stealth` route was also tried and made no difference, ruling that out). Because of this, `tools/lookup-price.js` never trusts a live result alone — it merges `live.all_prices` with whatever's still fresh in `scraped_prices` (live entries win on a same-supplier collision, since they're strictly newer), so a partial live match on the web app still gets compared against the nightly batch scrape's Screwfix/B&Q prices for that material rather than silently hiding a cheaper cached price behind an incomplete live one. `source` reflects whichever supplier actually won the merge (`'live_scraped'` if it was a live entry, `'scraped'` if it was a cache row) — confirmed with a synthetic cache row cheaper than the real live Toolstation price, forcing the merge to pick it over the live result. Restoring full 3-supplier live coverage on the web app would need a residential-proxy add-on or a different hosted-browser provider — not attempted here.

**Web-search price fallback:** the live-scrape/cache chain above is inherently limited to whichever suppliers have a scraper module (Screwfix/Toolstation/B&Q), and those are general DIY retailers — confirmed in production they don't reliably stock specialist trade materials outside their core categories (a roofer's EPDM rubber roofing membrane, adhesive, and flashing tape all came back `[Price TBC]`: Toolstation had zero candidates, Screwfix's top results were a different membrane type entirely, and B&Q only sells pre-bundled consumer roof kits, not the by-the-metre/by-the-litre trade quantities a roofer orders). Writing a bespoke scraper per specialist merchant per trade doesn't scale to the app's 17 trades. `lib/web-search-price.js` (`ENABLE_WEB_SEARCH_PRICE_FALLBACK`, default off) is a true last resort — a single, generic Claude API call using the `web_search_20260209` server tool (no `playwright` import, so unlike the live-scrape split it needs no CLI/web divide and has zero Vercel bundling impact), invoked by `tools/lookup-price.js` only when both the catalog match/live-scrape/cache chain **and** the raw-material-name bypass have already failed.

**Honest reliability, from real testing, not just the design intent:** this generalizes across any trade (it searches the whole web, not a fixed site list) and did once find a genuinely correct product (ClassicBond EPDM membrane sold per linear metre, not a kit, from Roofing Superstore) — but across 6 real attempts in testing, only that one succeeded. The other 5 (including retesting the *same* material at higher `max_uses` with retries explicitly allowed) all returned `found: false`, because `web_search_20260209` runs its own `code_execution` wrapper internally (confirmed, not something this app's prompt controls) which itself errors out unpredictably — the model correctly declines rather than fabricate a price when that happens, matching `NEVER_DO_RULES`, but it means the real-world hit rate is lower than a single early success suggested. Cost is real either way (~$0.07-0.26 per attempt observed, whether it finds something or not) — a result is deliberately returned with `verified: false, source: 'web_search'` even on success, since it depends on the model reading a search snippet rather than parsing an exact price off a live DOM. Given this, it stays opt-in rather than becoming a default part of the pricing chain; monitor its actual hit rate against real quotes before deciding whether the cost is worth it for your usage.

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
BROWSERLESS_WS_ENDPOINT=  # optional; enables live per-quote scraping on the web app — see "Live per-quote scraping" below. Unset means lookup_price falls back to the existing scraped_prices cache / sample-prices.json chain
ENABLE_WEB_SEARCH_PRICE_FALLBACK=  # optional, default off; see "Web-search price fallback" below. Real API cost per attempt, low real-world hit rate — enable deliberately
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
