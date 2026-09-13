import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRows = new Map()

vi.mock('../../db.js', () => ({
  getPriceSearchCacheEntry: vi.fn(async (key) => mockRows.get(key) ?? null),
  setPriceSearchCacheEntry: vi.fn(async (key, payload, expiresAt) => {
    mockRows.set(key, { payload, expires_at: expiresAt })
  }),
  deletePriceSearchCacheEntry: vi.fn(async (key) => {
    mockRows.delete(key)
  }),
}))

const { DbCacheStore } = await import('./DbCacheStore.js')
const { deletePriceSearchCacheEntry } = await import('../../db.js')

describe('DbCacheStore', () => {
  beforeEach(() => {
    mockRows.clear()
    vi.clearAllMocks()
  })

  it('returns null on a cache miss', async () => {
    const store = new DbCacheStore()
    expect(await store.get('missing-key')).toBeNull()
  })

  it('round-trips a set value through get', async () => {
    const store = new DbCacheStore()
    const value = { products: [{ title: 'Paint' }], providerName: 'serper', fetchedAt: Date.now(), fromCache: false }

    await store.set('k1', value, 3600)
    const result = await store.get('k1')

    expect(result).toEqual(value)
  })

  it('treats an expired entry as a miss and deletes it', async () => {
    const store = new DbCacheStore()
    await store.set('k2', { products: [] }, -1) // already expired

    const result = await store.get('k2')

    expect(result).toBeNull()
    expect(deletePriceSearchCacheEntry).toHaveBeenCalledWith('k2')
  })

  it('delete removes an entry', async () => {
    const store = new DbCacheStore()
    await store.set('k3', { products: [] }, 3600)

    await store.delete('k3')

    expect(await store.get('k3')).toBeNull()
  })
})
