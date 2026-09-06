#!/usr/bin/env node
import dotenv from 'dotenv';
// Some environments (e.g. this project's devcontainer remoteEnv) pre-set these
// as an empty string when the host has no value. Treat empty as unset so .env
// can still supply it, while a real operator/CI-set value is never overridden.
for (const key of ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL']) {
  if (process.env[key] === '') delete process.env[key];
}
dotenv.config();
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { runAgent } from './agent.js';
import { TOOL_DEFINITIONS, executeTool } from './tools/index.js';
import { SYSTEM_PROMPT, buildInitialMessage } from './prompts/system.js';
import { runProfileCommand } from './commands/profile.js';
import { getTraderProfile, insertGeneratedQuote } from './lib/db.js';
import { formatTraderContext } from './lib/trader-context.js';
import { VALID_TRADES, VALID_TONES } from './lib/constants.js';

const OTHER_OPTION = 'Other';

function isOtherSelected(value) {
  return Array.isArray(value) ? value.includes(OTHER_OPTION) : value === OTHER_OPTION;
}

// Terminal-specific ask_user transport, supplied to the agent via
// toolContext.askUser — see tools/ask-user.js for why this lives here
// rather than being imported directly by the tool. When the model supplies
// `choices`, each group becomes an inquirer `list` (radio/OR) or `checkbox`
// (AND) prompt with an always-appended "Other" option (revealing a free-text
// follow-up), plus a free-text notes prompt — answers are combined into the
// single string the model expects back.
async function promptForAnswer(question, context, choices) {
  if (context) console.log(chalk.gray(context));

  if (Array.isArray(choices) && choices.length) {
    console.log(chalk.cyan.bold(question));
    const prompts = [];
    choices.forEach((group, i) => {
      prompts.push({
        type: group.type === 'checkbox' ? 'checkbox' : 'list',
        name: `choice_${i}`,
        message: group.label || 'Select an option:',
        choices: [...group.options, OTHER_OPTION],
      });
      prompts.push({
        type: 'input',
        name: `choice_${i}_other`,
        message: `Please specify (${group.label || 'other'}):`,
        when: (answers) => isOtherSelected(answers[`choice_${i}`]),
      });
    });
    prompts.push({ type: 'input', name: 'notes', message: 'Additional notes or comments (optional):' });

    const result = await inquirer.prompt(prompts);
    const parts = choices.map((group, i) => {
      let value = result[`choice_${i}`];
      const custom = result[`choice_${i}_other`];
      if (custom !== undefined) {
        const customValue = custom.trim() || OTHER_OPTION;
        value = Array.isArray(value) ? value.map((v) => (v === OTHER_OPTION ? customValue : v)) : customValue;
      }
      const prefix = group.label ? `${group.label}: ` : '';
      return prefix + (Array.isArray(value) ? value.join(', ') : value);
    });
    if (result.notes?.trim()) parts.push(`Notes: ${result.notes.trim()}`);
    return parts.join('. ');
  }

  const { answer } = await inquirer.prompt([{ type: 'input', name: 'answer', message: question }]);
  return answer;
}

// Format the initial message for the agent
function formatToolInput(toolName, input) {
  switch (toolName) {
    case 'ask_user':
      return chalk.gray(`   "${input?.question ?? ''}"`);
    case 'identify_materials': {
      const desc = input?.job_description ?? '';
      return chalk.gray(
        `   trade=${input?.trade ?? ''}, description="${desc.slice(0, 60)}${desc.length > 60 ? '...' : ''}"`,
      );
    }
    case 'draft_section':
      return chalk.gray(`   section=${input?.section ?? ''}`);
    case 'save_quote':
      return chalk.gray(`   (saving all drafted sections)`);
    default:
      return chalk.gray(`   ${JSON.stringify(input).slice(0, 80)}`);
  }
}

function formatToolResult(toolName, result) {
  if (result?.error) {
    return chalk.red(`   Error: ${result.message ?? 'unknown error'}`);
  }
  switch (toolName) {
    case 'ask_user':
      return chalk.green(`   Answer: "${result?.answer ?? ''}"`);
    case 'identify_materials': {
      const names = (result?.materials || []).map((m) => m.name).join(', ');
      return chalk.green(
        `   Found ${result?.materials?.length ?? 0} materials: ${names}`,
      );
    }
    case 'draft_section':
      return chalk.green(
        `   Section "${result?.section ?? ''}" drafted (${result?.words ?? 0} words)`,
      );
    case 'save_quote':
      if (result?.success && result.file_written) {
        return chalk.green(`   Saved (${result.filename})`);
      }
      if (result?.success) {
        return chalk.yellow(`   Quote assembled but not written to disk (${result.char_count} chars)`);
      }
      return chalk.red(`   Failed to save`);
    default:
      return chalk.green(`   ${JSON.stringify(result).slice(0, 100)}`);
  }
}

