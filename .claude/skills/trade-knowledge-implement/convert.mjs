#!/usr/bin/env node
// Checks the YAML in docs/trade-research/<slug>.md against the pack rules and, with --write,
// generates lib/trade-knowledge/<slug>.js. Usage: node convert.mjs <slug> [--write] [--force]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import { VALID_TRADES, tradeLabel } from '../../../lib/constants.js';
import { keyQuestionsFor } from '../../../lib/key-questions.js';
import { isRejectedLabel } from '../../../lib/material-rules.js';
import { isNearDuplicateQuestion } from '../../../lib/propose-materials.js';

// Same wording packs.test.js rejects, plus prices: pack text reaches quote prompts.
const FORBIDDEN_WORDING = /part p|gas safe|bs ?7671|water regulations|complian|certif|building regs|wras|approved|£\s?\d/i;
const NEW_FIELDS = ['siteChecks', 'stages', 'customerPrep', 'handOffs', 'accessAndEquipment', 'photoFocus'];
const ENTRY_FIELDS = ['id', 'title', 'matches', 'skipKeyQuestions', 'questions', 'variants', 'assumptions', 'exclusions', 'pitfalls', ...NEW_FIELDS];

const [slug, ...flags] = process.argv.slice(2);
if (!slug || !VALID_TRADES.includes(slug)) {
  console.error(`Usage: node convert.mjs <slug> [--write] [--force]\nslug must be one of: ${VALID_TRADES.join(', ')}`);
  process.exit(2);
}
const write = flags.includes('--write');
const force = flags.includes('--force');
const source = `docs/trade-research/${slug}.md`;
if (!existsSync(source)) {
  console.error(`${source} not found. Put the research file there first.`);
  process.exit(2);
}

// The first ```yaml block under the given "## " heading, parsed; null when the section has none.
function yamlSection(markdown, heading) {
  const start = markdown.search(new RegExp(`^## ${heading}\\s*$`, 'm'));
  if (start === -1) return null;
  const rest = markdown.slice(start + 1);
  const end = rest.search(/^## /m);
  const block = (end === -1 ? rest : rest.slice(0, end)).match(/```ya?ml\n([\s\S]*?)```/);
  return block ? parse(block[1]) : null;
}

const markdown = readFileSync(source, 'utf8');
const problems = [];
const notes = [];
const problem = (where, message) => problems.push(`${where}: ${message}`);

let entries;
try {
  entries = yamlSection(markdown, 'Pack entries');
} catch (err) {
  console.error(`Pack entries YAML doesn't parse: ${err.message}`);
  process.exit(1);
}
if (!Array.isArray(entries) || !entries.length) {
  console.error('No pack entries found: expected a ```yaml list under "## Pack entries".');
  process.exit(1);
}

const keyQuestions = keyQuestionsFor(slug);
const keyTopics = new Set(keyQuestions.map((q) => q.topic));
const strings = (list) => Array.isArray(list) && list.length > 0 && list.every((s) => typeof s === 'string' && s.trim());

if (entries.length < 5 || entries.length > 8) notes.push(`${entries.length} jobs (the handover asks for 5–8)`);
const ids = new Set();
for (const [i, e] of entries.entries()) {
  const at = `entry ${i + 1}${e?.id ? ` (${e.id})` : ''}`;
  if (!e || typeof e !== 'object') { problem(at, 'not an object'); continue; }
  for (const key of Object.keys(e)) if (!ENTRY_FIELDS.includes(key) && key !== 'reviewed') problem(at, `unknown field "${key}"`);
  if (typeof e.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.id)) problem(at, 'id must be kebab-case');
  else if (ids.has(e.id)) problem(at, 'duplicate id');
  else ids.add(e.id);
  for (const field of ['title', 'matches']) if (typeof e[field] !== 'string' || !e[field].trim()) problem(at, `${field} is required`);
  for (const field of ['assumptions', 'exclusions', 'pitfalls']) if (!strings(e[field])) problem(at, `${field} needs at least one sentence`);

  for (const topic of e.skipKeyQuestions ?? []) if (!keyTopics.has(topic)) problem(at, `skipKeyQuestions "${topic}" isn't one of: ${[...keyTopics].join(', ')}`);
  if (new Set(e.skipKeyQuestions ?? []).size >= keyTopics.size) problem(at, 'skipKeyQuestions must leave at least one key question');

  if (!Array.isArray(e.questions) || !e.questions.length) problem(at, 'needs at least one question');
  for (const q of e.questions ?? []) {
    const qa = `${at} question "${q?.question ?? '?'}"`;
    if (typeof q?.topic !== 'string' || !q.topic.trim()) problem(qa, 'topic is required');
    else if (keyTopics.has(q.topic)) problem(qa, `topic "${q.topic}" is a key question`);
    if (typeof q?.question !== 'string' || !q.question.trim().endsWith('?')) problem(qa, 'must end with "?"');
    if (!Array.isArray(q?.options) || q.options.length < 2 || q.options.length > 5) problem(qa, 'needs 2–5 options');
    if ((q?.options ?? []).some((o) => /^(other|not sure)/i.test(String(o)))) problem(qa, 'no "Other" or "Not sure" options (the form adds them)');
    if ('askWhen' in (q ?? {}) && !String(q.askWhen ?? '').trim()) problem(qa, 'askWhen is empty');
    if (typeof q?.question === 'string' && isNearDuplicateQuestion(q.question, keyQuestions)) problem(qa, 'repeats a key question');
    for (const key of keyQuestions) {
      const shared = (q?.options ?? []).filter((o) => key.options.some((k) => k.toLowerCase() === String(o).toLowerCase()));
      if (shared.length >= 2) problem(qa, `shares options with key question "${key.question}"`);
    }
  }

  if (!Array.isArray(e.variants) || !e.variants.length) problem(at, 'needs at least one variant');
  for (const v of e.variants ?? []) {
    if (typeof v?.when !== 'string' || !v.when.trim()) problem(at, 'every variant needs "when"');
    if (!Array.isArray(v?.materials)) problem(at, `variant "${v?.when}" needs a materials list (it may be empty)`);
    for (const label of v?.materials ?? []) if (isRejectedLabel(String(label))) problem(at, `material "${label}" breaks the materials rules`);
  }

  const present = NEW_FIELDS.filter((f) => f in e);
  if (present.length) notes.push(`${e.id}: ${present.join(', ')} not written to the pack (no code reads them yet, see the handover 2.2 B)`);
}
for (const e of entries) {
  const hits = new Set([...JSON.stringify(e).matchAll(new RegExp(FORBIDDEN_WORDING, 'gi'))].map((m) => m[0]));
  if (hits.size) problem(`entry ${e?.id}`, `forbidden wording: ${[...hits].map((h) => `"${h}"`).join(', ')}`);
}

