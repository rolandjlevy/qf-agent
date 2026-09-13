import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCachedProvider, makeCacheKey } from './CachedPriceSearchProvider.js'
import { PriceSearchError } from './providers/PriceSearchProvider.js'

// A minimal in-memory CacheStore, standing in for DbCacheStore — this test
// is about CachedPriceSearchProvider's own decision logic (when to read/
// write the cache), not about Postgres.
function createMemoryCacheStore() {
  const rows = new Map()
  return {
    async get(key) {
      return rows.has(key) ? rows.get(key) : null
    },
    async set(key, value) {
      rows.set(key, value)
    },
    async delete(key) {
      rows.delete(key)
    },
    _rows: rows,
  }
}

function makeProduct(overrides = {}) {
  return {
    id: 'p1',
    title: 'Paint',
    price: 10,
    currency: 'GBP',
    merchant: 'Screwfix',
    productUrl: 'https://example.com',
    imageUrl: null,
    rating: null,
    reviewCount: null,
    availability: 'unknown',
    ...overrides,
  }
}

describe('createCachedProvider', () => {
  let cacheStore

  beforeEach(() => {
    cacheStore = createMemoryCacheStore()
  })

  it('calls the underlying provider on a cache miss, then serves from cache on the next call', async () => {
    const search = vi.fn(async () => ({
      products: [makeProduct()],
      providerName: 'fake',
      fetchedAt: Date.now(),
      fromCache: false,
    }))
    const cached = createCachedProvider({ name: 'fake', search }, cacheStore, 3600)

    const first = await cached.search('dulux emulsion')
    expect(search).toHaveBeenCalledTimes(1)
    expect(first.fromCache).toBe(false)

    const second = await cached.search('dulux emulsion')
    expect(search).toHaveBeenCalledTimes(1) // not called again — served from cache
    expect(second.fromCache).toBe(true)
    expect(second.products).toEqual(first.products)
  })

  it('normalizes query case/whitespace so both spellings hit the same cache entry', async () => {
    const search = vi.fn(async () => ({ products: [makeProduct()], providerName: 'fake', fetchedAt: Date.now(), fromCache: false }))
    const cached = createCachedProvider({ name: 'fake', search }, cacheStore, 3600)

    await cached.search('  20L Dulux Trade Emulsion Magnolia  ')
    await cached.search('20l dulux trade emulsion magnolia')

    expect(search).toHaveBeenCalledTimes(1)
  })

  it('does not cache an empty result set', async () => {
    const search = vi.fn(async () => ({ products: [], providerName: 'fake', fetchedAt: Date.now(), fromCache: false }))
    const cached = createCachedProvider({ name: 'fake', search }, cacheStore, 3600)

    await cached.search('nonexistent widget')
    await cached.search('nonexistent widget')

    expect(search).toHaveBeenCalledTimes(2) // every call re-hits the provider
    expect(cacheStore._rows.size).toBe(0)
  })

  it('does not cache a thrown provider error, and lets it propagate', async () => {
    const search = vi.fn(async () => {
      throw new PriceSearchError('PROVIDER_DOWN', 'boom')
    })
    const cached = createCachedProvider({ name: 'fake', search }, cacheStore, 3600)

    await expect(cached.search('paint')).rejects.toMatchObject({ code: 'PROVIDER_DOWN' })
    expect(cacheStore._rows.size).toBe(0)
  })

  it('names itself "<provider>+cache"', () => {
    const cached = createCachedProvider({ name: 'serper', search: vi.fn() }, cacheStore, 3600)
    expect(cached.name).toBe('serper+cache')
  })
})

describe('makeCacheKey', () => {
  it('is stable across whitespace/case differences', () => {
    expect(makeCacheKey('  Foo   Bar ')).toBe(makeCacheKey('foo bar'))
  })

  it('differs when country, currency, maxResults, or merchant differ', () => {
    const base = makeCacheKey('paint')
    expect(makeCacheKey('paint', { country: 'US' })).not.toBe(base)
    expect(makeCacheKey('paint', { currency: 'USD' })).not.toBe(base)
    expect(makeCacheKey('paint', { maxResults: 5 })).not.toBe(base)
    expect(makeCacheKey('paint', { merchant: 'Screwfix' })).not.toBe(base)
    expect(makeCacheKey('paint', { merchant: 'Screwfix' })).not.toBe(makeCacheKey('paint', { merchant: 'Toolstation' }))
  })
})
