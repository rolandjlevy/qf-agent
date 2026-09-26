import { PLUMBER_JOBS } from './plumber.js'
import { BATHROOM_FITTER_JOBS } from './bathroom-fitter.js'
import { ELECTRICIAN_JOBS } from './electrician.js'
import { CARPENTER_JOBS } from './carpenter.js'
import { ROOFER_JOBS } from './roofer.js'
import { tradeLabel } from '../constants.js'

// Per-trade knowledge packs (Phase 3c). Only reviewed entries are used, unless
// TRADE_KNOWLEDGE=all (dev and evals) or TRADE_KNOWLEDGE=off (eval baseline).
export const JOBS_BY_TRADE = {
  'bathroom-fitter': BATHROOM_FITTER_JOBS,
  carpenter: CARPENTER_JOBS,
  electrician: ELECTRICIAN_JOBS,
  plumber: PLUMBER_JOBS,
  roofer: ROOFER_JOBS,
}

export function jobsFor(trade) {
  const mode = process.env.TRADE_KNOWLEDGE
  if (mode === 'off') return []
  const jobs = Object.hasOwn(JOBS_BY_TRADE, trade) ? JOBS_BY_TRADE[trade] : []
  return mode === 'all' ? jobs : jobs.filter((j) => j.reviewed)
}

export function jobEntry(trade, id) {
  if (typeof id !== 'string') return null
  return jobsFor(trade).find((j) => j.id === id) ?? null
}

const bullets = (list, indent = '') => list.map((s) => `${indent}- ${s}`).join('\n')

// Phase A: every job for the trade, so the model can match the job and ask its diagnostic questions.
export function formatJobsForPhaseA(trade) {
  const jobs = jobsFor(trade)
  if (!jobs.length) return ''
  const entries = jobs.map((j) => {
    const questions = j.questions
      .map((q) => `  - ${q.question} (${q.options.join(' / ')})${q.askWhen ? ` (only if ${q.askWhen})` : ''}`)
      .join('\n')
    const variants = j.variants
      .map((v) => `  - ${v.when}: ${v.materials.length ? v.materials.join('; ') : 'no materials at this stage'}`)
      .join('\n')
    const pitfalls = bullets(j.pitfalls, '  ')
    return `<job id="${j.id}">\n${j.title} (e.g. ${j.matches})\nDiagnostic questions:\n${questions}\nTypical materials by variant:\n${variants}\nPitfalls:\n${pitfalls}\n</job>`
  })
  return `\n\nTRADE KNOWLEDGE — common ${tradeLabel(trade)} jobs, checked guidance from the trade. If this job matches one, prefer its diagnostic questions, but skip any the job description, photos or answers already settle. Ask one with its options as "choices", never listed in the question text. Base the materials on the variant the job points to, still following every materials rule below. Never repeat any of it as a claim about regulations or safety.\n<trade_knowledge>\n${entries.join('\n')}\n</trade_knowledge>`
}

// Phase B: only the matched job's considerations, for the scope, assumptions and exclusions sections.
export function formatJobForPhaseB(entry) {
  if (!entry) return ''
  return `Typical considerations for this job type (${entry.title}) — use them only where relevant to this job:
Common assumptions:
${bullets(entry.assumptions)}
Common exclusions:
${bullets(entry.exclusions)}
Pitfalls to reflect in the scope or small print:
${bullets(entry.pitfalls)}`
}
