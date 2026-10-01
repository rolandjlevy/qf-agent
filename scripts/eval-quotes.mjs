// Runs evals/quote-quality.cases.js through the web UI's full pipeline in-process (key questions,
// Phase A, Phase B), auto-answering questions as the trader, then has Claude score each quote.
// Usage: npm run eval:quotes [-- --case=id]. Writes to evals/results/quote-quality-<timestamp>/.
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

// Same empty-string clearing as qf.js, so dotenv loads the real values from .env.
for (const key of ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL']) {
  if (process.env[key] === '') delete process.env[key]
}
dotenv.config()

const { runAgent } = await import('../agent.js')
const { TOOL_DEFINITIONS, executeTool } = await import('../tools/index.js')
const { buildPhaseBSystemPrompt, buildInitialMessage } = await import('../prompts/system.js')
const { createClient, createMessage, getPhaseAModel, getPhaseBModel } = await import('../lib/anthropic-client.js')
const { proposeMaterials, MAX_CLARIFYING_QUESTIONS } = await import('../lib/propose-materials.js')
const { keyQuestionsForJob, jobEntry, formatJobForPhaseB } = await import('../lib/trade-knowledge/index.js')
const { summarizeFollowUpAnswers } = await import('../lib/summarize-follow-up-answers.js')
const { formatTraderContext } = await import('../lib/trader-context.js')
const { tradeLabel } = await import('../lib/constants.js')
const { QUOTE_QUALITY_CASES } = await import('../evals/quote-quality.cases.js')
const { QUOTE_RUBRIC, RUBRIC_SECTIONS } = await import('../evals/quote-quality-rubric.js')

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? 'true']),
)
const cases = args.case ? QUOTE_QUALITY_CASES.filter((c) => c.id === args.case) : QUOTE_QUALITY_CASES
const EVAL_MODEL = process.env.EVAL_MODEL || 'claude-sonnet-5'
const TONE = 'professional'
const NOT_SURE = 'Not sure'

// A fictional profile so the header, terms and contact lines get exercised as they would for a real trader.
const TRADER_PROFILE = {
  business_name: 'Hartley Property Services',
  contact_details: '07700 900123\nhello@hartleyps.example',
  hourly_rate: 45,
  service_area: 'Leicester and surrounding villages',
  standard_terms: 'Quote valid for 30 days. 25% deposit to book, balance on completion. Payment by bank transfer.',
  vat_registered: false,
}

const anthropic = createClient()
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// One judge/answerer call that must come back as JSON; retried up to twice on a parse failure.
async function askJson(prompt, maxTokens) {
  let lastErr
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const response = await createMessage(anthropic, { model: EVAL_MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] })
      const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
      const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
      return JSON.parse(json)
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) throw err
      lastErr = err
    }
  }
  throw new Error(`No valid JSON after 3 attempts: ${lastErr?.message}`)
}

function optionsOf(q) {
  if (q.options) return q.options
  return (q.choices ?? []).flatMap((g) => g.options ?? [])
}

// Answers questions the way a trader would. Questions with options get one of them back, or "Not sure".
async function autoAnswer(testCase, questions) {
  const list = questions
    .map((q, i) => {
      const options = optionsOf(q)
      return `${i + 1}. ${q.question}${options.length ? `\n   Options: ${options.join(' | ')}` : ''}`
    })
    .join('\n')
  const prompt = `You are a UK ${tradeLabel(testCase.trade).toLowerCase()} answering follow-up questions about a job you've been asked to quote. Keep answers short and realistic, 1-2 sentences max, the way a tradesperson would actually reply. Be specific but don't over-explain.
Where a question lists options, answer with one option copied exactly, or "${NOT_SURE}" if you genuinely couldn't know yet.

Job description: ${testCase.jobDescription}

Questions:
${list}

Answer each question. Return ONLY valid JSON:
{
  "answers": {
    "1": "short realistic answer",
    "2": "short realistic answer"
  }
}`
  const { answers } = await askJson(prompt, 1000)
  return questions.map((q, i) => String(answers?.[String(i + 1)] ?? NOT_SURE).trim() || NOT_SURE)
}

