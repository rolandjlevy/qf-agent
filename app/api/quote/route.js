import { randomUUID } from 'crypto'
import { runAgent } from '../../../agent.js'
import { TOOL_DEFINITIONS, executeTool } from '../../../tools/index.js'
import { SYSTEM_PROMPT, buildInitialMessage } from '../../../prompts/system.js'
import { getTraderProfile, insertGeneratedQuote } from '../../../lib/db.js'
import { formatTraderContext } from '../../../lib/trader-context.js'
import { VALID_TRADES, VALID_TONES } from '../../../lib/constants.js'
import { waitForAnswer } from '../../../lib/quote-runs.js'

// save_quote (via tools/save-quote.js) uses Node's fs module — must run in
// the Node runtime, not edge.
export const runtime = 'nodejs'
// Vercel's function timeout for this project defaults to 300s (confirmed via
// a production "Task timed out after 300 seconds" log). Declared explicitly
// so the margin below is against a known value, not an account default that
// could silently change.
export const maxDuration = 300

const HEARTBEAT_INTERVAL_MS = 15000

// Must leave enough margin under maxDuration for the rest of the pipeline
// (remaining draft_section calls, save_quote, the DB write) to finish after
// the fallback fires — matching it exactly to maxDuration lets an unanswered
// question's fallback lose the race against Vercel's hard kill, so the
// connection dies with no done/error event ever sent to the client.
const ASK_USER_TIMEOUT_MS = 3.5 * 60 * 1000
const PIPELINE_MARGIN_MS = 90 * 1000

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
  const encoder = new TextEncoder()
  const deadline = Date.now() + maxDuration * 1000 - PIPELINE_MARGIN_MS

  // Without this, a disconnected client (closed tab, navigated away) left
  // the agent loop — and its Anthropic API calls — running to completion
  // regardless: confirmed in production, where a request the client gave up
  // on at 30s kept executing server-side for the full 5-minute maxDuration,
  // making many outbound API calls nobody was waiting for. cancel() aborts
  // this so abandoned runs actually stop instead of quietly burning the
  // full budget in the background.
  const abortController = new AbortController()

  // If the client disconnects, the runtime calls cancel() and the
  // controller becomes unusable — later enqueue()/close() calls throw
  // "Invalid state: Controller is already closed", which surfaced as an
  // unhandled rejection in production. `closed` makes send/finish no-ops
  // instead of throwing once that's happened.
  let closed = false
  let heartbeat = null

  const stream = new ReadableStream({
    start(controller) {
      function send(event, data) {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
        }
      }

      function finish() {
        if (closed) return
        closed = true
        if (heartbeat) clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          // already closing/closed
        }
      }

      // Some intermediate network layers (corporate proxies, VPNs, security
      // software) don't see Vercel's own HTTP/2 keepalive PINGs and enforce
      // their own idle-connection timeout — observed as a 502 whenever the
      // stream goes quiet for ~30s+, which the ask_user wait does by design.
      // A periodic comment line keeps bytes flowing without being a real
      // event (SSE comments start with ':' and are ignored by parsers).
      heartbeat = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          closed = true
        }
      }, HEARTBEAT_INTERVAL_MS)

      send('run_started', { runId })

      const toolCallLog = []
      let savedQuote = null

      function onStep(step) {
        if (step.type === 'tool_call' || step.type === 'tool_result') {
          toolCallLog.push(step)
        }
        send(step.type, step)
        if (step.type === 'tool_result' && step.tool === 'save_quote' && step.result?.success) {
          savedQuote = { filePath: step.result.file_path, content: step.result.content }
        }
      }

      const askUser = (question, context) => {
        send('question', { question, context })
        const remainingMs = Math.max(0, deadline - Date.now())
        return waitForAnswer(
          runId,
          Math.min(ASK_USER_TIMEOUT_MS, remainingMs),
          () => 'No answer given — proceed with reasonable assumptions.',
          abortController.signal,
        )
      }

      ;(async () => {
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
              tool_call_log: toolCallLog,
            })
          }

          send('done', { turns, quoteId })
        } catch (err) {
          send('error', { message: err.message })
        } finally {
          finish()
        }
      })()
    },
    cancel() {
      closed = true
      if (heartbeat) clearInterval(heartbeat)
      abortController.abort()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
