import { createClient, createMessage, getModel } from './anthropic-client.js'
import { NEVER_DO_RULES } from '../prompts/system.js'

// Last-resort price lookup — a plain Anthropic API call (same sub-LLM
// pattern as tools/identify-materials.js and tools/draft-section.js), used
// only when a material fails both the trader's own price history and the
// live-scrape/cache chain in tools/lookup-price.js. Unlike lib/live-scrape.js
// / lib/live-scrape-remote.js, this has no `playwright` import and needs no
// CLI/web split — it works identically on both surfaces with zero Vercel
// bundling concern.
//
// This generalizes across any trade (it searches the whole web, not a fixed
// 3-supplier list) — confirmed in testing it found a real, correctly-spec'd
// product (EPDM roofing membrane sold per linear metre, not a bundled kit)
// that none of Screwfix/Toolstation/B&Q stock. But it is NOT a reliable
// primary mechanism: `web_search_20260209` runs its own code-execution
// wrapper internally, which can itself error out (confirmed in testing —
// the model correctly declined to guess rather than fabricate a price when
// that happened) and can retry multiple times before succeeding or giving
// up, so cost per call varies widely (~$0.07-0.26 observed) whether or not
// it finds anything. `max_uses: 1` bounds the ceiling but can't fully
// prevent the internal retry behaviour.
export async function webSearchPrice(materialName) {
  const anthropic = createClient()
  const prompt = `Find the current UK price for this specific material from a real UK trade or hardware supplier's website.

Material: "${materialName}"

RULES — follow these exactly:
- Do at most ONE web search. Do not retry or search again if the first search doesn't give a clean answer.
- Only report a real, specific, currently-listed product with an exact price and product URL from an actual UK supplier.
- The product must match the material's spec (size, quantity unit, type) — do not report a pre-bundled kit or a different-but-similar product as if it were the same thing.
- If you cannot find a real, confidently-matching listing, return found:false. Do NOT guess, estimate, or invent a price under any circumstances.
- Return ONLY valid JSON, with no markdown fences, no explanation, no preamble.

Return this exact JSON structure:
{ "found": boolean, "name": "string or null", "price": number or null, "supplier": "string or null", "product_url": "string or null" }`

  const response = await createMessage(anthropic, {
    model: getModel(),
    max_tokens: 512,
    system: NEVER_DO_RULES,
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 1 }],
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (
      !parsed.found ||
      typeof parsed.name !== 'string' ||
      typeof parsed.price !== 'number' ||
      !(parsed.price > 0) ||
      typeof parsed.supplier !== 'string'
    ) {
      return null
    }
    return {
      name: parsed.name,
      price: parsed.price,
      supplier: parsed.supplier,
      product_url: typeof parsed.product_url === 'string' ? parsed.product_url : null,
    }
  } catch {
    return null
  }
}