// Mirrors app/quote/new/new-quote-flow.js: key questions, then Phase A rounds, all materials kept, then Phase B.
async function generateQuote(testCase) {
  const { trade, jobDescription } = testCase

  const keyQuestions = keyQuestionsForJob(trade, jobDescription)
  const keyReplies = keyQuestions.length ? await autoAnswer(testCase, keyQuestions) : []
  const keyAnswers = []
  const unclear = []
  keyQuestions.forEach((q, i) => {
    const answer = keyReplies[i]
    if (/^not sure$/i.test(answer)) unclear.push(q.topic)
    else keyAnswers.push({ question: q.question, answer })
  })
  const photoFindings = unclear.length ? { observations: [], resolved: [], unclear } : undefined

  const priorQuestions = []
  const clarifying = []
  let result = await proposeMaterials({ trade, jobDescription, keyAnswers, photoFindings })
  let jobType = result.jobType
  while (result.clarifyingQuestion && priorQuestions.length < MAX_CLARIFYING_QUESTIONS) {
    const q = result.clarifyingQuestion
    const [answer] = await autoAnswer(testCase, [q])
    clarifying.push(q)
    priorQuestions.push({ question: q.question, answer })
    result = await proposeMaterials({ trade, jobDescription, keyAnswers, priorQuestions, photoFindings })
    jobType = result.jobType ?? jobType
  }
  const materials = (result.materials ?? []).map((m) => ({
    name: m.label,
    quantity: m.quantity ?? null,
    notes: m.description ?? null,
    confidence: 'trader_confirmed',
  }))

  // Same Phase B setup as app/api/quote/route.js, minus the run row and watchdog.
  const followUpAnswers = [...keyAnswers, ...priorQuestions]
  const traderContext = formatTraderContext(TRADER_PROFILE)
  const toolContext = {
    traderProfile: TRADER_PROFILE,
    trade,
    tone: TONE,
    jobDescription,
    sectionStore: {},
    materials,
    followUpAnswerBullets: await summarizeFollowUpAnswers(followUpAnswers),
    jobKnowledge: formatJobForPhaseB(jobEntry(trade, jobType)),
  }
  await runAgent({
    systemPrompt: `${buildPhaseBSystemPrompt()}\n\n${traderContext}`,
    tools: TOOL_DEFINITIONS.filter((t) => !['identify_materials', 'ask_user'].includes(t.name)),
    executeTool,
    initialMessage: buildInitialMessage({ trade, tone: TONE, jobDescription, followUpAnswers, photoFindings }),
    maxTurns: 20,
    onStep: () => {},
    toolContext,
    model: getPhaseBModel(),
  })
  if (!toolContext.savedQuote?.content) throw new Error('No quote was saved')

  const questions = [
    ...keyQuestions.map((q, i) => ({ kind: 'key', question: q.question, answer: keyReplies[i] })),
    ...clarifying.map((q, i) => ({ kind: 'clarifying', question: q.question, answer: priorQuestions[i].answer })),
  ]
  return { jobType: jobType ?? null, questions, materials: result.materials ?? [], quote: toolContext.savedQuote.content }
}

async function scoreQuote(testCase, generated) {
  const numbered = (items) => items.map((x, i) => `${i + 1}. ${x}`).join('\n') || '(none)'
  const prompt = `You are evaluating the quality of an AI-generated trade quote.

TRADE: ${tradeLabel(testCase.trade)}
ORIGINAL JOB DESCRIPTION: ${testCase.jobDescription}
FOLLOW-UP QUESTIONS ASKED:
${numbered(generated.questions.map((q) => q.question))}
FOLLOW-UP ANSWERS GIVEN:
${numbered(generated.questions.map((q) => q.answer))}

GENERATED QUOTE:
${generated.quote}

SCORING RUBRIC:
${QUOTE_RUBRIC}

EXPECTED GAPS (what the follow-up questions should have caught):
${numbered(testCase.expectedGaps)}

Score the quote. Return ONLY valid JSON, no other text:
{
  "scores": {
${RUBRIC_SECTIONS.map((s) => `    "${s}": { "score": 0|1|2|null, "reason": "one sentence" }`).join(',\n')}
  },
  "followUpCoverage": {
    "expectedGaps": <number of expected gaps>,
    "gapsCovered": <number actually asked about>,
    "missed": ["gap not asked about"],
    "irrelevant": ["any generic/irrelevant questions asked"]
  },
  "overallNotes": "2-3 sentences on the biggest strengths and weaknesses"
}`
  const judged = await askJson(prompt, 2500)
  // Totals are computed here rather than trusted from the judge.
  const values = RUBRIC_SECTIONS.map((s) => judged.scores?.[s]?.score).filter((v) => typeof v === 'number')
  return { ...judged, total: values.reduce((a, b) => a + b, 0), maxPossible: values.length * 2 }
}

