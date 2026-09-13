import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// getPriceSearchProvider() builds a real DbCacheStore, which goes through
// lib/db.js — mock it so this test never needs a real DATABASE_URL.
vi.mock('../db.js', () => ({
  getPriceSearchCacheEntry: vi.fn(async () => null),
  setPriceSearchCacheEntry: vi.fn(async () => {}),
  deletePriceSearchCacheEntry: vi.fn(async () => {}),
}))

const { getPriceSearchProvider } = await import('./index.js')

describe('getPriceSearchProvider', () => {
  beforeEach(() => {
    vi.stubEnv('SERPER_API_KEY', '') // force mock mode, no real network calls
    vi.stubEnv('SERPER_MOCK_MODE', '')
    vi.stubEnv('PRICE_PROVIDER', '')
    vi.stubEnv('PRICE_CACHE_TTL_SECONDS', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to a cached Serper provider', async () => {
    const provider = getPriceSearchProvider()
    expect(provider.name).toBe('serper+cache')

    const result = await provider.search('paint')
    expect(result.products.length).toBeGreaterThan(0)
  })

  it('PRICE_PROVIDER=dataforseo swaps providers via env alone and fails loudly with NOT_IMPLEMENTED', async () => {
    vi.stubEnv('PRICE_PROVIDER', 'dataforseo')
    const provider = getPriceSearchProvider()
    expect(provider.name).toBe('dataforseo+cache')

    await expect(provider.search('paint')).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED' })
  })
})
