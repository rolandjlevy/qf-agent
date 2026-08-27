export function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function wordSet(str) {
  return new Set(normalize(str).split(' ').filter((w) => w.length > 2))
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
    if (normTerm.includes(normSearch) && normSearch.length > 5) return 85
    if (normSearch.includes(normTerm) && normTerm.length > 5) return 80
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
