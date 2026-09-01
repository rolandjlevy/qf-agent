# QuoteFetch (qf-agent) — Project Handoff

Generated for handoff to an external AI tool for analysis. This is a snapshot as of 2026-08-27, branch `development-error-handling`.

## What this project is

**QuoteFetch** is a CLI "true agent" (Node.js, plain ESM, no build step) that turns a rough UK trade job description into a professional written quote (`.md` file). Claude drives the sequence via tool calls — there is no hardcoded flow. The agent decides whether to ask follow-up questions, what materials to look up, and in what order to draft the seven quote sections.

Run it with:
```bash
node qf.js --trade=<trade> --tone=<tone> "<job description>"
```

Phase 1 of a planned multi-phase roadmap:
- **Phase 1 (current)** — CLI only
- **Phase 2** — Next.js frontend; `agent.js` reused as-is, `qf.js` becomes an API route
- **Phase 3** — Real Playwright scraper replaces `tools/lookup-price.js` (same interface)
- **Phase 4** — Optional auth/database

## Repo layout (all files)

```
qf.js                         227 lines — CLI entry point (yargs, dotenv, top-level error handling)
agent.js                       70 lines — generic agent loop, zero QuoteFetch-specific logic
lib/anthropic-client.js        72 lines — shared Anthropic client, retry/backoff, truncation detection
prompts/system.js              42 lines — SYSTEM_PROMPT + NEVER_DO_RULES (exported, reused by sub-LLM calls)
prompts/02_QF_KNOWLEDGE_BANK.md 828 lines — domain knowledge bank spec (quote format, tone rules, etc.)
prompts/03_QF_AGENT_PROMPT.md  558 lines — original agent prompt design doc
tools/index.js                 201 lines — TOOL_DEFINITIONS + executeTool() dispatch/validation choke point
tools/ask-user.js               15 lines — inquirer prompt tool
tools/identify-materials.js     67 lines — sub-LLM call + post-filter backstop for skip rules
tools/lookup-price.js          102 lines — fuzzy match against data/sample-prices.json
tools/draft-section.js         171 lines — sub-LLM call per quote section (7 sections)
tools/save-quote.js             93 lines — assembles + writes quote to output/
data/sample-prices.json             — 50 entries, all verified: false (placeholder prices)
output/*.md                         — example generated quotes (3 sample runs)
README.md                       86 lines — setup, usage, valid trades/tones, test cases
CLAUDE.md                           — authoritative architecture/behavior doc (see below, largely reproduced here)
package.json                        — deps: @anthropic-ai/sdk, chalk, dotenv, inquirer, ora, yargs
.env / .env.example                 — ANTHROPIC_API_KEY, CLAUDE_MODEL, REQUEST_TIMEOUT_MS
```

Total custom source: ~2,530 lines across the files above (excluding node_modules/lockfile).

## Architecture

```
qf.js  →  runAgent()  →  Claude API  →  tool call(s)
               ↑                              ↓
         messages[]  ←  tool_result  ←  executeTool()
```

- `agent.js` is a **generic reusable loop** with zero domain logic — this is deliberate, to make Phase 2 (web frontend) reuse it unchanged.
- All QuoteFetch-specific logic lives in `tools/` and `prompts/system.js`.
- `lib/anthropic-client.js` centralizes all Anthropic API access (used by `agent.js`, `identify-materials.js`, `draft-section.js`): shared client with request timeout, retry with exponential backoff on `429`/`5xx`/network errors, immediate fail on `401`/`403`, and `TruncatedResponseError` thrown when `stop_reason === 'max_tokens'` instead of silently accepting a cut-off response.
- **Multiple tool calls per turn**: Claude may return several `tool_use` blocks in one response (e.g. batching all `lookup_price` calls). `agent.js`'s loop processes all blocks and returns all `tool_result` entries in a single message — required, or the API returns 400.

## The five tools

| Tool | Implementation | Notes |
|---|---|---|
| `ask_user` | inquirer prompt | Used only when the job description is genuinely too vague |
| `identify_materials` | sub-LLM call | Returns `{ materials: [{name, quantity, notes}] }`; post-filtered to drop entries that are missing/non-string, too short, contain "or"/multiple commas, or match a skip-keyword list |
| `lookup_price` | fuzzy match on `data/sample-prices.json` | Returns `found`, `cheapest`, `cheapest_supplier`, `verified`; returns `found: false` gracefully instead of throwing on bad input or no-price matches |
| `draft_section` | sub-LLM call per section | Seven sections: introduction, scope, materials, assumptions, exclusions, next_steps, disclaimers |
| `save_quote` | `fs.writeFileSync` | Fixed section order, saved to `output/`; same-day duplicate filenames get `-2`, `-3`, ... suffixes rather than overwriting |

