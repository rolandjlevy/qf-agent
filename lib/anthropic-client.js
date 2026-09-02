import Anthropic from '@anthropic-ai/sdk'

const DEFAULT_TIMEOUT_MS = 60000
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

export class TruncatedResponseError extends Error {
  constructor(message) {
    super(message)
    this.name = 'TruncatedResponseError'
  }
}

let client = null

export function getModel() {
  return process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'
}

export function createClient() {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: Number(process.env.REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
    })
  }
  return client
}

function isRetryable(err) {
  if (err?.status && RETRYABLE_STATUS.has(err.status)) return true
  // No status at all means a connection/network-level failure (APIConnectionError et al)
  if (!err?.status && err?.name !== 'AbortError') return true
  return false
}

function retryDelayMs(err, attempt) {
  const retryAfter = err?.headers?.get?.('retry-after')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (!Number.isNaN(seconds)) return seconds * 1000
  }
  const base = 500 * 2 ** attempt
  const jitter = Math.random() * 250
  return base + jitter
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function createMessage(anthropicClient, params, { retries = 3, signal } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    try {
      const response = await anthropicClient.messages.create(params, { signal })
      if (response.stop_reason === 'max_tokens') {
        throw new TruncatedResponseError(
          `Response truncated at max_tokens (${params.max_tokens}) before completion`,
        )
      }
      return response
    } catch (err) {
      if (err instanceof TruncatedResponseError) throw err
      lastErr = err
      // Auth/permission errors can't be fixed by retrying — fail fast
      if (err?.status === 401 || err?.status === 403) throw err
      if (!isRetryable(err) || attempt === retries) throw err
      await sleep(retryDelayMs(err, attempt))
    }
  }
  throw lastErr
}
