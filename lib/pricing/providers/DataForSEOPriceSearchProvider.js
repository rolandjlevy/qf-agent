// Skeleton only — proves the PriceSearchProvider interface holds across a
// second provider before committing to Serper's response shape. Not wired
// into getPriceSearchProvider() as a working option; PRICE_PROVIDER=dataforseo
// is expected to fail loudly via NOT_IMPLEMENTED, not silently do nothing.
//
// To finish this (Phase 3b, gated on whether Serper's UK trade-merchant
// coverage proves thin or its cost escalates):
// - Endpoint: DataForSEO's Merchant > Google Shopping API
//   (POST /v3/merchant/google/shopping/search/live/advanced, or the task-queue
//   variant if the live endpoint's latency doesn't fit the request path).
// - Auth: HTTP Basic (login:password from a DataForSEO account), not a
//   bearer token — different pattern from Serper's header-based API key.
// - Pricing tier: DataForSEO bills per task/request at a published rate card:
//   confirm the tier against expected query volume before enabling this in
//   production, since it differs from Serper's per-request Starter-tier model.
// - Response shape mapping: DataForSEO's shopping results nest under
//   tasks[].result[].items[], with fields such as price.current /
//   price.regular (compare against Serper's flat `price` field), rating.value
//   / rating.votes_count (vs. this codebase's rating/reviewCount), and an
//   items[].data_asin-style product id rather than Serper's `product_id`. Map
//   all of this down to the same ProductResult shape Serper produces — if a
//   field DataForSEO returns has no ProductResult equivalent (or vice versa),
//   that's a signal the interface needs revisiting, not a reason to leak a
//   provider-specific field through.

import { PriceSearchError } from './PriceSearchProvider.js'

/** @implements {import('./PriceSearchProvider.js').PriceSearchProvider} */
export class DataForSEOPriceSearchProvider {
  name = 'dataforseo'

  /**
   * @param {string} query
   * @param {import('./PriceSearchProvider.js').PriceSearchOptions} [options]
   * @returns {Promise<import('./PriceSearchProvider.js').PriceSearchResult>}
   */
  async search(_query, _options = {}) {
    throw new PriceSearchError('NOT_IMPLEMENTED', 'DataForSEOPriceSearchProvider is a skeleton — see top-of-file comment for what remains to implement it.')
  }
}
