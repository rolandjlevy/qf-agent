import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SerperPriceSearchProvider } from './SerperPriceSearchProvider.js'
import { PriceSearchError } from './PriceSearchProvider.js'

describe('SerperPriceSearchProvider (mock mode)', () => {
  beforeEach(() => {
    // No SERPER_API_KEY -> mock mode by default, regardless of the host env.
    vi.stubEnv('SERPER_API_KEY', '')
    vi.stubEnv('SERPER_MOCK_MODE', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns fixture products without calling fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const provider = new SerperPriceSearchProvider()

    const result = await provider.search('dulux trade emulsion')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.providerName).toBe('serper')
    expect(result.fromCache).toBe(false)
    expect(result.products.length).toBeGreaterThan(0)
    for (const product of result.products) {
      expect(product.currency).toBe('GBP')
      expect(typeof product.price).toBe('number')
      expect(product.availability).toMatch(/in_stock|out_of_stock|unknown/)
    }
  })

  it('respects maxResults', async () => {
    const provider = new SerperPriceSearchProvider()
    const result = await provider.search('paint', { maxResults: 1 })
    expect(result.products).toHaveLength(1)
  })

  it('filters to the requested currency', async () => {
    const provider = new SerperPriceSearchProvider()
    const result = await provider.search('paint', { currency: 'USD' })
    expect(result.products).toHaveLength(0)
  })

  it('honours SERPER_MOCK_MODE=true even when a key is set', async () => {
    vi.stubEnv('SERPER_API_KEY', 'sk-real-key')
    vi.stubEnv('SERPER_MOCK_MODE', 'true')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const provider = new SerperPriceSearchProvider()

    await provider.search('paint')

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('throws INVALID_QUERY for an empty query', async () => {
    const provider = new SerperPriceSearchProvider()
    await expect(provider.search('')).rejects.toThrow(PriceSearchError)
    await expect(provider.search('   ')).rejects.toMatchObject({ code: 'INVALID_QUERY' })
  })
})

// Regression coverage for a bug caught during manual end-to-end testing: a
// 403 (wrong/invalid API key — confirmed by pointing this at a real but
// wrong-provider key) was being mapped to INVALID_QUERY, which would have
// told the trader to "try different search terms" for a problem no amount
// of retyping the query can fix.
describe('SerperPriceSearchProvider (real API path, fetch mocked)', () => {
  beforeEach(() => {
    vi.stubEnv('SERPER_API_KEY', 'fake-key-for-test')
    vi.stubEnv('SERPER_MOCK_MODE', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  function mockFetchOnce(status) {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({}),
    })
  }

  it('sends gl as the plain ISO country code, not "uk" (regression: "uk" is silently ignored by Serper, returning USD results)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ shopping: [] }),
    })
    const provider = new SerperPriceSearchProvider()

    await provider.search('paint', { country: 'GB' })

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(body.gl).toBe('gb')
  })

  it('maps 401/403 to UNKNOWN, not INVALID_QUERY, and does not retry', async () => {
    const fetchSpy = mockFetchOnce(403)
    const provider = new SerperPriceSearchProvider()

    await expect(provider.search('paint')).rejects.toMatchObject({ code: 'UNKNOWN' })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('maps 429 to RATE_LIMITED and does not retry', async () => {
    const fetchSpy = mockFetchOnce(429)
    const provider = new SerperPriceSearchProvider()

    await expect(provider.search('paint')).rejects.toMatchObject({ code: 'RATE_LIMITED' })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('maps other 4xx to INVALID_QUERY and does not retry', async () => {
    const fetchSpy = mockFetchOnce(400)
    const provider = new SerperPriceSearchProvider()

    await expect(provider.search('paint')).rejects.toMatchObject({ code: 'INVALID_QUERY' })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('retries a 5xx up to the backoff schedule, then throws PROVIDER_DOWN', async () => {
    const fetchSpy = mockFetchOnce(500)
    const provider = new SerperPriceSearchProvider()

    await expect(provider.search('paint')).rejects.toMatchObject({ code: 'PROVIDER_DOWN' })
    expect(fetchSpy).toHaveBeenCalledTimes(3) // initial + 2 retries
  })

  it('maps a successful response to ProductResult shape, dropping unparseable prices', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        shopping: [
          { title: 'Good Paint', price: '£19.99', source: 'Screwfix', link: 'https://x.test/1', rating: 4.2, ratingCount: 10, imageUrl: 'https://x.test/i.jpg', productId: 'abc' },
          { title: 'No price field', source: 'Screwfix', link: 'https://x.test/2' },
        ],
      }),
    })
    const provider = new SerperPriceSearchProvider()

    const result = await provider.search('paint')

    expect(result.products).toHaveLength(1)
    expect(result.products[0]).toMatchObject({
      title: 'Good Paint',
      price: 19.99,
      currency: 'GBP',
      merchant: 'Screwfix',
      productUrl: 'https://x.test/1',
      availability: 'unknown',
    })
  })
})
