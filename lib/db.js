import { neon } from '@neondatabase/serverless'
import { scoreMatch, MATCH_THRESHOLD } from './fuzzy-match.js'

let sql = null

// Lazy so this file can be imported before qf.js's dotenv.config() runs
// (ESM evaluates static imports, and any top-level code in them, before the
// importing module's own top-level code) — a module-scope neon(...) call
// here would permanently capture an undefined DATABASE_URL in the CLI.
// Mirrors createClient() in lib/anthropic-client.js.
function getClient() {
  if (!sql) sql = neon(process.env.DATABASE_URL)
  return sql
}

export async function getTraderProfile() {
  const rows = await getClient()`SELECT * FROM trader_profile WHERE id = 1`
  return rows[0] || null
}

export async function upsertTraderProfile(fields) {
  const updatedAt = new Date().toISOString()
  const client = getClient()
  await client`
    INSERT INTO trader_profile (id, business_name, contact_details, hourly_rate, standard_terms, voice_sample, updated_at)
    VALUES (1, ${fields.business_name ?? null}, ${fields.contact_details ?? null}, ${fields.hourly_rate ?? null}, ${fields.standard_terms ?? null}, ${fields.voice_sample ?? null}, ${updatedAt})
    ON CONFLICT (id) DO UPDATE SET
      business_name = excluded.business_name,
      contact_details = excluded.contact_details,
      hourly_rate = excluded.hourly_rate,
      standard_terms = excluded.standard_terms,
      voice_sample = excluded.voice_sample,
      updated_at = excluded.updated_at
  `
  return getTraderProfile()
}

// Fuzzy-matches material_name against every row in trader_prices, using the
// same scoring/threshold as the sample-DB lookup so the two sources behave
// identically from the caller's point of view.
export async function findTraderPrice(materialName) {
  const rows = await getClient()`SELECT * FROM trader_prices`

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
  const client = getClient()
  await client`
    INSERT INTO trader_prices (material_name, canonical_name, aliases, unit, unit_price, source, source_ref, updated_at)
    VALUES (${material_name}, ${canonical_name ?? material_name}, ${JSON.stringify(aliases ?? [])}, ${unit ?? null}, ${unit_price}, ${source}, ${source_ref ?? null}, ${new Date().toISOString()})
  `
}

export async function insertHistoricalQuote({ file_path, extraction_status }) {
  const client = getClient()
  const rows = await client`
    INSERT INTO historical_quotes (file_path, imported_at, extraction_status)
    VALUES (${file_path}, ${new Date().toISOString()}, ${extraction_status})
    RETURNING id
  `
  return Number(rows[0].id)
}

export async function updateHistoricalQuoteStatus(id, { extraction_status, extracted_text, notes }) {
  const client = getClient()
  await client`
    UPDATE historical_quotes
    SET extraction_status = ${extraction_status},
        extracted_text = COALESCE(${extracted_text ?? null}, extracted_text),
        notes = ${notes ?? null}
    WHERE id = ${id}
  `
}

export async function insertGeneratedQuote({ job_description, output_path, content, tool_call_log }) {
  const client = getClient()
  const rows = await client`
    INSERT INTO generated_quotes (job_description, output_path, content, generated_at, tool_call_log)
    VALUES (${job_description}, ${output_path ?? ''}, ${content ?? null}, ${new Date().toISOString()}, ${JSON.stringify(tool_call_log ?? [])})
    RETURNING id
  `
  return Number(rows[0].id)
}

export async function listGeneratedQuotes() {
  return getClient()`SELECT * FROM generated_quotes ORDER BY generated_at DESC`
}

export async function getGeneratedQuoteById(id) {
  const rows = await getClient()`SELECT * FROM generated_quotes WHERE id = ${id}`
  return rows[0] || null
}

export async function deleteGeneratedQuote(id) {
  await getClient()`DELETE FROM generated_quotes WHERE id = ${id}`
}

