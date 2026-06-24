# QuoteFetch Agent — Build Prompt

> **Usage:** Paste this into Claude Code inside an empty project directory.
> Phase 1 is CLI-only. The web frontend comes later. The point of this build
> is to learn what QuoteFetch looks like as a true agent — not a 3-stage
> workflow with API calls.

---

```
You are helping me rebuild QuoteFetch from scratch — this time as an
agentic CLI tool, not a web app with hardcoded flow stages.

I am a senior full-stack engineer. I have built QuoteFetch once before
as a three-stage Next.js app (analyse → generate → enrich). That version
hardcodes the sequence: Claude is called three separate times with
deterministic logic in between. It works, but it's not really an agent —
it's a chained workflow.

This rebuild is a learning exercise as much as a product. I want to see
how the SAME problem space looks when Claude drives the sequence using
tools, rather than me orchestrating it. I have already built one agent
(CSV Agent — a CLI with read_csv, analyse, write_report tools) so I
understand the loop pattern.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOURCE OF TRUTH — READ BEFORE GENERATING ANY FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A file called QF_KNOWLEDGE_BANK.md exists in the /prompts directory. It was
produced by auditing the previous (workflow-based) version of
QuoteFetch and extracting only the durable knowledge that survives
the architectural rebuild.

READ IT FIRST. Use it as the authoritative source for:

  ✓ Trade list (exact strings used in the original)
  ✓ Tone definitions and how each tone changes output
  ✓ Disclaimer text (legally significant — preserve verbatim)
  ✓ Section drafting prompts (introduction, scope, etc.)
  ✓ Material taxonomy and common materials per trade
  ✓ Validation rules and known edge cases
  ✓ User-facing copy and terminology

DO NOT use it as a blueprint for the application structure. The
knowledge bank contains CONTENT, not ARCHITECTURE. Specifically:

  ✗ Do not replicate the three-stage workflow (analyze → generate
    → enrich). That was the workflow we are explicitly escaping.
  ✗ Do not create API routes, Next.js pages, or web infrastructure.
    Phase 1 is CLI-only.
  ✗ Do not import any code or files from the original project.
  ✗ Do not use Stage 1 / Stage 2 / Stage 3 framing anywhere. The
    agent decides the sequence.

If a section of the knowledge bank reads like orchestration logic
(stages, endpoints, hardcoded flow), ignore it — that's the workflow
showing through. The agent loop replaces all of that.

If QF_KNOWLEDGE_BANK.md is NOT present in the /prompts directory, stop and
ask before proceeding — I want the rebuild grounded in the hard-won
knowledge from the original, not reinvented from scratch.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 SCOPE — CLI ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No frontend. No database. No auth. No deployment. A Node.js CLI that
takes a job description on the command line and produces a complete
quote in the terminal, using an agent loop with tools.

Example usage:

  node qf.js --trade=electrician --tone=professional \
    "Replace consumer unit in 3-bed semi, including 8 new MCBs and surge protection"

The agent:
  1. Reads the job description
  2. Decides whether it needs more details (asks the user in the CLI
     if so, or proceeds if not)
  3. Decides what materials are likely needed
  4. Looks up real prices for those materials
  5. Assembles the quote sections
  6. Outputs the full quote to stdout (and optionally saves to a file)

The user watches the agent decide what to do, step by step, in the
terminal — same observability pattern as CSV Agent.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT'S DIFFERENT FROM THE ORIGINAL QUOTEFETCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Original (three-stage workflow):

  Stage 1 (form)   → Stage 2 (analyze endpoint) → Stage 3 (generate
  endpoint) → async (enrich endpoint with scraper)

  Hardcoded order. Three Claude calls. Code in between deciding
  what happens next. This is a workflow, not an agent.

New (agentic):

  One CLI invocation → agent loop → Claude decides whether to ask
  the user, look up materials, search prices, draft sections, or
  finish. Could take 2 turns for a trivial job or 8 turns for a
  complex one.

The point: same problem, completely different architecture. The agent
might decide to skip follow-up questions if the job description is
detailed enough. It might decide to look up prices BEFORE drafting
sections (because knowing the material cost changes how the scope is
described). It might decide to ask the user a clarifying question
mid-flow. None of that is hardcoded.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  qf-agent/
  ├── qf.js                    ← CLI entry: parse args, run agent loop
  ├── agent.js                 ← Pure agent loop (no QF-specific logic)
  ├── tools/
  │   ├── index.js             ← Exports TOOL_DEFINITIONS + executeTool
  │   ├── ask-user.js          ← Prompt the user for more info in CLI
  │   ├── identify-materials.js← Claude-powered: extract material list
  │   ├── lookup-price.js      ← Mock UK supplier price lookup
  │   ├── draft-section.js     ← Generate a quote section (intro, scope, etc.)
  │   └── save-quote.js        ← Write final quote to a markdown file
  ├── prompts/
  │   └── system.js            ← The agent's system prompt
  ├── data/
  │   └── sample-prices.json   ← Mock price database for Phase 1
  ├── output/                   ← Generated quotes saved here
  ├── package.json
  ├── .env.example
  ├── .gitignore
  └── README.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @anthropic-ai/sdk
  dotenv
  yargs              ← CLI arg parsing
  inquirer           ← Interactive user prompts in the terminal
  chalk              ← Coloured terminal output for readability

No Playwright, no Prisma, no Next.js, no Tailwind. Phase 1 is
deliberately minimal — Playwright comes back in Phase 3 (real
scraping). Database comes back in Phase 4 (if at all — agents work
fine without one for a CLI).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENVIRONMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ANTHROPIC_API_KEY=sk-ant-xxx
  CLAUDE_MODEL=claude-sonnet-4-6  (optional, defaults to this)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE FIVE TOOLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The agent has exactly five tools. It chooses which to call and in
what order. You do NOT hardcode the sequence.

TOOL 1: ask_user
  Purpose: Get more information from the user mid-flow
  Input: { question: string, context?: string }
  Returns: { answer: string }
  Implementation: Uses inquirer to prompt the user in the terminal
  The agent uses this ONLY when the job description is genuinely
  too thin to proceed — not as a default first step.

TOOL 2: identify_materials
  Purpose: From a job description, extract the likely materials needed
  Input: { trade: string, job_description: string }
  Returns: { materials: Array<{ name: string, quantity?: string, notes?: string }> }
  Implementation: A SUB-LLM call to Claude that returns structured JSON.
  This is the "agent calling another LLM as a tool" pattern — the
  outer agent decides WHEN to identify materials, the inner LLM
  decides WHAT they are.

TOOL 3: lookup_price
  Purpose: Get a current UK price for a single material
  Input: { material_name: string }
  Returns: { material: string, prices: Array<{ supplier: string, price: number, sku?: string }>, cheapest: number }
  Implementation: For Phase 1, reads from data/sample-prices.json
  with simple fuzzy matching on material name. This simulates the
  real Playwright scraper without the complexity. The agent doesn't
  know or care that it's a mock — that's the point of the tool
  abstraction.

TOOL 4: draft_section
  Purpose: Generate one section of the quote
  Input: { section: 'introduction' | 'scope' | 'materials' | 'assumptions' | 'exclusions' | 'next_steps' | 'disclaimers', context: object }
  Returns: { section: string, content: string }
  Implementation: A SUB-LLM call to Claude with a section-specific
  prompt. Context contains: trade, tone, job description, identified
  materials with prices, and any other info gathered so far.
  Materials section MUST use real prices if available, "[Price TBC]"
  if not. Quote text must paste cleanly into email — no markdown
  tables, no fenced code blocks.

TOOL 5: save_quote
  Purpose: Write the assembled quote to a markdown file
  Input: { sections: object, filename?: string }
  Returns: { success: boolean, file_path: string }
  Implementation: Combines sections in standard order, saves to
  output/ directory with timestamped filename if none provided.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE AGENT LOOP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

agent.js implements the pattern. Same shape as CSV Agent — the
QF-specific behaviour lives in the tools and the system prompt,
not the loop.

```javascript
// agent.js — generic, reusable
export async function runAgent({
  systemPrompt,
  tools,
  executeTool,
  initialMessage,
  maxTurns = 15,  // higher than CSV Agent — QF flow is longer
  onStep,         // callback for logging / UI hooks
}) {
  const messages = [{ role: 'user', content: initialMessage }]

  for (let turn = 0; turn < maxTurns; turn++) {
    onStep({ type: 'turn_start', turn: turn + 1 })

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    })

    if (response.stop_reason === 'tool_use') {
      const toolBlock = response.content.find(b => b.type === 'tool_use')
      onStep({ type: 'tool_call', tool: toolBlock.name, input: toolBlock.input })

      const result = await executeTool(toolBlock.name, toolBlock.input)
      onStep({ type: 'tool_result', tool: toolBlock.name, result })

      messages.push({ role: 'assistant', content: response.content })
      messages.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: toolBlock.id,
                    content: JSON.stringify(result) }]
      })
    } else {
      const text = response.content.find(b => b.type === 'text')?.text
      onStep({ type: 'final_answer', text })
      return { answer: text, turns: turn + 1, messages }
    }
  }

  throw new Error(`Agent exceeded max turns (${maxTurns})`)
}
```

By extracting the loop into agent.js with no QF-specific logic,
the same loop can be reused for any future agent — including the
web frontend in a later phase.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYSTEM PROMPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
You are QuoteFetch, an AI quoting assistant for UK tradespeople.
You help sole traders and small trade businesses turn rough job
descriptions into professional written quotes.

Your job is to produce a complete, professional, copy-paste-ready
quote document. You have tools to help you. You decide which tools
to call and in what order. Think before you act.

YOUR PROCESS (guidance, not script):
- Read the job description carefully. If it's clear and detailed
  enough, do not ask follow-up questions — proceed.
- If the description is genuinely vague (missing critical info
  like quantity, scope, or property type), use ask_user to get
  ONE specific question answered. Don't pepper the user with
  questions — one or two max, only if essential.
- Identify the materials needed for the job using identify_materials.
- Look up current UK prices for each material using lookup_price.
- Draft each quote section using draft_section, passing it
  everything you've gathered so far as context.
- Save the final quote using save_quote.

QUOTE STANDARDS:
- Currency: GBP (£)
- Tone: matches what the user specified (professional, friendly,
  formal, casual)
- Format: clean prose, no markdown tables, no fenced code blocks.
  Must paste cleanly into an email client.
- Prices: only use real prices from lookup_price. Never invent
  prices. If a material couldn't be found, write "[Price TBC]".
- Disclaimers: every quote ends with a disclaimer that prices are
  indicative, subject to site inspection, and not a guaranteed
  fixed cost.

WHAT YOU NEVER DO:
- Make up material prices
- Claim regulatory compliance (Part P, gas safe, etc.)
- Guarantee outcomes or completion times
- Add VAT calculations unless explicitly asked
- Use markdown tables in quote sections (use prose lists instead)

When you have produced and saved the complete quote, respond with
a one-sentence summary of what you produced and where it was saved.
Do not repeat the entire quote in your final message.
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOL DEFINITIONS (CLAUDE API FORMAT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use the Anthropic tool-use format. Schema example for one tool —
follow the same pattern for all five:

```javascript
{
  name: 'identify_materials',
  description: 'Analyse a trade job description and return the list of materials likely needed. Returns structured JSON with material names, quantities where determinable, and notes. Use this BEFORE drafting the materials section of the quote.',
  input_schema: {
    type: 'object',
    properties: {
      trade: {
        type: 'string',
        description: 'The trade (e.g. electrician, plumber, builder)'
      },
      job_description: {
        type: 'string',
        description: 'The full job description, including any follow-up answers gathered'
      }
    },
    required: ['trade', 'job_description']
  }
}
```

Write all five tool definitions with descriptions detailed enough
that Claude can choose between them correctly without examples.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SAMPLE DATA — data/sample-prices.json
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate the file with realistic but PLACEHOLDER prices. I will
manually update the 10-15 most common items with real prices from
Screwfix/Toolstation/B&Q after you scaffold the project.

To make this easy, do TWO things:

1. Mark every price entry with a "verified" boolean (default false)
   so it's obvious at a glance which entries I've personally checked
   vs which are still placeholders.

2. Sort the materials array so the most commonly-quoted items
   appear first (consumer units, MCBs, copper pipe, paint, plaster-
   board) — these are the ones I'll edit first.

Format:

```json
{
  "_note": "Prices marked verified:false are placeholder estimates. Verify against live supplier listings before relying on output.",
  "last_updated": "2026-06-24",
  "materials": [
    {
      "name": "Consumer unit 10-way RCBO",
      "aliases": ["consumer unit", "fuseboard", "fuse box"],
      "trade": "electrician",
      "prices": [
        { "supplier": "Screwfix", "price": 189.99, "sku": "12345", "verified": false },
        { "supplier": "Toolstation", "price": 184.50, "sku": "67890", "verified": false },
        { "supplier": "B&Q", "price": 199.00, "sku": "11223", "verified": false }
      ]
    }
    // ...
  ]
}
```

Cover at minimum (in priority order — top of list = edit first):
1. Consumer units (10-way, 16-way RCBO)
2. MCBs (Type B 6A, 16A, 32A)
3. Copper pipe (15mm × 3m, 22mm × 3m)
4. Push-fit fittings (15mm tee, 22mm elbow)
5. Paint (5L white emulsion, 10L white emulsion, 5L magnolia)
6. Plasterboard (12.5mm × 1.2 × 2.4m)
7. Plaster (25kg bonding, 25kg multi-finish)
8. Cable (2.5mm twin & earth, 100m)
9. Sockets (single, double white)
10. Light switches (1-gang, 2-gang)
Then add ~30 more across timber, insulation, screws, filler, etc.

After scaffolding completes, tell me:
"The mock price file is ready. Open data/sample-prices.json and
update the top 10-15 items with current Screwfix/Toolstation/B&Q
prices. Set verified:true for entries you've checked."

This nudges me to do the manual update before testing, rather than
discovering the demo looks janky because every price is fake.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPTIONAL: PRICE STATUS IN AGENT OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The lookup_price tool should include the verified flag in its
response:

```json
{
  "material": "Consumer unit 10-way RCBO",
  "cheapest": 184.50,
  "supplier": "Toolstation",
  "verified": true,
  "all_prices": [...]
}
```

And the agent's system prompt should be updated with one extra rule:

"If a material price is unverified (verified:false in the lookup
result), include a small note in the materials section of the quote
indicating the price is indicative only and should be confirmed
before sending."

This way the agent automatically handles mixed verified/unverified
data correctly — without you having to remember which is which.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONSOLE OUTPUT — WHAT I SHOULD SEE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use chalk for colour. The user should see the agent's reasoning
clearly as it works.

  🛠  QuoteFetch Agent
  ─────────────────────
  Trade: electrician
  Tone: professional
  Job: Replace consumer unit in 3-bed semi, 8 MCBs, surge protection

  🔄 Turn 1
  🔧 identify_materials
     trade=electrician, description="Replace consumer unit..."
  ✅ Found 6 materials: Consumer unit 10-way RCBO, MCB Type B 6A (×4),
     MCB Type B 16A (×2), Surge protection device, Earth cable...

  🔄 Turn 2
  🔧 lookup_price
     material_name="Consumer unit 10-way RCBO"
  ✅ Cheapest: Toolstation £184.50 (also at Screwfix £189.99, B&Q £199.00)

  ... (continues looking up each material) ...

  🔄 Turn 8
  🔧 draft_section
     section=introduction
  ✅ Section drafted (412 characters)

  ... (drafts each section) ...

  🔄 Turn 14
  🔧 save_quote
     filename=undefined
  ✅ Saved to output/quote-2026-06-24-electrician-consumer-unit.md

  🔄 Turn 15
  💬 Quote complete. Saved to output/quote-2026-06-24-electrician-
     consumer-unit.md. Total materials cost: £487.23.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT NOT TO DO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Do not hardcode the tool sequence. The whole point is that
  Claude decides. If you find yourself writing if/else logic
  around tool calls in qf.js, stop and rethink.
- Do not bring in Playwright. Phase 1 uses sample-prices.json.
- Do not bring in a database. Output is just markdown files.
- Do not bring in Next.js. Phase 1 is CLI-only.
- Do not skip the chalk-coloured console output — watching the
  agent work is the entire learning experience.
- Do not use the three-stage flow from the original QuoteFetch.
  This is a clean rebuild around the agent pattern.
- Do not use LangChain, CrewAI, or any agent framework. Build
  the loop from scratch (same as CSV Agent).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUILD ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Scaffold — package.json, dependencies, file structure
2. Sample data — data/sample-prices.json (40-50 entries)
3. Tools — implement each tool in tools/, exporting from index.js
4. Agent loop — agent.js (generic, reusable)
5. CLI entry — qf.js with yargs arg parsing and chalk logging
6. Test with the example invocation above
7. README.md with example invocations and expected output

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST CASES TO RUN AFTER BUILDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each should produce a different sequence of tool calls — that's how
you verify the agent is actually deciding, not following a script.

Test 1 — Detailed job, no follow-up needed:
  node qf.js --trade=electrician --tone=professional \
    "Replace consumer unit in 3-bed semi, 8 MCBs, surge protection"

Test 2 — Vague job, agent should use ask_user once:
  node qf.js --trade=plumber --tone=friendly "Sort out my boiler"

Test 3 — Cosmetic/light materials job:
  node qf.js --trade=decorator --tone=casual \
    "Paint two bedrooms, white walls, white ceilings, magnolia"

Test 4 — Mixed trade requiring multiple material types:
  node qf.js --trade=builder --tone=formal \
    "Build a stud wall with door, 3m long, plasterboard both sides, including
     skim and one coat of mist paint"

After each, look at the turn count and which tools were called. They
should differ noticeably — that's the agent pattern working.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FUTURE PHASES (DO NOT BUILD THESE NOW)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For context only — so you don't accidentally pre-empt them:

  Phase 2 — Web frontend (Next.js, streaming agent feed UI similar
            to CSV Agent's web version)
  Phase 3 — Real Playwright scraper as a tool (replaces lookup_price
            mock — same tool interface, real implementation)
  Phase 4 — Optional: auth, database, quote history (only if needed —
            agents work fine stateless for a CLI)

The clean separation between agent loop, tools, and CLI is what makes
those phases easy. Tools are interchangeable — swap the mock for the
real scraper and nothing else changes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GENERATE ALL FILES NOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
