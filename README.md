# QuoteFetch Agent

An agentic tool that turns a rough trade job description into a professional written quote. Claude drives the sequence using tools — it decides whether to ask follow-up questions, which materials to look up, and in what order to draft sections. Available both as a CLI and as a web app, both built on the same agent loop and tools.

## Setup

```bash
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY and DATABASE_URL (a Neon/Postgres connection string) to .env
npm run db:migrate   # one-off: creates the tables in your database
```

## CLI usage

```bash
node qf.js --trade=<trade> --tone=<tone> "<job description>"
node qf.js profile               # set your business name, contact details, rate, T&Cs
node qf.js import <path>         # learn your real prices from a past quote (.md/.txt/.pdf/.docx)
```

### Valid trades

`bathroom-fitter` · `builder` · `carpenter` · `driveway-specialist` · `electrician` · `flooring-fitter` · `gas-engineer` · `glazier` · `groundworker` · `handyman` · `kitchen-fitter` · `gardener-landscaper` · `decorator` · `plasterer` · `plumber` · `roofer` · `tiler`

### Valid tones

`friendly` · `formal` · `direct` · `persuasive` · `professional`

## Web usage

```bash
npm run web:dev     # http://localhost:3000
```

- `/profile` — set your business details and upload past quotes to teach the agent your real prices
- `/quote/new` — describe a job, watch the agent work in real time, answer any clarifying questions it asks
- `/quotes` — browse quotes you've generated
- `/quote/[id]` — view one saved quote

Not a separate implementation — it reuses the exact same agent loop and tools as the CLI above. `npm run web:build`/`npm run web:start` for a production build. Deploys to Vercel as-is (`npm run vercel-build` runs `next build`); set `ANTHROPIC_API_KEY` and `DATABASE_URL` as environment variables there too.

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

`lookup_price` checks your own price history first — see "Learning your prices" below — then falls back to `data/sample-prices.json`, which starts with 50 entries all marked `verified: false` (indicative estimates only). To verify a sample price: find the entry, update it against a live Screwfix or Toolstation listing, and set `verified: true`. The agent displays `(unverified)` next to unconfirmed prices and the quote includes a note that prices are indicative.

Phase 3 will replace the sample-DB fallback with a live Playwright scraper using the same `lookup_price` interface.

### Learning your prices

Run `node qf.js import <path>` (CLI) or upload past quotes on the `/profile` page (web) to extract real material prices from quotes you've actually sent. These are stored per-material and preferred automatically over the sample DB — a match there is always shown as verified, since it's a price you actually paid.

## Output

Every generated quote is persisted to the database (viewable at `/quote/[id]` or via `/quotes`). The CLI additionally writes a copy to the `output/` directory as a `.md` file, named `quote-YYYY-MM-DD-trade-job-slug.md`.

## Architecture

```
qf.js                 — CLI entry: parse args, log with chalk, call runAgent
agent.js               — Generic reusable agent loop (no QF-specific logic), used by both the CLI and the web route
tools/
  index.js            — TOOL_DEFINITIONS + executeTool dispatcher
  ask-user.js          — thin adapter; transport supplied via toolContext.askUser
  identify-materials.js  — sub-LLM call to extract material list
  lookup-price.js        — trader history first, then fuzzy match against sample-prices.json
  draft-section.js       — sub-LLM call to generate each quote section
  save-quote.js           — assemble the quote; best-effort write to output/
prompts/
  system.js            — agent system prompt + shared buildInitialMessage()
lib/
  db.js                — Neon Postgres access (trader profile, prices, quote history)
  schema.sql            — Postgres schema, applied once via scripts/migrate.mjs
  trader-context.js      — formats the trader profile for the system prompt
  extract-quote.js        — sub-LLM extraction of priced items from a past quote
  quote-runs.js           — the web UI's ask_user bridge (see app/api/quote/route.js)
  actions/profile.js       — web UI Server Actions (save profile, import quotes)
commands/
  profile.js            — CLI: view/edit your trader profile
  import.js              — CLI: import a past quote
app/                    — Next.js App Router web UI (see CLAUDE.md for the full page/route list)
data/
  sample-prices.json     — mock UK supplier price database
scripts/
  migrate.mjs            — one-off Neon schema migration
  web-env.mjs             — devcontainer env workaround wrapping `next`
agent.test.js           — vitest coverage of agent.js's core loop
```

## Phase roadmap

- **Phase 1** — CLI, mock prices, all logic working end-to-end. Done.
- **Phase 2** (this) — trader profile/price persistence on Neon Postgres, plus a Next.js web UI reusing the same agent loop. Done.
- **Phase 3** — Real Playwright scraper replaces the sample-DB fallback in `lookup-price.js` (same tool interface)
- **Phase 4** — Optional: auth, multi-tenant support
