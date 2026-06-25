# QuoteFetch Agent — Phase 1 (CLI)

An agentic CLI tool that turns a rough trade job description into a professional written quote. Claude drives the sequence using tools — it decides whether to ask follow-up questions, which materials to look up, and in what order to draft sections.

## Setup

```bash
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

## Usage

```bash
node qf.js --trade=<trade> --tone=<tone> "<job description>"
```

### Valid trades

`bathroom-fitter` · `builder` · `carpenter` · `driveway-specialist` · `electrician` · `flooring-fitter` · `gas-engineer` · `glazier` · `groundworker` · `handyman` · `kitchen-fitter` · `gardener-landscaper` · `decorator` · `plasterer` · `plumber` · `roofer` · `tiler`

### Valid tones

`friendly` · `formal` · `direct` · `persuasive` · `professional`

## Test cases

```bash
# Test 1 — detailed job, agent should proceed without follow-up questions
node qf.js --trade=electrician --tone=professional \
  "Replace consumer unit in 3-bed semi, including 8 new MCBs and surge protection"

# Test 2 — vague job, agent should ask several targeted follow-up questions
node qf.js --trade=plumber --tone=friendly "Sort out my boiler"

# Test 3 — decorator job with light materials
node qf.js --trade=decorator --tone=direct \
  "Paint two bedrooms, white walls, white ceilings, magnolia woodwork"

# Test 4 — builder job with mixed materials
node qf.js --trade=builder --tone=formal \
  "Build a stud wall with door opening, 3m long, plasterboard both sides, skim and mist coat"
```

The tool call sequence differs between jobs — that is how you verify the agent is actually deciding, not following a hardcoded script.

For vague jobs (e.g. "Sort out my boiler") the agent will ask up to four targeted follow-up questions before proceeding. Which questions it asks depends on the trade — a plumber job prompts for boiler type and pipework material; a decorator job asks about surface condition and number of coats.

## Prices

Prices are stored in `data/sample-prices.json`. All entries start with `verified: false` (indicative estimates only).

To verify a price: find the entry in `sample-prices.json`, update the `price` against a live Screwfix or Toolstation listing, and set `verified: true`. The agent displays `(unverified)` next to unconfirmed prices and the quote includes a note that prices are indicative.

Phase 3 will replace the static file with a live Playwright scraper using the same `lookup_price` interface.

## Output

Generated quotes are saved to the `output/` directory as `.md` files. Filenames follow the format `quote-YYYY-MM-DD-trade-job-slug.md` (e.g. `quote-2026-06-24-electrician-replace-consumer-unit.md`).

## Architecture

```
qf.js           — CLI entry: parse args, log with chalk, call runAgent
agent.js        — Generic reusable agent loop (no QF-specific logic)
tools/
  index.js      — TOOL_DEFINITIONS + executeTool dispatcher
  ask-user.js   — inquirer prompt for mid-flow user questions
  identify-materials.js  — sub-LLM call to extract material list
  lookup-price.js        — fuzzy match against sample-prices.json
  draft-section.js       — sub-LLM call to generate each quote section
  save-quote.js          — assemble and write the quote to output/
prompts/
  system.js     — agent system prompt
data/
  sample-prices.json     — mock UK supplier price database
```

## Phase roadmap

- **Phase 1** (this) — CLI, mock prices, all logic working end-to-end
- **Phase 2** — Next.js frontend with streaming agent feed
- **Phase 3** — Real Playwright scraper replaces `lookup-price.js` (same tool interface)
- **Phase 4** — Optional: auth, database, quote history
