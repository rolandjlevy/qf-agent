// Live per-quote price scraping — CLI only. Deliberately not imported by
// tools/lookup-price.js (which is shared with the Vercel web route): a
// static `playwright` import anywhere in that route's module graph would
// repeat the exact bundling problem tools/ask-user.js's inquirer split was
// built to avoid. qf.js imports this file directly and injects it via
// toolContext.liveScrapePrice instead — see tools/ask-user.js for the
// precedent this mirrors.
import { chromium } from 'playwright'
import { scoreMatch, MATCH_THRESHOLD } from './fuzzy-match.js'
import { upsertScrapedPrice } from './db.js'
import { search as searchScrewfix } from '../scripts/scrapers/screwfix.mjs'
import { search as searchToolstation } from '../scripts/scrapers/toolstation.mjs'
import { search as searchBq } from '../scripts/scrapers/bq.mjs'

const SUPPLIERS = [
  { name: 'Screwfix', search: searchScrewfix },
  { name: 'Toolstation', search: searchToolstation },
  { name: 'B&Q', search: searchBq },
]

// Toolstation's Cloudflare challenge wait (8s) plus goto/parse overhead is
// the slowest leg — 15s gives real headroom without letting one stuck
// material hang the whole quote run if a site changes or blocks a request.
const PER_SUPPLIER_TIMEOUT_MS = 15000

// Same low-volume courtesy as scripts/scrape-prices.mjs's REQUEST_DELAY_MS —
// this is a single trader's quote runs, not bulk scraping, but consecutive
// materials in one run shouldn't hit each supplier back-to-back regardless.
const MIN_GAP_BETWEEN_MATERIALS_MS = 1000

let browserPromise = null
let lastCallAt = 0

function getBrowser() {
  if (!browserPromise) browserPromise = chromium.launch({ headless: true })
  return browserPromise
}

// qf.js calls this once after the agent run finishes (success or failure) so
// the browser process never lingers past the CLI's own exit.
export async function closeLiveScrapeBrowser() {
  if (!browserPromise) return
  const browser = await browserPromise
  browserPromise = null
  await browser.close().catch(() => {})
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('live scrape timed out')), ms)),
  ])
}

// Live-scrapes one canonical material (the sample-prices.json entry
// tools/lookup-price.js already fuzzy-matched) across all three suppliers in
// parallel, using the same search/score/threshold logic as
// scripts/scrape-prices.mjs's nightly batch run. Never throws — any failure
// (no browser installed, network error, no confident match, timeout) returns
// null so the caller falls back to the existing scraped_prices cache /
// sample-prices.json chain; "no live result" is a normal degrade path here,
// not an error.
export async function liveScrapePrice(material) {
  try {
    const gap = Date.now() - lastCallAt
    if (gap < MIN_GAP_BETWEEN_MATERIALS_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_GAP_BETWEEN_MATERIALS_MS - gap))
    }
    lastCallAt = Date.now()

    const browser = await getBrowser()
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    })

    try {
      const settled = await Promise.allSettled(
        SUPPLIERS.map(async (supplier) => {
          const page = await context.newPage()
          try {
            const candidates = await withTimeout(supplier.search(page, material.name), PER_SUPPLIER_TIMEOUT_MS)

            // Same "don't trust search rank" scoring as the nightly batch
            // scraper — a low-confidence result is skipped, not returned as
            // if it were a real match.
            let best = null
            let bestScore = 0
            for (const candidate of candidates) {
              const score = scoreMatch(material, candidate.name)
              if (score > bestScore) {
                bestScore = score
                best = candidate
              }
            }
            if (!best || bestScore < MATCH_THRESHOLD) return null
            return best
          } finally {
            await page.close().catch(() => {})
          }
        }),
      )

      const matches = settled.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value)
      if (matches.length === 0) return null

      // Cache what was just scraped — this quote's lookups benefit any later
      // quote (same run or a future one) until the next nightly batch run,
      // and the nightly run will just overwrite it as usual. Best-effort: a
      // DB hiccup here must not discard prices that were genuinely already
      // scraped — caching is a bonus, the live result itself is the point.
      await Promise.all(
        matches.map((m) =>
          upsertScrapedPrice({
            material_name: material.name,
            supplier: m.supplier,
            price: m.price,
            sku: m.sku,
            product_url: m.product_url,
          }).catch((err) => console.error(`Failed to cache live-scraped price for "${material.name}" (${m.supplier}):`, err.message)),
        ),
      )

      const sorted = [...matches].sort((a, b) => a.price - b.price)
      return {
        cheapest: sorted[0].price,
        cheapest_supplier: sorted[0].supplier,
        cheapest_sku: sorted[0].sku || null,
        all_prices: sorted.map((m) => ({ supplier: m.supplier, price: m.price, sku: m.sku || null, verified: true })),
      }
    } finally {
      await context.close().catch(() => {})
    }
  } catch {
    return null
  }
}
