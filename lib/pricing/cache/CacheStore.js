/**
 * Generic cache backing for PriceSearchResult lookups. DbCacheStore.js is the
 * only implementation today; a RedisCacheStore would slot in via this same
 * interface once cache volume justifies moving off Postgres (Phase 3c).
 *
 * @typedef {Object} CacheStore
 * @property {(key: string) => Promise<import('../providers/PriceSearchProvider.js').PriceSearchResult|null>} get
 * @property {(key: string, value: import('../providers/PriceSearchProvider.js').PriceSearchResult, ttlSeconds: number) => Promise<void>} set
 * @property {(key: string) => Promise<void>} delete
 */

// No runtime exports — this file exists for the JSDoc typedef above, imported
// elsewhere via `import('./CacheStore.js').CacheStore`. The empty export
// keeps it an ES module rather than an ambient script.
export {}
