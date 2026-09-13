// Shared between the server (SerperPriceSearchProvider's merchant filter,
// route.js's validation) and the client (app/materials-pricing.js's filter
// buttons) so the two can never drift into different merchant buckets.
//
// Serper's `source` field is a free-text merchant name (e.g. "Screwfix.com",
// "Amazon.co.uk - Amazon.co.uk-Seller") rather than a fixed enum — bucket it
// by substring match onto these categories, with anything unrecognised
// (Wickes, ITS, an independent seller, etc.) falling into "Other" rather
// than being dropped.
export const MERCHANT_CATEGORIES = ['Screwfix', 'Toolstation', 'B&Q', 'Amazon', 'Other']

export function merchantCategory(merchant) {
  const name = (merchant || '').toLowerCase()
  if (name.includes('screwfix')) return 'Screwfix'
  if (name.includes('toolstation')) return 'Toolstation'
  if (name.includes('b&q') || name.includes('diy.com')) return 'B&Q'
  if (name.includes('amazon')) return 'Amazon'
  return 'Other'
}
