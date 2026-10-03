# Handover: building better trade knowledge packs

**For:** whoever builds the next round of trade knowledge, whether a developer, a researcher working with tradespeople, or an AI coding agent.
**Written:** 2026-10-03.
**Read first:** `docs/PHASE_3C_TRADE_KNOWLEDGE.md` (how the packs were designed, measured and reviewed) and the "Trade knowledge packs" and "Never-do rules" sections of `CLAUDE.md`.

Part 1 explains the goal and the current state. Part 2 is the specification. Part 3 is a prompt you can paste into Claude Code (or hand to a person) to build or deepen one trade at a time.

---

## Part 1: The goal and where things stand

### What we want

QuoteFetch drafts quotes for UK tradespeople. The quality of each quote depends on how well the app understands the trade: which questions a good tradesperson would ask, which materials the job really needs, what they would assume and leave out, what goes wrong in practice, and how they talk to customers.

The aim is to capture that knowledge properly for every trade. That covers materials, skills, qualifications, attitudes, customer needs, experience and the everyday realities of the work. The result should be quotes a working tradesperson would recognise as written by someone who knows the job.

### How the app uses trade knowledge today

A quote on `/quote/new` goes through these steps. Knowledge only helps where a step actually reads it.

| Step | What it does | Trade knowledge it reads |
|---|---|---|
| Key questions | 3–4 fixed questions per trade, on one page | `lib/key-questions.js`, minus a matched job's `skipKeyQuestions` |
| Photo analysis (optional) | One vision call over the trader's site photos | `PHOTO_FOCUS_BY_TRADE` in `lib/analyse-job-photos.js` |
| Phase A | Asks up to 2 job-specific questions, then proposes materials | The trade's whole pack (`formatJobsForPhaseA`): jobs, diagnostic questions, materials by variant, pitfalls |
| Materials review | The trader ticks, unticks or adds materials | Nothing; the choices are logged in `material_refinement_events` |
| Phase B | Drafts the quote's seven sections | The matched job's assumptions, exclusions and pitfalls (`formatJobForPhaseB`), used by the scope, assumptions and exclusions sections |
| Sample quotes and example jobs | First-use content on `/quote/new` and the homepage | `lib/sample-quotes.json`, `lib/example-jobs.js` |

### Current state

