const SUPPLIER = 'Toolstation'
const MAX_CANDIDATES = 8

// Toolstation fronts search results with a Cloudflare JS challenge ("Just a
// moment…") that a real headless Chromium session clears on its own —
// confirmed via manual probe: an 8s wait (vs. the 3s used for the other two
// suppliers) is enough for it to resolve without any stealth plugin or
// proxy. Product cards carry data-testid="product-card"; the main image's
// alt text is a clean full product name (e.g. "BG / BG Metal Consumer Unit
// Dual 80A RCD Type A + 10 MCBs 10 Way") — more reliable than the link's own
// innerText, which picks up review-count/rating text instead of the name.
// Returns several top candidates (not just the first) — see screwfix.mjs's
// comment for why: search ranking doesn't reliably surface the exact-spec
// match first, so the caller scores every candidate itself.
export async function search(page, materialName) {
  const url = `https://www.toolstation.com/search?q=${encodeURIComponent(materialName)}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(8000)

  return page.evaluate(
    ({ supplier, maxCandidates }) => {
      const cards = Array.from(document.querySelectorAll('[data-testid="product-card"]')).slice(0, maxCandidates)
      const out = []
      for (const card of cards) {
        const link = card.querySelector('a[data-testid="product-card-image-link"]')
        const href = link?.getAttribute('href')
        if (!href) continue

        const img = card.querySelector('img[data-testid="plp-product-main-image"]')
        const name = img?.getAttribute('alt') || null

        const priceMatch = card.innerText?.match(/£\s?\d+\.\d{2}/)
        if (!name || !priceMatch) continue

        // Toolstation product URLs end in /p<digits> (e.g. /bg-.../p90696)
        const skuMatch = href.match(/\/p(\d+)/)
        out.push({
          supplier,
          name,
          price: Number.parseFloat(priceMatch[0].replace('£', '').trim()),
          sku: skuMatch ? skuMatch[1] : null,
          product_url: new URL(href, 'https://www.toolstation.com').toString(),
        })
      }
      return out
    },
    { supplier: SUPPLIER, maxCandidates: MAX_CANDIDATES },
  )
}