export async function insertPendingAnswer(runId, answer) {
  const client = getClient()
  await client`
    INSERT INTO pending_answers (run_id, answer, created_at)
    VALUES (${runId}, ${answer}, ${new Date().toISOString()})
    ON CONFLICT (run_id) DO UPDATE SET answer = excluded.answer, created_at = excluded.created_at
  `
  // Best-effort sweep of rows nobody ever collected (the waiter already
  // timed out, or the process holding it recycled) — keeps the table from
  // growing unbounded without needing a separate cron job.
  await client`DELETE FROM pending_answers WHERE created_at < ${new Date(Date.now() - 60 * 60 * 1000).toISOString()}`
}

// Atomically claims (deletes-and-returns) a pending answer, so two
// concurrent pollers for the same runId can't both consume it.
export async function takePendingAnswer(runId) {
  const rows = await getClient()`DELETE FROM pending_answers WHERE run_id = ${runId} RETURNING answer`
  return rows[0]?.answer ?? null
}

export async function insertQuoteRun({ runId, trade, tone, jobDescription }) {
  const client = getClient()
  const now = new Date().toISOString()
  await client`
    INSERT INTO quote_runs (run_id, status, trade, tone, job_description, steps, question, quote_id, turns, error_message, created_at, updated_at, last_polled_at)
    VALUES (${runId}, 'running', ${trade}, ${tone}, ${jobDescription}, '[]', NULL, NULL, NULL, NULL, ${now}, ${now}, ${now})
  `
  // Best-effort sweep of old runs — this table is live-progress scratch
  // data, not a system of record (generated_quotes already persists the
  // durable result), so it doesn't need to accumulate indefinitely.
  await client`DELETE FROM quote_runs WHERE created_at < ${new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()}`
}

export async function getQuoteRun(runId) {
  const rows = await getClient()`SELECT * FROM quote_runs WHERE run_id = ${runId}`
  return rows[0] ?? null
}

// Narrow read used by the in-process watchdog every ~15s — avoids pulling
// the (potentially several-KB) steps column on every tick.
export async function getQuoteRunWatchdogInfo(runId) {
  const rows = await getClient()`SELECT status, last_polled_at FROM quote_runs WHERE run_id = ${runId}`
  return rows[0] ?? null
}

export async function touchQuoteRunPolled(runId) {
  await getClient()`UPDATE quote_runs SET last_polled_at = ${new Date().toISOString()} WHERE run_id = ${runId}`
}

export async function updateQuoteRunProgress(runId, steps) {
  await getClient()`
    UPDATE quote_runs
    SET steps = ${JSON.stringify(steps)}, status = 'running', question = NULL, updated_at = ${new Date().toISOString()}
    WHERE run_id = ${runId}
  `
}

export async function setQuoteRunQuestion(runId, question) {
  await getClient()`
    UPDATE quote_runs
    SET status = 'awaiting_answer', question = ${JSON.stringify(question)}, updated_at = ${new Date().toISOString()}
    WHERE run_id = ${runId}
  `
}

export async function completeQuoteRun(runId, { quoteId, turns }) {
  await getClient()`
    UPDATE quote_runs
    SET status = 'done', quote_id = ${quoteId}, turns = ${turns}, question = NULL, updated_at = ${new Date().toISOString()}
    WHERE run_id = ${runId}
  `
}

export async function failQuoteRun(runId, message) {
  await getClient()`
    UPDATE quote_runs
    SET status = 'error', error_message = ${message}, question = NULL, updated_at = ${new Date().toISOString()}
    WHERE run_id = ${runId}
  `
}

export async function abortQuoteRun(runId, message) {
  await getClient()`
    UPDATE quote_runs
    SET status = 'aborted', error_message = ${message}, question = NULL, updated_at = ${new Date().toISOString()}
    WHERE run_id = ${runId}
  `
}
