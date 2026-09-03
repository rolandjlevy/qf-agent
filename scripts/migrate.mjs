#!/usr/bin/env node
import dotenv from 'dotenv'
dotenv.config()
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set — copy .env.example to .env and add your Neon connection string.')
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)
  const schema = readFileSync(join(__dirname, '../lib/schema.sql'), 'utf8')

  // Postgres has no multi-statement exec() over the HTTP driver — split the
  // schema file into individual statements and run them one at a time.
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  for (const statement of statements) {
    console.log(`Running: ${statement.split('\n')[0]}…`)
    await sql.query(statement)
  }

  console.log(`Migration complete — ${statements.length} statement(s) applied.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
