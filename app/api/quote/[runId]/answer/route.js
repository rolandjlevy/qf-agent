import { resolveAnswer } from '../../../../../lib/quote-runs.js'

export const runtime = 'nodejs'

export async function POST(request, { params }) {
  try {
    const { runId } = await params
    const body = await request.json()
    const resolved = resolveAnswer(runId, body.answer ?? '')

    if (!resolved) {
      return Response.json({ error: true, message: 'No pending question for this run' }, { status: 404 })
    }

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: true, message: err.message }, { status: 500 })
  }
}
