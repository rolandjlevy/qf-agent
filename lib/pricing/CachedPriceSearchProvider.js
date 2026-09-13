import { createHash } from 'node:crypto'

// Same normalization for every caller so two differently-cased/whitespaced
// spellings of the same query ("20L Dulux..." vs "20l dulux...") share a
// cache entry.
function normalizeQuery(query) {
  return query.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * @param {string} query
 * @param {import('./providers/PriceSearchProvider.js').PriceSearchOptions} [options]
 */
export function makeCacheKey(query, options = {}) {
  const { country = 'GB', currency = 'GBP', maxResults = 10, merchant = '' } = options
  const normalizedQuery = normalizeQuery(query)
  return createHash('sha256').update(`${normalizedQuery}|${country}|${currency}|${maxResults}|${merchant}`).digest('hex')
}

// Decorator, not inheritance — wraps any PriceSearchProvider with any
// CacheStore. Errors and empty result sets are never cached: an error is
// exactly the kind of thing that shouldn't be memoized as if it were a real
// answer, and a zero-result query today might return results tomorrow once
// Google's index updates.
/**
 * @param {import('./providers/PriceSearchProvider.js').PriceSearchProvider} provider
 * @param {import('./cache/CacheStore.js').CacheStore} cacheStore
 * @param {number} ttlSeconds
 * @returns {import('./providers/PriceSearchProvider.js').PriceSearchProvider}
 */
export function createCachedProvider(provider, cacheStore, ttlSeconds) {
  return {
    name: `${provider.name}+cache`,
    async search(query, options = {}) {
      const key = makeCacheKey(query, options)
      const cached = await cacheStore.get(key)
      if (cached) {
        // Basic hit/miss logging — the only ground truth for "is the cache
        // actually saving provider credits" (success criterion: >50% hit
        // rate after a few days of real usage).
        console.log(`[pricing] cache hit for "${query}"`)
        return { ...cached, fromCache: true }
      }

      console.log(`[pricing] cache miss for "${query}"`)
      const fresh = await provider.search(query, options)
      if (fresh.products.length > 0) {
        await cacheStore.set(key, fresh, ttlSeconds)
      }
      return { ...fresh, fromCache: false }
    },
  }
}
