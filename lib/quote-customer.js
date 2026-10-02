// The customer name a trader adds on /quote/[id] is an overlay, like quote_line_prices:
// generated_quotes.content keeps the drafted text, and this rewrites it for display, Copy and Download.

export const CUSTOMER_NAME_MAX = 100

const PLACEHOLDER = '[CUSTOMER NAME]'

// Trimmed, single-spaced, or null when blank. Throws past CUSTOMER_NAME_MAX.
export function normalizeCustomerName(name) {
  if (name == null) return null
  if (typeof name !== 'string') throw new Error('customerName must be a string')
  const clean = name.trim().replace(/\s+/g, ' ')
  if (clean.length > CUSTOMER_NAME_MAX) throw new Error(`customerName must be at most ${CUSTOMER_NAME_MAX} characters`)
  return clean || null
}

// Header's Customer segment is set (or added before Date, on quotes saved before it existed), and the intro gets "Dear <name>,".
export function applyCustomerName(content, customerName) {
  const name = normalizeCustomerName(customerName)
  if (!content || !name) return content

  const lines = content.split('\n')
  const segments = lines[0].split(' | ')
  const customerIndex = segments.findIndex((s) => s.startsWith('Customer: '))
  if (customerIndex !== -1) {
    segments[customerIndex] = `Customer: ${name}`
  } else {
    const dateIndex = segments.findIndex((s) => s.startsWith('Date: '))
    segments.splice(dateIndex === -1 ? segments.length : dateIndex, 0, `Customer: ${name}`)
  }
  lines[0] = segments.join(' | ')

  // The intro starts after the header's blank line; a "Dear X," line there came from save_quote (CLI), so it's renamed.
  const introIndex = lines.findIndex((line, i) => i > 0 && line.trim())
  if (introIndex !== -1) {
    if (/^Dear [^,]+,$/.test(lines[introIndex].trim())) lines[introIndex] = `Dear ${name},`
    else lines.splice(introIndex, 0, `Dear ${name},`, '')
  }
  return lines.join('\n').replaceAll(PLACEHOLDER, name)
}
