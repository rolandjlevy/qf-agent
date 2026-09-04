export function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Glues a leading count onto "gang"/"way" (UK electrical-accessory
// convention — gang = plate positions, way = switching type, e.g. a
// product literally named "1 Gang 2 Way") into one atomic token ("1gang",
// "2way") before word-splitting. Without this, a product whose name
// contains numbers for *two different* specs (a "1 Gang 2 Way" switch has
// both "1" and "2") makes every count-differentiated catalog entry that
// shares either number score identically — confirmed in production: a
// "2-gang light switch" search and a "1-gang light switch" search both
// matched this exact product with the same score, because "2" (from "2
// Way") and "1" (from "1 Gang") were each floating free rather than
// bound to which spec they described.
function glueCountedTerms(normalized) {
  return normalized.replace(/\b(\d+)\s+(gang|way)\b/g, '$1$2')
}

// Drops short noise words (a, of, to, in, ...) but keeps any token that
// contains a digit regardless of length — otherwise a spec-critical number
// like "6A" or "10-way" silently vanishes (normalize() splits "10-way" into
// "10"+"way", and a lone "6a" fails a plain length filter), making two
// catalog entries that differ only by that number indistinguishable to
// scoreMatch.
export function wordSet(str) {
  return new Set(glueCountedTerms(normalize(str)).split(' ').filter((w) => w.length > 2 || /\d/.test(w)))
}

// Scores how well `searchTerm` matches a { name, aliases } entry, 0-100.
// Same scoring tiers regardless of what the entry represents (sample-DB
// material or trader-priced material) so both lookups behave identically.
export function scoreMatch(entry, searchTerm) {
  const normSearch = normalize(searchTerm)
  const normName = normalize(entry.name)

  if (normName === normSearch) return 100

  const allTerms = [entry.name, ...(entry.aliases || [])]

  for (const term of allTerms) {
    const normTerm = normalize(term)
    if (normTerm === normSearch) return 95
    // Containment only counts as a strong signal for a genuinely
    // multi-word phrase — a single generic word (e.g. a catalog alias
    // like "wallboard" or "fuseboard") is a substring of almost any
    // sufficiently long, unrelated product name, and previously hit these
    // branches directly, skipping word-overlap scoring (and its
    // digit-awareness) entirely. Confirmed in production: a 9.5mm
    // plasterboard product scored 80 against a 12.5mm catalog entry
    // purely because "wallboard" appeared somewhere in its name — the
    // actual thickness never got compared.
    if (normTerm.includes(normSearch) && normSearch.length > 5 && normSearch.includes(' ')) return 85
    if (normSearch.includes(normTerm) && normTerm.length > 5 && normTerm.includes(' ')) return 80
  }

  // Word overlap scoring across name + aliases
  const searchWords = wordSet(searchTerm)
  if (searchWords.size === 0) return 0

  let bestWordScore = 0
  for (const term of allTerms) {
    const termWords = wordSet(term)
    const overlap = [...searchWords].filter((w) => termWords.has(w)).length
    if (overlap > 0) {
      const score = (overlap / Math.max(searchWords.size, termWords.size)) * 65
      if (score > bestWordScore) bestWordScore = score
    }
  }

  return bestWordScore
}

export const MATCH_THRESHOLD = 40
