// Code-level backstop for the never-do rule against regulatory compliance claims, applied
// to drafted quote sections. The trader's own certifications may still be stated verbatim.
export const COMPLIANCE_PATTERNS = [
  /\bpart p\b/i,
  /\bgas safe\b/i,
  /\bbs ?7671\b/i,
  /\bwater (supply )?regulations\b/i,
  /\bbuilding reg(ulation)?s\b/i,
  /\bcompl(y|ies|iant|iance)\b/i,
  /\bcertif/i,
  /\bwras\b/i,
  /\b(niceic|napit)\b/i,
]

// Phrases from the trader profile's certifications field, e.g. "Gas Safe registered, NICEIC".
export function certificationPhrases(certifications) {
  if (typeof certifications !== 'string') return []
  return certifications
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 3)
}

function maskAllowed(text, allowed) {
  let masked = text
  for (const phrase of allowed) {
    masked = masked.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ')
  }
  return masked
}

export function hasComplianceWording(text, allowed = []) {
  if (!text) return false
  const masked = maskAllowed(text, allowed)
  return COMPLIANCE_PATTERNS.some((re) => re.test(masked))
}

// Last resort once a repair attempt fails: drops offending bullets, or offending sentences
// from prose lines, and leaves everything else untouched.
export function stripComplianceWording(text, allowed = []) {
  return text
    .split('\n')
    .flatMap((line) => {
      if (!hasComplianceWording(line, allowed)) return [line]
      if (/^\s*([•*-]|\d+[.)])\s/.test(line)) return []
      const kept = line
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => !hasComplianceWording(sentence, allowed))
        .join(' ')
      return kept.trim() ? [kept] : []
    })
    .join('\n')
}
