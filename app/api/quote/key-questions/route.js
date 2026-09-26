import { VALID_TRADES } from '../../../../lib/constants.js'
import { keyQuestionsForJob } from '../../../../lib/trade-knowledge/index.js'

export const runtime = 'nodejs'

// The trade's key questions minus any the description's matched pack job never needs.
// Server-side so the knowledge packs (about 150KB of text) stay out of the page's bundle.
export async function POST(request) {
  const body = await request.json().catch(() => null)
  const trade = body?.trade
  const jobDescription = typeof body?.jobDescription === 'string' ? body.jobDescription.trim() : ''

  if (!VALID_TRADES.includes(trade)) {
    return Response.json({ error: `trade must be one of: ${VALID_TRADES.join(', ')}` }, { status: 400 })
  }
  if (!jobDescription) {
    return Response.json({ error: 'jobDescription is required' }, { status: 400 })
  }

  return Response.json({ questions: keyQuestionsForJob(trade, jobDescription) })
}
