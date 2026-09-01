import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { scoreMatch, MATCH_THRESHOLD } from './fuzzy-match.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = join(__dirname, 'schema.sql')

// Local file (CLI / local dev) unless pointed at a remote Turso database in
// production, or overridden by tests to point at an in-memory DB instead of
// the trader's real data/qf.db — never unset in normal CLI/web usage.
const DB_URL =
  process.env.QF_DB_PATH ||
  process.env.TURSO_DATABASE_URL ||
  `file:${join(__dirname, '../data/qf.db')}`
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN

let client = null
let schemaReady = null

function getClient() {
  if (!client) {
    client = createClient(AUTH_TOKEN ? { url: DB_URL, authToken: AUTH_TOKEN } : { url: DB_URL })
  }
  return client
}

export async function getDb() {
  const db = getClient()
  if (!schemaReady) {
    schemaReady = db.executeMultiple(readFileSync(SCHEMA_PATH, 'utf8'))
  }
  await schemaReady
  return db
}

export async function getTraderProfile() {
  const db = await getDb()
  const result = await db.execute('SELECT * FROM trader_profile WHERE id = 1')
  return result.rows[0] || null
}

export async function upsertTraderProfile(fields) {
  const db = await getDb()
  await db.execute({
    sql: `INSERT INTO trader_profile (id, business_name, contact_details, hourly_rate, standard_terms, voice_sample, updated_at)
          VALUES (1, :business_name, :contact_details, :hourly_rate, :standard_terms, :voice_sample, :updated_at)
          ON CONFLICT(id) DO UPDATE SET
            business_name = excluded.business_name,
            contact_details = excluded.contact_details,
            hourly_rate = excluded.hourly_rate,
            standard_terms = excluded.standard_terms,
            voice_sample = excluded.voice_sample,
            updated_at = excluded.updated_at`,
    args: {
      business_name: fields.business_name ?? null,
      contact_details: fields.contact_details ?? null,
      hourly_rate: fields.hourly_rate ?? null,
      standard_terms: fields.standard_terms ?? null,
      voice_sample: fields.voice_sample ?? null,
      updated_at: new Date().toISOString(),
    },
  })
  return getTraderProfile()
}

// Fuzzy-matches material_name against every row in trader_prices, using the
// same scoring/threshold as the sample-DB lookup so the two sources behave
// identically from the caller's point of view.
export async function findTraderPrice(materialName) {
  const db = await getDb()
  const result = await db.execute('SELECT * FROM trader_prices')

  let bestScore = 0
  let bestMatch = null
  for (const row of result.rows) {
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
  await db.execute({
    sql: `INSERT INTO trader_prices (material_name, canonical_name, aliases, unit, unit_price, source, source_ref, updated_at)
          VALUES (:material_name, :canonical_name, :aliases, :unit, :unit_price, :source, :source_ref, :updated_at)`,
    args: {
      material_name,
      canonical_name: canonical_name ?? material_name,
      aliases: JSON.stringify(aliases ?? []),
      unit: unit ?? null,
      unit_price,
      source,
      source_ref: source_ref ?? null,
      updated_at: new Date().toISOString(),
    },
  })
}

export async function insertHistoricalQuote({ file_path, extraction_status }) {
  const db = await getDb()
  const result = await db.execute({
    sql: `INSERT INTO historical_quotes (file_path, imported_at, extraction_status)
          VALUES (:file_path, :imported_at, :extraction_status)`,
    args: { file_path, imported_at: new Date().toISOString(), extraction_status },
  })
  return Number(result.lastInsertRowid)
}

export async function updateHistoricalQuoteStatus(id, { extraction_status, extracted_text, notes }) {
  const db = await getDb()
  await db.execute({
    sql: `UPDATE historical_quotes
          SET extraction_status = :extraction_status, extracted_text = COALESCE(:extracted_text, extracted_text), notes = :notes
          WHERE id = :id`,
    args: { extraction_status, extracted_text: extracted_text ?? null, notes: notes ?? null, id },
  })
}

export async function insertGeneratedQuote({ job_description, output_path, tool_call_log }) {
  const db = await getDb()
  const result = await db.execute({
    sql: `INSERT INTO generated_quotes (job_description, output_path, generated_at, tool_call_log)
          VALUES (:job_description, :output_path, :generated_at, :tool_call_log)`,
    args: {
      job_description,
      output_path,
      generated_at: new Date().toISOString(),
      tool_call_log: JSON.stringify(tool_call_log ?? []),
    },
  })
  return Number(result.lastInsertRowid)
}

export async function listGeneratedQuotes() {
  const db = await getDb()
  const result = await db.execute('SELECT * FROM generated_quotes ORDER BY generated_at DESC')
  return result.rows
}

export async function getGeneratedQuoteById(id) {
  const db = await getDb()
  const result = await db.execute({ sql: 'SELECT * FROM generated_quotes WHERE id = :id', args: { id } })
  return result.rows[0] || null
}
