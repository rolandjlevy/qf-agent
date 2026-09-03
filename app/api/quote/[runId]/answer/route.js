import { resolveAnswer } from '../../../../../lib/quote-runs.js'

export const runtime = 'nodejs'

export async function POST(request, { params }) {
  try {
    const { runId } = await params
    const body = await request.json()
    // Always stores the answer (lib/quote-runs.js's pending_answers table) —
    // unlike the old in-memory version, this instance has no way to know
    // whether the waiter is still alive (it's very possibly a different
    // Lambda instance). A late or orphaned answer is harmless: it just sits
    // until the waiter's poll claims it, or ages out of the table unclaimed.
    await resolveAnswer(runId, body.answer ?? '')
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: true, message: err.message }, { status: 500 })
  }
}
