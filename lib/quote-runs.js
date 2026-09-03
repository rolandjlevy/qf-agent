// In-memory bridge between the SSE /api/quote run loop (which pauses on an
// ask_user tool call) and the companion /api/quote/[runId]/answer endpoint
// that resumes it. Single-process, single-tenant, matches the rest of
// Phase 2's storage choices — not persisted, since a pending question only
// makes sense for the lifetime of its still-open request.
//
// Anchored on globalThis rather than module scope: Next.js bundles each
// route handler as its own module graph, so a plain module-level variable
// here would not actually be shared between /api/quote and
// /api/quote/[runId]/answer — globalThis is the one thing guaranteed to be
// the same object across route bundles within a single Node process.
const pending = (globalThis.__qfPendingAnswers ??= new Map())

export function waitForAnswer(runId, timeoutMs, onTimeout, signal) {
  return new Promise((resolve, reject) => {
    // A signal aborted before this call starts would never fire its 'abort'
    // event again — the listener below would wait out the full timeout.
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timer = setTimeout(() => {
      pending.delete(runId)
      resolve(onTimeout())
    }, timeoutMs)

    pending.set(runId, (answer) => {
      clearTimeout(timer)
      pending.delete(runId)
      resolve(answer)
    })

    // Without this, a client disconnect during an ask_user wait leaves the
    // question pending — and the run silently blocked — for the full
    // timeout instead of unwinding immediately.
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        pending.delete(runId)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

export function resolveAnswer(runId, answer) {
  const resolver = pending.get(runId)
  if (!resolver) return false
  resolver(answer)
  return true
}
