'use server'

import { logRefinementEvents } from '../db.js'

// Called imperatively from the refinement step's Continue click, after
// Phase B has already been fired (see app/quote/new/page.js) — analytics
// must never block or fail the user-facing flow, so this swallows its own
// errors rather than letting them propagate back to the caller.
export async function recordRefinementEvents(sessionId, jobDescription, events) {
  if (!Array.isArray(events) || events.length === 0) return
  try {
    await logRefinementEvents(
      events.map((e) => ({
        session_id: sessionId,
        job_description: (jobDescription || '').slice(0, 500),
        label: e.label,
        source: e.source,
        action: e.action,
      })),
    )
  } catch (err) {
    console.error('material_refinement_events write failed:', err.message)
  }
}
