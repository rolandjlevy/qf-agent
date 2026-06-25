import Anthropic from '@anthropic-ai/sdk'

export async function identifyMaterials({ trade, job_description }) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const prompt = `You are a UK trade materials expert. Analyse the following job description for a ${trade} and return a JSON list of the physical materials and equipment that will need to be purchased.

Job description: ${job_description}

RULES — follow these exactly:
- Return ONLY valid JSON, with no markdown fences, no explanation, no preamble
- Each material must be ONE specific, purchasable product (e.g. "Consumer unit 10-way RCBO", not "consumer unit or fusebox")
- Do NOT use "or" alternatives in any material name — pick the most likely single product
- Do NOT bundle multiple products on one line — "screws and wall plugs" must be two separate entries
- Do NOT include service items: no disposal fees, no hire costs, no labour, no skip hire
- Do NOT include vague or generic terms: no "sundries", no "consumables", no "miscellaneous"
- Use specific UK product names that would return useful results from Screwfix or Toolstation
- Include quantity where clearly determinable from the job description (e.g. "8" for 8 MCBs)
- Include a brief notes field only if there is a genuinely useful constraint (e.g. "must be RCBO type")
- Limit to 4–8 materials — only the key purchasable items, not every small consumable

Return this exact JSON structure:
{
  "materials": [
    { "name": "string", "quantity": "string or null", "notes": "string or null" }
  ]
}`

  const response = await anthropic.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content.find((b) => b.type === 'text')?.text || ''

  // Strip markdown fences if Claude wraps the JSON anyway
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { materials: [] }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return { materials: parsed.materials || [] }
  } catch {
    return { materials: [] }
  }
}
