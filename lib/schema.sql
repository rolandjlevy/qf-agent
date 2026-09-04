CREATE TABLE IF NOT EXISTS trader_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT,
  contact_details TEXT,
  hourly_rate DOUBLE PRECISION,
  standard_terms TEXT,
  voice_sample TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS trader_prices (
  id SERIAL PRIMARY KEY,
  material_name TEXT NOT NULL,
  canonical_name TEXT,
  aliases TEXT,
  unit TEXT,
  unit_price DOUBLE PRECISION NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('historical_quote', 'manual_entry')),
  source_ref TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS historical_quotes (
  id SERIAL PRIMARY KEY,
  file_path TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  extracted_text TEXT,
  extraction_status TEXT NOT NULL CHECK (extraction_status IN ('pending', 'success', 'failed')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS generated_quotes (
  id SERIAL PRIMARY KEY,
  job_description TEXT NOT NULL,
  output_path TEXT NOT NULL DEFAULT '',
  content TEXT,
  generated_at TEXT NOT NULL,
  tool_call_log TEXT
);

-- Bridges an in-flight ask_user wait (in one Vercel Lambda instance) to the
-- /api/quote/[runId]/answer POST that resolves it (routinely a *different*
-- instance, since Vercel's Node.js functions have no session affinity) — see
-- lib/quote-runs.js. An in-memory Map cannot cross that instance boundary,
-- this table can.
CREATE TABLE IF NOT EXISTS pending_answers (
  run_id TEXT PRIMARY KEY,
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Tracks one polling-driven agent run end-to-end (replaces the old SSE
-- stream). POST /api/quote inserts this row and returns runId immediately,
-- then the agent loop actually runs afterwards in a next/server `after()`
-- callback in the same invocation, writing progress here as it goes (see
-- app/api/quote/route.js). GET /api/quote/[runId]/status polls this row and
-- stamps last_polled_at on every call — the background loop's watchdog
-- reads that column to detect an abandoned client and stop making Anthropic
-- API calls nobody is waiting on, since a short-polling transport has no
-- socket-level disconnect signal the way the old stream's cancel() did.
CREATE TABLE IF NOT EXISTS quote_runs (
  run_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('running', 'awaiting_answer', 'done', 'error', 'aborted')),
  trade TEXT NOT NULL,
  tone TEXT NOT NULL,
  job_description TEXT NOT NULL,
  steps TEXT NOT NULL DEFAULT '[]',
  question TEXT,
  quote_id INTEGER,
  turns INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_polled_at TEXT NOT NULL
);

-- Scraped-price cache populated out of band by scripts/scrape-prices.mjs
-- (run on a schedule via GitHub Actions, not inside the live agent request
-- path — Playwright doesn't fit Vercel's serverless functions, and
-- app/api/quote/route.js already fights a tight maxDuration budget).
-- lookup_price reads this before falling back to the static
-- data/sample-prices.json placeholder catalog. material_name matches
-- sample-prices.json's canonical "name" field exactly — that file remains
-- the single source of truth for which materials exist and their aliases,
-- this table only supplies real current prices for names it already knows.
CREATE TABLE IF NOT EXISTS scraped_prices (
  id SERIAL PRIMARY KEY,
  material_name TEXT NOT NULL,
  supplier TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  sku TEXT,
  product_url TEXT,
  scraped_at TEXT NOT NULL
);
