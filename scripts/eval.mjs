// Runs a trade's eval cases through Phase A and the knowledge-bearing Phase B sections
// against the real API. Usage: npm run eval -- --trade=plumber [--knowledge=off] [--case=id] [--runs=N]
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

// Same empty-string clearing as qf.js, so dotenv loads the real values from .env.
for (const key of ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL']) {
  if (process.env[key] === '') delete process.env[key]
}
dotenv.config()

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? 'true']),
)
const trade = args.trade ?? 'plumber'
const knowledge = args.knowledge === 'off' ? 'off' : 'all'
const runs = Math.max(1, Number.parseInt(args.runs ?? '1', 10) || 1)
process.env.TRADE_KNOWLEDGE = knowledge

const { proposeMaterials, isNearDuplicateQuestion, questionListsOptions } = await import('../lib/propose-materials.js')
const { getPhaseAModel } = await import('../lib/anthropic-client.js')
const { draftSection } = await import('../tools/draft-section.js')
const { jobEntry, formatJobForPhaseB } = await import('../lib/trade-knowledge/index.js')
const casesModule = await import(`../evals/${trade}.cases.js`)
const FORBIDDEN = casesModule.FORBIDDEN
const allCases = casesModule[`${trade.toUpperCase().replace(/-/g, '_')}_CASES`]
const cases = args.case ? allCases.filter((c) => c.id === args.case) : allCases

const SECTIONS = ['scope', 'assumptions', 'exclusions']
const MAX_ROUNDS = 5

// Scripted reply to one Phase A question, falling back to its first option.
function answerFor(testCase, q) {
  const scripted = testCase.answers?.find(([re]) => re.test(q.question))
  return scripted ? scripted[1] : q.choices?.[0]?.options[0] ?? 'Not sure'
}

async function runCase(testCase) {
  const priorQuestions = []
  const asked = []
  let result = await proposeMaterials({ trade, jobDescription: testCase.jobDescription, keyAnswers: testCase.keyAnswers })
  let jobType = result.jobType
  while (result.clarifyingQuestion && priorQuestions.length < MAX_ROUNDS) {
    const q = result.clarifyingQuestion
    asked.push(q)
    priorQuestions.push({ question: q.question, answer: answerFor(testCase, q) })
    result = await proposeMaterials({ trade, jobDescription: testCase.jobDescription, keyAnswers: testCase.keyAnswers, priorQuestions })
    jobType = result.jobType ?? jobType
  }
  const materials = result.materials ?? []

  // Mirrors app/api/quote/route.js's Phase B toolContext for the sections the pack affects.
  const toolContext = {
    trade,
    tone: 'professional',
    jobDescription: testCase.jobDescription,
    sectionStore: {},
    materials: materials.map((m) => ({ name: m.label, quantity: m.quantity ?? null, notes: m.description ?? null, confidence: 'trader_confirmed' })),
    jobKnowledge: formatJobForPhaseB(jobEntry(trade, jobType)),
  }
  const followUps = [...testCase.keyAnswers, ...priorQuestions]
  for (const section of SECTIONS) {
    await draftSection({ section, context: { follow_up_answers: followUps } }, toolContext)
  }

  const questions = priorQuestions.map((qa) => qa.question).join('\n')
  const labels = materials.map((m) => m.label).join('\n')
  const texts = { ...toolContext.sectionStore }
  const everything = [questions, labels, ...Object.values(texts)].join('\n')

  const checks = []
  const { expect: exp } = testCase
  if (exp.asksAny) checks.push({ kind: 'asksAny', name: 'asks a job-specific question', pass: exp.asksAny.some((re) => re.test(questions)) })
  for (const re of exp.materials ?? []) checks.push({ kind: 'materials', name: `materials ${re}`, pass: re.test(labels) })
  for (const section of SECTIONS) {
    for (const re of exp[section] ?? []) checks.push({ kind: section, name: `${section} ${re}`, pass: re.test(texts[section] ?? '') })
  }
  // Scored on every case, so the Phase A backstops show up in the numbers.
  const repeats = asked.filter((q, i) => isNearDuplicateQuestion(q.question, [...testCase.keyAnswers, ...asked.slice(0, i)]))
  checks.push({ kind: 'distinct', name: 'no repeated question', pass: repeats.length === 0 })
  const listing = asked.filter((q) => questionListsOptions(q.question, q.choices))
  checks.push({ kind: 'clean-question', name: 'no options in question text', pass: listing.length === 0 })
  for (const re of FORBIDDEN) checks.push({ kind: 'forbidden', name: `never ${re}`, pass: !re.test(everything) })

  return { id: testCase.id, jobType, priorQuestions, asked, materials, sections: texts, checks }
}

async function runAll() {
  const results = []
  const queue = [...cases]
  const worker = async () => {
    while (queue.length) {
      const testCase = queue.shift()
      try {
        results.push(await runCase(testCase))
      } catch (err) {
        results.push({ id: testCase.id, error: err.message, checks: [] })
      }
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker))
  return results.sort((a, b) => cases.findIndex((c) => c.id === a.id) - cases.findIndex((c) => c.id === b.id))
}

function printRun(results) {
  for (const r of results) {
    if (r.error) {
      console.log(`ERROR ${r.id}: ${r.error}`)
      continue
    }
    const passed = r.checks.filter((c) => c.pass).length
    const failed = r.checks.filter((c) => !c.pass).map((c) => c.name)
    console.log(`${passed === r.checks.length ? 'PASS' : 'FAIL'} ${r.id.padEnd(18)} ${passed}/${r.checks.length}  job=${r.jobType ?? '-'}  questions=${r.priorQuestions.length}`)
    for (const name of failed) console.log(`       ✗ ${name}`)
  }
}

function tally(results) {
  const byKind = {}
  for (const c of results.flatMap((r) => r.checks)) {
    byKind[c.kind] ??= { pass: 0, total: 0 }
    byKind[c.kind].total++
    if (c.pass) byKind[c.kind].pass++
  }
  const all = results.flatMap((r) => r.checks)
  byKind.total = { pass: all.filter((c) => c.pass).length, total: all.length }
  return byKind
}

console.log(`\n${trade} eval, knowledge=${knowledge}, phaseA=${getPhaseAModel()}, runs=${runs}`)
const runResults = []
for (let run = 1; run <= runs; run++) {
  const results = await runAll()
  console.log(`\nRun ${run}/${runs}`)
  printRun(results)
  runResults.push(results)
}

// Mean pass count per check type across runs, with the min–max spread, since single runs are noisy.
const tallies = runResults.map(tally)
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
console.log('\nBy check type (mean, min–max):')
for (const kind of [...new Set(tallies.flatMap(Object.keys))]) {
  const passes = tallies.map((t) => t[kind]?.pass ?? 0)
  const total = Math.max(...tallies.map((t) => t[kind]?.total ?? 0))
  const mean = passes.reduce((a, b) => a + b, 0) / passes.length
  const spread = runs > 1 ? `  (${Math.min(...passes)}–${Math.max(...passes)})` : ''
  console.log(`  ${kind.padEnd(14)} ${fmt(mean)}/${total}${spread}`)
}
console.log(`Errors: ${runResults.flat().filter((r) => r.error).length}`)

const dir = path.join(process.cwd(), 'evals', 'results')
fs.mkdirSync(dir, { recursive: true })
const file = path.join(dir, `${trade}-${knowledge}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
fs.writeFileSync(file, JSON.stringify({ trade, knowledge, phaseAModel: getPhaseAModel(), runs: runResults }, null, 2))
console.log(`Full output: ${path.relative(process.cwd(), file)}`)
