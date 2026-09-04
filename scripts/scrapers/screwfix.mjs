const SUPPLIER = 'Screwfix'
const MAX_CANDIDATES = 8

// Screwfix's search results render product links as <a href="/p/...">.
// Confirmed via manual probe: loads cleanly with no bot challenge, prices
// render in plain text within a few ancestor levels of each product link.
// Returns several top candidates (not just the first) — search result
// ranking doesn't reliably put the exact-spec match first (e.g. searching
// "MCB Type B 6A" can rank a similarly-worded but wrong-type product #1),
// so the caller scores every candidate against the canonical material name
// and picks the best match rather than trusting search order.
export async function search(page, materialName) {
  const url = `https://www.screwfix.com/search?search=${encodeURIComponent(materialName)}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(3000)

  return page.evaluate(
    ({ supplier, maxCandidates }) => {
      const links = Array.from(document.querySelectorAll('a[href*="/p/"]'))
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
        const name = link.innerText?.trim() || link.getAttribute('aria-label') || null
        if (!name || !priceText) continue
        seen.add(href)
        // Screwfix product URLs end in /<sku> (e.g. /p/.../627kr)
        const skuMatch = href.match(/\/([a-z0-9]+)\/?$/i)
        out.push({
          supplier,
          name,
          price: Number.parseFloat(priceText.replace('£', '').trim()),
          sku: skuMatch ? skuMatch[1] : null,
          product_url: new URL(href, 'https://www.screwfix.com').toString(),
        })
      }
      return out
    },
    { supplier: SUPPLIER, maxCandidates: MAX_CANDIDATES },
  )
}
