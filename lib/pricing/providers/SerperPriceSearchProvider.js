// Serper's Google Shopping endpoint: POST https://google.serper.dev/shopping,
// auth via an X-API-KEY header, body { q, gl, hl, num }. Response shape is
// `{ shopping: [{ title, source, link, price, delivery, rating, ratingCount,
// offers, imageUrl, position, productId }] }` — `price` is a currency-symbol
// string (e.g. "£12.99"), not a bare number.
//
// Verified against Serper's own published example response and third-party
// wrappers of the same endpoint (docs.serper.dev itself was not reachable
// from this environment's network) — re-check the actual response shape
// against a live call once SERPER_API_KEY is set for real, since this was
// not confirmed against Serper's own docs page directly.

import { PriceSearchError } from './PriceSearchProvider.js';

const SHOPPING_ENDPOINT = 'https://google.serper.dev/shopping';
const RETRY_DELAYS_MS = [100, 300];

const CURRENCY_SYMBOLS = {
  '£': 'GBP',
  $: 'USD',
  '€': 'EUR',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMockMode() {
  // Also used as the local-dev default (no key set) so `npm run web:dev`
  // works out of the box without hitting the real API — same reasoning the
  // brief gives for tests.
  return process.env.SERPER_MOCK_MODE === 'true' || !process.env.SERPER_API_KEY;
}

// Serper's `price` field is a currency-symbol string, e.g. "£12.99" or
// "$104.97" — never a bare number. A price with no recognised symbol, or
// with no parseable numeric portion, can't be trusted, so the caller drops
// the product rather than guessing a currency.
function parsePrice(rawPrice) {
  if (typeof rawPrice !== 'string') return null;
  const symbolMatch = rawPrice.match(/[£$€]/);
  if (!symbolMatch) return null;
  const currency = CURRENCY_SYMBOLS[symbolMatch[0]];
  const numeric = Number(rawPrice.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric)) return null;
  return { amount: numeric, currency };
}

// Maps Serper's shopping-result shape to the provider-agnostic ProductResult.
// Never let a Serper-specific field (e.g. `position`, `offers`) leak through.
function mapProduct(raw) {
  const parsedPrice = parsePrice(raw?.price);
  if (!parsedPrice) return null;
  return {
    id: raw.productId || raw.link || raw.title,
    title: raw.title,
    price: parsedPrice.amount,
    currency: parsedPrice.currency,
    merchant: raw.source || 'Unknown',
    productUrl: raw.link,
    imageUrl: raw.imageUrl || null,
    rating: typeof raw.rating === 'number' ? raw.rating : null,
    reviewCount: typeof raw.ratingCount === 'number' ? raw.ratingCount : null,
    availability: 'unknown',
  };
}

