import { getQuoteRun, touchQuoteRunPolled } from '../../../../../lib/db.js'

export const runtime = 'nodejs'
// Without this, Next would statically prerender this route at build time,
// freezing its response — this must reflect the live quote_runs row on
// every poll.
export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  const { runId } = await params
  const run = await getQuoteRun(runId)
  if (!run) return Response.json({ error: 'Run not found' }, { status: 404 })

  // Doubles as the "someone is still watching" heartbeat the background
  // run's watchdog checks — see WATCHDOG_STALL_MS in app/api/quote/route.js.
  await touchQuoteRunPolled(runId)

  return Response.json({
    status: run.status,
    steps: JSON.parse(run.steps ?? '[]'),
    question: run.question ? JSON.parse(run.question) : null,
    quoteId: run.quote_id,
    turns: run.turns,
    error: run.error_message,
  })
}
