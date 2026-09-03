// Bridge between the SSE /api/quote run loop (which pauses on an ask_user
// tool call) and the companion /api/quote/[runId]/answer endpoint that
// resumes it. Backed by Postgres (lib/db.js's pending_answers table), not
// in-process memory — Vercel's Node.js serverless functions have no session
// affinity, so the request that posts the answer routinely lands on a
// different Lambda instance than the one still waiting inside runAgent().
// A same-process store (even one anchored on globalThis, as this used to
// be) is invisible across that boundary: the answer silently vanished and
// the run fell back to "No answer given" after the full timeout even though
// the trader did answer. Polling Postgres works regardless of which
// instance handles which request.
import { insertPendingAnswer, takePendingAnswer } from './db.js'

const POLL_INTERVAL_MS = 1000

export function waitForAnswer(runId, timeoutMs, onTimeout, signal) {
  return new Promise((resolve, reject) => {
    // A signal aborted before this call starts would never fire its 'abort'
    // event again — the listener below would wait out the full timeout.
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const deadline = Date.now() + timeoutMs
    let settled = false
    let poller = null

    function finish(fn) {
      if (settled) return
      settled = true
      if (poller) clearInterval(poller)
      signal?.removeEventListener('abort', onAbort)
      fn()
    }

    function onAbort() {
      finish(() => reject(new DOMException('Aborted', 'AbortError')))
    }
    // Without this, a client disconnect during an ask_user wait leaves the
    // question pending — and the run silently blocked — for the full
    // timeout instead of unwinding immediately.
    signal?.addEventListener('abort', onAbort, { once: true })

    async function poll() {
      if (settled) return
      let answer = null
      try {
        answer = await takePendingAnswer(runId)
      } catch {
        // Transient DB hiccup — try again on the next tick rather than
        // failing the whole wait over one blip.
        return
      }
      if (answer !== null) {
        finish(() => resolve(answer))
        return
      }
      if (Date.now() >= deadline) {
        finish(() => resolve(onTimeout()))
      }
    }

    poller = setInterval(poll, POLL_INTERVAL_MS)
    poll()
  })
}

export async function resolveAnswer(runId, answer) {
  await insertPendingAnswer(runId, answer)
  return true
}
