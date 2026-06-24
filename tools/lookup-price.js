import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = JSON.parse(readFileSync(join(__dirname, '../data/sample-prices.json'), 'utf8'))

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function wordSet(str) {
  return new Set(normalize(str).split(' ').filter((w) => w.length > 2))
}

function scoreMatch(material, searchTerm) {
  const normSearch = normalize(searchTerm)
  const normName = normalize(material.name)

  if (normName === normSearch) return 100

  const allTerms = [material.name, ...(material.aliases || [])]

  for (const term of allTerms) {
    const normTerm = normalize(term)
    if (normTerm === normSearch) return 95
    if (normTerm.includes(normSearch) && normSearch.length > 5) return 85
    if (normSearch.includes(normTerm) && normTerm.length > 5) return 80
  }

  // Word overlap scoring across name + aliases
  const searchWords = wordSet(searchTerm)
  if (searchWords.size === 0) return 0

  let bestWordScore = 0
  for (const term of allTerms) {
    const termWords = wordSet(term)
    const overlap = [...searchWords].filter((w) => termWords.has(w)).length
    if (overlap > 0) {
      const score = (overlap / Math.max(searchWords.size, termWords.size)) * 65
      if (score > bestWordScore) bestWordScore = score
    }
  }

  return bestWordScore
}

export function lookupPrice({ material_name }) {
  let bestScore = 0
  let bestMatch = null

  for (const material of db.materials) {
    const score = scoreMatch(material, material_name)
    if (score > bestScore) {
      bestScore = score
      bestMatch = material
    }
  }

  // Require a minimum match quality
  if (bestScore < 40 || !bestMatch) {
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
  }
}
