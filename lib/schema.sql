CREATE TABLE IF NOT EXISTS trader_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT,
  contact_details TEXT,
  hourly_rate DOUBLE PRECISION,
  standard_terms TEXT,
  voice_sample TEXT,
  updated_at TEXT
);

-- CREATE TABLE IF NOT EXISTS won't add columns to an already-existing table,
-- so new trader_profile fields are added via explicit, idempotent ALTERs.
ALTER TABLE trader_profile ADD COLUMN IF NOT EXISTS vat_registered BOOLEAN DEFAULT false;
ALTER TABLE trader_profile ADD COLUMN IF NOT EXISTS certifications TEXT;
ALTER TABLE trader_profile ADD COLUMN IF NOT EXISTS service_area TEXT;

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

-- Caches lib/pricing's PriceSearchProvider results (Phase 3a — Google
-- Shopping price search, see lib/pricing/CachedPriceSearchProvider.js) so
-- repeat lookups of the same material don't re-spend SERP provider credits.
-- cache_key is a hash of the normalized query + country + currency +
-- maxResults (see lib/pricing/CachedPriceSearchProvider.js's makeCacheKey).
-- No scheduled cleanup for MVP — an expired row is only ever deleted lazily,
-- the next time DbCacheStore.get() happens to read it past expires_at.
CREATE TABLE IF NOT EXISTS price_search_cache (
  cache_key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS price_search_cache_expires_at_idx
  ON price_search_cache(expires_at);

-- A trader's per-line overrides for one material line of one quote: chosen
-- Serper product, edited quantity, and inclusion state. Deliberately
-- additive/separate from generated_quotes.content and tool_call_log — those
-- stay exactly as drafted/saved — the underlying materials list itself always
-- comes from tool_call_log (see lib/quote-materials.js) and can't be edited,
-- only overridden/hidden here. The quote-view page joins this in by
-- (quote_id, material_name) to show an inline price badge, apply the
-- quantity override, and filter out non-'active' lines from both the
-- on-screen total and the Copy/Download text. One row per line (re-selecting
-- a price, re-editing a quantity, or changing status upserts in place, it
-- doesn't accumulate history) — selected_at doubles as "last touched at"
-- for any of the three fields, not just a price selection.
CREATE TABLE IF NOT EXISTS quote_line_prices (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER NOT NULL REFERENCES generated_quotes(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  product TEXT, -- JSON.stringify(ProductResult), or NULL if no price picked yet
  selected_at TEXT NOT NULL,
  UNIQUE (quote_id, material_name)
);

-- CREATE TABLE IF NOT EXISTS won't add columns to an already-existing table,
-- so these are added via explicit, idempotent ALTERs (same pattern as
-- trader_profile above). product was originally NOT NULL — dropped since a
-- line can now get a quantity override or a status change before any price
-- is ever selected for it.
ALTER TABLE quote_line_prices ALTER COLUMN product DROP NOT NULL;
ALTER TABLE quote_line_prices ADD COLUMN IF NOT EXISTS quantity_override TEXT;
ALTER TABLE quote_line_prices ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'saved_for_later', 'deleted'));
-- Set alongside a product selection when the trader searched under a
-- different term than the original identify_materials label (e.g. "Gutter
-- cleaning brush" -> "Gutter cleaning brush set") — material_name itself
-- stays the stable join key back to tool_call_log's materials list.
ALTER TABLE quote_line_prices ADD COLUMN IF NOT EXISTS name_override TEXT;

-- Analytics for the materials-refinement step (see CLAUDE.md's Phase 3a
-- addendum): one row per material the trader saw in the refinement dialog
-- when they hit Continue, capturing whether an LLM-proposed material was
-- kept or removed, and which materials the trader typed in themselves.
-- Nothing in the app reads this back — it's a pure data-collection surface,
-- queried manually to spot where Phase A's proposals are weak.
CREATE TABLE IF NOT EXISTS material_refinement_events (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  job_description TEXT NOT NULL,
  label TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('llm_proposed', 'trader_added')),
  action TEXT NOT NULL CHECK (action IN ('accepted', 'rejected')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS material_refinement_events_created_at_idx
  ON material_refinement_events(created_at);
