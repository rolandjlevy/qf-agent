import { scoreMatch, MATCH_THRESHOLD } from '../lib/fuzzy-match.js'
import { findTraderPrice, getScrapedPrices } from '../lib/db.js'
import { webSearchPrice } from '../lib/web-search-price.js'
import db from '../data/sample-prices.json' with { type: 'json' }

// If scripts/scrape-prices.mjs's GitHub Actions schedule ever stops running
// or breaks silently, scraped_prices rows just get older — this stops
// lookup_price from serving an increasingly-wrong price while still
// claiming verified: true. Past this age, treat the material as unscraped
// and fall back to the sample-prices.json placeholder instead.
const SCRAPED_PRICE_MAX_AGE_DAYS = 14

async function getFreshScrapedPrices(materialName) {
  const rows = await getScrapedPrices(materialName)
  const maxAgeMs = SCRAPED_PRICE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  return rows.filter((row) => Date.now() - new Date(row.scraped_at).getTime() < maxAgeMs)
}

// Attempts a live scrape for `material` ({ name, aliases }) and merges it
// with whatever's still fresh in the cache under that same name — a partial
// live match (e.g. only Toolstation, see liveScrapePrice's callers) must
// still be compared against cached prices for suppliers live scraping
// didn't reach, so a real cached price never gets silently hidden behind an
// incomplete live one. Live entries win over a cached entry for the same
// supplier, since live is strictly fresher. Returns null if live scraping
// isn't available or found nothing confident.
async function tryLiveWithCacheMerge(liveScrapePriceFn, material) {
  const live = await liveScrapePriceFn(material).catch(() => null)
  if (!live) return null

  const bySupplier = new Map()
  for (const row of await getFreshScrapedPrices(material.name)) {
    bySupplier.set(row.supplier, { supplier: row.supplier, price: row.price, sku: row.sku || null, verified: true })
  }
  for (const p of live.all_prices) {
    bySupplier.set(p.supplier, p)
  }

  const merged = [...bySupplier.values()].sort((a, b) => a.price - b.price)
  const cheapest = merged[0]

  return {
    all_prices: merged,
    cheapest,
    source: live.all_prices.some((p) => p.supplier === cheapest.supplier) ? 'live_scraped' : 'scraped',
  }
}

// True last resort, gated behind ENABLE_WEB_SEARCH_PRICE_FALLBACK (read once
// per run into toolContext.webSearchPriceEnabled by qf.js/route.js) — no
// playwright import here, so unlike liveScrapePrice this needs no
// CLI/web split or toolContext function-injection, just a flag. Costs real
// API tokens whether it succeeds or fails (confirmed: ~$0.07-0.26 per
// attempt), so it's opt-in and only reached when the free tiers above have
// nothing.
async function tryWebSearchFallback(toolContext, materialName) {
  if (!toolContext.webSearchPriceEnabled) return null
  const result = await webSearchPrice(materialName).catch(() => null)
  if (!result) return null
  return {
    material: result.name,
    found: true,
    match_score: null,
    cheapest: result.price,
    cheapest_supplier: result.supplier,
    cheapest_sku: null,
    // Unlike a direct scrape (which parses an exact price off the live
    // DOM), this relies on the model reading and summarizing a search
    // result — the same "confirm before sending" caution as an unverified
    // sample_db placeholder, even though it's a real, sourced listing.
    verified: false,
    any_verified: false,
    all_prices: [{ supplier: result.supplier, price: result.price, sku: null, verified: false }],
    source: 'web_search',
  }
}

export async function lookupPrice({ material_name }, toolContext = {}) {
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

  // toolContext.liveScrapePrice is only ever injected by qf.js (local
  // Chromium, all three suppliers) or app/api/quote/route.js (a hosted
  // browser, where Screwfix/B&Q's WAF blocks the shared datacenter IP and
  // only Toolstation gets through — confirmed in testing) — never imported
  // directly by this file, since that would pull a static `playwright`
  // import into the Vercel bundle's module graph.
  const hasLiveScraping = typeof toolContext.liveScrapePrice === 'function'

  // No confident catalog match — the static ~120-entry taxonomy can never
  // cover the combinatorial variety of material names identify_materials
  // generates per job (confirmed in production across many quotes). Rather
  // than give up, search suppliers directly using the raw job-specific text
  // when live scraping is available — this doesn't need a pre-known
  // canonical name, just something to search with and score results
  // against. Confirmed in production: this recovers real prices for
  // materials that never resemble anything in the catalog, e.g. "Terminal
  // block connector strip 30A" or a specific cable/back-box spec.
  if (bestScore < MATCH_THRESHOLD || !bestMatch) {
    if (hasLiveScraping) {
      const result = await tryLiveWithCacheMerge(toolContext.liveScrapePrice, { name: material_name, aliases: [] })
      if (result) {
        return {
          material: material_name,
          found: true,
          match_score: null,
          cheapest: result.cheapest.price,
          cheapest_supplier: result.cheapest.supplier,
          cheapest_sku: result.cheapest.sku,
          verified: true,
          any_verified: true,
          all_prices: result.all_prices,
          source: result.source,
        }
      }
    }
    const webResult = await tryWebSearchFallback(toolContext, material_name)
    if (webResult) return webResult
    return {
      material: material_name,
      found: false,
      message: 'No matching material found in price database',
    }
  }

  // A confident catalog match beats the raw job-specific text as a search
  // query — bestMatch.name/aliases are a curated canonical form, and a live
  // result is merged with the scraped-price cache rather than trusted
  // alone: a partial live match (e.g. Toolstation only) must still be
  // compared against whatever the nightly batch scrape has for the
  // suppliers live scraping didn't reach.
  if (hasLiveScraping) {
    const result = await tryLiveWithCacheMerge(toolContext.liveScrapePrice, bestMatch)
    if (result) {
      return {
        material: bestMatch.name,
        found: true,
        match_score: Math.round(bestScore),
        cheapest: result.cheapest.price,
        cheapest_supplier: result.cheapest.supplier,
        cheapest_sku: result.cheapest.sku,
        verified: true,
        any_verified: true,
        all_prices: result.all_prices,
        source: result.source,
      }
    }
  }

  // Real, currently-scraped prices for this exact canonical material beat
  // the static placeholder catalog whenever they exist and aren't stale.
  const freshScraped = await getFreshScrapedPrices(bestMatch.name)

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

  // Only this final placeholder tier actually reads bestMatch.prices — an
  // empty array here means the catalog entry itself has no seeded sample
  // price, not that no price is available (live scraping/the cache above
  // already had their chance regardless of this array).
  if (!Array.isArray(bestMatch.prices) || bestMatch.prices.length === 0) {
    const webResult = await tryWebSearchFallback(toolContext, material_name)
    if (webResult) return webResult
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
