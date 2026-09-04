const SUPPLIER = 'B&Q'
const MAX_CANDIDATES = 8

// B&Q (diy.com) loads cleanly with no bot challenge. Product links match
// href*="_BQ.prd" (e.g. /departments/<slug>/<sku>_BQ.prd); their aria-label
// carries the full product name followed by a "Product review rating: ..."
// suffix that needs trimming off. Returns several top candidates (not just
// the first) — see screwfix.mjs's comment for why: search ranking doesn't
// reliably surface the exact-spec match first, so the caller scores every
// candidate itself.
export async function search(page, materialName) {
  const url = `https://www.diy.com/search?term=${encodeURIComponent(materialName)}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(3000)

  return page.evaluate(
    ({ supplier, maxCandidates }) => {
      const links = Array.from(document.querySelectorAll('a[href*="_BQ.prd"]'))
      const seen = new Set()
      const out = []
      for (const link of links) {
        if (out.length >= maxCandidates) break
        const href = link.getAttribute('href')
        if (!href || seen.has(href)) continue
        let el = link
        let priceText = null
        for (let i = 0; i < 6 && el; i++) {
          const match = el.innerText?.match(/£\s?\d+\.\d{2}/)
          if (match) {
            priceText = match[0]
            break
          }
          el = el.parentElement
        }
        const rawName = link.getAttribute('aria-label') || link.innerText?.trim() || null
        const name = rawName?.split(/\n\nProduct review rating/)[0]?.trim() || null
        if (!name || !priceText) continue
        seen.add(href)
        const skuMatch = href.match(/\/(\w+)_BQ\.prd/)
        out.push({
          supplier,
          name,
          price: Number.parseFloat(priceText.replace('£', '').trim()),
          sku: skuMatch ? skuMatch[1] : null,
          product_url: new URL(href, 'https://www.diy.com').toString(),
        })
      }
      return out
    },
    { supplier: SUPPLIER, maxCandidates: MAX_CANDIDATES },
  )
}
