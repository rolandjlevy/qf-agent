import { neon } from '@neondatabase/serverless'
import { scoreMatch, MATCH_THRESHOLD } from './fuzzy-match.js'

// Inlined rather than read from a schema.sql file at runtime: a
// fs.readFileSync(join(__dirname, ...)) path here hit the same deployed-bundle
// path-resolution failure as data/sample-prices.json did (see tools/lookup-price.js) —
// confirmed via production logs (ENOENT on lib/schema.sql on Vercel). Still
// applies under Neon — this is a Vercel/Next.js bundling issue, not a
// Turso-specific one.
const SCHEMA = `
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
  output_path TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  tool_call_log TEXT
);
`

// Postgres has no equivalent of executeMultiple() for a semicolon-delimited
// batch of DDL statements, so split and run each CREATE TABLE individually.
const SCHEMA_STATEMENTS = SCHEMA.split(';')
  .map((s) => s.trim())
  .filter(Boolean)

// Single source of truth for the connection string. Turso needed a
// three-tier fallback (QF_DB_PATH override → TURSO_DATABASE_URL → a local
// file: path) because local dev and tests ran against an embedded SQLite
// file with no server to point at. Neon is a remote Postgres service only —
// there's no embedded/local equivalent — so every environment (local dev,
// tests, production) points at a real Neon branch via DATABASE_URL, and
// local dev uses its own Neon dev branch rather than a file on disk.
//
// Read lazily inside getClient(), not into a module-level const: ESM hoists
// and fully evaluates a file's static imports before its own top-level
// statements run, so a module-level read here would execute before qf.js's
// own dotenv.config() call and permanently capture `undefined`. The old
// Turso fallback had this same top-level read but never hit the bug locally
// — QF_DB_PATH/TURSO_DATABASE_URL were never set in .env, so it silently
// fell through to the hardcoded file: path, which needs no env var at all.

let sql = null
let schemaReady = null

function getClient() {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL)
  }
  return sql
}

// generated_quotes.content was added after the table already existed in
// deployed databases — CREATE TABLE IF NOT EXISTS won't retroactively add it,
// and a raw ALTER TABLE baked into SCHEMA would error ("duplicate column")
// on every cold start after the first. Check before adding, so this stays
// safe to run on every getDb() call across serverless invocations.
async function ensureContentColumn(db) {
  const rows = await db.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'generated_quotes' AND column_name = 'content'`
  )
  if (rows.length === 0) {
    await db.query('ALTER TABLE generated_quotes ADD COLUMN content TEXT')
  }
}

export async function getDb() {
  const db = getClient()
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const statement of SCHEMA_STATEMENTS) {
        await db.query(statement)
      }
      await ensureContentColumn(db)
    })()
  }
  await schemaReady
  return db
}

export async function getTraderProfile() {
  const db = await getDb()
  const rows = await db.query('SELECT * FROM trader_profile WHERE id = 1')
  return rows[0] || null
}

export async function upsertTraderProfile(fields) {
  const db = await getDb()
  await db.query(
    `INSERT INTO trader_profile (id, business_name, contact_details, hourly_rate, standard_terms, voice_sample, updated_at)
     VALUES (1, $1, $2, $3, $4, $5, $6)
     ON CONFLICT(id) DO UPDATE SET
       business_name = excluded.business_name,
       contact_details = excluded.contact_details,
       hourly_rate = excluded.hourly_rate,
       standard_terms = excluded.standard_terms,
       voice_sample = excluded.voice_sample,
       updated_at = excluded.updated_at`,
    [
      fields.business_name ?? null,
      fields.contact_details ?? null,
      fields.hourly_rate ?? null,
      fields.standard_terms ?? null,
      fields.voice_sample ?? null,
      new Date().toISOString(),
    ]
  )
  return getTraderProfile()
}

// Fuzzy-matches material_name against every row in trader_prices, using the
// same scoring/threshold as the sample-DB lookup so the two sources behave
// identically from the caller's point of view.
export async function findTraderPrice(materialName) {
  const db = await getDb()
  const rows = await db.query('SELECT * FROM trader_prices')

  let bestScore = 0
  let bestMatch = null
  for (const row of rows) {
    const aliases = row.aliases ? JSON.parse(row.aliases) : []
    const score = scoreMatch({ name: row.canonical_name || row.material_name, aliases }, materialName)
    if (score > bestScore) {
      bestScore = score
      bestMatch = row
    }
  }

  if (bestScore < MATCH_THRESHOLD || !bestMatch) return null

  return { ...bestMatch, match_score: Math.round(bestScore) }
}

export async function upsertTraderPrice({ material_name, canonical_name, aliases, unit, unit_price, source, source_ref }) {
  const db = await getDb()
  await db.query(
    `INSERT INTO trader_prices (material_name, canonical_name, aliases, unit, unit_price, source, source_ref, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      material_name,
      canonical_name ?? material_name,
      JSON.stringify(aliases ?? []),
      unit ?? null,
      unit_price,
      source,
      source_ref ?? null,
      new Date().toISOString(),
    ]
  )
}

export async function insertHistoricalQuote({ file_path, extraction_status }) {
  const db = await getDb()
  const rows = await db.query(
    `INSERT INTO historical_quotes (file_path, imported_at, extraction_status)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [file_path, new Date().toISOString(), extraction_status]
  )
  return Number(rows[0].id)
}

export async function updateHistoricalQuoteStatus(id, { extraction_status, extracted_text, notes }) {
  const db = await getDb()
  await db.query(
    `UPDATE historical_quotes
     SET extraction_status = $1, extracted_text = COALESCE($2, extracted_text), notes = $3
     WHERE id = $4`,
    [extraction_status, extracted_text ?? null, notes ?? null, id]
  )
}

// output_path is a local-disk convenience (CLI / local dev) and may not exist
// in production (Vercel's serverless functions can't write to disk) — content
// is the source of truth there, so output_path falls back to '' rather than
// being required.
export async function insertGeneratedQuote({ job_description, output_path, content, tool_call_log }) {
  const db = await getDb()
  const rows = await db.query(
    `INSERT INTO generated_quotes (job_description, output_path, content, generated_at, tool_call_log)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [job_description, output_path || '', content ?? null, new Date().toISOString(), JSON.stringify(tool_call_log ?? [])]
  )
  return Number(rows[0].id)
}

export async function listGeneratedQuotes() {
  const db = await getDb()
  return db.query('SELECT * FROM generated_quotes ORDER BY generated_at DESC')
}

export async function getGeneratedQuoteById(id) {
  const db = await getDb()
  const rows = await db.query('SELECT * FROM generated_quotes WHERE id = $1', [id])
  return rows[0] || null
}