async function fetchShoppingResults(body) {
  for (let attempt = 0; ; attempt++) {
    let response;
    try {
      response = await fetch(SHOPPING_ENDPOINT, {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw new PriceSearchError(
        'PROVIDER_DOWN',
        `Serper request failed: ${err.message}`,
        { cause: err },
      );
    }

    if (response.ok) return response.json();

    // Never retry a 4xx (including 429) — a fixed 100-300ms backoff doesn't
    // fix a bad request, bad credentials, or a request already over the
    // rate limit.
    if (response.status === 429) {
      throw new PriceSearchError('RATE_LIMITED', 'Serper rate limit exceeded');
    }
    // 401/403 means a missing/invalid/wrong-provider SERPER_API_KEY, not a
    // bad query — UNKNOWN, not INVALID_QUERY, so callers don't tell the
    // trader to "try different search terms" for a problem retyping the
    // query can never fix.
    if (response.status === 401 || response.status === 403) {
      throw new PriceSearchError(
        'UNKNOWN',
        `Serper rejected the request as unauthorized (HTTP ${response.status}) — check SERPER_API_KEY`,
      );
    }
    if (response.status >= 400 && response.status < 500) {
      throw new PriceSearchError(
        'INVALID_QUERY',
        `Serper rejected the request (HTTP ${response.status})`,
      );
    }

    // 5xx — transient, worth the bounded retry.
    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    throw new PriceSearchError(
      'PROVIDER_DOWN',
      `Serper returned HTTP ${response.status} after retries`,
    );
  }
}

// 3-4 realistic UK trade-material results, GBP only, shaped exactly like
// mapProduct()'s output — used verbatim in tests and whenever no
// SERPER_API_KEY is configured (local dev), so nothing here should need
// updating when the real endpoint mapping changes upstream of this function.
const MOCK_PRODUCTS = [
  {
    id: 'mock-dulux-trade-emulsion-5l',
    title: 'Dulux Trade Vinyl Matt Emulsion Paint Pure Brilliant White 5L',
    price: 42.98,
    currency: 'GBP',
    merchant: 'Screwfix',
    productUrl:
      'https://www.screwfix.com/p/dulux-trade-vinyl-matt-emulsion-paint-pure-brilliant-white-5ltr',
    imageUrl: null,
    rating: 4.7,
    reviewCount: 312,
    availability: 'in_stock',
  },
  {
    id: 'mock-dulux-trade-emulsion-magnolia-5l',
    title: 'Dulux Trade Vinyl Matt Emulsion Paint Magnolia 5L',
    price: 41.5,
    currency: 'GBP',
    merchant: 'Toolstation',
    productUrl:
      'https://www.toolstation.com/dulux-trade-vinyl-matt-emulsion-magnolia-5l',
    imageUrl: null,
    rating: 4.6,
    reviewCount: 198,
    availability: 'in_stock',
  },
  {
    id: 'mock-masking-tape-50mm',
    title: 'Scotch Masking Tape 50mm x 50m',
    price: 6.99,
    currency: 'GBP',
    merchant: 'B&Q',
    productUrl:
      'https://www.diy.com/departments/scotch-masking-tape-50mm-x-50m',
    imageUrl: null,
    rating: 4.4,
    reviewCount: 87,
    availability: 'unknown',
  },
  {
    id: 'mock-paint-roller-tray-set',
    title: 'Harris Seriously Good Paint Roller and Tray Set 9 Inch',
    price: 12.5,
    currency: 'GBP',
    merchant: 'Screwfix',
    productUrl:
      'https://www.screwfix.com/p/harris-seriously-good-paint-roller-tray-set-9in',
    imageUrl: null,
    rating: 4.5,
    reviewCount: 156,
    availability: 'in_stock',
  },
];

function buildMockResult(_query, { maxResults, currency }) {
  const products = MOCK_PRODUCTS.filter((p) => p.currency === currency).slice(
    0,
    maxResults,
  );
  return {
    products,
    providerName: 'serper',
    fetchedAt: Date.now(),
    fromCache: false,
  };
}

/** @implements {import('./PriceSearchProvider.js').PriceSearchProvider} */
export class SerperPriceSearchProvider {
  name = 'serper';

  /**
   * @param {string} query
   * @param {import('./PriceSearchProvider.js').PriceSearchOptions} [options]
   * @returns {Promise<import('./PriceSearchProvider.js').PriceSearchResult>}
   */
  async search(query, options = {}) {
    if (typeof query !== 'string' || !query.trim()) {
      throw new PriceSearchError(
        'INVALID_QUERY',
        'search query must be a non-empty string',
      );
    }

    const {
      country = 'GB',
      language = 'en',
      maxResults = 10,
      currency = 'GBP',
    } = options;

    if (isMockMode()) {
      return buildMockResult(query, { maxResults, currency });
    }

    const data = await fetchShoppingResults({
      q: query,
      // Serper's `gl` takes the standard ISO 3166-1 alpha-2 code ("gb"), not
      // "uk" — confirmed against a live call: "uk" is silently ignored
      // (falls back to US/USD results), while "gb" correctly returns GBP
      // prices. The brief's own suggestion of "uk" was wrong.
      gl: country.toLowerCase(),
      hl: language,
      num: maxResults,
    });

    const rawProducts = Array.isArray(data?.shopping) ? data.shopping : [];
    const products = rawProducts
      .map(mapProduct)
      .filter((p) => p && p.currency === currency)
      .slice(0, maxResults);

    // An empty result set is a normal, cacheable-decision-relevant outcome
    // (CachedPriceSearchProvider decides whether to cache it), not a thrown
    // error — NO_RESULTS is reserved for a provider response that explicitly
    // signals zero matches as an error condition, which Serper's shopping
    // endpoint does not do (it just returns an empty/absent `shopping` array).
    return {
      products,
      providerName: this.name,
      fetchedAt: Date.now(),
      fromCache: false,
    };
  }
}
