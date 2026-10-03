import { resolveAnswer } from '../../../../../lib/quote-runs.js'
import { clearQuoteRunQuestion, getQuoteRun } from '../../../../../lib/db.js'

const MAX_ANSWER_LENGTH = 1000

export const runtime = 'nodejs'

export async function POST(request, { params }) {
  try {
    const { runId } = await params
    const body = await request.json().catch(() => null)
    const answer = body?.answer ?? ''
    if (typeof answer !== 'string' || answer.length > MAX_ANSWER_LENGTH) {
      return Response.json({ error: true, message: `answer must be a string of up to ${MAX_ANSWER_LENGTH} characters` }, { status: 400 })
    }
    if (!(await getQuoteRun(runId))) return Response.json({ error: true, message: 'Run not found' }, { status: 404 })
    // Always stores the answer (lib/quote-runs.js's pending_answers table) —
    // unlike the old in-memory version, this instance has no way to know
    // whether the waiter is still alive (it's very possibly a different
    // Lambda instance). A late or orphaned answer is harmless: it just sits
    // until the waiter's poll claims it, or ages out of the table unclaimed.
    await resolveAnswer(runId, answer)
    // Clear the pending question here, synchronously, rather than waiting for
    // the agent loop to notice — see clearQuoteRunQuestion's comment for why
    // that gap caused the answered question to flicker back on the page.
    await clearQuoteRunQuestion(runId)
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: true, message: err.message }, { status: 500 })
  }
}
