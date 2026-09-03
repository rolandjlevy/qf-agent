import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '../output')

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

export function saveQuote({ sections, metadata }, traderProfile) {
  const trade = slugify(metadata?.trade || sections.trade || 'trade')
  const jobSlug = slugify(metadata?.job_description || '').slice(0, 40) || 'quote'
  const dateStr = isoDate()

  const baseFilename = `quote-${dateStr}-${trade}-${jobSlug}`
  const content = assembleQuote(sections, traderProfile)

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

  return {
    success: true,
    file_path: filePath,
    file_written: fileWritten,
    filename: resolvedFilename,
    content,
    char_count: content.length,
  }
}
