# QuoteFetch Agent

An agentic tool that turns a rough trade job description into a professional written quote. Claude drives the sequence using tools — it decides whether to ask follow-up questions, which materials to look up, and in what order to draft sections. Available both as a CLI and as a web app, both built on the same agent loop and tools.

## Setup

```bash
npm i @anthropic-ai/claude-code -g
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

`lookup_price` checks your own price history first — see "Learning your prices" below — then, if live scraping is available (see below), scrapes just the materials on this quote from Screwfix/Toolstation/B&Q directly. Otherwise it falls back to a nightly-scraped cache, then to `data/sample-prices.json`'s placeholder entries (indicative estimates only, `verified: false`). The agent displays `(unverified)` next to unconfirmed prices and the quote includes a note that prices are indicative.

### Learning your prices

Run `node qf.js import <path>` (CLI) or upload past quotes on the `/profile` page (web) to extract real material prices from quotes you've actually sent. These are stored per-material and preferred automatically over everything else — a match there is always shown as verified, since it's a price you actually paid.

### Live scraping (optional)

Both the CLI and the web app can scrape real, current prices for just the materials on a given quote — rather than relying on the cache/placeholder fallback.

- **CLI** — works out of the box, no setup needed (launches a local Playwright browser).
- **Web app** — needs a hosted browser endpoint, since Vercel's serverless functions can't launch a real browser themselves:
  1. Sign up for a free account at [browserless.io](https://browserless.io) (free tier: 1,000 units/month, 2 concurrent browsers, no card required).
  2. Log in and copy your API token from the Browserless dashboard.
  3. Add to `.env` for local testing, and to your Vercel project's Environment Variables for production:
     ```
     BROWSERLESS_WS_ENDPOINT=wss://production-sfo.browserless.io?token=YOUR_TOKEN
     ```
     (swap the hostname for Browserless's EU region if that's closer to you — check their dashboard)
  4. Restart `npm run web:dev` locally, or redeploy on Vercel, for the new variable to take effect.

Leave `BROWSERLESS_WS_ENDPOINT` unset to keep the web app on the existing cached/placeholder prices — nothing else changes.

### Web-search price fallback (optional, off by default)

Screwfix/Toolstation/B&Q are general DIY retailers — they don't reliably stock specialist trade materials (confirmed: a roofer's EPDM roofing membrane, adhesive, and flashing tape all came back with no price, since none of the three either stocked it or sold it in the quantity a roofer actually orders). Set `ENABLE_WEB_SEARCH_PRICE_FALLBACK=true` to let a material that finds nothing anywhere else fall back to one Claude web-search call, covering any trade rather than only the suppliers with a dedicated scraper.

**Set expectations before turning this on:** in real testing this only succeeded roughly 1 time in 6 attempts — the underlying search tool has its own internal retry/error behaviour that this app can't fully control, so it often declines rather than fabricate a price (matching the app's never-guess rule) even when a real listing likely exists. It also costs real API tokens per attempt (~$0.07-0.26 observed) whether it finds something or not. Worth trying if a real gap is costing you time, but don't expect it to close every gap.

## Output

Every generated quote is persisted to the database (viewable at `/quote/[id]` or via `/quotes`). The CLI additionally writes a copy to the `output/` directory as a `.md` file, named `quote-YYYY-MM-DD-trade-job-slug.md`.

## Cost: prompt caching

`agent.js`'s main loop caches its system prompt + tool definitions (frozen for the life of one quote run) and the growing conversation history turn-to-turn, so a multi-turn run only pays full price for what's new each turn instead of reprocessing everything from scratch. Nothing to configure — it's on by default. Run a quote via the CLI and watch for a `cache: N read, N written, N uncached` line after the first couple of turns to confirm it's landing hits (the web app logs the same to the server console instead of the trader-facing progress log).

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
- **Phase 3** — Real Playwright scraper replaces the sample-DB fallback in `lookup-price.js` (same tool interface). Done — plus live per-quote scraping (see "Live scraping" above) on both the CLI and, optionally, the web app.
- **Phase 4** — Optional: auth, multi-tenant support
