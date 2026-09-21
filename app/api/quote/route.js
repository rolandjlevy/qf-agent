import { randomUUID } from 'crypto'
import { after } from 'next/server'
import { runAgent } from '../../../agent.js'
import { TOOL_DEFINITIONS, executeTool } from '../../../tools/index.js'
import { buildPhaseBSystemPrompt, buildInitialMessage } from '../../../prompts/system.js'
import { getPhaseBModel } from '../../../lib/anthropic-client.js'
import {
  getTraderProfile,
  insertGeneratedQuote,
  insertQuoteRun,
  updateQuoteRunProgress,
  setQuoteRunQuestion,
  completeQuoteRun,
  failQuoteRun,
  abortQuoteRun,
  getQuoteRunWatchdogInfo,
} from '../../../lib/db.js'
import { formatTraderContext } from '../../../lib/trader-context.js'
import { VALID_TRADES, VALID_TONES } from '../../../lib/constants.js'
import { waitForAnswer } from '../../../lib/quote-runs.js'
import { summarizeFollowUpAnswers } from '../../../lib/summarize-follow-up-answers.js'

// save_quote (via tools/save-quote.js) uses Node's fs module — must run in
// the Node runtime, not edge.
export const runtime = 'nodejs'
// Vercel's function timeout for this project defaults to 300s (confirmed via
// a production "Task timed out after 300 seconds" log). Declared explicitly
// so the margin below is against a known value, not an account default that
// could silently change. after() does not extend this — the background run
// below still shares the same 300s ceiling as before, just decoupled from
// whether the client is still connected.
export const maxDuration = 300

// Must leave enough margin under maxDuration for the rest of the pipeline
// (remaining draft_section calls, save_quote, the DB write) to finish after
// the fallback fires — matching it exactly to maxDuration lets an unanswered
// question's fallback lose the race against Vercel's hard kill, so the run
// dies with no terminal status ever written.
const ASK_USER_TIMEOUT_MS = 3.5 * 60 * 1000
const PIPELINE_MARGIN_MS = 90 * 1000

// A short-polling transport has no socket-level disconnect signal the way
// the old SSE stream's cancel() did — a client that closes the tab just
// stops polling. This watchdog checks quote_runs.last_polled_at (stamped by
// GET /api/quote/[runId]/status on every poll) and aborts the run if the
// client's gone quiet, so an abandoned run stops making Anthropic API calls
// nobody is waiting on, same as the old AbortController-on-disconnect did.
const WATCHDOG_INTERVAL_MS = 15000
const WATCHDOG_STALL_MS = 60000

// Materials-refinement flow (see CLAUDE.md's Phase 3a addendum): this route
// is now always Phase B — the trader has already reviewed a Phase A proposal
// via /api/quote/propose-materials and refined it client-side, so `materials`
// is required and authoritative, never re-derived by the agent loop itself.
function validateMaterials(materials) {
  // An empty array is valid and deliberate — a labour-only job can
  // legitimately have no materials at all; only a missing/malformed field
  // (not an array, or a malformed entry) is rejected below.
  if (!Array.isArray(materials)) return null
  for (const m of materials) {
    if (!m || typeof m.label !== 'string' || !m.label.trim()) return null
    if (m.quantity !== undefined && typeof m.quantity !== 'string') return null
    if (m.description !== undefined && typeof m.description !== 'string') return null
  }
  return materials
}

// Converts the refined {label, quantity?, description?} list back into the
// {name, quantity, notes, confidence} shape tools/identify-materials.js has
// always produced, so lib/quote-materials.js's extractMaterialsFromToolCallLog
// — and everything downstream of it (the Phase 3a price-lookup UI, including
// its editable Qty input — see app/materials-pricing.js) — keeps working
// completely unchanged, with no knowledge that Phase A/B exist. `quantity`
// used to be hardcoded null here since Phase A never captured it as a
// structured field; it now proposes one (lib/propose-materials.js) so it can
// carry straight through instead of leaving that Qty input blank.
function toLegacyMaterialShape(materials) {
  return materials.map((m) => ({
    name: m.label.trim(),
    quantity: m.quantity?.trim() || null,
    notes: m.description?.trim() || null,
    confidence: 'trader_confirmed',
  }))
}

