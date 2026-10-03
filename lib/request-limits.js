// Input limits for the routes that spend Anthropic tokens. There's no sign-in yet (Phase 4), so these keep one
// oversized request from running up the API bill; lib/rate-limit.js limits repeated ones.

export const MAX_JOB_DESCRIPTION_LENGTH = 5000;
const MAX_QA_PAIRS = 12;
const MAX_QUESTION_LENGTH = 300;
const MAX_ANSWER_LENGTH = 1000;
export const MAX_MATERIALS = 60;
const MAX_MATERIAL_FIELD_LENGTH = { label: 200, quantity: 50, description: 500 };

// The trimmed description, or null when it's missing or longer than the limit.
export function cleanJobDescription(raw) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  return text && text.length <= MAX_JOB_DESCRIPTION_LENGTH ? text : null;
}

// Supplementary { question, answer } pairs: malformed entries are dropped and long ones cut, not rejected.
export function sanitizeQaPairs(pairs) {
  if (!Array.isArray(pairs)) return [];
  return pairs
    .filter((qa) => qa && typeof qa.question === 'string' && qa.question.trim() && typeof qa.answer === 'string' && qa.answer.trim())
    .slice(0, MAX_QA_PAIRS)
    .map((qa) => ({ question: qa.question.trim().slice(0, MAX_QUESTION_LENGTH), answer: qa.answer.trim().slice(0, MAX_ANSWER_LENGTH) }));
}

// Phase B's trader-refined materials: null when malformed or over a limit (they're authoritative, so never cut).
export function validateMaterials(materials) {
  if (!Array.isArray(materials) || materials.length > MAX_MATERIALS) return null;
  for (const m of materials) {
    if (!m || typeof m.label !== 'string' || !m.label.trim()) return null;
    for (const [field, max] of Object.entries(MAX_MATERIAL_FIELD_LENGTH)) {
      if (m[field] === undefined) continue;
      if (typeof m[field] !== 'string' || m[field].length > max) return null;
    }
  }
  return materials;
}
