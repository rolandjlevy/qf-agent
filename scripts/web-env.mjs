#!/usr/bin/env node
// Mirrors the empty-string env workaround at the top of qf.js: this
// devcontainer's remoteEnv pre-sets ANTHROPIC_API_KEY/CLAUDE_MODEL to "" when
// the host has no value, and Next.js's own .env loader (unlike dotenv usage
// in qf.js) treats an existing-but-empty var as already set and never falls
// through to the real value in .env. Delete them here, before spawning next,
// so its loader picks up .env correctly.
for (const key of ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL']) {
  if (process.env[key] === '') delete process.env[key];
}

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const nextBin = join(__dirname, '../node_modules/.bin/next');
const args = process.argv.slice(2);

const child = spawn(nextBin, args, { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 0));
