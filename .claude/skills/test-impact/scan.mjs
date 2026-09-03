#!/usr/bin/env node
// Scans the QuoteFetch repo for uncommitted changes, builds a reverse
// import graph across its .js/.mjs files, and reports which test files are
// affected (directly or transitively) by each changed file — plus which
// changed files have no reachable test coverage at all. Detect-and-report
// only: this script never edits test code itself.

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');

const EXCLUDED_DIRS = new Set(['node_modules', '.next', '.git', 'output', 'data', '.claude']);
const CONFIG_FILES = new Set(['vitest.config.js', 'vitest.setup.js', 'package.json']);
const IMPORT_RE = /(?:import\s+(?:[\s\S]*?\s+from\s+)?|export\s+(?:[\s\S]*?\s+from\s+)?)['"](\.[^'"]+)['"]/g;
const DYNAMIC_IMPORT_RE = /import\(\s*['"](\.[^'"]+)['"]\s*\)/g;

function toRepoRelative(absPath) {
  return relative(REPO_ROOT, absPath).split('\\').join('/');
}

function walkJsFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkJsFiles(full, out);
    } else if (entry.endsWith('.js') || entry.endsWith('.mjs')) {
      out.push(full);
    }
  }
  return out;
}

function resolveImport(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  for (const candidate of [base, `${base}.js`, `${base}.mjs`, join(base, 'index.js')]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // try next candidate
    }
  }
  return null;
}

function getChangedFiles() {
  const output = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf8' });
  const files = [];
  for (const line of output.split('\n')) {
    if (!line.trim()) continue;
    const status = line.slice(0, 2);
    let filePath = line.slice(3);
    if (filePath.includes(' -> ')) filePath = filePath.split(' -> ')[1];
    filePath = filePath.replace(/^"|"$/g, '');
    if (status.includes('D')) continue; // deleted files have nothing left to test
    if (!filePath.endsWith('.js') && !filePath.endsWith('.mjs')) continue;
    if (filePath.split('/').some((part) => EXCLUDED_DIRS.has(part))) continue;
    files.push(resolve(REPO_ROOT, filePath));
  }
  return files;
}

function buildReverseGraph(allFiles) {
  const reverse = new Map(); // absPath -> Set(absPath that imports it)
  for (const file of allFiles) reverse.set(file, new Set());

  for (const file of allFiles) {
    const content = readFileSync(file, 'utf8');
    const specifiers = new Set();
    for (const re of [IMPORT_RE, DYNAMIC_IMPORT_RE]) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(content))) specifiers.add(match[1]);
    }
    for (const spec of specifiers) {
      const resolved = resolveImport(file, spec);
      if (resolved && reverse.has(resolved)) {
        reverse.get(resolved).add(file);
      }
    }
  }
  return reverse;
}

function findAffectedTests(changedFile, reverseGraph) {
  if (changedFile.endsWith('.test.js')) return new Set([changedFile]);

  const visited = new Set([changedFile]);
  const queue = [changedFile];
  const tests = new Set();

  while (queue.length) {
    const current = queue.shift();
    for (const importer of reverseGraph.get(current) ?? []) {
      if (importer.endsWith('.test.js')) tests.add(importer);
      if (!visited.has(importer)) {
        visited.add(importer);
        queue.push(importer);
      }
    }
  }
  return tests;
}

function runTests(testFiles) {
  if (testFiles.length === 0) return { ran: false };
  const relPaths = testFiles.map(toRepoRelative);
  try {
    const output = execSync(`npx vitest run ${relPaths.map((p) => `"${p}"`).join(' ')}`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { ran: true, passed: true, output };
  } catch (err) {
    return { ran: true, passed: false, output: err.stdout?.toString() ?? err.message };
  }
}

function main() {
  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    console.log('No changed .js/.mjs files in the working tree.');
    return;
  }

  const allFiles = walkJsFiles(REPO_ROOT);
  const reverseGraph = buildReverseGraph(allFiles);

  const changedConfigFiles = changedFiles.filter((f) => CONFIG_FILES.has(toRepoRelative(f)));
  const changedSourceFiles = changedFiles.filter((f) => !CONFIG_FILES.has(toRepoRelative(f)));

  const perFileTests = new Map();
  const noCoverage = [];
  const allAffectedTests = new Set();

  for (const file of changedSourceFiles) {
    const tests = findAffectedTests(file, reverseGraph);
    perFileTests.set(file, tests);
    if (tests.size === 0) noCoverage.push(file);
    for (const t of tests) allAffectedTests.add(t);
  }

  if (changedConfigFiles.length > 0) {
    for (const file of allFiles) {
      if (file.endsWith('.test.js')) allAffectedTests.add(file);
    }
  }

  console.log('=== Test impact report ===\n');

  if (changedConfigFiles.length > 0) {
    console.log('Config files changed — treating the full test suite as affected:');
    for (const f of changedConfigFiles) console.log(`  - ${toRepoRelative(f)}`);
    console.log();
  }

  for (const [file, tests] of perFileTests) {
    console.log(toRepoRelative(file));
    if (tests.size === 0) {
      console.log('  -> NO TEST COVERAGE DETECTED');
    } else {
      for (const t of tests) console.log(`  -> ${toRepoRelative(t)}`);
    }
  }

  if (noCoverage.length > 0) {
    console.log('\n--- Changed files with no reachable test coverage ---');
    for (const f of noCoverage) console.log(`  - ${toRepoRelative(f)}`);
  }

  if (allAffectedTests.size > 0) {
    console.log(`\n--- Running ${allAffectedTests.size} affected test file(s) ---`);
    const result = runTests([...allAffectedTests]);
    console.log(result.output);
    console.log(result.passed ? '\nAffected tests: PASSING' : '\nAffected tests: FAILING (see output above)');
  } else {
    console.log('\nNo existing tests are reachable from these changes.');
  }
}

main();
