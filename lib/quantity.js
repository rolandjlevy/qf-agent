// A material's quantity is a loose string — either as identify_materials/
// propose_materials first returned it (their own prompt examples include
// unit-suffixed values like "25m" and "1 box", and identify_materials can
// occasionally return a range like "1–5" — see tools/identify-materials.js,
// lib/propose-materials.js) or as the trader has since edited it via the
// quantity input on the quote-view page (app/materials-pricing.js). Any
// quantity actually shown to, or edited by, the trader must only ever be a
// plain integer — never a range, never a unit baked into the number — so
// this pulls every number out of the string and takes the highest one (the
// safer assumption for ordering materials: "2-3 bags" becomes 3, not 2),
// rounded up to a whole number. Falls back to 1 for anything with no number
// in it at all, so a missing/unparseable quantity still contributes its
// unit price rather than silently zeroing the line out of a total.
//
// Shared between a Client Component (app/materials-pricing.js, the editable
// Qty input and the live materials total) and a Server Component
// (app/quote/[id]/page.js, the drafted MATERIALS & EQUIPMENT text rebuilt
// for Copy/Download) so a raw range can never leak into one but not the
// other — same principle as lib/pricing/merchant-category.js's sharing.
export function extractIntegerQuantity(quantity) {
  const numbers = String(quantity ?? '').match(/\d+(?:\.\d+)?/g)
  if (!numbers) return 1
  const highest = Math.max(...numbers.map(Number))
  return Number.isFinite(highest) && highest > 0 ? Math.ceil(highest) : 1
}

// Splits a loose quantity string ("25m", "1 box", "2-3 bags", "1–5") into
// the plain integer to show in the editable Qty input (see
// extractIntegerQuantity — never a range, never text) plus a trailing unit
// word, if any, to show next to the "Qty" label instead (e.g. "Qty (bags)")
// rather than inside the input itself. The unit is whatever letters follow
// the last number in the string, with any range punctuation/whitespace in
// between ("-3 bags" → "bags") stripped — covers a plain suffix ("25m" →
// "m", "1 box" → "box") and a ranged one ("2-3 bags" → "bags") the same way.
export function splitQuantity(quantity) {
  const str = String(quantity ?? '').trim()
  const number = String(extractIntegerQuantity(str))

  const matches = [...str.matchAll(/\d+(?:\.\d+)?/g)]
  const lastNumber = matches[matches.length - 1]
  const afterLastNumber = lastNumber ? str.slice(lastNumber.index + lastNumber[0].length) : ''
  const unitMatch = afterLastNumber.match(/[a-zA-Z][a-zA-Z\s]*/)
  const unit = unitMatch ? unitMatch[0].trim() : ''

  return { number, unit }
}

export function joinQuantity(number, unit) {
  return unit ? `${number} ${unit}` : String(number)
}
