import { neon } from '@neondatabase/serverless'

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
    INSERT INTO trader_profile (id, business_name, contact_details, hourly_rate, standard_terms, voice_sample, vat_registered, certifications, service_area, updated_at)
    VALUES (1, ${fields.business_name ?? null}, ${fields.contact_details ?? null}, ${fields.hourly_rate ?? null}, ${fields.standard_terms ?? null}, ${fields.voice_sample ?? null}, ${fields.vat_registered ?? false}, ${fields.certifications ?? null}, ${fields.service_area ?? null}, ${updatedAt})
    ON CONFLICT (id) DO UPDATE SET
      business_name = excluded.business_name,
      contact_details = excluded.contact_details,
      hourly_rate = excluded.hourly_rate,
      standard_terms = excluded.standard_terms,
      voice_sample = excluded.voice_sample,
      vat_registered = excluded.vat_registered,
      certifications = excluded.certifications,
      service_area = excluded.service_area,
      updated_at = excluded.updated_at
  `
  return getTraderProfile()
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

// Called synchronously from POST /api/quote/[runId]/answer, before it
// responds — without this, the row still says status='awaiting_answer' with
// the old question until the agent loop's server-side poller (up to 1s) picks
// the answer up *and* gets a further response from Claude, which is often
// slower than the client's 2s status poll. That gap let a poll land in
// between the client optimistically clearing its own question state and the
// agent loop eventually clearing this row, making the answered question
// flicker back onto the page for a beat before disappearing for good.
// Guarded to the 'awaiting_answer' status so a late/orphaned answer (past its
// timeout, or for a run that already finished) can't overwrite a terminal
// status this run has since reached.
export async function clearQuoteRunQuestion(runId) {
  await getClient()`
    UPDATE quote_runs
    SET status = 'running', question = NULL, updated_at = ${new Date().toISOString()}
    WHERE run_id = ${runId} AND status = 'awaiting_answer'
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

// Guarded to non-terminal statuses so a late call (the background run
// finished right as this fired) can't overwrite an already-reached 'done'/
// 'error' state with 'aborted'.
export async function abortQuoteRun(runId, message) {
  await getClient()`
    UPDATE quote_runs
    SET status = 'aborted', error_message = ${message}, question = NULL, updated_at = ${new Date().toISOString()}
    WHERE run_id = ${runId} AND status NOT IN ('done', 'error', 'aborted')
  `
}

// Backs lib/pricing/cache/DbCacheStore.js. `payload` is the caller's
// JSON.stringify(PriceSearchResult); this layer only stores/retrieves bytes
// and the expiry timestamp, expiry semantics live in DbCacheStore.
export async function getPriceSearchCacheEntry(cacheKey) {
  const rows = await getClient()`SELECT payload, expires_at FROM price_search_cache WHERE cache_key = ${cacheKey}`
  return rows[0] ?? null
}

export async function setPriceSearchCacheEntry(cacheKey, payload, expiresAt) {
  await getClient()`
    INSERT INTO price_search_cache (cache_key, payload, expires_at)
    VALUES (${cacheKey}, ${payload}, ${expiresAt})
    ON CONFLICT (cache_key) DO UPDATE SET payload = excluded.payload, expires_at = excluded.expires_at
  `
}

export async function deletePriceSearchCacheEntry(cacheKey) {
  await getClient()`DELETE FROM price_search_cache WHERE cache_key = ${cacheKey}`
}

// A trader's chosen product per material line — see quote_line_prices in
// lib/schema.sql. Additive to generated_quotes, never overwrites it.
export async function getQuoteLinePrices(quoteId) {
  return getClient()`SELECT material_name, product, selected_at FROM quote_line_prices WHERE quote_id = ${quoteId}`
}

export async function upsertQuoteLinePrice(quoteId, materialName, product) {
  await getClient()`
    INSERT INTO quote_line_prices (quote_id, material_name, product, selected_at)
    VALUES (${quoteId}, ${materialName}, ${JSON.stringify(product)}, ${new Date().toISOString()})
    ON CONFLICT (quote_id, material_name) DO UPDATE SET product = excluded.product, selected_at = excluded.selected_at
  `
}
