import { getPriceSearchProvider } from '../../../../lib/pricing/index.js'
import { PriceSearchError } from '../../../../lib/pricing/providers/PriceSearchProvider.js'
import { MERCHANT_CATEGORIES } from '../../../../lib/pricing/merchant-category.js'
import { clientIp, createRateLimiter } from '../../../../lib/rate-limit.js'

export const runtime = 'nodejs'

const MAX_QUERY_LENGTH = 200

// No session concept in this app (single-tenant, no auth — see CLAUDE.md), so this limits per client IP,
// shared across instances in Upstash Redis (lib/rate-limit.js), with its own budget apart from the quote routes'.
const isRateLimited = createRateLimiter({ prefix: 'pricing', max: 20, windowSeconds: 60 })

const HTTP_STATUS_BY_ERROR_CODE = {
  RATE_LIMITED: 429,
  NO_RESULTS: 404,
  PROVIDER_DOWN: 502,
  INVALID_QUERY: 400,
  NOT_IMPLEMENTED: 501,
  UNKNOWN: 500,
}

export async function POST(request) {
  const ip = clientIp(request)
  if (await isRateLimited(ip)) {
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
  if (options?.merchant !== undefined && !MERCHANT_CATEGORIES.includes(options.merchant)) {
    return Response.json({ code: 'INVALID_QUERY', message: `"options.merchant" must be one of: ${MERCHANT_CATEGORIES.join(', ')}.` }, { status: 400 })
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
