import { proposeMaterials } from '../../../../lib/propose-materials.js'
import { VALID_TRADES } from '../../../../lib/constants.js'
import { sanitizePhotoFindings } from '../../../../lib/photo-findings.js'
import {
  MAX_JOB_DESCRIPTION_LENGTH,
  cleanJobDescription,
  sanitizeQaPairs,
} from '../../../../lib/request-limits.js'
import { clientIp, isQuoteRequestRateLimited, rateLimitedResponse } from '../../../../lib/rate-limit.js'

// No fs/inquirer dependency, but kept consistent with the sibling /api/quote
// route (which does need Node for save_quote's fs.writeFileSync).
export const runtime = 'nodejs'


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
  if (await isQuoteRequestRateLimited(clientIp(request))) return rateLimitedResponse()
  const body = await request.json().catch(() => null)
  const trade = body?.trade
  const jobDescription = cleanJobDescription(body?.jobDescription)
  const priorQuestions = sanitizeQaPairs(body?.priorQuestions)
  const keyAnswers = sanitizeQaPairs(body?.keyAnswers)
  const photoFindings = sanitizePhotoFindings(body?.photoFindings)

  if (!VALID_TRADES.includes(trade)) {
    return Response.json({ error: `trade must be one of: ${VALID_TRADES.join(', ')}` }, { status: 400 })
  }
  if (!jobDescription) {
    return Response.json({ error: `jobDescription is required, up to ${MAX_JOB_DESCRIPTION_LENGTH} characters` }, { status: 400 })
  }

  try {
    const result = await proposeMaterials({ trade, jobDescription, priorQuestions, keyAnswers, photoFindings })
    return Response.json(result)
  } catch (err) {
    // Auth/permission errors can't be fixed by the caller retrying — surface
    // the real status instead of a generic 500, same distinction
    // tools/index.js's isFatal draws for the main agent loop.
    const status = err?.status === 401 || err?.status === 403 ? err.status : 500
    return Response.json({ error: err.message || 'Failed to propose materials' }, { status })
  }
}