async function runQuoteCommand(argv) {
  // Job description comes from whatever positional arguments are left over.
  const jobDescription = argv._.join(' ').trim();

  if (!jobDescription) {
    console.error(
      chalk.red('Error: job description is required as a positional argument'),
    );
    console.error(
      chalk.gray(
        '  node qf.js --trade=electrician --tone=professional "Replace consumer unit..."',
      ),
    );
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(chalk.red('Error: ANTHROPIC_API_KEY is not set'));
    console.error(chalk.gray('  Copy .env.example to .env and add your key'));
    process.exit(1);
  }

  const trade = argv.trade;
  const tone = argv.tone;

  // Header
  console.log();
  console.log(chalk.bold('🛠  QuoteFetch Agent'));
  console.log(chalk.gray('─────────────────────────────────────────'));
  console.log(chalk.cyan('Trade: ') + chalk.white(trade));
  console.log(chalk.cyan('Tone:  ') + chalk.white(tone));
  console.log(chalk.cyan('Job:   ') + chalk.white(jobDescription));
  console.log(chalk.gray('─────────────────────────────────────────'));
  console.log();

  const initialMessage = buildInitialMessage({ trade, tone, jobDescription });

  // Loaded once per run and threaded through to the tools that need it
  // (draft_section, save_quote) via runAgent's toolContext — not re-read
  // from the DB inside each tool.
  const traderProfile = await getTraderProfile();
  const traderContext = formatTraderContext(traderProfile);
  const systemPrompt = traderContext ? `${SYSTEM_PROMPT}\n\n${traderContext}` : SYSTEM_PROMPT;

  let spinner = null;
  const toolCallLog = [];

  function onStep(step) {
    switch (step.type) {
      case 'turn_start':
        console.log(chalk.yellow.bold(`🔄 Turn ${step.turn}`));
        break;
      case 'api_start':
        spinner = ora({ text: chalk.gray('Thinking…'), color: 'cyan' }).start();
        break;
      case 'api_end':
        spinner?.stop();
        spinner = null;
        break;
      case 'usage': {
        const u = step.usage;
        const read = u.cache_read_input_tokens ?? 0;
        const created = u.cache_creation_input_tokens ?? 0;
        console.log(
          chalk.gray(
            `   tokens: in=${u.input_tokens} cache_read=${read} cache_write=${created} out=${u.output_tokens}`,
          ),
        );
        break;
      }
      case 'tool_call':
        console.log(chalk.cyan.bold(`🔧 ${step.tool}`));
        console.log(formatToolInput(step.tool, step.input));
        toolCallLog.push({ type: 'tool_call', tool: step.tool, input: step.input });
        break;
      case 'tool_result':
        console.log(formatToolResult(step.tool, step.result));
        console.log();
        toolCallLog.push({ type: 'tool_result', tool: step.tool, result: step.result });
        break;
      case 'final_answer':
        console.log(chalk.gray('─────────────────────────────────────────'));
        console.log(chalk.white.bold('💬 ' + step.text));
        console.log();
        break;
    }
  }

  // trade/tone/jobDescription are known once for the whole run — supplied
  // here so identify_materials/draft_section/save_quote don't need the model
  // to retype them on every call. sectionStore accumulates drafted section
  // text the same way; savedQuote is filled in by save_quote.
  const toolContext = { traderProfile, askUser: promptForAnswer, trade, tone, jobDescription, sectionStore: {} };

  try {
    const { turns } = await runAgent({
      systemPrompt,
      tools: TOOL_DEFINITIONS,
      executeTool,
      initialMessage,
      maxTurns: 20,
      onStep,
      toolContext,
    });

    if (toolContext.savedQuote) {
      await insertGeneratedQuote({
        job_description: jobDescription,
        output_path: toolContext.savedQuote.file_path ?? '',
        content: toolContext.savedQuote.content,
        tool_call_log: toolCallLog,
      });
    }

    console.log(
      chalk.gray(`Completed in ${turns} turn${turns === 1 ? '' : 's'}.`),
    );
  } catch (err) {
    console.error();
    console.error(chalk.red.bold('Error: ' + err.message));
    process.exit(1);
  }
}

await yargs(hideBin(process.argv))
  .usage('Usage: node qf.js --trade=<trade> --tone=<tone> "<job description>"')
  .command(
    '$0',
    'Generate a professional quote from a job description',
    (y) =>
      y
        .option('trade', {
          type: 'string',
          demandOption: true,
          choices: VALID_TRADES,
          description: `Trade category. Valid: ${VALID_TRADES.join(', ')}`,
        })
        .option('tone', {
          type: 'string',
          demandOption: true,
          choices: VALID_TONES,
          description: `Quote tone. Valid: ${VALID_TONES.join(', ')}`,
        })
        .example(
          'node qf.js --trade=electrician --tone=professional "Replace consumer unit, 8 MCBs, surge protection"',
        ),
    runQuoteCommand,
  )
  .command(
    'profile',
    'View or edit your trader profile (business name, contact details, rate, T&Cs)',
    () => {},
    runProfileCommand,
  )
  .help()
  .parseAsync();
