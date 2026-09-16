import { proposeMaterials } from '../../../../lib/propose-materials.js'
import { VALID_TRADES } from '../../../../lib/constants.js'

// No fs/inquirer dependency, but kept consistent with the sibling /api/quote
// route (which does need Node for save_quote's fs.writeFileSync).
export const runtime = 'nodejs'

// { question, answer } pairs only — anything else is either malformed client
// state or from a stale/tampered request, and this step is a proposal aid,
// not an authoritative record, so we just drop bad entries rather than 400
// the whole request over them.
function sanitizeQaPairs(pairs) {
  if (!Array.isArray(pairs)) return []
  return pairs.filter(
    (qa) => qa && typeof qa.question === 'string' && qa.question.trim() && typeof qa.answer === 'string' && qa.answer.trim(),
  )
}

// Phase A of the materials-refinement flow (see CLAUDE.md's Phase 3a
// addendum, and the follow-up that added the clarifying-question round-trip
// below): a single, fast, synchronous request/response per round — this has
// no long-running pause of its own, so it doesn't need the quote_runs
// insert-then-poll machinery POST /api/quote (Phase B) uses for ask_user.
//
// Each call returns either `{ materials }` (done) or `{ clarifyingQuestion }`
// (the trader answers it, then the client calls this again with the answer
// appended to `priorQuestions` — see app/quote/new/page.js).
export async function POST(request) {
  const body = await request.json().catch(() => null)
  const trade = body?.trade
  const jobDescription = typeof body?.jobDescription === 'string' ? body.jobDescription.trim() : ''
  const priorQuestions = sanitizeQaPairs(body?.priorQuestions)

  if (!VALID_TRADES.includes(trade)) {
    return Response.json({ error: `trade must be one of: ${VALID_TRADES.join(', ')}` }, { status: 400 })
  }
  if (!jobDescription) {
    return Response.json({ error: 'jobDescription is required' }, { status: 400 })
  }

  try {
    const result = await proposeMaterials({ trade, jobDescription, priorQuestions })
    return Response.json(result)
  } catch (err) {
    // Auth/permission errors can't be fixed by the caller retrying — surface
    // the real status instead of a generic 500, same distinction
    // tools/index.js's isFatal draws for the main agent loop.
    const status = err?.status === 401 || err?.status === 403 ? err.status : 500
    return Response.json({ error: err.message || 'Failed to propose materials' }, { status })
  }
}
