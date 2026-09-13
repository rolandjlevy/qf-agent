import { getPriceSearchCacheEntry, setPriceSearchCacheEntry, deletePriceSearchCacheEntry } from '../../db.js'

/** @implements {import('./CacheStore.js').CacheStore} */
export class DbCacheStore {
  /**
   * @param {string} key
   * @returns {Promise<import('../providers/PriceSearchProvider.js').PriceSearchResult|null>}
   */
  async get(key) {
    const row = await getPriceSearchCacheEntry(key)
    if (!row) return null

    // No scheduled cleanup job for MVP (Phase 3b work) — an expired row is
    // only ever swept here, the next time something happens to read it.
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await deletePriceSearchCacheEntry(key)
      return null
    }

    return JSON.parse(row.payload)
  }

  /**
   * @param {string} key
   * @param {import('../providers/PriceSearchProvider.js').PriceSearchResult} value
   * @param {number} ttlSeconds
   */
  async set(key, value, ttlSeconds) {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
    await setPriceSearchCacheEntry(key, JSON.stringify(value), expiresAt)
  }

  /** @param {string} key */
  async delete(key) {
    await deletePriceSearchCacheEntry(key)
  }
}
