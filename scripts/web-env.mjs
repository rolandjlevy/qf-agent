#!/usr/bin/env node
// This devcontainer's remoteEnv pre-sets ANTHROPIC_API_KEY/CLAUDE_MODEL/
// DATABASE_URL as an empty string when the host has no value. Next's own
// .env loader treats an existing-but-empty var as "already set" and won't
// fall through to .env for it — the same bug class qf.js already works
// around for the CLI. Clear the empty ones here, before spawning `next`,
// so its loader can pick up the real values from .env.
for (const key of ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL', 'DATABASE_URL']) {
  if (process.env[key] === '') delete process.env[key];
}

const { spawn } = await import('child_process');
const nextBin = new URL('../node_modules/.bin/next', import.meta.url).pathname;
const args = process.argv.slice(2);

const child = spawn(nextBin, args, { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 0));
