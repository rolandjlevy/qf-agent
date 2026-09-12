import { abortQuoteRun, getQuoteRun } from '../../../../../lib/db.js'

export const runtime = 'nodejs'

// Different Lambda instance may own the run, so this goes through the DB.
// The background run's watchdog (app/api/quote/route.js) picks up 'aborted' on its ~15s poll and aborts its AbortController.
export async function POST(_request, { params }) {
  const { runId } = await params
  const run = await getQuoteRun(runId)
  if (!run) return Response.json({ error: 'Run not found' }, { status: 404 })
  await abortQuoteRun(runId, 'Cancelled by user.')
  return Response.json({ success: true })
}
