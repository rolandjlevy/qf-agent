import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { scoreMatch, MATCH_THRESHOLD } from '../lib/fuzzy-match.js'
import { findTraderPrice } from '../lib/db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = JSON.parse(readFileSync(join(__dirname, '../data/sample-prices.json'), 'utf8'))

export function lookupPrice({ material_name }) {
  if (typeof material_name !== 'string' || !material_name.trim()) {
    return {
      material: material_name ?? null,
      found: false,
      message: 'material_name must be a non-empty string',
    }
  }

  // The trader's own historical prices are what they actually paid — prefer
  // them over the placeholder sample DB whenever there's a good match.
  const traderMatch = findTraderPrice(material_name)
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
