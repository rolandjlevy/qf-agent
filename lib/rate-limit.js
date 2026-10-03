import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Per-IP rate limits shared by every server instance, in the qf-rate-limit Upstash Redis database
// (KV_REST_API_URL/TOKEN). Server-only: kept apart from lib/request-limits.js, which the browser imports.

const REDIS_TIMEOUT_MS = 1000;

// Read at call time, not module load (the CLI loads .env after imports, see lib/db.js).
let redis;
function getRedis() {
  if (redis === undefined) {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    redis = url && token ? new Redis({ url, token }) : null;
  }
  return redis;
}

// Fallback without Redis (local dev with no credentials): counts per instance, in memory.
export function createMemoryRateLimiter({ windowMs, max }) {
  const hits = new Map();
  return function isRateLimited(ip, now = Date.now()) {
    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(ip, recent);
    // Drop idle IPs now and then so the map can't grow without limit on a long-lived instance.
    if (hits.size > 1000) {
      for (const [key, times] of hits) if (now - times[times.length - 1] >= windowMs) hits.delete(key);
    }
    return recent.length > max;
  };
}

// `max` requests per `windowSeconds` per IP, as a sliding window. Fails open: if Redis is slow (over 1s, the
// SDK's own timeout), errors or is out of quota, the request goes through, so an outage never blocks traders.
export function createRateLimiter({ prefix, max, windowSeconds }) {
  let limiter;
  const memory = createMemoryRateLimiter({ windowMs: windowSeconds * 1000, max });
  return async function isRateLimited(ip) {
    const client = getRedis();
    if (!client) return memory(ip);
    limiter ??= new Ratelimit({
      redis: client,
      prefix: `qf:ratelimit:${prefix}`,
      limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
      timeout: REDIS_TIMEOUT_MS,
    });
    try {
      const { success } = await limiter.limit(ip);
      return !success;
    } catch (err) {
      console.warn(`Rate limit check failed (${prefix}), allowing the request:`, err.message);
      return false;
    }
  };
}

// Vercel sets x-forwarded-for; without it (local dev) every request shares one bucket.
export function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

// One budget shared by the Anthropic-calling routes: a full quote is about 10 requests, so this allows several.
export const isQuoteRequestRateLimited = createRateLimiter({ prefix: 'quote', max: 30, windowSeconds: 60 });

export function rateLimitedResponse() {
  return Response.json({ error: 'Too many requests from this connection. Wait a minute and try again.' }, { status: 429 });
}
