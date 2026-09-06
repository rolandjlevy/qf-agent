import { askUser } from './ask-user.js'
import { identifyMaterials } from './identify-materials.js'
import { draftSection } from './draft-section.js'
import { saveQuote, SECTION_NAMES } from './save-quote.js'

export const TOOL_DEFINITIONS = [
  {
    name: 'ask_user',
    description:
      'Ask the user a single clarifying question in the terminal and wait for their answer. Use when the job description is missing context that would materially change the scope, materials, or assumptions. Ask one focused question per call; you may call this up to four times before proceeding. Stop asking as soon as you have enough to produce an accurate quote — do not ask for information you can reasonably assume.',
    input_schema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The specific question to ask the user. Should be focused and answerable in a sentence or two.',
        },
        context: {
          type: 'string',
          description: 'Optional context shown to the user above the question to help them understand what information is needed and why.',
        },
      },
      required: ['question'],
    },
  },
  {
    name: 'identify_materials',
    description:
      'Analyse a trade job description and return the list of physical materials and equipment likely needed. Returns structured JSON with material names, quantities where determinable, and notes. Each material is a single specific purchasable product — no alternatives, no bundles, no service items. Use this BEFORE drafting the materials section of the quote. Trade and job description are already known from the run — omit both to use them as-is; pass them only to override with an updated job_description (e.g. incorporating ask_user follow-up answers).',
    input_schema: {
      type: 'object',
      properties: {
        trade: {
          type: 'string',
          description: 'Optional override for the trade category — omit to use the one already given for this job.',
        },
        job_description: {
          type: 'string',
          description: 'Optional override — pass only when you have an updated job description (e.g. incorporating follow-up answers) that should be analysed instead of the original.',
        },
      },
    },
  },
  {
    name: 'draft_section',
    description:
      'Generate one named section of the quote document as clean prose. Call this once per section. All seven sections must be drafted before calling save_quote: introduction, scope, materials, assumptions, exclusions, next_steps, disclaimers. Pricing is not available — the materials section always uses "[Price TBC]" for every item. No markdown tables anywhere in output. Trade, tone, job description, and identified materials are already known from the run and are supplied automatically — you do not need to repeat them.',
    input_schema: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: ['introduction', 'scope', 'materials', 'assumptions', 'exclusions', 'next_steps', 'disclaimers'],
          description: 'Which section to draft. introduction: greeting and job summary (max 50 words). scope: flat bullet list of tasks (6–8 items). materials: itemised list, each marked [Price TBC]. assumptions: what the quote assumes is true (3–4 points). exclusions: what is NOT included (3–4 points). next_steps: how to accept and book (2–3 points). disclaimers: legal/professional boilerplate.',
        },
        context: {
          type: 'object',
          description: 'Only include fields you need to ADD or OVERRIDE — trade/tone/job_description/materials are filled in automatically from the run. Pass customer_name or follow_up_answers if gathered via ask_user, or job_description only if you have an updated version to use instead of the original.',
          properties: {
            trade: { type: 'string' },
            tone: { type: 'string' },
            job_description: { type: 'string' },
            customer_name: { type: 'string' },
            follow_up_answers: { type: 'object' },
            materials: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
      },
      required: ['section'],
    },
  },
  {
    name: 'save_quote',
    description:
      'Write the completed quote to a markdown file in the output directory. Call this once all seven sections have been drafted — the drafted text and job metadata are already recorded from the run, so no arguments are needed. Returns confirmation that the quote was saved. This is the final tool call — after it succeeds, provide a one-sentence summary to the user.',
    input_schema: {
      type: 'object',
      properties: {
        sections: {
          type: 'object',
          description: 'Optional — only pass a section here to OVERRIDE its already-drafted text. Normally omit this entirely.',
          properties: {
            introduction: { type: 'string' },
            scope: { type: 'string' },
            materials: { type: 'string' },
            assumptions: { type: 'string' },
            exclusions: { type: 'string' },
            next_steps: { type: 'string' },
            disclaimers: { type: 'string' },
          },
        },
        metadata: {
          type: 'object',
          description: 'Optional override for filename generation — trade/job_description are already known from the run.',
          properties: {
            trade: { type: 'string' },
            job_description: { type: 'string' },
          },
        },
      },
    },
  },
]

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0
}

// Minimal shape checks so a malformed/hallucinated tool call fails fast with a
// clear message instead of crashing deep inside a tool implementation.
function validateInput(name, input) {
  switch (name) {
    case 'ask_user':
      if (!isNonEmptyString(input?.question)) return 'ask_user requires a non-empty "question" string'
      return null
    case 'identify_materials':
      // trade/job_description may come from toolContext instead of input —
      // identifyMaterials itself throws a clear error if neither source has them.
      if (input?.trade !== undefined && !isNonEmptyString(input.trade)) return 'identify_materials "trade" must be a non-empty string when provided'
      if (input?.job_description !== undefined && !isNonEmptyString(input.job_description)) return 'identify_materials "job_description" must be a non-empty string when provided'
      return null
    case 'draft_section':
      if (!SECTION_NAMES.includes(input?.section)) {
        return `draft_section "section" must be one of: ${SECTION_NAMES.join(', ')}`
      }
      if (input?.context !== undefined && typeof input.context !== 'object') {
        return 'draft_section "context" must be an object when provided'
      }
      return null
    case 'save_quote':
      if (input?.sections !== undefined && typeof input.sections !== 'object') {
        return 'save_quote "sections" must be an object when provided'
      }
      return null
    default:
      return null
  }
}

// Auth/permission failures can't be resolved by the model retrying — let those
// propagate to the top-level handler instead of feeding them back as a tool_result.
function isFatal(err) {
  return err?.status === 401 || err?.status === 403
}

export async function executeTool(name, input, toolContext = {}) {
  const validationError = validateInput(name, input)
  if (validationError) {
    return { error: true, message: validationError }
  }

  try {
    switch (name) {
      case 'ask_user':
        return await askUser(input, toolContext)
      case 'identify_materials':
        return await identifyMaterials(input, toolContext)
      case 'draft_section':
        return await draftSection(input, toolContext)
      case 'save_quote':
        return saveQuote(input, toolContext)
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (err) {
    if (isFatal(err)) throw err
    return { error: true, message: err.message }
  }
}
