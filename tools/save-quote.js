import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Override lets tests write to a throwaway directory instead of the real
// output/ folder — never unset in normal CLI/web usage.
const OUTPUT_DIR = process.env.QF_OUTPUT_DIR || join(__dirname, '../output')

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

function assembleQuote(sections, traderProfile) {
  const s = (key, fallback = '') => {
    // Accept both snake_case (tool API) and camelCase (KB format)
    const camelMap = { scope: 'scopeOfWork', next_steps: 'nextSteps' }
    return sections[key] || sections[camelMap[key]] || fallback
  }

  const customerLine = sections.customer_name ? `Dear ${sections.customer_name},\n\n` : ''

  const parts = [
    traderProfile?.business_name || '[YOUR BUSINESS NAME]',
    traderProfile?.contact_details || '[YOUR CONTACT DETAILS]',
    '',
    `Date: ${formatDate()}`,
    '',
    customerLine + s('introduction'),
    '',
    'SCOPE OF WORK',
    s('scope'),
    '',
    'MATERIALS & EQUIPMENT',
    s('materials'),
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

// The returned content is the source of truth (persisted to the DB by the
// caller); the local file write is a best-effort convenience for CLI/local
// use and is skipped silently if the filesystem isn't writable (e.g. Vercel's
// serverless functions), rather than failing the whole tool call.
export function saveQuote({ sections, metadata }, traderProfile) {
  const content = assembleQuote(sections, traderProfile)

  const trade = slugify(metadata?.trade || sections.trade || 'trade')
  const jobSlug = slugify(metadata?.job_description || '').slice(0, 40) || 'quote'
  const dateStr = isoDate()
  const baseFilename = `quote-${dateStr}-${trade}-${jobSlug}`

  let filePath = null
  let filename = null
  try {
    mkdirSync(OUTPUT_DIR, { recursive: true })

    let resolvedFilename = `${baseFilename}.md`
    let candidatePath = join(OUTPUT_DIR, resolvedFilename)
    for (let suffix = 2; existsSync(candidatePath) && suffix <= 20; suffix++) {
      resolvedFilename = `${baseFilename}-${suffix}.md`
      candidatePath = join(OUTPUT_DIR, resolvedFilename)
    }

    writeFileSync(candidatePath, content, 'utf8')
    filePath = candidatePath
    filename = resolvedFilename
  } catch {
    // Filesystem not writable — content is still returned below.
  }

  return {
    success: true,
    file_path: filePath,
    filename,
    content,
    char_count: content.length,
  }
}
