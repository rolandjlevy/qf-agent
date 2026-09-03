import { answerRun } from '../../../../../lib/quote-runs.js'

export const runtime = 'nodejs'

export async function POST(request, { params }) {
  const { runId } = await params
  const body = await request.json().catch(() => null)
  const answer = typeof body?.answer === 'string' ? body.answer : ''

  const delivered = answerRun(runId, answer)
  return Response.json({ delivered })
}
