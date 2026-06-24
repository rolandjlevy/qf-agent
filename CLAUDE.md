# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**The five tools:**

| Tool | Implementation | Notes |
|---|---|---|
| `ask_user` | inquirer prompt | Used only when job description is genuinely too vague |
| `identify_materials` | sub-LLM call | Returns `{ materials: [{name, quantity, notes}] }` |
| `lookup_price` | fuzzy match on `data/sample-prices.json` | Returns `found`, `cheapest`, `cheapest_supplier`, `verified` |
| `draft_section` | sub-LLM call per section | Seven sections: introduction, scope, materials, assumptions, exclusions, next_steps, disclaimers |
| `save_quote` | fs.writeFileSync | Assembles sections in fixed order, saves to `output/` |

**Multiple tool calls per turn:** Claude may return several `tool_use` blocks in a single response (e.g. batching all `lookup_price` calls). The loop in `agent.js` handles this correctly — it processes all blocks and returns all `tool_result` entries in one message. If you modify the loop, preserve this behaviour or the API will return a 400.

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

## Environment

```
ANTHROPIC_API_KEY=   # required
CLAUDE_MODEL=        # optional, defaults to claude-sonnet-4-6
```

## Phase roadmap (for context)

- **Phase 2** — Next.js frontend; `agent.js` is reused as-is, `qf.js` becomes an API route
- **Phase 3** — Real Playwright scraper replaces `tools/lookup-price.js` (same interface, different implementation)
- **Phase 4** — Optional auth/database