function summarise(results) {
  const scored = results.filter((r) => r.scores)
  const sectionAverages = Object.fromEntries(
    RUBRIC_SECTIONS.map((s) => {
      const values = scored.map((r) => r.scores.scores?.[s]?.score).filter((v) => typeof v === 'number')
      return [s, values.length ? values.reduce((a, b) => a + b, 0) / values.length : null]
    }),
  )
  const ranked = Object.entries(sectionAverages).filter(([, v]) => v !== null).sort((a, b) => a[1] - b[1])
  const pct = (r) => r.scores.total / r.scores.maxPossible
  const byTotal = [...scored].sort((a, b) => pct(a) - pct(b))
  const coverage = scored.map((r) => r.scores.followUpCoverage).filter((c) => c?.expectedGaps)
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  return {
    jobsScored: scored.length,
    jobsFailed: results.length - scored.length,
    sectionAverages,
    averageTotal: mean(scored.map((r) => r.scores.total)),
    averageMaxPossible: mean(scored.map((r) => r.scores.maxPossible)),
    followUpCoverage: mean(coverage.map((c) => Math.min(1, c.gapsCovered / c.expectedGaps))),
    weakestSection: ranked[0] ?? null,
    strongestSection: ranked.at(-1) ?? null,
    worstJob: byTotal[0]?.id ?? null,
    bestJob: byTotal.at(-1)?.id ?? null,
  }
}

// Turns the per-job scores into the report's three written paragraphs.
async function writeAnalysis(results, stats) {
  const digest = results
    .filter((r) => r.scores)
    .map((r) => ({
      job: r.title,
      trade: r.trade,
      scores: Object.fromEntries(RUBRIC_SECTIONS.map((s) => [s, r.scores.scores?.[s]])),
      missedGaps: r.scores.followUpCoverage?.missed,
      irrelevantQuestions: r.scores.followUpCoverage?.irrelevant,
      notes: r.scores.overallNotes,
    }))
  const prompt = `These are quality scores for 10 quotes produced by QuoteFetch, a tool that drafts quotes for UK tradespeople. Summarise them for the developer tuning its prompts.

SUMMARY STATS:
${JSON.stringify(stats, null, 2)}

PER-JOB RESULTS:
${JSON.stringify(digest, null, 2)}

RUBRIC AND PRODUCT NOTES:
${QUOTE_RUBRIC}

Recommendations must respect the product's fixed rules: never invent prices, labour costs or totals; never claim regulatory compliance; one specific product per materials line; plain-text output with no tables. Don't recommend breaking any of these.

Return ONLY valid JSON:
{
  "weakestSections": "one paragraph on where to focus prompt tuning, with concrete examples from the quotes",
  "followUpGaps": "one paragraph on which expected gaps the questions consistently miss",
  "recommendations": ["3-5 specific, actionable prompt changes"]
}`
  return askJson(prompt, 3000)
}

