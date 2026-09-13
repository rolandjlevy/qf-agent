/**
 * @typedef {Object} ProductResult
 * @property {string} id - Provider-specific stable ID
 * @property {string} title - Product name as displayed
 * @property {number} price - Numeric amount (no currency symbol)
 * @property {string} currency - ISO 4217 (e.g. "GBP")
 * @property {string} merchant - Seller name (e.g. "Screwfix")
 * @property {string} productUrl - Direct link to product page
 * @property {string|null} imageUrl - Product image or null
 * @property {number|null} rating - 0-5 or null
 * @property {number|null} reviewCount - Integer or null
 * @property {'in_stock'|'out_of_stock'|'unknown'} availability
 */

/**
 * @typedef {Object} PriceSearchOptions
 * @property {string} [country='GB'] - ISO country code
 * @property {string} [language='en'] - ISO language code
 * @property {number} [maxResults=10] - Cap on results returned
 * @property {string} [currency='GBP'] - Preferred currency filter
 * @property {string} [merchant] - One of MERCHANT_CATEGORIES (see
 *   ../merchant-category.js). When set, the provider over-fetches raw
 *   results and filters to this merchant server-side *before* applying
 *   maxResults, so a merchant with fewer matches than maxResults returns
 *   just those, and one with maxResults-or-more returns a full page of
 *   maxResults — never a short page caused by unrelated merchants having
 *   occupied result slots ahead of the filter.
 */

/**
 * @typedef {Object} PriceSearchResult
 * @property {ProductResult[]} products
 * @property {string} providerName - e.g. "serper"
 * @property {number} fetchedAt - Unix ms timestamp
 * @property {boolean} fromCache
 */

/**
 * All price search providers implement this shape.
 * @typedef {Object} PriceSearchProvider
 * @property {string} name
 * @property {(query: string, options?: PriceSearchOptions) => Promise<PriceSearchResult>} search
 */

// Codes a caller can safely branch on. NOT_IMPLEMENTED is only ever thrown by
// a provider skeleton (see DataForSEOPriceSearchProvider.js) — a real
// provider never throws it.
export const PRICE_SEARCH_ERROR_CODES = [
  'RATE_LIMITED',
  'NO_RESULTS',
  'PROVIDER_DOWN',
  'INVALID_QUERY',
  'NOT_IMPLEMENTED',
  'UNKNOWN',
]

/**
 * Thrown by any PriceSearchProvider (or its cache wrapper) instead of a raw
 * provider error, so callers can branch on `.code` instead of parsing
 * provider-specific error message strings.
 */
export class PriceSearchError extends Error {
  /**
   * @param {(typeof PRICE_SEARCH_ERROR_CODES)[number]} code
   * @param {string} message
   * @param {{ cause?: unknown }} [options]
   */
  constructor(code, message, options) {
    super(message, options)
    this.name = 'PriceSearchError'
    this.code = code
  }
}
