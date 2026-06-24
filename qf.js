#!/usr/bin/env node
import 'dotenv/config'
import chalk from 'chalk'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { runAgent } from './agent.js'
import { TOOL_DEFINITIONS, executeTool } from './tools/index.js'
import { SYSTEM_PROMPT } from './prompts/system.js'

const VALID_TRADES = [
  'bathroom-fitter', 'builder', 'carpenter', 'driveway-specialist',
  'electrician', 'flooring-fitter', 'gas-engineer', 'glazier',
  'groundworker', 'handyman', 'kitchen-fitter', 'gardener-landscaper',
  'decorator', 'plasterer', 'plumber', 'roofer', 'tiler',
]

const VALID_TONES = ['friendly', 'formal', 'direct', 'persuasive', 'professional']

const argv = yargs(hideBin(process.argv))
  .usage('Usage: node qf.js --trade=<trade> --tone=<tone> "<job description>"')
  .option('trade', {
    type: 'string',
    demandOption: true,
    description: `Trade category. Valid: ${VALID_TRADES.join(', ')}`,
  })
  .option('tone', {
    type: 'string',
    demandOption: true,
    description: `Quote tone. Valid: ${VALID_TONES.join(', ')}`,
  })
  .example('node qf.js --trade=electrician --tone=professional "Replace consumer unit, 8 MCBs, surge protection"')
  .help()
  .argv

const jobDescription = argv._.join(' ').trim()

if (!jobDescription) {
  console.error(chalk.red('Error: job description is required as a positional argument'))
  console.error(chalk.gray('  node qf.js --trade=electrician --tone=professional "Replace consumer unit..."'))
  process.exit(1)
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(chalk.red('Error: ANTHROPIC_API_KEY is not set'))
  console.error(chalk.gray('  Copy .env.example to .env and add your key'))
  process.exit(1)
}

const trade = argv.trade
const tone = argv.tone

// Header
console.log()
console.log(chalk.bold('🛠  QuoteFetch Agent'))
console.log(chalk.gray('─────────────────────────────────────────'))
console.log(chalk.cyan('Trade: ') + chalk.white(trade))
console.log(chalk.cyan('Tone:  ') + chalk.white(tone))
console.log(chalk.cyan('Job:   ') + chalk.white(jobDescription))
console.log(chalk.gray('─────────────────────────────────────────'))
console.log()

function formatToolInput(toolName, input) {
  switch (toolName) {
    case 'ask_user':
      return chalk.gray(`   "${input.question}"`)
    case 'identify_materials':
      return chalk.gray(`   trade=${input.trade}, description="${input.job_description.slice(0, 60)}${input.job_description.length > 60 ? '...' : ''}"`)
    case 'lookup_price':
      return chalk.gray(`   material_name="${input.material_name}"`)
    case 'draft_section':
      return chalk.gray(`   section=${input.section}`)
    case 'save_quote': {
      const keys = Object.keys(input.sections || {})
      return chalk.gray(`   sections=[${keys.join(', ')}], filename=${input.filename || 'auto'}`)
    }
    default:
      return chalk.gray(`   ${JSON.stringify(input).slice(0, 80)}`)
  }
}

function formatToolResult(toolName, result) {
  switch (toolName) {
    case 'ask_user':
      return chalk.green(`   Answer: "${result.answer}"`)
    case 'identify_materials': {
      const names = (result.materials || []).map((m) => m.name).join(', ')
      return chalk.green(`   Found ${result.materials?.length ?? 0} materials: ${names}`)
    }
    case 'lookup_price':
      if (!result.found) {
        return chalk.yellow(`   Not found — will use [Price TBC]`)
      }
      const verifiedTag = result.verified ? '' : chalk.yellow(' (unverified)')
      const others = (result.all_prices || [])
        .filter((p) => p.supplier !== result.cheapest_supplier)
        .map((p) => `${p.supplier} £${p.price.toFixed(2)}`)
        .join(', ')
      return (
        chalk.green(`   Cheapest: ${result.cheapest_supplier} £${result.cheapest.toFixed(2)}`) +
        verifiedTag +
        (others ? chalk.gray(` (also: ${others})`) : '')
      )
    case 'draft_section':
      return chalk.green(`   Section "${result.section}" drafted (${result.content?.length ?? 0} chars)`)
    case 'save_quote':
      if (result.success) {
        return chalk.green(`   Saved to ${result.file_path}`)
      }
      return chalk.red(`   Failed to save`)
    default:
      return chalk.green(`   ${JSON.stringify(result).slice(0, 100)}`)
  }
}

const initialMessage = `Generate a complete professional quote for the following job.

Trade: ${trade}
Tone: ${tone}
Job description: ${jobDescription}

Today's date is ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`

function onStep(step) {
  switch (step.type) {
    case 'turn_start':
      console.log(chalk.yellow.bold(`🔄 Turn ${step.turn}`))
      break
    case 'tool_call':
      console.log(chalk.cyan.bold(`🔧 ${step.tool}`))
      console.log(formatToolInput(step.tool, step.input))
      break
    case 'tool_result':
      console.log(formatToolResult(step.tool, step.result))
      console.log()
      break
    case 'final_answer':
      console.log(chalk.gray('─────────────────────────────────────────'))
      console.log(chalk.white.bold('💬 ' + step.text))
      console.log()
      break
  }
}

try {
  const { turns } = await runAgent({
    systemPrompt: SYSTEM_PROMPT,
    tools: TOOL_DEFINITIONS,
    executeTool,
    initialMessage,
    maxTurns: 20,
    onStep,
  })

  console.log(chalk.gray(`Completed in ${turns} turn${turns === 1 ? '' : 's'}.`))
} catch (err) {
  console.error()
  console.error(chalk.red.bold('Error: ' + err.message))
  process.exit(1)
}
