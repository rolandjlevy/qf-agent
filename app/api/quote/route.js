import { randomUUID } from 'crypto'
import { runAgent } from '../../../agent.js'
import { TOOL_DEFINITIONS, executeTool } from '../../../tools/index.js'
import { SYSTEM_PROMPT, buildInitialMessage } from '../../../prompts/system.js'
import { getTraderProfile, insertGeneratedQuote } from '../../../lib/db.js'
import { formatTraderContext } from '../../../lib/trader-context.js'
import { VALID_TRADES, VALID_TONES } from '../../../lib/constants.js'
import { createRun, endRun, waitForAnswer } from '../../../lib/quote-runs.js'

// save_quote (via tools/save-quote.js) uses Node's fs module — must run in
// the Node runtime, not edge.
export const runtime = 'nodejs'
// Vercel serverless function duration cap for this route. Raise if your plan
// allows and jobs with several ask_user round-trips need more headroom;
// lower to match a Hobby-plan ceiling if deploying there.
export const maxDuration = 300

const HEARTBEAT_INTERVAL_MS = 15000
// Per-question cap, but never allowed to push the run past the shared
// deadline below — avoids main's bug where two unanswered questions in one
// run stacked past Vercel's hard maxDuration with no terminal event ever sent.
const ASK_USER_TIMEOUT_MS = 120000
const DEADLINE_MARGIN_MS = 5000

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
  createRun(runId)

  const encoder = new TextEncoder()
  const deadline = Date.now() + maxDuration * 1000 - DEADLINE_MARGIN_MS

  let closed = false
  let heartbeat = null

  const stream = new ReadableStream({
    async start(controller) {
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
        endRun(runId)
        try {
          controller.close()
        } catch {
          // already closing/closed
        }
      }

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

      async function askUser(question, context) {
        send('question', { question, context })
        const remaining = Math.max(0, deadline - Date.now())
        const timeoutMs = Math.min(ASK_USER_TIMEOUT_MS, remaining)
        return waitForAnswer(runId, timeoutMs, 'No answer given — proceed with reasonable assumptions.')
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
          toolContext: { traderProfile, askUser },
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
    },
    cancel() {
      closed = true
      if (heartbeat) clearInterval(heartbeat)
      endRun(runId)
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
