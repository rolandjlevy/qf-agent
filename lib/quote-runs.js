// Bridges app/api/quote/route.js (one long-lived streaming POST, running the
// agent for the lifetime of the whole quote generation) and
// app/api/quote/[runId]/answer/route.js (a second, separate short POST that
// delivers an answer to a paused ask_user call mid-run).
//
// Anchored on globalThis, not module scope: Next bundles each route as its
// own module graph, so a plain top-level `const runs = new Map()` here would
// not actually be the same Map in both route handlers' module instances.
const runs = globalThis.__qfQuoteRuns ?? (globalThis.__qfQuoteRuns = new Map())

export function createRun(runId) {
  runs.set(runId, { resolveAnswer: null })
}

export function endRun(runId) {
  runs.delete(runId)
}

export function hasRun(runId) {
  return runs.has(runId)
}

// Called from the SSE route's askUser callback. Resolves either when
// answerRun() is called for this runId from the /answer route, or after
// timeoutMs with fallbackAnswer — so an unanswered question degrades to a
// reasonable default rather than hanging the run indefinitely.
export function waitForAnswer(runId, timeoutMs, fallbackAnswer) {
  return new Promise((resolve) => {
    const run = runs.get(runId)
    if (!run) {
      resolve(fallbackAnswer)
      return
    }

    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      run.resolveAnswer = null
      resolve(fallbackAnswer)
    }, timeoutMs)

    run.resolveAnswer = (answer) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      run.resolveAnswer = null
      resolve(answer)
    }
  })
}

// Called from the /answer route. Returns true if there was a pending
// question actually waiting on an answer, false otherwise (unknown runId,
// or no question currently in flight for it).
export function answerRun(runId, answer) {
  const run = runs.get(runId)
  if (!run || !run.resolveAnswer) return false
  run.resolveAnswer(answer)
  return true
}
