// Code-level backstop for the "never bundle/never alternate/never vague"
// materials rules (see CLAUDE.md's Never-do rules) — shared by
// tools/identify-materials.js (the CLI's and old web flow's single-loop
// extraction) and lib/propose-materials.js (Phase A of the web
// materials-refinement flow) so the rules can't drift between the two.
export const SKIP_KEYWORDS = ['sundries', 'consumables', 'miscellaneous', 'disposal', 'hire', 'skip hire', 'labour']
const SKIP_KEYWORD_PATTERNS = SKIP_KEYWORDS.map((kw) => new RegExp(`\\b${kw}\\b`, 'i'))

export function isRejectedLabel(label) {
  if (typeof label !== 'string') return true
  const trimmed = label.trim()
  if (trimmed.length < 4) return true
  const lower = trimmed.toLowerCase()
  if (lower.includes(' or ')) return true
  // A single legitimate product name should never contain a comma — any
  // comma is a sign of exactly the bundling ("screws, wall plugs") the
  // prompt's rules forbid.
  if (trimmed.includes(',')) return true
  if (SKIP_KEYWORD_PATTERNS.some((re) => re.test(trimmed))) return true
  return false
}
