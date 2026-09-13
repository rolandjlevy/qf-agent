import { getPriceSearchProvider } from '../../../../lib/pricing/index.js'
import { PriceSearchError } from '../../../../lib/pricing/providers/PriceSearchProvider.js'

export const runtime = 'nodejs'

const MAX_QUERY_LENGTH = 200

// No session concept in this app (single-tenant, no auth — see CLAUDE.md) so
// this rate-limits per client IP rather than per session, as the brief's
// fallback option specifies.
//
// In-memory only: this Map does not survive a Vercel serverless instance
// recycling, and a request can land on a different instance than the one
// that saw this IP's earlier requests (no session affinity — the same
// caveat lib/quote-runs.js's pending_answers table exists to work around
// for ask_user). That makes this a soft, best-effort abuse guard, not a
// hard per-IP guarantee. Good enough for MVP; a Redis-backed limiter would
// be needed for the real thing, same tradeoff as PRICE_CACHE_TTL_SECONDS's
// Postgres-not-Redis call.
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 20
const requestTimestampsByIp = new Map()

function isRateLimited(ip) {
  const now = Date.now()
  const recent = (requestTimestampsByIp.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  recent.push(now)
  requestTimestampsByIp.set(ip, recent)
  return recent.length > RATE_LIMIT_MAX_REQUESTS
}

function getClientIp(request) {
  // Vercel sets x-forwarded-for; fall back to a shared bucket if it's ever
  // absent (local dev without a proxy) rather than failing the request.
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown'
}

const HTTP_STATUS_BY_ERROR_CODE = {
  RATE_LIMITED: 429,
  NO_RESULTS: 404,
  PROVIDER_DOWN: 502,
  INVALID_QUERY: 400,
  NOT_IMPLEMENTED: 501,
  UNKNOWN: 500,
}

export async function POST(request) {
  const ip = getClientIp(request)
  if (isRateLimited(ip)) {
    return Response.json({ code: 'RATE_LIMITED', message: 'Too many price searches from this connection — try again shortly.' }, { status: 429 })
  }

  const body = await request.json().catch(() => null)
  const query = body?.query
  const options = body?.options

  if (typeof query !== 'string' || !query.trim() || query.length > MAX_QUERY_LENGTH) {
    return Response.json({ code: 'INVALID_QUERY', message: `"query" must be a non-empty string of at most ${MAX_QUERY_LENGTH} characters.` }, { status: 400 })
  }
  if (options !== undefined && (typeof options !== 'object' || options === null || Array.isArray(options))) {
    return Response.json({ code: 'INVALID_QUERY', message: '"options" must be an object when provided.' }, { status: 400 })
  }

  try {
    const provider = getPriceSearchProvider()
    const result = await provider.search(query, options)
    return Response.json(result)
  } catch (err) {
    if (err instanceof PriceSearchError) {
      return Response.json({ code: err.code, message: err.message }, { status: HTTP_STATUS_BY_ERROR_CODE[err.code] ?? 500 })
    }
    // Anything not already a typed PriceSearchError is a genuine surprise —
    // logged server-side, never leaked as a raw error message to the client
    // (could contain SERPER_API_KEY-adjacent request details).
    console.error('POST /api/pricing/search failed:', err)
    return Response.json({ code: 'UNKNOWN', message: 'Price search failed unexpectedly.' }, { status: 500 })
  }
}
