import { scoreMatch, MATCH_THRESHOLD } from '../lib/fuzzy-match.js'
import { findTraderPrice, getScrapedPrices } from '../lib/db.js'
import db from '../data/sample-prices.json' with { type: 'json' }

// If scripts/scrape-prices.mjs's GitHub Actions schedule ever stops running
// or breaks silently, scraped_prices rows just get older — this stops
// lookup_price from serving an increasingly-wrong price while still
// claiming verified: true. Past this age, treat the material as unscraped
// and fall back to the sample-prices.json placeholder instead.
const SCRAPED_PRICE_MAX_AGE_DAYS = 14

export async function lookupPrice({ material_name }) {
  if (typeof material_name !== 'string' || !material_name.trim()) {
    return {
      material: material_name ?? null,
      found: false,
      message: 'material_name must be a non-empty string',
    }
  }

  // The trader's own historical prices are what they actually paid — prefer
  // them over the placeholder sample DB whenever there's a good match.
  const traderMatch = await findTraderPrice(material_name)
  if (traderMatch) {
    return {
      material: traderMatch.canonical_name || traderMatch.material_name,
      found: true,
      match_score: traderMatch.match_score,
      cheapest: traderMatch.unit_price,
      cheapest_supplier: 'Your price history',
      cheapest_sku: null,
      verified: true,
      any_verified: true,
      all_prices: [
        { supplier: 'Your price history', price: traderMatch.unit_price, sku: null, verified: true },
      ],
      source: 'trader_history',
    }
  }

  let bestScore = 0
  let bestMatch = null

  for (const material of db.materials) {
    const score = scoreMatch(material, material_name)
    if (score > bestScore) {
      bestScore = score
      bestMatch = material
    }
  }

  // Require a minimum match quality, and a non-empty price list to report on
  if (bestScore < MATCH_THRESHOLD || !bestMatch || !Array.isArray(bestMatch.prices) || bestMatch.prices.length === 0) {
    return {
      material: material_name,
      found: false,
      message: 'No matching material found in price database',
    }
  }

  // Real, currently-scraped prices for this exact canonical material beat
  // the static placeholder catalog whenever they exist and aren't stale.
  const scrapedRows = await getScrapedPrices(bestMatch.name)
  const maxAgeMs = SCRAPED_PRICE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  const freshScraped = scrapedRows.filter((row) => Date.now() - new Date(row.scraped_at).getTime() < maxAgeMs)

  if (freshScraped.length > 0) {
    const cheapestScraped = freshScraped[0]
    return {
      material: bestMatch.name,
      found: true,
      match_score: Math.round(bestScore),
      cheapest: cheapestScraped.price,
      cheapest_supplier: cheapestScraped.supplier,
      cheapest_sku: cheapestScraped.sku || null,
      verified: true,
      any_verified: true,
      all_prices: freshScraped.map((row) => ({
        supplier: row.supplier,
        price: row.price,
        sku: row.sku || null,
        verified: true,
      })),
      source: 'scraped',
    }
  }

  const sortedPrices = [...bestMatch.prices].sort((a, b) => a.price - b.price)
  const cheapest = sortedPrices[0]
  const anyVerified = bestMatch.prices.some((p) => p.verified)
  const allVerified = bestMatch.prices.every((p) => p.verified)

  return {
    material: bestMatch.name,
    found: true,
    match_score: Math.round(bestScore),
    cheapest: cheapest.price,
    cheapest_supplier: cheapest.supplier,
    cheapest_sku: cheapest.sku || null,
    verified: allVerified,
    any_verified: anyVerified,
    all_prices: sortedPrices.map((p) => ({
      supplier: p.supplier,
      price: p.price,
      sku: p.sku || null,
      verified: p.verified,
    })),
    source: 'sample_db',
  }
}
