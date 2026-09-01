# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Checkpoint marker (2026-08-27, branch `development-phase-2`):** Phase 2a from `prompts/05_QF_PHASE_2.md` (steps 1–4: SQLite trader profile in `lib/db.js`, trader-price-first `lookup_price`, trader context wired into the system prompt/`draft_section`/`save_quote`, and `node qf.js import <path>`) is implemented and verified in the working tree, but **not committed**. Everything else in this file still describes the last-committed (Phase 1) state until that lands. Phase 2b (web UI) has not been started — checkpoint reached per the brief's own instruction to pause after Phase 2a.

## Running the agent

```bash
node qf.js --trade=<trade> --tone=<tone> "<job description>"
```

Pass CLI args through npm if preferred:
```bash
npm start -- --trade=electrician --tone=professional "Replace consumer unit, 8 MCBs"
```

There are no build, lint, or test steps — this is a plain ESM Node.js project with no compilation.

## Architecture

This is a **true agent** — Claude drives the sequence via tools. There is no hardcoded flow. The agent decides whether to ask follow-up questions, what materials to look up, and in what order to draft sections. The number of turns varies per job.

**Data flow:**

```
qf.js  →  runAgent()  →  Claude API  →  tool call(s)
               ↑                              ↓
         messages[]  ←  tool_result  ←  executeTool()
```

**Key separation:** `agent.js` is a generic reusable loop with zero QuoteFetch-specific logic. All domain logic lives in `tools/` and `prompts/system.js`. This makes it straightforward to reuse the loop for a Phase 2 web frontend.

`lib/anthropic-client.js` centralizes all Anthropic API access — `agent.js`, `tools/identify-materials.js`, and `tools/draft-section.js` all call through it instead of constructing their own client. It provides a shared client (with a request timeout), retry with exponential backoff on `429`/`5xx`/network errors (immediate fail on `401`/`403` since retrying a bad key never helps), and detection of `stop_reason === 'max_tokens'` (thrown as `TruncatedResponseError` rather than silently treated as a complete response).

**The five tools:**

| Tool | Implementation | Notes |
|---|---|---|
| `ask_user` | inquirer prompt | Used only when job description is genuinely too vague |
| `identify_materials` | sub-LLM call | Returns `{ materials: [{name, quantity, notes}] }`; results are post-filtered to drop entries that are missing/non-string, too short, contain "or"/multiple commas, or match a skip-keyword list — a code-level backstop for the never-do rules below |
| `lookup_price` | fuzzy match on `data/sample-prices.json` | Returns `found`, `cheapest`, `cheapest_supplier`, `verified`; returns `found: false` gracefully for a non-string/empty `material_name` or a matched entry with no prices, instead of throwing |
| `draft_section` | sub-LLM call per section | Seven sections: introduction, scope, materials, assumptions, exclusions, next_steps, disclaimers |
| `save_quote` | fs.writeFileSync | Assembles sections in fixed order, saves to `output/`; if a same-day file for the same trade/job already exists, appends `-2`, `-3`, ... rather than overwriting it |

**Multiple tool calls per turn:** Claude may return several `tool_use` blocks in a single response (e.g. batching all `lookup_price` calls). The loop in `agent.js` handles this correctly — it processes all blocks and returns all `tool_result` entries in one message. If you modify the loop, preserve this behaviour or the API will return a 400.

## Error handling

`tools/index.js`'s `executeTool` is the single choke point for all five tools: it validates required fields per tool before dispatch, then wraps the call in try/catch. A validation failure or caught exception becomes `{ error: true, message }`, returned as a normal tool result so Claude sees a recoverable failure and can adapt (skip an item, ask the user, retry) instead of the whole run crashing. The one exception is `401`/`403` auth errors, which propagate up to `qf.js`'s top-level handler and exit the process, since no amount of retrying or model adaptation fixes a bad API key.

`agent.js`'s `onStep` calls are also wrapped defensively — a bug in `qf.js`'s display/formatting code logs a warning instead of aborting the agent loop mid-turn.

CLI input is validated up front too: `qf.js`'s `--trade` and `--tone` options use yargs `choices` against `VALID_TRADES`/`VALID_TONES`, so an invalid value now fails fast instead of silently flowing into every prompt (previously these arrays were documentation-only, shown in `--help` but never enforced).

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
```

`qf.js` treats an empty-string `ANTHROPIC_API_KEY`/`CLAUDE_MODEL` as unset before calling `dotenv.config()` — this devcontainer's `remoteEnv` pre-sets both to `""` when the host has no value, which would otherwise make `dotenv` skip loading the real value from `.env` (its default `override: false` treats an existing-but-empty var as "already set"). This still means a real operator/CI-supplied value is never silently overridden by a stray local `.env`.

## Phase roadmap (for context)

- **Phase 2** — Next.js frontend; `agent.js` is reused as-is, `qf.js` becomes an API route
- **Phase 3** — Real Playwright scraper replaces `tools/lookup-price.js` (same interface, different implementation)
- **Phase 4** — Optional auth/database
