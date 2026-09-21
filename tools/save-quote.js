import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '../output')

export const SECTION_NAMES = ['introduction', 'scope', 'materials', 'assumptions', 'exclusions', 'next_steps', 'disclaimers']

function formatDate() {
  const d = new Date()
  const day = d.getDate()
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function isoDate() {
  return new Date().toISOString().slice(0, 10)
}

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
}

// Business name, contact details, and date on one pipe-separated line
// instead of three stacked lines — contact_details itself can be multi-line
// (the profile form's field is "phone / email / address"), so each of its
// lines becomes its own pipe segment too rather than breaking the "one
// line" result.
function formatHeaderLine(traderProfile) {
  const businessName = traderProfile?.business_name || '[YOUR BUSINESS NAME]'
  const contactDetails = traderProfile?.contact_details || '[YOUR CONTACT DETAILS]'
  return [businessName, contactDetails, `Date: ${formatDate()}`]
    .flatMap((part) => part.split('\n'))
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' | ')
}

// Exported so app/quote/[id]/page.js can bold this exact line on screen
// without the saved plain-text content (Copy/Download/DB) itself changing.
export const FOLLOW_UP_ANSWERS_HEADING = 'Based on what you told us:'

// `bullets` are already-condensed strings (see
// lib/summarize-follow-up-answers.js — a sub-LLM rewrite of the trader's raw
// Phase A Q&A pairs into short, readable statements). This function is just
// assembly: prefix each with a bullet and add the heading. Omitted entirely
// for CLI/labour-only runs with nothing to show.
function formatFollowUpAnswers(bullets) {
  if (!Array.isArray(bullets) || !bullets.length) return ''
  const list = bullets.map((b) => `• ${b}`).join('\n')
  return `${FOLLOW_UP_ANSWERS_HEADING}\n${list}`
}

function assembleQuote(sections, traderProfile, followUpAnswerBullets) {
  const s = (key, fallback = '') => {
    // Accept both snake_case (tool API) and camelCase (KB format)
    const camelMap = { scope: 'scopeOfWork', next_steps: 'nextSteps' }
    return sections[key] || sections[camelMap[key]] || fallback
  }

  const customerLine = sections.customer_name ? `Dear ${sections.customer_name},\n\n` : ''
  const answersBlock = formatFollowUpAnswers(followUpAnswerBullets)

  const parts = [
    formatHeaderLine(traderProfile),
    '',
    customerLine + s('introduction'),
    ...(answersBlock ? ['', answersBlock] : []),
    '',
    'MATERIALS & EQUIPMENT',
    s('materials'),
    '',
    'SCOPE OF WORK',
    s('scope'),
    '',
    'ASSUMPTIONS',
    s('assumptions'),
    '',
    'EXCLUSIONS',
    s('exclusions'),
    '',
    'NEXT STEPS',
    s('next_steps'),
    '',
    'DISCLAIMERS',
    s('disclaimers'),
  ]

  return parts.join('\n').trimEnd()
}

// `sections`/`metadata` in the tool call are optional overrides — the
// authoritative drafted text lives in toolContext.sectionStore (populated by
// draft_section as it runs) and toolContext.trade/jobDescription (set once
// per run), so the model doesn't need to retype the full quote text or the
// job context just to trigger the save.
export function saveQuote({ sections: sectionsInput, metadata } = {}, toolContext = {}) {
  const { traderProfile, sectionStore = {}, trade: ctxTrade, jobDescription: ctxJobDescription, followUpAnswerBullets } = toolContext
  const sections = { ...sectionStore, ...sectionsInput }

  const missing = SECTION_NAMES.filter((name) => !sections[name])
  if (missing.length) {
    throw new Error(`Cannot save quote — missing drafted sections: ${missing.join(', ')}`)
  }

  const trade = slugify(metadata?.trade || ctxTrade || sections.trade || 'trade')
  const jobSlug = slugify(metadata?.job_description || ctxJobDescription || '').slice(0, 40) || 'quote'
  const dateStr = isoDate()

  const baseFilename = `quote-${dateStr}-${trade}-${jobSlug}`
  const content = assembleQuote(sections, traderProfile, followUpAnswerBullets)

  // Writing to the local output/ dir is best-effort: on Vercel the
  // filesystem is read-only outside /tmp (and /tmp is ephemeral), so a
  // failure here must not be fatal — content is always returned regardless,
  // and is the caller's durable record (persisted to generated_quotes.content).
  let resolvedFilename = `${baseFilename}.md`
  let filePath = join(OUTPUT_DIR, resolvedFilename)
  let fileWritten = false

  try {
    mkdirSync(OUTPUT_DIR, { recursive: true })
    for (let suffix = 2; existsSync(filePath) && suffix <= 20; suffix++) {
      resolvedFilename = `${baseFilename}-${suffix}.md`
      filePath = join(OUTPUT_DIR, resolvedFilename)
    }
    writeFileSync(filePath, content, 'utf8')
    fileWritten = true
  } catch {
    filePath = null
  }

  // The full content/file_path is what callers (qf.js, app/api/quote/route.js)
  // persist to Neon — stashed on toolContext so it never has to flow back
  // through the model's own context a second time. The return value here is
  // what the model actually sees as this tool's result.
  toolContext.savedQuote = { file_path: filePath, file_written: fileWritten, filename: resolvedFilename, content, char_count: content.length }

  return {
    success: true,
    file_written: fileWritten,
    filename: resolvedFilename,
    char_count: content.length,
  }
}
