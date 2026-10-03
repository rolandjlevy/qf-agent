'use server'

import { logRefinementEvents } from '../db.js'
import { MAX_MATERIALS } from '../request-limits.js'

const SOURCES = ['llm_proposed', 'trader_added']
const ACTIONS = ['accepted', 'rejected']

// Called imperatively from the refinement step's Continue click, after
// Phase B has already been fired (see app/quote/new/page.js) — analytics
// must never block or fail the user-facing flow, so this swallows its own
// errors rather than letting them propagate back to the caller.
export async function recordRefinementEvents(sessionId, jobDescription, events) {
  if (!Array.isArray(events) || typeof sessionId !== 'string') return
  // Only well-formed events, at most one per material the trader could have seen.
  const rows = events
    .filter((e) => e && typeof e.label === 'string' && e.label.trim() && SOURCES.includes(e.source) && ACTIONS.includes(e.action))
    .slice(0, MAX_MATERIALS * 2)
    .map((e) => ({
      session_id: sessionId.slice(0, 100),
      job_description: (typeof jobDescription === 'string' ? jobDescription : '').slice(0, 500),
      label: e.label.trim().slice(0, 200),
      source: e.source,
      action: e.action,
    }))
  if (rows.length === 0) return
  try {
    await logRefinementEvents(rows)
  } catch (err) {
    console.error('material_refinement_events write failed:', err.message)
  }
}
