import { askUser } from './ask-user.js'
import { identifyMaterials } from './identify-materials.js'
import { lookupPrice } from './lookup-price.js'
import { draftSection } from './draft-section.js'
import { saveQuote } from './save-quote.js'

export const TOOL_DEFINITIONS = [
  {
    name: 'ask_user',
    description:
      'Ask the user a single clarifying question in the terminal and wait for their answer. Use this ONLY when the job description is genuinely too vague to proceed — missing critical information such as scope, quantities, or property type. Do not use this as a default first step. Ask one focused question at a time, two at most for the entire job.',
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
      'Analyse a trade job description and return the list of physical materials and equipment likely needed. Returns structured JSON with material names, quantities where determinable, and notes. Each material is a single specific purchasable product — no alternatives, no bundles, no service items. Use this BEFORE drafting the materials section of the quote, and BEFORE calling lookup_price.',
    input_schema: {
      type: 'object',
      properties: {
        trade: {
          type: 'string',
          description: 'The trade category (e.g. electrician, plumber, builder, decorator, plasterer)',
        },
        job_description: {
          type: 'string',
          description: 'The full job description including any follow-up answers gathered from the user',
        },
      },
      required: ['trade', 'job_description'],
    },
  },
  {
    name: 'lookup_price',
    description:
      'Look up the current UK supplier price for a single named material. Returns the cheapest price found, which supplier offers it, and prices from all suppliers. Also returns a verified flag indicating whether the price has been manually confirmed against a live supplier listing. Call this once per material identified by identify_materials. If a material is not found, the response includes found:false — use "[Price TBC]" for that item in the quote.',
    input_schema: {
      type: 'object',
      properties: {
        material_name: {
          type: 'string',
          description: 'The specific material name to look up — use the exact name returned by identify_materials. Should be a single purchasable product, not a vague category.',
        },
      },
      required: ['material_name'],
    },
  },
  {
    name: 'draft_section',
    description:
      'Generate one named section of the quote document as clean prose. Call this once per section. All seven sections must be drafted before calling save_quote: introduction, scope, materials, assumptions, exclusions, next_steps, disclaimers. The materials section must use real prices from lookup_price where available, and "[Price TBC]" where not. No markdown tables anywhere in output.',
    input_schema: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: ['introduction', 'scope', 'materials', 'assumptions', 'exclusions', 'next_steps', 'disclaimers'],
          description: 'Which section to draft. introduction: greeting and job summary (max 50 words). scope: flat bullet list of tasks (6–8 items). materials: itemised list with prices. assumptions: what the quote assumes is true (3–4 points). exclusions: what is NOT included (3–4 points). next_steps: how to accept and book (2–3 points). disclaimers: legal/professional boilerplate.',
        },
        context: {
          type: 'object',
          description: 'All context gathered so far. Should include: trade (string), tone (string), job_description (string), and for the materials section: materials_with_prices (array of objects each with name, quantity, notes, price_result from lookup_price). Optionally: customer_name, follow_up_answers.',
          properties: {
            trade: { type: 'string' },
            tone: { type: 'string' },
            job_description: { type: 'string' },
            customer_name: { type: 'string' },
            follow_up_answers: { type: 'object' },
            materials_with_prices: {
              type: 'array',
              items: { type: 'object' },
            },
          },
          required: ['trade', 'tone', 'job_description'],
        },
      },
      required: ['section', 'context'],
    },
  },
  {
    name: 'save_quote',
    description:
      'Write the completed quote to a markdown file in the output directory. Call this once all seven sections have been drafted. Pass all drafted sections as the sections object. Returns the file path of the saved quote. This is the final tool call — after it succeeds, provide a one-sentence summary to the user.',
    input_schema: {
      type: 'object',
      properties: {
        sections: {
          type: 'object',
          description: 'Object containing all drafted sections keyed by section name: introduction, scope, materials, assumptions, exclusions, next_steps, disclaimers.',
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
        filename: {
          type: 'string',
          description: 'Optional filename for the output file (e.g. "quote-electrician-consumer-unit.md"). If omitted, a timestamped filename is generated automatically.',
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata used for filename generation. Include trade to produce a descriptive filename.',
          properties: {
            trade: { type: 'string' },
            tone: { type: 'string' },
          },
        },
      },
      required: ['sections'],
    },
  },
]

export async function executeTool(name, input) {
  switch (name) {
    case 'ask_user':
      return askUser(input)
    case 'identify_materials':
      return identifyMaterials(input)
    case 'lookup_price':
      return lookupPrice(input)
    case 'draft_section':
      return draftSection(input)
    case 'save_quote':
      return saveQuote(input)
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
