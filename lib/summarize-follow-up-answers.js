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
// Drops exact-repeat bullets (keeping the first occurrence) — a code-level
// backstop for the "never repeat the same fact twice" prompt rule below,
// same principle as this codebase's other prompt-plus-code-backstop rules
// (see lib/material-rules.js). Several Phase A clarifying questions can
// independently resolve to the literal same rewritten sentence (e.g. two
// different questions both answered "unsure, needs inspection" about the
// same underlying unknown), and the model doesn't reliably catch that itself.
function dedupeBullets(bullets) {
  return bullets.filter((b, i) => bullets.indexOf(b) === i)
}

export async function summarizeFollowUpAnswers(followUpAnswers, { signal } = {}) {
  if (!Array.isArray(followUpAnswers) || !followUpAnswers.length) return []

  const fallback = () => dedupeBullets(followUpAnswers.map((qa) => `${qa.question} — ${qa.answer}`))

  try {
    const anthropic = createClient()
    const qaBlock = followUpAnswers.map((qa, i) => `${i + 1}. Q: ${qa.question}\n   A: ${qa.answer}`).join('\n')

    const prompt = `Rewrite the following clarifying question/answer pairs into short, natural bullet points for a customer-facing quote summary. Each bullet should read as a plain statement of fact, not a Q&A transcript.

${qaBlock}

RULES:
- Never invent, drop, or change any factual detail from an answer — only reword for readability, or merge pairs as described below
- If two or more pairs boil down to the same underlying fact (e.g. several answers all confirm "the exact gutter type isn't known yet, pending inspection"), collapse them into ONE bullet stating that fact once — never state the same fact in more than one bullet, whether worded the same or differently
- Keep each bullet short — aim for under 12 words
- Do not restate the question verbatim; distill it into the minimum context needed for the answer to make sense on its own
- Return ONLY a JSON array of strings — one per DISTINCT fact, so it may be shorter than the number of pairs above if any were merged, but never longer — with no markdown fences and no explanation

EXAMPLE:
Q: What type of gutter system is installed?
A: Plastic (uPVC)
-> "The gutter system is Plastic (uPVC)"

Q: How extensive are the cracked or leaking sections — are they isolated patches, or does a significant length of the gutter need replacement?
A: Small isolated cracks/leaks
-> "Types of cracks - small isolated cracks/leaks"

EXAMPLE of merging repeated pairs (do not copy verbatim):
Q: What type of structural repair is needed?
A: Unsure — needs inspection first
Q: What is the current condition, and what issue has been identified?
A: Visible but undiagnosed — needs inspection to confirm
-> both collapse into ONE bullet: "The exact repair needed is unconfirmed, pending inspection"`

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
    if (!Array.isArray(parsed) || !parsed.length || parsed.length > followUpAnswers.length) return fallback()
    if (!parsed.every((bullet) => typeof bullet === 'string' && bullet.trim())) return fallback()

    return dedupeBullets(parsed.map((bullet) => bullet.trim()))
  } catch {
    return fallback()
  }
}