function summaryMarkdown(results, stats, analysis, meta) {
  const cell = (v) => (v === null || v === undefined ? 'N/A' : String(v))
  const header = `| Job | ${RUBRIC_SECTIONS.join(' | ')} | Total | Gaps covered |`
  const divider = `|${' --- |'.repeat(RUBRIC_SECTIONS.length + 3)}`
  const rows = results.map((r) => {
    if (!r.scores) return `| ${r.title} (${r.trade}) | ${RUBRIC_SECTIONS.map(() => 'error').join(' | ')} | error | error |`
    const c = r.scores.followUpCoverage ?? {}
    return `| ${r.title} (${r.trade}) | ${RUBRIC_SECTIONS.map((s) => cell(r.scores.scores?.[s]?.score)).join(' | ')} | ${r.scores.total}/${r.scores.maxPossible} | ${c.gapsCovered ?? '?'}/${c.expectedGaps ?? '?'} |`
  })
  const avg = `| **Average** | ${RUBRIC_SECTIONS.map((s) => cell(stats.sectionAverages[s]?.toFixed(2))).join(' | ')} | ${stats.averageTotal?.toFixed(1)}/${stats.averageMaxPossible?.toFixed(0)} | ${stats.followUpCoverage === null ? 'N/A' : `${Math.round(stats.followUpCoverage * 100)}%`} |`
  const errors = results.filter((r) => r.error).map((r) => `- ${r.title}: ${r.error}`)
  return `# Quote quality eval

${meta.date} · judge ${meta.evalModel} · Phase A ${meta.phaseAModel} · Phase B ${meta.phaseBModel} · TRADE_KNOWLEDGE=${meta.tradeKnowledge}

Labour and totals are N/A by design: QuoteFetch never prices a quote.

${header}
${divider}
${rows.join('\n')}
${avg}
${errors.length ? `\n## Errors\n\n${errors.join('\n')}\n` : ''}
## Weakest sections

${analysis?.weakestSections ?? '(analysis unavailable)'}

## Follow-up question gaps

${analysis?.followUpGaps ?? '(analysis unavailable)'}

## Recommendations

${(analysis?.recommendations ?? []).map((r) => `- ${r}`).join('\n') || '(analysis unavailable)'}
`
}

const results = []
for (const [i, testCase] of cases.entries()) {
  console.log(`Testing ${i + 1}/${cases.length}: ${testCase.title} (${tradeLabel(testCase.trade)})...`)
  const entry = { id: testCase.id, title: testCase.title, trade: testCase.trade, jobDescription: testCase.jobDescription, expectedGaps: testCase.expectedGaps }
  try {
    Object.assign(entry, await generateQuote(testCase))
    entry.scores = await scoreQuote(testCase, entry)
    console.log(`  ${entry.scores.total}/${entry.scores.maxPossible}, gaps ${entry.scores.followUpCoverage?.gapsCovered}/${entry.scores.followUpCoverage?.expectedGaps}`)
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) throw err
    entry.error = err.message
    console.log(`  ERROR: ${err.message}`)
  }
  results.push(entry)
  if (i < cases.length - 1) await sleep(2000)
}

const stats = summarise(results)
let analysis = null
try {
  if (stats.jobsScored) analysis = await writeAnalysis(results, stats)
} catch (err) {
  console.log(`Analysis failed: ${err.message}`)
}

const meta = {
  date: new Date().toISOString(),
  evalModel: EVAL_MODEL,
  phaseAModel: getPhaseAModel(),
  phaseBModel: getPhaseBModel(),
  tradeKnowledge: process.env.TRADE_KNOWLEDGE || 'reviewed only',
}
const dir = path.join(process.cwd(), 'evals', 'results', `quote-quality-${meta.date.replace(/[:.]/g, '-')}`)
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, 'full-results.json'), JSON.stringify({ meta, stats, analysis, results }, null, 2))
fs.writeFileSync(path.join(dir, 'summary.md'), summaryMarkdown(results, stats, analysis, meta))

const fmt = (n, d = 1) => (n === null ? 'N/A' : n.toFixed(d))
console.log(`
Overall average: ${fmt(stats.averageTotal)}/${fmt(stats.averageMaxPossible, 0)}
Weakest section: ${stats.weakestSection ? `${stats.weakestSection[0]} (avg ${fmt(stats.weakestSection[1])}/2)` : 'N/A'}
Strongest section: ${stats.strongestSection ? `${stats.strongestSection[0]} (avg ${fmt(stats.strongestSection[1])}/2)` : 'N/A'}
Follow-up coverage: ${stats.followUpCoverage === null ? 'N/A' : `${Math.round(stats.followUpCoverage * 100)}%`} of expected gaps covered
Full results: ${path.relative(process.cwd(), path.join(dir, 'full-results.json'))}
Summary: ${path.relative(process.cwd(), path.join(dir, 'summary.md'))}`)
