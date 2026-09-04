import { randomUUID } from 'crypto'
import { after } from 'next/server'
import { runAgent } from '../../../agent.js'
import { TOOL_DEFINITIONS, executeTool } from '../../../tools/index.js'
import { SYSTEM_PROMPT, buildInitialMessage } from '../../../prompts/system.js'
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

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const trade = body?.trade
  const tone = body?.tone
  const jobDescription = typeof body?.jobDescription === 'string' ? body.jobDescription.trim() : ''

  if (!VALID_TRADES.includes(trade)) {
    return Response.json({ error: `trade must be one of: ${VALID_TRADES.join(', ')}` }, { status: 400 })
  }
  if (!VALID_TONES.includes(tone)) {
    return Response.json({ error: `tone must be one of: ${VALID_TONES.join(', ')}` }, { status: 400 })
  }
  if (!jobDescription) {
    return Response.json({ error: 'jobDescription is required' }, { status: 400 })
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
    let savedQuote = null

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
      if (!info || info.status === 'done' || info.status === 'error' || info.status === 'aborted') {
        clearInterval(watchdog)
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
      if (step.type === 'tool_result' && step.tool === 'save_quote' && step.result?.success) {
        savedQuote = { filePath: step.result.file_path, content: step.result.content }
      }
      const snapshot = [...steps]
      enqueueWrite(() => updateQuoteRunProgress(runId, snapshot))
    }

    const askUser = async (question, context) => {
      if (!finished) await enqueueWrite(() => setQuoteRunQuestion(runId, { question, context }))
      const remainingMs = Math.max(0, deadline - Date.now())
      return waitForAnswer(
        runId,
        Math.min(ASK_USER_TIMEOUT_MS, remainingMs),
        () => 'No answer given — proceed with reasonable assumptions.',
        abortController.signal,
      )
    }

    try {
      const traderProfile = await getTraderProfile()
      const traderContext = formatTraderContext(traderProfile)
      const systemPrompt = traderContext ? `${SYSTEM_PROMPT}\n\n${traderContext}` : SYSTEM_PROMPT
      const initialMessage = buildInitialMessage({ trade, tone, jobDescription })

      const { turns } = await runAgent({
        systemPrompt,
        tools: TOOL_DEFINITIONS,
        executeTool,
        initialMessage,
        maxTurns: 20,
        onStep,
        toolContext: { traderProfile, askUser, signal: abortController.signal },
        signal: abortController.signal,
      })

      let quoteId = null
      if (savedQuote) {
        quoteId = await insertGeneratedQuote({
          job_description: jobDescription,
          output_path: savedQuote.filePath ?? '',
          content: savedQuote.content,
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
