import { writeFileSync, mkdirSync } from 'fs'
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

function assembleQuote(sections) {
  const s = (key, fallback = '') => {
    // Accept both snake_case (tool API) and camelCase (KB format)
    const camelMap = { scope: 'scopeOfWork', next_steps: 'nextSteps' }
    return sections[key] || sections[camelMap[key]] || fallback
  }

  const customerLine = sections.customer_name ? `Dear ${sections.customer_name},\n\n` : ''

  const parts = [
    '[YOUR BUSINESS NAME]',
    '[YOUR CONTACT DETAILS]',
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

export function saveQuote({ sections, filename, metadata }) {
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const trade = slugify(metadata?.trade || sections.trade || 'trade')
  const dateStr = isoDate()

  const resolvedFilename =
    filename ||
    `quote-${dateStr}-${trade}.md`

  const filePath = join(OUTPUT_DIR, resolvedFilename)
  const content = assembleQuote(sections)

  writeFileSync(filePath, content, 'utf8')

  return {
    success: true,
    file_path: filePath,
    filename: resolvedFilename,
    char_count: content.length,
  }
}
