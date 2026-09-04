#!/usr/bin/env node
// Populates the scraped_prices Postgres cache from live UK trade-supplier
// search results, so lookup_price can serve real current prices instead of
// data/sample-prices.json's static verified:false placeholders. Runs out of
// band (GitHub Actions cron, or manually via `npm run scrape:prices`), never
// inside the live agent request path — see tools/lookup-price.js and the
// scraped_prices table comment in lib/schema.sql for why.
import dotenv from 'dotenv'
dotenv.config()

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { chromium } from 'playwright'
import { upsertScrapedPrice, deleteScrapedPrice } from '../lib/db.js'
import { scoreMatch, MATCH_THRESHOLD } from '../lib/fuzzy-match.js'
import { search as searchScrewfix } from './scrapers/screwfix.mjs'
import { search as searchToolstation } from './scrapers/toolstation.mjs'
import { search as searchBq } from './scrapers/bq.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// A small delay between requests, and one supplier at a time rather than
// unbounded concurrency — this is low-volume, single-trader personal use
// (~51 materials x 3 suppliers, once a day), not commercial-scale scraping,
// but there's no reason to hammer any of these sites regardless.
const REQUEST_DELAY_MS = 1500

const SUPPLIERS = [
  { name: 'Screwfix', search: searchScrewfix },
  { name: 'Toolstation', search: searchToolstation },
  { name: 'B&Q', search: searchBq },
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set — copy .env.example to .env and add your Neon connection string.')
    process.exit(1)
  }

  const catalogPath = join(__dirname, '../data/sample-prices.json')
  const { materials } = JSON.parse(readFileSync(catalogPath, 'utf8'))

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  })

  let succeeded = 0
  let failed = 0

  try {
    for (const material of materials) {
      for (const supplier of SUPPLIERS) {
        try {
          const candidates = await supplier.search(page, material.name)

          // Search ranking doesn't reliably surface the exact-spec match
          // first (confirmed in testing: "MCB Type B 6A" ranked a Type A
          // product #1, "Consumer unit 10-way RCBO" ranked an 8-way unit
          // #1) — score every candidate's real product name against this
          // material's canonical name/aliases with the same scoreMatch used
          // throughout the rest of the app, and only accept the best one if
          // it clears MATCH_THRESHOLD. A low-confidence match is skipped
          // entirely rather than cached as if it were verified — the
          // material just keeps its existing sample-prices.json placeholder
          // until a future run finds a confident match.
          let best = null
          let bestScore = 0
          for (const candidate of candidates) {
            const score = scoreMatch(material, candidate.name)
            if (score > bestScore) {
              bestScore = score
              best = candidate
            }
          }

          if (!best || bestScore < MATCH_THRESHOLD) {
            // A skip means "no confident current match" — clear any row a
            // previous run left behind rather than silently keeping it.
            // Otherwise a stale or since-corrected match could linger
            // indefinitely just because a later run didn't happen to find
            // (and overwrite it with) a new one.
            await deleteScrapedPrice(material.name, supplier.name)
            console.log(
              `[skip] ${supplier.name}: no confident match for "${material.name}"` +
                (best ? ` (best candidate "${best.name}" scored ${Math.round(bestScore)}, below threshold ${MATCH_THRESHOLD})` : ''),
            )
            failed++
            continue
          }

          await upsertScrapedPrice({
            material_name: material.name,
            supplier: best.supplier,
            price: best.price,
            sku: best.sku,
            product_url: best.product_url,
          })
          console.log(`[ok] ${supplier.name}: "${material.name}" -> £${best.price} (matched "${best.name}", score ${Math.round(bestScore)})`)
          succeeded++
        } catch (err) {
          // One bad material/supplier (site change, transient block, network
          // error) must not fail the whole run — every other combination
          // still gets scraped, and this one just keeps its existing
          // sample-prices.json placeholder until the next successful run.
          console.error(`[error] ${supplier.name}: "${material.name}" — ${err.message}`)
          failed++
        }
        await sleep(REQUEST_DELAY_MS)
      }
    }
  } finally {
    await browser.close()
  }

  console.log(`\nDone — ${succeeded} succeeded, ${failed} failed/skipped out of ${materials.length * SUPPLIERS.length}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