// { question, answer } pairs gathered during Phase A's clarifying-question
// round-trip (lib/propose-materials.js) — supplementary context for
// buildInitialMessage, not authoritative like `materials`, so malformed
// entries are dropped rather than rejecting the whole request over them.
function sanitizeFollowUpAnswers(followUpAnswers) {
  if (!Array.isArray(followUpAnswers)) return []
  return followUpAnswers.filter(
    (qa) => qa && typeof qa.question === 'string' && qa.question.trim() && typeof qa.answer === 'string' && qa.answer.trim(),
  )
}

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const trade = body?.trade
  const tone = body?.tone
  const jobDescription = typeof body?.jobDescription === 'string' ? body.jobDescription.trim() : ''
  const materials = validateMaterials(body?.materials)
  const followUpAnswers = sanitizeFollowUpAnswers(body?.followUpAnswers)

  if (!VALID_TRADES.includes(trade)) {
    return Response.json({ error: `trade must be one of: ${VALID_TRADES.join(', ')}` }, { status: 400 })
  }
  if (!VALID_TONES.includes(tone)) {
    return Response.json({ error: `tone must be one of: ${VALID_TONES.join(', ')}` }, { status: 400 })
  }
  if (!jobDescription) {
    return Response.json({ error: 'jobDescription is required' }, { status: 400 })
  }
  if (!materials) {
    return Response.json(
      { error: 'materials is required — an array of { label, description? } refined via /api/quote/propose-materials (may be empty for a labour-only job)' },
      { status: 400 },
    )
  }

  const runId = randomUUID()
  // Computed here, at invocation start, not inside after() — after()'s
  // callback still shares this invocation's maxDuration budget, so the
  // deadline math must anchor to the same wall-clock start it always has.
  const deadline = Date.now() + maxDuration * 1000 - PIPELINE_MARGIN_MS

  // Awaited before after() so the first status poll — which can legitimately
  // arrive within ~100ms of the client receiving runId — never races an
  // unwritten row.
  await insertQuoteRun({ runId, trade, tone, jobDescription })

  after(async () => {
    const abortController = new AbortController()
    const steps = []

    // Every quote_runs write for this run — progress, question, terminal
    // state — goes through this single queue instead of firing independently.
    // onStep is called synchronously by agent.js (not awaited), so its write
    // can't be awaited inline without changing agent.js; and even askUser's
    // own write (which *is* awaited by its caller) can still race a
    // just-enqueued onStep write for the very same tool_call event, since
    // that one was never awaited before askUser ran. Both hazards land on
    // the same failure shape: updateQuoteRunProgress always resets
    // status='running', so a write that lands late can silently overwrite a
    // 'awaiting_answer' or 'done' status set moments before it. Routing every
    // write through one chain and awaiting it wherever ordering actually
    // matters (before waitForAnswer, before the terminal write) guarantees
    // each write is applied strictly after everything enqueued before it.
    let writeChain = Promise.resolve()
    // Set the instant a terminal write (done/error/aborted) is decided —
    // before it's even enqueued. abortController.abort() doesn't stop the
    // agent loop instantly: agent.js only checks signal.aborted at the top
    // of the next turn, so a turn already in flight when the watchdog fires
    // can still produce one or more further onStep calls afterward. Ordering
    // writes correctly (via writeChain) isn't enough to protect against
    // that — a *new* write enqueued after the terminal one, from stale
    // in-flight work, would still legitimately be "last" and overwrite it.
    // Gating onStep's enqueue on this flag stops those new writes from ever
    // being enqueued at all, once a terminal state has been decided.
    let finished = false
    function enqueueWrite(fn) {
      writeChain = writeChain.then(fn).catch((err) => console.error('quote_runs write failed:', err.message))
      return writeChain
    }

    const watchdog = setInterval(async () => {
      if (finished) {
        clearInterval(watchdog)
        return
      }
      const info = await getQuoteRunWatchdogInfo(runId).catch(() => null)
      if (!info || info.status === 'done' || info.status === 'error') {
        clearInterval(watchdog)
        return
      }
      if (info.status === 'aborted') {
        // Set by POST /api/quote/[runId]/cancel — this loop's AbortController
        // just hasn't heard yet. Abort now so it stops burning API calls and can't reset status back to 'running' via onStep.
        clearInterval(watchdog)
        finished = true
        abortController.abort()
        return
      }
      if (Date.now() - new Date(info.last_polled_at).getTime() > WATCHDOG_STALL_MS) {
        clearInterval(watchdog)
        finished = true
        abortController.abort()
        await enqueueWrite(() => abortQuoteRun(runId, 'Run abandoned — client stopped polling.'))
      }
    }, WATCHDOG_INTERVAL_MS)

    function onStep(step) {
      if (finished) return
      if (!['turn_start', 'tool_call', 'tool_result', 'final_answer'].includes(step.type)) return
      steps.push(step)
      const snapshot = [...steps]
      enqueueWrite(() => updateQuoteRunProgress(runId, snapshot))
    }

    const askUser = async (question, context, choices) => {
      if (!finished) await enqueueWrite(() => setQuoteRunQuestion(runId, { question, context, choices }))
      const remainingMs = Math.max(0, deadline - Date.now())
      return waitForAnswer(
        runId,
        Math.min(ASK_USER_TIMEOUT_MS, remainingMs),
        () => 'No answer given — proceed with reasonable assumptions.',
        abortController.signal,
      )
    }

    try {
      // Run concurrently — neither depends on the other, and the
      // summarization call is itself an LLM round-trip worth overlapping
      // with the trader-profile fetch rather than paying for both in series.
      const [traderProfile, followUpAnswerBullets] = await Promise.all([
        getTraderProfile(),
        summarizeFollowUpAnswers(followUpAnswers, { signal: abortController.signal }),
      ])
      const traderContext = formatTraderContext(traderProfile)
      const phaseBPrompt = buildPhaseBSystemPrompt()
      const systemPrompt = traderContext ? `${phaseBPrompt}\n\n${traderContext}` : phaseBPrompt
      const initialMessage = buildInitialMessage({ trade, tone, jobDescription, followUpAnswers })

      // The trader-refined list from the materials-refinement UI — already
      // final by this point (see validateMaterials/toLegacyMaterialShape
      // above). Converted to the same shape tools/identify-materials.js has
      // always produced and recorded as a synthetic identify_materials
      // tool_call/tool_result pair, purely so
      // lib/quote-materials.js's extractMaterialsFromToolCallLog (and the
      // Phase 3a price-lookup UI built on it) keeps working unchanged,
      // without needing to know Phase A/B split ever happened.
      const legacyMaterials = toLegacyMaterialShape(materials)
      const materialsInput = { trade, job_description: jobDescription }
      steps.push(
        { type: 'tool_call', tool: 'identify_materials', input: materialsInput },
        { type: 'tool_result', tool: 'identify_materials', result: { materials: legacyMaterials } },
      )

      // trade/tone/jobDescription/sectionStore let draft_section/save_quote
      // pull known-once-per-run context instead of requiring the model to
      // retype it on every call; save_quote fills in toolContext.savedQuote.
      // materials is pre-populated (not left for the model to fill in via
      // identify_materials, which isn't offered as a tool below) so
      // draft_section picks up the trader-refined list automatically.
      const toolContext = {
        traderProfile,
        askUser,
        signal: abortController.signal,
        trade,
        tone,
        jobDescription,
        sectionStore: {},
        materials: legacyMaterials,
        followUpAnswerBullets,
      }

      // identify_materials and ask_user are deliberately excluded — materials
      // are already final and any clarifying questions this job needed were
      // already asked during Phase A's round-trip (see
      // lib/propose-materials.js and PHASE_B_MATERIALS_RULES in
      // prompts/system.js); not offering either tool at all is a stronger
      // guarantee than a prompt instruction alone that the model can't
      // silently re-derive materials or re-ask something too late to matter.
      const phaseBTools = TOOL_DEFINITIONS.filter((t) => !['identify_materials', 'ask_user'].includes(t.name))

      const { turns } = await runAgent({
        systemPrompt,
        tools: phaseBTools,
        executeTool,
        initialMessage,
        maxTurns: 20,
        onStep,
        toolContext,
        signal: abortController.signal,
        model: getPhaseBModel(),
      })

      let quoteId = null
      if (toolContext.savedQuote) {
        quoteId = await insertGeneratedQuote({
          job_description: jobDescription,
          output_path: toolContext.savedQuote.file_path ?? '',
          content: toolContext.savedQuote.content,
          tool_call_log: steps,
        })
      }
      finished = true
      await enqueueWrite(() => completeQuoteRun(runId, { quoteId, turns }))
    } catch (err) {
      // AbortError means the watchdog already wrote 'aborted' — don't
      // overwrite that with a generic error state.
      if (err.name !== 'AbortError') {
        finished = true
        await enqueueWrite(() => failQuoteRun(runId, err.message))
      }
    } finally {
      clearInterval(watchdog)
    }
  })

  return Response.json({ runId })
}
