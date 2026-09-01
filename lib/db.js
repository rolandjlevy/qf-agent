import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { scoreMatch, MATCH_THRESHOLD } from './fuzzy-match.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../data/qf.db')
const SCHEMA_PATH = join(__dirname, 'schema.sql')

let db = null

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.exec(readFileSync(SCHEMA_PATH, 'utf8'))
  }
  return db
}

export function getTraderProfile() {
  const row = getDb().prepare('SELECT * FROM trader_profile WHERE id = 1').get()
  return row || null
}

export function upsertTraderProfile(fields) {
  const updatedAt = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO trader_profile (id, business_name, contact_details, hourly_rate, standard_terms, voice_sample, updated_at)
       VALUES (1, @business_name, @contact_details, @hourly_rate, @standard_terms, @voice_sample, @updated_at)
       ON CONFLICT(id) DO UPDATE SET
         business_name = excluded.business_name,
         contact_details = excluded.contact_details,
         hourly_rate = excluded.hourly_rate,
         standard_terms = excluded.standard_terms,
         voice_sample = excluded.voice_sample,
         updated_at = excluded.updated_at`,
    )
    .run({
      business_name: fields.business_name ?? null,
      contact_details: fields.contact_details ?? null,
      hourly_rate: fields.hourly_rate ?? null,
      standard_terms: fields.standard_terms ?? null,
      voice_sample: fields.voice_sample ?? null,
      updated_at: updatedAt,
    })
  return getTraderProfile()
}

// Fuzzy-matches material_name against every row in trader_prices, using the
// same scoring/threshold as the sample-DB lookup so the two sources behave
// identically from the caller's point of view.
export function findTraderPrice(materialName) {
  const rows = getDb().prepare('SELECT * FROM trader_prices').all()

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

export function upsertTraderPrice({ material_name, canonical_name, aliases, unit, unit_price, source, source_ref }) {
  getDb()
    .prepare(
      `INSERT INTO trader_prices (material_name, canonical_name, aliases, unit, unit_price, source, source_ref, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      material_name,
      canonical_name ?? material_name,
      JSON.stringify(aliases ?? []),
      unit ?? null,
      unit_price,
      source,
      source_ref ?? null,
      new Date().toISOString(),
    )
}

export function insertHistoricalQuote({ file_path, extraction_status }) {
  const result = getDb()
    .prepare(
      `INSERT INTO historical_quotes (file_path, imported_at, extraction_status)
       VALUES (?, ?, ?)`,
    )
    .run(file_path, new Date().toISOString(), extraction_status)
  return result.lastInsertRowid
}

export function updateHistoricalQuoteStatus(id, { extraction_status, extracted_text, notes }) {
  getDb()
    .prepare(
      `UPDATE historical_quotes
       SET extraction_status = ?, extracted_text = COALESCE(?, extracted_text), notes = ?
       WHERE id = ?`,
    )
    .run(extraction_status, extracted_text ?? null, notes ?? null, id)
}

export function insertGeneratedQuote({ job_description, output_path, tool_call_log }) {
  const result = getDb()
    .prepare(
      `INSERT INTO generated_quotes (job_description, output_path, generated_at, tool_call_log)
       VALUES (?, ?, ?, ?)`,
    )
    .run(job_description, output_path, new Date().toISOString(), JSON.stringify(tool_call_log ?? []))
  return result.lastInsertRowid
}

export function listGeneratedQuotes() {
  return getDb().prepare('SELECT * FROM generated_quotes ORDER BY generated_at DESC').all()
}

export function getGeneratedQuoteById(id) {
  const row = getDb().prepare('SELECT * FROM generated_quotes WHERE id = ?').get(id)
  return row || null
}
