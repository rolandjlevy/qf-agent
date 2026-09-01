CREATE TABLE IF NOT EXISTS trader_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT,
  contact_details TEXT,
  hourly_rate REAL,
  standard_terms TEXT,
  voice_sample TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS trader_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_name TEXT NOT NULL,
  canonical_name TEXT,
  aliases TEXT,
  unit TEXT,
  unit_price REAL NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('historical_quote', 'manual_entry')),
  source_ref TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS historical_quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  extracted_text TEXT,
  extraction_status TEXT NOT NULL CHECK (extraction_status IN ('pending', 'success', 'failed')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS generated_quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_description TEXT NOT NULL,
  output_path TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  tool_call_log TEXT
);