## Error handling model

- `tools/index.js`'s `executeTool` is the **single choke point** for all five tools: validates required fields per tool before dispatch, wraps the call in try/catch. Failures become `{ error: true, message }` — a normal tool result, so Claude sees a recoverable failure and can adapt (skip an item, ask the user, retry) rather than crashing the whole run.
- Exception: `401`/`403` auth errors propagate to `qf.js`'s top-level handler and exit the process — no retry/adaptation fixes a bad API key.
- `agent.js`'s `onStep` calls are wrapped defensively — a bug in `qf.js`'s display/formatting code logs a warning instead of aborting the agent loop mid-turn.
- CLI input validated up front: `--trade`/`--tone` use yargs `choices` against `VALID_TRADES`/`VALID_TONES` (previously documentation-only, now enforced).

## Prices database

`data/sample-prices.json` — 50 entries, all `verified: false` (placeholder). `lookup_price` uses word-overlap fuzzy matching, score threshold 40, matches on `name` and `aliases[]`. The `verified` flag flows into the agent's system prompt — unverified prices get an automatic note in the quote. Array is sorted priority-first (consumer units, MCBs, copper pipe, emulsion paint, plasterboard).

## Quote output format

Written to `output/` as plain-text `.md` files matching the knowledge-bank spec: all-caps section headings, bullet points only, **no markdown tables** (must paste cleanly into an email client).

Section order: `[BUSINESS NAME]` · `[CONTACT DETAILS]` · Date · introduction · SCOPE OF WORK · MATERIALS & EQUIPMENT · ASSUMPTIONS · EXCLUSIONS · NEXT STEPS · DISCLAIMERS.

## Never-do rules (safety guardrails — not style preferences)

- Claude must never invent or estimate material prices — only prices from `lookup_price` may appear in a quote
- No regulatory compliance claims (Part P, Gas Safe, BS 7671, etc.)
- No markdown tables anywhere in quote output
- Materials lines must be single specific products — no "X or Y" alternatives, no bundling two items on one line
- `identify_materials` sub-prompt must retain skip rules for service items (disposal fees, hire costs) and generic terms (sundries, consumables)

Enforced two ways: `NEVER_DO_RULES` (exported from `prompts/system.js`) is passed as the `system` param to both `identify_materials` and `draft_section` sub-LLM calls *and* is part of the main loop's `SYSTEM_PROMPT`; the materials skip-rule is *additionally* enforced in code via a post-filter in `tools/identify-materials.js`, not left to the model alone.

## Environment variables

```
ANTHROPIC_API_KEY=    # required
CLAUDE_MODEL=         # optional, defaults to claude-sonnet-4-6
REQUEST_TIMEOUT_MS=   # optional, defaults to 60000
```

Quirk: `qf.js` treats an empty-string `ANTHROPIC_API_KEY`/`CLAUDE_MODEL` as unset *before* calling `dotenv.config()` — this devcontainer's `remoteEnv` pre-sets both to `""` when the host has no value, which would otherwise make dotenv's default `override: false` skip loading the real value from `.env`. A real operator/CI-supplied value is still never silently overridden.

## Recent git history (most recent first)

```
369c7bf harden error handling, add API retries, and close security gaps
5003323 added ora package for terminal spinner
830c407 updated README file
416022e fixed bugs
d8e3dcf updated permissions
```

Current branch `development-error-handling` is clean (no uncommitted changes) as of this snapshot.

## Suggested angles for external analysis

- Correctness/robustness review of `agent.js`'s tool-call loop and `lib/anthropic-client.js`'s retry/backoff logic
- Whether the never-do guardrails (prompt + code post-filter) are actually sufficient to prevent price hallucination or malformed materials lines
- Fuzzy-matching quality in `tools/lookup-price.js` (score threshold 40 — false positive/negative risk)
- Readiness of the `agent.js` / tool-interface boundary for Phase 2 reuse (Next.js API route) and Phase 3 (real scraper swap-in for `lookup-price.js`)
- Test coverage — there are currently no automated tests, only the three manual CLI test cases documented in README.md
