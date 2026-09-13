// Shared between the server (SerperPriceSearchProvider's merchant filter,
// route.js's validation) and the client (app/materials-pricing.js's filter
// buttons) so the two can never drift into different merchant buckets.
//
// Serper's `source` field is a free-text merchant name (e.g. "Screwfix.com",
// "Amazon.co.uk - Amazon.co.uk-Seller") rather than a fixed enum — bucket it
// by substring match onto these categories, with anything unrecognised
// (Wickes, ITS, an independent seller, etc.) falling into "Other" rather
// than being dropped.
//
// Single source of truth for both the category name and the substrings that
// identify it — a name/pattern pair only needs to be added or changed here,
// rather than kept in sync across a separate categories list and if/else
// chain.
const MERCHANT_NAME_PATTERNS = [
  ['Screwfix', ['screwfix']],
  ['Toolstation', ['toolstation']],
  ['B&Q', ['b&q', 'diy.com']],
  ['Amazon', ['amazon']],
]

export const MERCHANT_CATEGORIES = [...MERCHANT_NAME_PATTERNS.map(([name]) => name), 'Other']

export function merchantCategory(merchant) {
  const name = (merchant || '').toLowerCase()
  const match = MERCHANT_NAME_PATTERNS.find(([, patterns]) => patterns.some((pattern) => name.includes(pattern)))
  return match ? match[0] : 'Other'
}