- **9 trades have packs:** plumber, bathroom fitter, electrician, carpenter, roofer, decorator, builder, gardener / landscaper and plasterer. They hold 5–8 jobs each, and every entry has been reviewed.
- **11 trades have none:** bricklayer, driveway specialist, fencer, flooring fitter, gas engineer, glazier, groundworker, handyman, kitchen fitter, tiler and tree surgeon.
- **Measured gains:** packs clearly improved bathroom fitter, electrician, plumber, decorator, builder, gardener and plasterer (eval ranges with and without the pack don't overlap).
  - Carpenter and roofer showed no measurable gain, because their baselines were already near the top. They need harder eval cases, not more content.
- **Prompt cost:** a pack adds about 1,800–3,100 tokens to every Phase A call and up to about 400 tokens to each Phase B section that uses it.

### What's missing

The packs are job-shaped. They say what to ask and buy for a known job, and stop there. Nothing yet covers:

- **How the trade works:** the stages of a job, who does what, the tools and equipment it needs, and how long things roughly take.
- **The tradesperson:** qualifications and registrations, experience levels, how they like to explain things to customers, and what they need from a quote.
- **The customer:** what customers usually worry about, misunderstand or forget to mention.
- **Hand-offs:** when the job needs another trade, such as a plumber passing gas work to a gas engineer, or a builder needing a structural engineer.
- **UK specifics:** regional words and product names, seasonal issues, older housing stock and common hidden surprises.
- **Evidence:** there's no record of where each piece of knowledge came from, and no interviews with real tradespeople.

---

## Part 2: Specification

### 2.1 Principles

1. **Only collect knowledge something will use.** Every field must be read by a named step in the table above, or be added together with the code that reads it. Background knowledge that nothing reads goes in the research notes (2.4), not the code.
2. **Real-world sources, checked by a working tradesperson.** Model-written content only repeats what the model already knows. It's a starting draft, never the answer.
3. **Measure before and after.** A change counts as an improvement only if the evals say so (2.6).
4. **The never-do rules win.** Richer knowledge must never lead to invented prices, compliance claims, markdown tables, or bundled or "X or Y" material lines (2.5).
5. **Mind the prompt budget.** The whole pack goes into every Phase A call. Keep each trade's Phase A block under about 3,500 tokens; if it would grow past that, change how the pack is selected (2.3) rather than cutting quality.

### 2.2 The knowledge to capture

#### A. Per job: deepen the existing fields

These already exist (see the schema in `docs/PHASE_3C_TRADE_KNOWLEDGE.md`) and are read today. Make them more complete and more accurate.

| Field | What good looks like |
|---|---|
| `matches` | The words customers and traders really use, including UK and regional terms (e.g. "fuse box", "consumer unit", "trip switch keeps going") |
| `questions` | The 2–4 questions that split the job into its real variants. Each answer must change the materials, the scope or the assumptions. Use `askWhen` for questions that only matter for some variants |
| `variants` → `materials` | One specific product per line, with the size or spec a merchant would recognise ("Isolating valve 15mm"). These labels become Find prices search terms, so check they find real products at Screwfix, Toolstation or B&Q |
| `assumptions` | What a careful tradesperson states they're assuming, such as access, the condition of what's hidden, and who supplies what |
| `exclusions` | What's commonly left out and causes disputes if it isn't written down |
| `pitfalls` | What goes wrong on real jobs: seized parts, discontinued sizes, hidden damage, older properties |
| `skipKeyQuestions` | Trade key questions that never apply to this job |

#### B. Per job: new fields worth adding

Each new field is listed with the step that would read it. Add the field together with that code, its formatter and tests.

| New field | Content | Read by |
|---|---|---|
| `siteChecks` | What to look at or measure on a survey visit (e.g. "check the stopcock turns", "measure the opening at three heights") | Phase A (better questions), photo analysis (per-job photo focus) |
| `stages` | The job broken into its usual steps, in order | Phase B scope of work |
| `customerPrep` | What the customer needs to do or decide before work starts (clear the room, choose tiles, book a parking bay) | Phase B next steps |
| `handOffs` | Work this trade passes to another, and when (e.g. "gas appliance work goes to a gas engineer") | Phase B exclusions; Phase A (don't propose materials for another trade's work) |
| `accessAndEquipment` | Scaffold, towers, skips, plant hire. These are never material lines (the skip rules forbid hire costs), so they become assumptions or exclusions | Phase B assumptions and exclusions |
| `photoFocus` | What a photo of this particular job should show | Photo analysis, and the "Useful photos" hint on `/quote/new` |

#### C. Per trade: a new trade profile

Some knowledge belongs to the trade, not to any single job. Put it in one `TRADE_PROFILE` export per pack file, read by a new formatter.

| Section | Content | Read by |
|---|---|---|
| `vocabulary` | Trade terms and UK product names a customer might use differently, with what they mean | Phase A matching and questions; photo analysis |
| `customerConcerns` | What customers usually worry about or misunderstand (mess, noise, time off work, hidden costs) | Phase B introduction and assumptions, so the quote answers them up front |
| `commonOmissions` | What customers often forget to mention that changes the job | Phase A questions |
| `quoteHabits` | How experienced traders in this trade structure and word a quote (e.g. "always state the number of coats") | Phase B section prompts |
| `seasonal` | Weather and seasonal factors (frost and mortar, nesting season, exterior painting temperatures) | Phase B assumptions |
| `propertyAge` | What tends to be found in pre-1920, 1930s, 1960s–70s and new-build homes | Phase A questions; Phase B pitfalls |

#### D. Research only: not for prompts

The following matters for getting everything else right, but must **not** go into pack code or prompts. Most of it is either about the trader rather than the job, or would invite compliance claims. Record it in the research notes (2.4) so reviewers and future work can rely on it.

- **Qualifications, registrations and schemes** (e.g. Gas Safe, NICEIC, Part P, FENSA, CSCS, NVQ levels).
  - The trader states their own in the profile's `certifications` field, and Phase B may repeat that verbatim.
  - The packs must never mention them: `packs.test.js` rejects compliance wording, and the never-do rules forbid compliance claims.
- **Skills and experience levels:** what an apprentice, an improver and a time-served tradesperson can each take on. Use this to judge which jobs are common enough to cover.
- **Attitudes and working style:** how traders prefer to deal with customers, what they're proud of, what frustrates them about quoting.
  - This informs `quoteHabits` and tone. Don't copy it into the packs as it is.
- **Business realities:** sole trader or firm, day rates or fixed prices, how they buy materials, cash flow and deposits.
  - Useful context for product decisions. Never put any rates or prices into packs.
- **What they need from QuoteFetch:** the questions they always ask, the mistakes they see in other people's quotes, what would make them trust an AI-drafted quote.

### 2.3 Prompt-size strategy

Today Phase A receives the whole trade pack. With richer packs:

1. **First, try matching the job before Phase A**, as `matchJobByDescription` already does for key questions. When one job matches, send that job in full and only the titles of the others. Fall back to the full pack when nothing matches.
2. Keep Phase B as it is: only the matched job, plus the relevant parts of the trade profile.
3. After any change, measure Phase A token use and latency, and re-run the evals.

### 2.4 Research notes, one file per trade

Create `docs/trade-research/<trade-slug>.md` for every trade you work on. It holds the knowledge behind the pack, with sources, so a reviewer can check it and a later pass can build on it.

Suggested contents:

- **Sources:** each with a date, and which pack items it supports. For example, interviews (anonymised, by role only), merchant catalogue pages, manufacturer fitting guides, trade association consumer guides, and saved quotes.
- **Job list:** why each job was chosen (how often it's quoted, how often it goes wrong), and the jobs deliberately left out.
- **The research-only material** from 2.2 D.
- **Open questions** for the reviewer.
- **Review record:** who reviewed what, by role and years in the trade (no names), and what they changed.

### 2.5 Hard rules

These apply to everything that reaches pack code, and most are enforced by `lib/trade-knowledge/packs.test.js`:

- **No prices, rates or costs** of any kind, including "typical cost" or day rates.
- **No compliance or approval wording:** no "Part P", "Gas Safe", "BS 7671", "Water Regulations", "compliant", "certified", "Building Regs", "WRAS" or "approved". Describe practical facts instead ("gas pipework is handed to a gas engineer", not "must be done by a Gas Safe engineer").
- **Materials are single, specific products:** no "X or Y", no two items on one line, no service items (disposal, hire, labour) and no vague terms (sundries, consumables). `isRejectedLabel` (`lib/material-rules.js`) must pass.
- **Diagnostic questions** end with "?", have 2–5 options, never include "Other" or "Not sure" (the form adds those), and never repeat one of the trade's key questions in topic, wording or options.
- **UK English and UK products throughout:** metric sizes where the trade uses them, imperial where it still does (1/2" tap threads).
- **Plain words a customer understands:** this text can end up in a quote they read.
- **Trade slugs never change.** They're stored in the database (`VALID_TRADES` in `lib/constants.js`).
- **Nothing goes live unreviewed.** Every entry starts with `reviewed: false`, and only a working tradesperson's review sets it to `true`.

### 2.6 How quality is measured

Two eval runners already exist:

1. **The pack eval:** `npm run eval -- --trade=<slug> [--knowledge=off] [--runs=3]` (`scripts/eval.mjs`, cases in `evals/<slug>.cases.js`). It runs real Phase A rounds and the scope, assumptions and exclusions sections, and checks questions, materials, assumptions, exclusions, forbidden wording, re-asks and option lists.
2. **The quote-quality eval:** `npm run eval:quotes` (`scripts/eval-quotes.mjs`). It runs the full pipeline, with Claude answering as the trader, and scores every section 0–2.

For each trade:

- **At least 8 cases**, including one job the pack doesn't cover and **at least two hard ones**: unusual properties, discontinued parts, or jobs that need a hand-off.
- **Write each case's checks from real-world practice,** never from the pack's own wording. Otherwise the eval only measures whether the pack was copied.
- **Compare the mean of 3 runs with and without the pack.** Report the range across runs, as `docs/PHASE_3C_TRADE_KNOWLEDGE.md` does.
- **Done means:** the ranges don't overlap. Or, if the baseline is already near the ceiling, the harder cases show a gain.
- **Also run `npm run eval:quotes`**, and confirm no section score drops.
- **Cost:** evals call the real Anthropic API. A full trade run (3 runs with, 3 without) costs real credit, so run single cases (`--case=<id>`) while iterating.

### 2.7 Interview guide for tradespeople

Use this with working tradespeople, ideally two per trade with different experience levels. Record answers by role, never by name.

1. Which 10 jobs do you quote most often? Which ones lose you money or cause arguments?
2. For each of the top 5:
   - What do you need to know before you can price it?
   - What do customers usually leave out?
3. What do you always look at or measure when you visit?
4. Which materials do you nearly always need for each, and in what sizes? Where do you buy them?
5. What do you always write down as assumed or not included, and why?
6. What has gone wrong on a job that you now check for every time?
7. What do you hand over to another trade, and when?
8. What do customers worry about most? What do they misunderstand about your work?
9. How does age of property change the job (Victorian, 1930s, 1970s, new build)?
10. What would make you trust a quote drafted for you, and what would make you bin it?
11. What qualifications or registrations matter in your trade, and for which jobs? (Research notes only.)
12. What separates someone two years in from someone with twenty years' experience? (Research notes only.)

### 2.8 Order of work

1. **Gas engineer, kitchen fitter, tiler, handyman.**
   - Gas engineer is safety-critical and the most likely to tempt compliance wording, so it needs the most care in review.
   - Handyman is broad: cover its 8 most common small jobs rather than trying to cover everything.
2. **Bricklayer, groundworker, driveway specialist, fencer.**
3. **Flooring fitter, glazier, tree surgeon.**
   - For tree surgeon, cover Tree Preservation Orders and conservation areas as a pitfall or assumption. Its key questions deliberately don't ask about them.
4. **Deepen the existing 9:** add sections B and C, and harder eval cases for carpenter and roofer.

Re-check the order against real quote volumes first: `SELECT trade, count(*) FROM generated_quotes GROUP BY trade`. Also check `material_refinement_events` for the trades whose proposed materials traders untick most.

### 2.9 Deliverables per trade

- [ ] `docs/trade-research/<slug>.md` with sources, interview notes, open questions and review record
- [ ] `lib/trade-knowledge/<slug>.js` with 5–8 jobs (plus the new fields and `TRADE_PROFILE` once their code exists), all `reviewed: false`, registered in `JOBS_BY_TRADE`
- [ ] `PHOTO_FOCUS_BY_TRADE` and `PHOTO_PROMPTS` checked against the pack, and kept in step
- [ ] `evals/<slug>.cases.js` with at least 8 cases, including 2 hard ones and 1 uncovered job
- [ ] `npx vitest run` passing, including `lib/trade-knowledge/packs.test.js`
- [ ] Eval results with and without the pack, 3 runs each, added to `docs/PHASE_3C_TRADE_KNOWLEDGE.md`
- [ ] A review checklist for the tradesperson, added to `docs/PHASE_3C_TRADE_KNOWLEDGE.md`
- [ ] `reviewed: true` set only on entries a working tradesperson has checked

### 2.10 Delivery format

Work comes back in one of two ways, depending on who did it. Both arrive in a form that goes straight into the app, with no rewriting.

#### Route A: code, from a developer or an AI coding agent

Deliver a **git branch** made from an up-to-date `main`, with one trade per branch, containing exactly these files.

**1. `lib/trade-knowledge/<slug>.js`:** one named export, `<TRADE>_JOBS` in upper snake case (e.g. `GAS_ENGINEER_JOBS`), an array of entries in this exact shape:

```js
// Common <trade> jobs, drafted for Phase 3c. Each entry stays out of production until a person
// checks it and sets reviewed: true (see ./index.js).
export const GAS_ENGINEER_JOBS = [
  {
    id: 'boiler-no-hot-water',              // kebab-case, unique within the trade, never renamed once live
    title: 'Boiler gives no hot water',      // short, how a trader would name the job
    matches: 'no hot water, boiler not firing, combi only does heating',  // comma-separated real phrasings
    reviewed: false,                         // always false on delivery
    skipKeyQuestions: [],                    // optional: topics from lib/key-questions.js that never apply
    questions: [
      {
        topic: 'boiler type',                // short and unique within the entry; never a key-question topic
        question: 'What type of boiler is it?',
        options: ['Combi', 'System with a cylinder', 'Regular with a loft tank'],  // 2–5, no Other / Not sure
        askWhen: 'the description does not say',  // optional: only for some variants
      },
    ],
    variants: [
      { when: 'Combi with a failed diverter valve', materials: ['Diverter valve cartridge'] },
      { when: 'Fault not yet diagnosed', materials: [] },   // an empty list is allowed
    ],
    assumptions: ['…'],   // 1 or more, plain sentences, no compliance wording
    exclusions: ['…'],
    pitfalls: ['…'],
  },
]
```

Also in this file:
- **New fields** from 2.2 B (`siteChecks`, `stages`, `customerPrep`, `handOffs`, `accessAndEquipment`, `photoFocus`) are each an array of plain strings, added to the entry.
- **A trade profile,** if delivered, is a second named export, `<TRADE>_PROFILE`, with the sections in 2.2 C, each an array of plain strings.
- Deliver either of these only together with the code that reads it (see 2.2).

**2. `lib/trade-knowledge/index.js`:** the new export imported and added to `JOBS_BY_TRADE` under the trade's slug.

**3. `evals/<slug>.cases.js`:** re-exports `FORBIDDEN` and exports `<TRADE>_CASES`, an array in this shape:

```js
export { FORBIDDEN } from './shared.js'
import { keyAnswersFor } from './shared.js'

export const GAS_ENGINEER_CASES = [
  {
    id: 'combi-no-hot-water',                      // unique within the file
    jobDescription: 'Combi boiler does heating but no hot water from any tap.',  // as a customer would write it
    keyAnswers: keyAnswersFor('gas-engineer', { 'appliance position': 'Same position' }),  // by key-question topic
    answers: [[/type of boiler|boiler type/i, 'Combi']],  // how the simulated trader answers Phase A's questions
    mustNotAsk: [/does it do heating/i],           // optional: questions the description already answers
    expect: {
      asksAny: [/make|model|pressure|diverter/i],  // at least one question should match
      materials: [/diverter/i],                    // each pattern must match a proposed material
      assumptions: [/parts?.*availab|access/i],    // each must match the assumptions section
      exclusions: [/system|radiator|cylinder/i],   // optional; scope works the same way
    },
  },
]
```

**4. `docs/trade-research/<slug>.md`:** the research notes, using the headings in Route B's template below.

**5. `docs/PHASE_3C_TRADE_KNOWLEDGE.md`:** two sections appended, in the same style as the existing batches.
- An eval results table: with and without the pack, the mean of 3 runs and the range.
- A review checklist: per entry, the specific questions only a working tradesperson can settle.

**6. Also on the branch where needed:** this trade's `PHOTO_FOCUS_BY_TRADE` (in `lib/analyse-job-photos.js`) and `PHOTO_PROMPTS` (in `lib/example-jobs.js`), updated to match the pack. Plus a line in CLAUDE.md's "Trade knowledge packs" listing the new trade.

**And a handover note** (the PR description, or a message) with:
- what was built;
- the output of `npx vitest run` (all passing);
- the Phase A token count for the trade;
- the eval table;
- the sources used;
- which entries still need a tradesperson's review;
- any rule in this document that couldn't be followed, and why.

#### Route B: research, from someone not writing code

Deliver **one Markdown file per trade**, `docs/trade-research/<slug>.md`, using exactly the template below. The pack entries and eval cases go in fenced YAML blocks, which match the code shapes above field for field. A developer, or Claude, can then turn them into `lib/trade-knowledge/<slug>.js` and `evals/<slug>.cases.js` mechanically, without changing any content.

````markdown
# <Trade label> (<slug>): trade research

## Sources
- 2026-10-14, interview: plumber and gas engineer, 22 years, sole trader, Leicester. Supports: all jobs.
- 2026-10-15, Screwfix category "Boiler spares": product names for diverter valves and PCBs.
- (one line per source: date, type, who by role or which page, and which items it supports)

## Jobs chosen
| Job | Why it's included | Quoted how often (rough) |
|---|---|---|
| Boiler gives no hot water | Most common call-out | Weekly |

Jobs left out, and why:
- …

## Pack entries
```yaml
- id: boiler-no-hot-water
  title: Boiler gives no hot water
  matches: no hot water, boiler not firing, combi only does heating
  skipKeyQuestions: []
  questions:
    - topic: boiler type
      question: What type of boiler is it?
      options: [Combi, System with a cylinder, Regular with a loft tank]
      askWhen: the description does not say
  variants:
    - when: Combi with a failed diverter valve
      materials: [Diverter valve cartridge]
  assumptions:
    - …
  exclusions:
    - …
  pitfalls:
    - …
  siteChecks: [ … ]        # optional new fields, plain sentences
  stages: [ … ]
  customerPrep: [ … ]
  handOffs: [ … ]
  accessAndEquipment: [ … ]
  photoFocus: [ … ]
```

## Trade profile
```yaml
vocabulary: [ "…" ]
customerConcerns: [ "…" ]
commonOmissions: [ "…" ]
quoteHabits: [ "…" ]
seasonal: [ "…" ]
propertyAge: [ "…" ]
```

## Eval cases
```yaml
- id: combi-no-hot-water
  jobDescription: Combi boiler does heating but no hot water from any tap.
  keyAnswers: { appliance position: Same position }   # key-question topic: answer
  traderAnswers:                         # question about → answer the trader gives
    type of boiler: Combi
  mustNotAsk: [does it do heating]
  expect:
    asksAbout: [make or model, pressure, diverter]   # any one is enough
    materials: [diverter]                            # each must appear
    assumptions: [parts availability]
    exclusions: [radiators or system faults]
```

## Research only (not for prompts)
- Qualifications and registrations:
- Skills and experience levels:
- Attitudes and working style:
- Business realities (no rates or prices):
- What they need from QuoteFetch:

## Open questions for the reviewer
- …

## Review record
- 2026-10-20, reviewed by: gas engineer, 15 years. Entries checked: all. Changes: …
````

Route B has two loose spots, which the developer settles when converting:
- `expect` uses plain words, which the developer turns into patterns.
- `asksAbout` and `traderAnswers` keys name what a question is about, not its exact wording.

Everything else in the YAML carries over unchanged. The same hard rules (2.5) apply to the YAML as to the code.

#### Putting a delivery into the app

In Claude Code, the project skill `.claude/skills/trade-knowledge-implement` runs these steps. Put the research file in `docs/trade-research/`, then ask it to implement the trade. Its `convert.mjs` checks the YAML with the app's own rules and writes the pack.


1. **Route B only:** convert the YAML blocks into `lib/trade-knowledge/<slug>.js` and `evals/<slug>.cases.js` in the Route A shapes, and register the pack in `JOBS_BY_TRADE`.
2. Run `npx vitest run`. If a pack guardrail fails, fix the content, not the test.
3. Run the evals (2.6), and add the results and review checklist to `docs/PHASE_3C_TRADE_KNOWLEDGE.md`.
4. Try it in the app with `TRADE_KNOWLEDGE=all`.
5. After a working tradesperson's review, set `reviewed: true` on each checked entry. Only then does it reach traders in production.
6. Open a PR, with the handover note as its description.

---

## Part 3: Prompt to hand over

Copy everything inside the block below into a new Claude Code session in this repository, or give it to a person as their brief. Replace `<TRADE>` with a trade slug from `VALID_TRADES` (e.g. `gas-engineer`), and `<MODE>` with `new pack` or `deepen existing pack`.

````text
You're working in the QuoteFetch repository: an AI quote drafter for UK tradespeople (Next.js 15, Neon Postgres, Anthropic API). Your task is to build trade knowledge for one trade.

Trade: <TRADE>
Mode: <MODE>

Read these first, in full, before changing anything:
1. CLAUDE.md, especially "Trade knowledge packs", "Never-do rules" and "Materials refinement".
2. docs/PHASE_3C_TRADE_KNOWLEDGE.md: the pack design, schema, eval results and review history.
3. docs/TRADE_KNOWLEDGE_HANDOVER.md: the specification you're working to (Part 2).
4. lib/trade-knowledge/index.js, lib/trade-knowledge/packs.test.js, and one finished pack (lib/trade-knowledge/plumber.js).
5. lib/key-questions.js (this trade's key questions), lib/analyse-job-photos.js (PHOTO_FOCUS_BY_TRADE) and lib/example-jobs.js (PHOTO_PROMPTS and this trade's example jobs).
6. evals/plumber.cases.js and scripts/eval.mjs.

Then work through these steps, stopping where marked.

Step 1. Research notes. Create docs/trade-research/<TRADE>.md as described in the handover's section 2.4.
- List the 10 jobs this trade quotes most often in the UK, and choose 5–8 to cover, saying why.
- For each chosen job, draft the knowledge in section 2.2 A.
- Draft the trade-level knowledge in 2.2 C, and the research-only knowledge in 2.2 D.
- Say where each point comes from: merchant catalogue structure (Screwfix, Toolstation, B&Q, trade merchants), manufacturer fitting guides, trade association consumer guides, or general knowledge.
- Mark anything that is only your own knowledge as "unverified: needs a tradesperson".
- End with the open questions a working tradesperson must answer.
STOP here and show me the research notes before writing code.

Step 2. The pack. Create or update lib/trade-knowledge/<TRADE>.js and register it in JOBS_BY_TRADE.
- Every entry has reviewed: false.
- Follow every rule in section 2.5: no prices, no compliance or approval wording, single specific products, question rules, UK English, plain words.
- Check each material label would find a real product in a merchant search.
- Only add the new fields from 2.2 B and 2.2 C if you also add the code that reads them (formatter, wiring and tests). If you do, keep it to one field at a time and explain which step reads it.
- Keep the trade's Phase A block under about 3,500 tokens. Measure it with formatJobsForPhaseA.
- Bring PHOTO_FOCUS_BY_TRADE and PHOTO_PROMPTS for this trade in step with the pack.

Step 3. Tests. Run npx vitest run. Everything must pass, including lib/trade-knowledge/packs.test.js. Fix the pack, never the guardrail tests, unless I agree a test is wrong.

Step 4. Evals. Create evals/<TRADE>.cases.js with at least 8 cases, following evals/plumber.cases.js.
- Include one job the pack doesn't cover, and at least two hard cases.
- Write each check from real-world practice, not from the pack's wording.
- Run single cases while iterating, as each run costs real API credit.
- STOP and ask me before the full comparison. It is npm run eval -- --trade=<TRADE> --knowledge=off --runs=3, then the same without --knowledge=off. Tell me the expected number of API calls first.

Step 5. Report. Add the results (mean and range across runs, with and without the pack) to docs/PHASE_3C_TRADE_KNOWLEDGE.md. Add a review checklist there too: the specific points in each entry that only a working tradesperson can settle.

Step 6. Deliver in the format in section 2.10, Route A.
- Use the exact file names, export names and entry shapes given there.
- Check every file in Route A's list is present.
- Write the handover note it describes: what was built; the test output; the trade's Phase A token count; the eval table; the sources; which entries need a tradesperson's review; and any rule that couldn't be followed.
- Show me the handover note when you're finished.

Rules throughout:
- Never set reviewed: true. Only a person who has had the entries checked by a working tradesperson does that.
- Never invent prices, rates or costs, and never write compliance or approval claims, even inside research notes meant for prompts. Qualifications and registrations belong only in the research-only section of docs/trade-research/<TRADE>.md.
- Never rename a trade slug.
- Work on a new branch from an up-to-date main. Don't commit or push until I ask.
- Keep code comments to two lines at most, and match the style of the surrounding code.
- If something in this brief conflicts with CLAUDE.md, CLAUDE.md wins. Point out the conflict.
````

---

## Appendix: useful commands

```bash
# Prompt size of every pack (Phase A, all entries)
TRADE_KNOWLEDGE=all node --input-type=module -e "import { formatJobsForPhaseA, JOBS_BY_TRADE } from './lib/trade-knowledge/index.js'; for (const t of Object.keys(JOBS_BY_TRADE)) console.log(t, Math.round(formatJobsForPhaseA(t).length / 4), 'tokens')"

# Pack guardrails only
npx vitest run lib/trade-knowledge

# One eval case while iterating (real API calls)
npm run eval -- --trade=plumber --case=mixer-dripping

# Try unreviewed entries in the app (add to .env, then restart npm run dev)
TRADE_KNOWLEDGE=all
```
