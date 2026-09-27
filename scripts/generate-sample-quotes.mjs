#!/usr/bin/env node
// Regenerates lib/sample-quotes.json: the read-only example quotes /quote/new shows first-time traders.
// Runs the real Phase A + Phase B pipeline with no trader profile; nothing is written to the database.
// Usage: node scripts/generate-sample-quotes.mjs [trade ...]   (review the output before committing)
import dotenv from 'dotenv'
for (const key of ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL']) {
  if (process.env[key] === '') delete process.env[key]
}
dotenv.config()
import fs from 'node:fs'
import { runAgent } from '../agent.js'
import { TOOL_DEFINITIONS, executeTool } from '../tools/index.js'
import { buildPhaseBSystemPrompt, buildInitialMessage } from '../prompts/system.js'
import { getPhaseBModel } from '../lib/anthropic-client.js'
import { proposeMaterials } from '../lib/propose-materials.js'
import { jobEntry, formatJobForPhaseB } from '../lib/trade-knowledge/index.js'
import { examplesFor } from '../lib/example-jobs.js'
import { DEFAULT_TONE } from '../lib/constants.js'

const OUT = new URL('../lib/sample-quotes.json', import.meta.url)

// `general` stands in for trades without their own sample; the rest are the trades with knowledge packs.
// Each uses that trade's photo example from lib/example-jobs.js, with a short card title.
const SAMPLES = {
  general: { trade: 'handyman', title: 'TV wall mounting' },
  plumber: { title: 'Kitchen tap repair' },
  'bathroom-fitter': { title: 'Bathroom refit, 2.5m × 2m' },
  electrician: { title: 'Consumer unit replacement' },
  carpenter: { title: 'Five internal doors' },
  roofer: { title: 'Slipped roof tiles' },
  decorator: { title: 'Two bedrooms, walls and ceilings' },
  builder: { title: 'Kitchen–dining knock-through' },
  'gardener-landscaper': { title: 'Sandstone patio' },
  plasterer: { title: 'Ceiling board and skim, 4m × 4m' },
}

async function draftSample(key, { trade = key, title }) {
  const example = examplesFor(trade)[0]
  const jobDescription = example.jobDescription

  const proposal = await proposeMaterials({ trade, jobDescription, noMoreQuestions: true })
  const materials = (proposal.materials ?? []).map((m) => ({
    name: m.label,
    quantity: m.quantity ?? null,
    notes: m.description ?? null,
    confidence: 'trader_confirmed',
  }))

  const toolContext = {
    traderProfile: null,
    trade,
    tone: DEFAULT_TONE,
    jobDescription,
    sectionStore: {},
    materials,
    followUpAnswerBullets: [],
    jobKnowledge: formatJobForPhaseB(jobEntry(trade, proposal.jobType)),
  }
  await runAgent({
    systemPrompt: buildPhaseBSystemPrompt(),
    tools: TOOL_DEFINITIONS.filter((t) => !['identify_materials', 'ask_user'].includes(t.name)),
    executeTool,
    initialMessage: buildInitialMessage({ trade, tone: DEFAULT_TONE, jobDescription }),
    maxTurns: 20,
    onStep: () => {},
    toolContext,
    model: getPhaseBModel(),
  })
  if (!toolContext.savedQuote?.content) throw new Error(`${key}: no quote was saved`)

  // A fixed sample shouldn't carry the day it happened to be generated.
  const content = toolContext.savedQuote.content.replace(/Date: [^|\n]+/, 'Date: [DATE]')
  return { trade, title, jobDescription, content }
}

const only = process.argv.slice(2)
const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {}
for (const [key, spec] of Object.entries(SAMPLES)) {
  if (only.length && !only.includes(key)) continue
  process.stdout.write(`${key}… `)
  existing[key] = await draftSample(key, spec)
  console.log('done')
}
fs.writeFileSync(OUT, `${JSON.stringify(existing, null, 2)}\n`)
console.log(`Wrote ${OUT.pathname}`)
