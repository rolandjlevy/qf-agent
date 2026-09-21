import { createClient, createMessage, getPhaseAModel } from './anthropic-client.js'
import { NEVER_DO_RULES } from '../prompts/system.js'

// Condenses each Phase A clarifying-answer pair into one short, natural
// bullet for the customer-facing quote (e.g. "What type of gutter system is
// installed?" / "Plastic (uPVC)" -> "The gutter system is Plastic (uPVC)").
// A plain string transform can't do this reliably across arbitrary,
// job-specific questions — it genuinely needs semantic compression. Runs on
// PHASE_A_MODEL (same cheap/fast model Phase A's own proposeMaterials uses,
// since this is the same class of small rewrite task). NEVER_DO_RULES (sent
// to every sub-LLM call app-wide) plus the prompt below both instruct the
// model to only reword, never add, drop, or change the trader's actual
// answer — this is a supplementary, non-authoritative display block, not
// where pricing/materials facts live.
//
// Any failure here (network error, malformed response, a mismatched bullet
// count) falls back to the plain, unreworded "question — answer" pairing
// rather than failing the whole quote — this block is a nice-to-have, and
// the trader's answers are never lost, just less polished.
export async function summarizeFollowUpAnswers(followUpAnswers, { signal } = {}) {
  if (!Array.isArray(followUpAnswers) || !followUpAnswers.length) return []

  const fallback = () => followUpAnswers.map((qa) => `${qa.question} — ${qa.answer}`)

  try {
    const anthropic = createClient()
    const qaBlock = followUpAnswers.map((qa, i) => `${i + 1}. Q: ${qa.question}\n   A: ${qa.answer}`).join('\n')

    const prompt = `Rewrite each of the following clarifying question/answer pairs as ONE short, natural bullet point for a customer-facing quote. Each bullet should read as a plain statement of fact, not a Q&A transcript.

${qaBlock}

RULES:
- Never invent, drop, or change any factual detail from the answer — only reword for readability
- Keep each bullet short — aim for under 12 words
- Do not restate the question verbatim; distill it into the minimum context needed for the answer to make sense on its own
- Return ONLY a JSON array of strings, one per pair, in the same order, with no markdown fences and no explanation

EXAMPLE:
Q: What type of gutter system is installed?
A: Plastic (uPVC)
-> "The gutter system is Plastic (uPVC)"

Q: How extensive are the cracked or leaking sections — are they isolated patches, or does a significant length of the gutter need replacement?
A: Small isolated cracks/leaks
-> "Types of cracks - small isolated cracks/leaks"`

    const response = await createMessage(
      anthropic,
      {
        model: getPhaseAModel(),
        max_tokens: 512,
        temperature: 0.2,
        system: NEVER_DO_RULES,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal },
    )

    const raw = response.content.find((b) => b.type === 'text')?.text || ''
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return fallback()

    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed) || parsed.length !== followUpAnswers.length) return fallback()

    return parsed.map((bullet, i) => (typeof bullet === 'string' && bullet.trim() ? bullet.trim() : fallback()[i]))
  } catch {
    return fallback()
  }
}
