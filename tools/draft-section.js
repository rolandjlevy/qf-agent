import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SECTION_PROMPTS = {
  introduction: (ctx) => `Write the introduction section for a trade quote.

Trade: ${ctx.trade}
Tone: ${ctx.tone}
Job description: ${ctx.job_description}
${ctx.customer_name ? `Customer name: ${ctx.customer_name}` : ''}

RULES:
- 2–3 sentences only. Maximum 50 words total.
- Use ${ctx.tone} language throughout.
- Begin with a greeting appropriate to the tone.
- Summarise the work in one sentence.
- No prices, no compliance claims, no guarantees.
- Return plain text only — no markdown, no headings, no bullets.`,

  scope: (ctx) => `Write the scope of work section for a trade quote.

Trade: ${ctx.trade}
Tone: ${ctx.tone}
Job description: ${ctx.job_description}
${ctx.follow_up_answers ? `Additional details: ${JSON.stringify(ctx.follow_up_answers)}` : ''}

RULES:
- Flat bullet list of the main tasks to be performed. No nested bullets.
- 6–8 items maximum. Each item on its own line starting with "•".
- Around 120 words total.
- Safety considerations for ${ctx.trade} included only where genuinely applicable.
- No padding or filler items.
- No prices, no compliance guarantees.
- Return plain text bullets only — no markdown headings, no tables.`,

  materials: (ctx) => {
    const materialLines = buildMaterialLines(ctx.materials_with_prices || [])
    return `Write the materials and equipment section for a trade quote.

Trade: ${ctx.trade}
Tone: ${ctx.tone}

Materials identified for this job (with prices where available):
${materialLines}

RULES:
- List each material on its own line starting with "•".
- For each material: if a real price is available, include it as "£X.XX (Supplier)" after the item name.
- If a price is marked verified:false, add "(price indicative — confirm before sending)" after the price.
- If no price is available (found:false), write "[Price TBC]" after the item name.
- 4–6 items maximum. Each line = exactly one specific purchasable product.
- No "or" alternatives. No bundling multiple products on one line.
- No disposal fees, hire costs, or service items.
- No markdown tables.
- Return plain text bullets only.
- At the end, add one line: "Price estimates sourced from UK trade suppliers — verify all prices before sending to client."`
  },

  assumptions: (ctx) => `Write the assumptions section for a trade quote.

Trade: ${ctx.trade}
Tone: ${ctx.tone}
Job description: ${ctx.job_description}

RULES:
- 3–4 bullet points covering the most important assumptions about site conditions, access, and customer-provided items.
- Around 60 words total.
- Each point on its own line starting with "•".
- State what is assumed to be true (e.g. "existing wiring is in reasonable condition", "clear access to the work area will be provided").
- No prices. No guarantees.
- Return plain text bullets only — no headings, no tables.`,

  exclusions: (ctx) => `Write the exclusions section for a trade quote.

Trade: ${ctx.trade}
Tone: ${ctx.tone}
Job description: ${ctx.job_description}

RULES:
- 3–4 bullet points explicitly stating what is NOT included in this quote.
- Around 50 words total.
- Each point on its own line starting with "•".
- Focus on items a customer might reasonably assume are included but are not (e.g. decoration after plastering, supply of fixtures by others, remedial work for unexpected issues found on site).
- Return plain text bullets only — no headings, no tables.`,

  next_steps: (ctx) => `Write the next steps section for a trade quote.

Trade: ${ctx.trade}
Tone: ${ctx.tone}

RULES:
- 2–3 bullet points guiding the customer toward accepting the quote and booking the work.
- Around 50 words total.
- Each point on its own line starting with "•".
- Action-oriented. Tell the customer what to do next (e.g. confirm acceptance, agree a start date, provide access information).
- Use ${ctx.tone} language.
- Return plain text bullets only — no headings, no tables.`,

  disclaimers: (ctx) => `Write the disclaimers section for a trade quote.

Trade: ${ctx.trade}

RULES:
- Professional disclaimers appropriate for a UK trade quote.
- Cover: quote validity period, subject to site inspection, prices subject to change, not a guaranteed fixed-price contract, customer responsibility to verify regulatory compliance.
- Do NOT claim compliance with any specific regulation (Part P, Gas Safe, BS 7671, etc.).
- Do NOT guarantee outcomes or results.
- Around 80–100 words.
- Return plain prose (not bullets) — clear, professional language.`,
}

function buildMaterialLines(materialsWithPrices) {
  if (!materialsWithPrices.length) return '(No materials identified yet)'

  return materialsWithPrices
    .map((m) => {
      const qty = m.quantity ? ` (qty: ${m.quantity})` : ''
      const notes = m.notes ? ` — ${m.notes}` : ''
      if (!m.price_result || !m.price_result.found) {
        return `• ${m.name}${qty}${notes} — not found in price database`
      }
      const pr = m.price_result
      const verifiedNote = pr.verified ? '' : ' [unverified]'
      return `• ${m.name}${qty}${notes} — £${pr.cheapest.toFixed(2)} at ${pr.cheapest_supplier}${verifiedNote}`
    })
    .join('\n')
}

export async function draftSection({ section, context }) {
  const promptFn = SECTION_PROMPTS[section]
  if (!promptFn) {
    throw new Error(`Unknown section: ${section}. Valid sections: ${Object.keys(SECTION_PROMPTS).join(', ')}`)
  }

  const prompt = promptFn(context)

  const response = await anthropic.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content.find((b) => b.type === 'text')?.text?.trim() || ''

  return { section, content }
}
