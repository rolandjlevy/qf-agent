import { SerperPriceSearchProvider } from './providers/SerperPriceSearchProvider.js'
import { DataForSEOPriceSearchProvider } from './providers/DataForSEOPriceSearchProvider.js'
import { DbCacheStore } from './cache/DbCacheStore.js'
import { createCachedProvider } from './CachedPriceSearchProvider.js'

const DEFAULT_TTL_SECONDS = 604800 // 7 days — trade-merchant prices are stable week to week, so fewer Serper calls

// Single entry point the app uses — callers never construct a provider
// directly, so swapping PRICE_PROVIDER is a config change, not a refactor.
// Reads env at call time (not module load), matching lib/db.js's getClient()
// and lib/anthropic-client.js's createClient() lazy pattern in this codebase.
export function getPriceSearchProvider() {
  const providerName = process.env.PRICE_PROVIDER || 'serper'
  const provider = providerName === 'dataforseo' ? new DataForSEOPriceSearchProvider() : new SerperPriceSearchProvider()

  const cacheStore = new DbCacheStore()
  const ttlSeconds = Number(process.env.PRICE_CACHE_TTL_SECONDS) || DEFAULT_TTL_SECONDS

  return createCachedProvider(provider, cacheStore, ttlSeconds)
}
