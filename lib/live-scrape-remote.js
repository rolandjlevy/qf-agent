// Live per-quote price scraping for the web app. Vercel's serverless
// functions can't launch a local Chromium process the way lib/live-scrape.js
// (CLI-only) does — no room for browser binaries, no support for spawning a
// real browser process in that sandbox. This connects instead to a hosted
// remote browser over CDP (Browserless, or any compatible provider) via
// BROWSERLESS_WS_ENDPOINT, using `playwright-core` (the CDP client only, no
// bundled browser binaries) rather than the full `playwright` package the
// CLI uses.
//
// Not imported by tools/lookup-price.js directly, for the same reason
// lib/live-scrape.js isn't — see tools/ask-user.js's inquirer split. Only
// app/api/quote/route.js imports this file, and only when
// BROWSERLESS_WS_ENDPOINT is actually set.
import { chromium } from 'playwright-core'
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

function raceAgainstSignalAndTimeout(promise, { signal, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('live scrape timed out')), timeoutMs)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    if (signal?.aborted) return onAbort()
    signal?.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        reject(err)
      },
    )
  })
}

// One of these is created per quote run (in app/api/quote/route.js's
// after() callback) so the same remote browser connection is reused across
// every lookup_price call in that run, rather than reconnecting per
// material — connection setup to a hosted browser has real latency of its
// own. `close()` must be called when the run ends (mirrors qf.js closing
// lib/live-scrape.js's local browser).
export function createRemoteScraper() {
  let browserPromise = null

  function getBrowser() {
    if (!process.env.BROWSERLESS_WS_ENDPOINT) return null
    if (!browserPromise) {
      browserPromise = chromium.connectOverCDP(process.env.BROWSERLESS_WS_ENDPOINT).catch((err) => {
        browserPromise = null
        throw err
      })
    }
    return browserPromise
  }

  async function close() {
    if (!browserPromise) return
    const browser = await browserPromise.catch(() => null)
    browserPromise = null
    if (browser) await browser.close().catch(() => {})
  }

  // Mirrors lib/live-scrape.js's liveScrapePrice — same search/score/cache
  // logic, different browser transport. Never throws: any failure (no
  // endpoint configured, connection error, timeout, no confident match)
  // resolves to null so tools/lookup-price.js falls through to the existing
  // scraped_prices cache / sample-prices.json chain exactly as if live
  // scraping weren't available. `timeoutMs` is the caller's responsibility
  // to keep under the run's remaining pipeline budget (see route.js) — a
  // request already close to Vercel's maxDuration should skip live scraping
  // rather than risk losing the rest of the pipeline to it.
  async function liveScrapePrice(material, { signal, timeoutMs = 20000 } = {}) {
    if (!process.env.BROWSERLESS_WS_ENDPOINT) return null
    if (signal?.aborted || timeoutMs <= 0) return null

    try {
      const browser = await raceAgainstSignalAndTimeout(getBrowser(), { signal, timeoutMs })
      if (!browser) return null

      const context = await browser.newContext()
      try {
        const settled = await Promise.allSettled(
          SUPPLIERS.map(async (supplier) => {
            const page = await context.newPage()
            try {
              const candidates = await raceAgainstSignalAndTimeout(supplier.search(page, material.name), {
                signal,
                timeoutMs,
              })
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

        // Best-effort: a cache-write failure must not discard prices that
        // were genuinely already scraped.
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

  return { liveScrapePrice, close }
}