let profile = null;
let cases = null;
try { profile = yamlSection(markdown, 'Trade profile'); } catch (err) { problem('Trade profile', `YAML doesn't parse: ${err.message}`); }
try { cases = yamlSection(markdown, 'Eval cases'); } catch (err) { problem('Eval cases', `YAML doesn't parse: ${err.message}`); }
if (profile) notes.push('Trade profile found: not written (no code reads it yet, see the handover 2.2 C)');
if (!Array.isArray(cases) || cases.length < 8) problem('Eval cases', `needs at least 8 (found ${Array.isArray(cases) ? cases.length : 0})`);
for (const c of cases ?? []) {
  if (!c?.id || !c?.jobDescription || !c?.expect) problem(`eval case ${c?.id ?? '?'}`, 'needs id, jobDescription and expect');
  for (const topic of Object.keys(c?.keyAnswers ?? {})) if (!keyTopics.has(topic)) problem(`eval case ${c.id}`, `keyAnswers topic "${topic}" isn't a key question`);
}
if (!/^## Review record/m.test(markdown)) notes.push('No "## Review record" section: treat every entry as unreviewed');

console.log(`${tradeLabel(slug)}: ${entries.length} jobs, ${Array.isArray(cases) ? cases.length : 0} eval cases`);
for (const n of notes) console.log(`note: ${n}`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`- ${p}`);
  console.log('\nFix these in the research file (with the user\'s agreement) and run again. Nothing was written.');
  process.exit(1);
}
console.log('All pack rules pass.');
if (!write) process.exit(0);

// Writes the entries in the Route A shape: single quotes, trailing commas, reviewed always false.
const target = `lib/trade-knowledge/${slug}.js`;
if (existsSync(target) && !force) {
  console.error(`${target} already exists. Re-run with --force to replace it (check with the user first).`);
  process.exit(1);
}
const quote = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
function serialize(value, indent) {
  const pad = '  '.repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    if (value.every((v) => typeof v === 'string') && value.join(', ').length < 60) return `[${value.map(quote).join(', ')}]`;
    return `[\n${value.map((v) => `${pad}  ${serialize(v, indent + 1)},`).join('\n')}\n${pad}]`;
  }
  if (value && typeof value === 'object') {
    return `{\n${Object.entries(value).map(([k, v]) => `${pad}  ${/^[a-z][a-zA-Z0-9]*$/.test(k) ? k : quote(k)}: ${serialize(v, indent + 1)},`).join('\n')}\n${pad}}`;
  }
  return typeof value === 'string' ? quote(value) : JSON.stringify(value);
}
const ordered = entries.map((e) => {
  const out = { id: e.id, title: e.title, matches: e.matches, reviewed: false };
  if (e.skipKeyQuestions?.length) out.skipKeyQuestions = e.skipKeyQuestions;
  for (const field of ['questions', 'variants', 'assumptions', 'exclusions', 'pitfalls']) out[field] = e[field];
  return out;
});
const exportName = `${slug.replace(/-/g, '_').toUpperCase()}_JOBS`;
writeFileSync(
  target,
  `// Common ${tradeLabel(slug).toLowerCase()} jobs, converted from docs/trade-research/${slug}.md. Each entry stays out
// of production until a person checks it and sets reviewed: true (see ./index.js).
export const ${exportName} = ${serialize(ordered, 0)};
`,
);
console.log(`Wrote ${target} (export ${exportName}). Register it in JOBS_BY_TRADE next.`);
