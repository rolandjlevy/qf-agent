# Phase 3c — Trade knowledge packs

**Status:** plumber pilot built and measured 2026-09-26 (140.3/143 with the pack, 131.3/143 without, mean of 3 runs). All plumber entries await review (`reviewed: false`), so nothing is live in production yet. Proposal written 2026-09-26; see "Pilot build" below for what was built.
**Depends on:** Phase 3b, trade key questions (`docs/PHASE_3B_KEY_QUESTIONS.md`; the work is on the `trade-key-questions` branch and backed up on `trade-key-questions-backup`).

## The question

What makes a trade's questions and quote content reliable, high quality, and true to real-world jobs? Take a trader who picks **plumber** and types "fix a leaky tap". What is the plumbing knowledge behind the questions asked, the materials proposed, and the assumptions written?

## Short answer

Today the basis is almost entirely **the model's general training knowledge**. The app tells the model little more than the word `plumber`. No part of the app holds actual trade knowledge: how a leaky tap is diagnosed, what parts it usually needs, or what a real plumber would assume or exclude.

Improving this does mean enriching the prompts. But the real gain comes from giving the prompts **per-trade knowledge to draw on**, and from **a way to measure** whether answers get better.

## What happens today for "fix a leaky tap" (plumber)

| Step | What the model is given | Plumbing-specific knowledge |
|---|---|---|
| **Photo analysis** (only if photos are added) | A list of things to look for in a plumbing job (`PHOTO_FOCUS_BY_TRADE` in `lib/analyse-job-photos.js`): tap, valve and fitting type, signs of leaks, pipe material | A little, and only on the photo path |
| **Key questions** (Phase 3b) | 4 fixed plumber questions: pipework material, access to the pipes, making good, who supplies materials | Generic: nothing about taps specifically |
| **Phase A: questions and materials** (`lib/propose-materials.js`) | "You are a UK trade materials expert… for a plumber job", plus generic rules | **None.** It relies on the model knowing plumbing |
| **Phase B: writing the quote** (`tools/draft-section.js`) | `Trade: plumber` plus generic section rules ("safety considerations for plumber where applicable") | **None** |
| CLI only (`CLARIFYING_QUESTION_GUIDANCE_BY_TRADE` in `prompts/system.js`) | One line of plumber question guidance: boiler type, pipework, property type | Aimed at boilers, not taps, and the web flow doesn't use it at all |

`prompts/02_QF_KNOWLEDGE_BANK.md` has no plumbing content beyond a few sample product names.

So for a leaky tap, whether the model thinks to ask "is it a mixer tap or separate hot and cold taps?", "does it drip from the spout or leak at the handle?" or "is there an isolation valve under the sink?" depends on the model, not on anything the app knows. Claude usually gets this right for common jobs. But the result isn't guaranteed, repeatable or checkable, and it gets weaker for niche jobs and UK-specific practice.

## What "enriching" would involve

### 1. A knowledge pack per trade

This should be structured data, not longer prose prompts. For each trade, cover its common jobs, and for each job:

- **Diagnostic questions**, the ones that split the job into its real variants. For a leaky tap: tap type (pillar, mixer, monobloc), where it leaks (spout drip, handle, base, under the sink), and the valve inside (old-style washer, quarter-turn ceramic cartridge).
- **Materials per variant.** A washer-type tap needs washers and O-rings; a ceramic tap needs a cartridge, which is often brand-specific; sometimes the answer is to replace the whole tap.
- **Standard assumptions and exclusions**, such as isolation valves being present and working, and no hidden pipe damage behind tiling.
- **Real-world pitfalls**, such as seized tap parts, discontinued cartridges, and hard-water scale.

Only the chosen trade's pack, or better just the matching job, gets injected into Phase A and Phase B. That keeps token costs down, which matters given the recent token-spend cuts.

### 2. Real-world sources for that knowledge

A model-written pack just repeats what the model already knows. Better sources:

- **Real tradespeople reviewing each pack.** This is the only way to make it trustworthy.
- **The app's own `material_refinement_events` table.** It already records which proposed materials traders untick and what they add themselves. That's direct evidence of where the model is wrong for each trade, and nothing reads it yet.
- **Manufacturer and merchant product data**, such as Screwfix and Toolstation category structures, for accurate part names.

### 3. A way to measure quality (evals)

Without this you can't tell whether a prompt change helped. Build 5–10 realistic jobs per trade, each with what a good answer must include: the right questions asked, the right materials, the key assumptions. Run them after each prompt change and score the results. This is what makes "high quality and reliable" something you can check.

### 4. Keep the never-do rules on top

Richer knowledge makes it more tempting for the model to state things like "compliant with Water Regulations". The rules in `CLAUDE.md` against compliance claims and invented prices still apply, and the packs should be written to respect them.

## Suggested first step: a plumber pilot

1. Draft a knowledge pack for 5–8 common plumbing jobs, starting with the leaky tap.
2. Build a matching eval set of test jobs.
3. Wire the pack into Phase A and Phase B.
4. Compare quotes before and after.

If it clearly helps, the same format extends to the other 19 trades. When the tree-surgeon pack is written, cover Tree Preservation Orders and conservation areas as a pitfall or assumption: its key questions deliberately don't ask about them.

**How this fits with Phase 3b:** key questions stay as the fixed questions for each trade, and the packs add questions specific to each job within that trade.

## Decisions made

- **Where packs live:** JS modules in `lib/trade-knowledge/`, one file per trade, following the pattern of `lib/key-questions.js`.
- **Matching a job to a pack entry:** Phase A sees the trade's whole job list and returns the matched id as `job_type`. There's no separate classification call.
- **Question budgets:** key questions no longer count toward Phase A's cap. Phase A gets its own 2 questions (`MAX_CLARIFYING_QUESTIONS`), so a trader faces at most 4 key questions plus 2 job-specific ones.
- **Review:** Claude drafts entries and a person reviews them. An entry goes live only once its `reviewed` flag is set to `true`.
- **Evals:** a script with checklist checks (`npm run eval`), kept out of `npm test` because it calls the real API.

## Pilot build

### What was built

| Piece | File |
|---|---|
| Plumber pack: 8 jobs (leaking tap, replace tap, toilet cistern, blocked waste, replace radiator, leaking pipe, outside tap, appliance plumbing) | `lib/trade-knowledge/plumber.js` |
| Gating (`jobsFor`, `jobEntry`) and prompt formatters (`formatJobsForPhaseA`, `formatJobForPhaseB`) | `lib/trade-knowledge/index.js` |
| Phase A: `keyAnswers` input (not counted toward the cap), pack block in the prompt, `jobType` in the result | `lib/propose-materials.js`, `app/api/quote/propose-materials/route.js` |
| Client: sends key answers separately, keeps `jobType` and sends it to Phase B | `app/quote/new/page.js` |
| Phase B: matched job's guidance in `toolContext.jobKnowledge`, used by the scope, assumptions and exclusions sections | `app/api/quote/route.js`, `tools/draft-section.js` |
| Tests: pack guardrails, gating, formatters, Phase A and `draft_section` wiring | `lib/trade-knowledge/*.test.js`, `lib/propose-materials.test.js`, `tools/draft-section.test.js` |
| Evals: 10 plumber cases and the runner | `evals/plumber.cases.js`, `scripts/eval.mjs` |

### Pack entry schema

```js
{
  id: 'leaking-tap',                 // returned by Phase A as job_type
  title: 'Leaking or dripping tap',
  matches: 'dripping tap, leaking mixer, …',   // phrasings that should match this job
  reviewed: false,                   // true only once a person has checked the entry
  questions: [{ topic, question, options, askWhen? }],   // 2–5 options, never "Other"/"Not sure"; askWhen limits it to some variants
  variants: [{ when, materials: ['single product label', …] }],
  assumptions: ['…'], exclusions: ['…'], pitfalls: ['…'],
}
```

### Adding a trade

1. Create `lib/trade-knowledge/<trade>.js` exporting its jobs, and register it in `JOBS_BY_TRADE` in `index.js`.
2. Copy `plumber.test.js` for the new trade, so the guardrail checks run on its content.
3. Write `evals/<trade>.cases.js`, exporting `<TRADE>_CASES` (e.g. `GAS_ENGINEER_CASES`) and `FORBIDDEN`. Write each case's checks from real-world practice, not from the pack's own wording.
4. Run `npm run eval -- --trade=<trade> --knowledge=off --runs=3`, then without `--knowledge=off`, and compare the means. Single runs are too noisy to compare.
5. Have someone who knows the trade review each entry, then set `reviewed: true`.

### Eval results (2026-09-26, Haiku for Phase A, mean of 3 runs)

Measured after the pack fixes and Phase A backstops described below. The range across the 3 runs is in brackets.

| Check type | Without pack | With pack |
|---|---|---|
| Asks a job-specific question | 6.3/10 (6–7) | 9/10 (8–10) |
| Right materials | 7/10 | 10/10 |
| Key assumptions | 8/8 | 8/8 |
| Key exclusions | 4/5 (3–5) | 5/5 |
| No repeated question (`distinct`) | 10/10 | 10/10 |
| No options listed in the question (`clean-question`) | 6.3/10 (5–8) | 8.3/10 (8–9) |
| No forbidden wording | 89.7/90 | 90/90 |
| **Total** | **131.3/143 (130–133)** | **140.3/143 (139–141)** |

The two ranges don't overlap, so the gain is real, not run-to-run noise. The earlier single-run figures (95–98/103 without, 102/103 with) used fewer checks and aren't comparable.

**Stronger Phase A model?** Sonnet 4.6 with the pack scored worse on questions: it asked no questions at all in 12 of 29 cases and went straight to materials (job-specific question 4/9). Its materials were as good (10/10). Keep Haiku as the Phase A default. Sonnet 5 couldn't be tested: Phase A sends `temperature: 0.2`, which Sonnet 5 rejects with a 400. So setting `PHASE_A_MODEL=claude-sonnet-5` would break Phase A until that parameter is dropped for such models.

### What the first run taught us

- **"Skip questions already answered" must name the job description explicitly.** Otherwise the model re-asks what the trader already wrote, such as asking how the tap turns off when the description said "several turns". Fixed in the prompt.
- **A warning that mentions "compliance" can prime the word.** One exclusion came back saying "non-compliant". The Phase B guidance block no longer mentions compliance at all; `NEVER_DO_RULES` in the system prompt already covers it.
- **Questions shown as `question (A / B / C)` invite options in the question text.** The Phase A block now asks for the options as "choices" instead.

### Fixes after the first runs

- **Pack:**
  - The mixer cartridge label was "35mm or 40mm", which broke the no-alternatives rule. It's now 40mm, and a pitfall covers 35mm.
  - The "who supplies the tap" question was removed, because key question 4 already asks it.
  - A "WRAS approved" pitfall was reworded, and the guardrail test now rejects "WRAS" and "approved".
  - Questions can carry `askWhen`, so flush type is only asked for a running toilet, not an overflow.
- **Phase A backstops** (`lib/propose-materials.js`):
  - `stripListedOptions` cuts options listed after a dash or colon (`questionListsOptions` flags two or more named options).
  - A question that `isNearDuplicateQuestion` flags as a re-ask of a key question or earlier question is dropped, and that round returns materials instead. The threshold (0.5 word overlap) was set from the eval runs: real repeats scored 0.53 or more, and distinct questions on the same job 0.40 or less.

### Known issues (Phase A, not the pack)

- About 1 in 6 questions with the pack still lists its options without a dash or colon (e.g. "Is the pipe fed from the mains, or from a tank in the loft?"). The backstop leaves these alone, because cutting mid-sentence reads worse than the repetition.
- Phase A sometimes asks about something the description already states, e.g. what the toilet is doing when the description says it overflows. Near-duplicates of earlier questions are now caught, but re-asking the description isn't.

## Review checklist

These are the points in each entry that only a working plumber can settle. Correct anything that's wrong, then set `reviewed: true` on the entry in `lib/trade-knowledge/plumber.js`.

- **leaking-tap**
  - The default mixer cartridge is now 40mm, and the pitfall notes that some are 35mm. Is 40mm the better default?
  - Is a spindle O-ring set the right part for a traditional tap leaking round the handle, or do older taps still need gland packing?
  - Should fitting an isolating valve, where there isn't one, be part of this job?
- **replace-tap**
  - Are the tap connector sizes right: 15mm x 1/2" for a basin, 22mm x 3/4" for a bath?
  - Is "Low-pressure rated mixer tap" a label that finds real products?
  - The "who supplies the tap" question was removed because key question 4 already asks it. Is anything lost?
- **toilet-cistern**
  - Are 1/2" bottom-entry and side-entry fill valves the right defaults?
  - Is a siphon diaphragm washer the right part for a lever toilet that needs several pulls?
  - Check the new `askWhen` conditions: flush type only when water runs into the pan or it won't flush, pipe position only when it overflows or refills slowly.
- **blocked-waste**
  - Are the trap and pipe sizes right: 32mm for a basin, 40mm for a sink or bath?
  - Should shower trays be in this job at all, given that lifting the tray is excluded?
- **replace-radiator**
  - Is a 600mm x 1000mm double panel convector a sensible default for a like-for-like swap?
  - Should "Thermostatic radiator valve and lockshield 15mm (pair)" stay one line, since it's usually sold as one pack?
  - Are the 1L inhibitor and the 10mm microbore adaptor right?
- **leaking-pipe**
  - For a short repair on copper, is push-fit the usual choice, rather than compression or solder?
  - Is the advice on lead pipe right?
- **outside-tap**
  - Is a kit with a double check valve the right default?
  - Is a sleeve for going through a cavity wall missing from the materials?
- **appliance-plumbing**
  - Is an equal tee with an appliance valve the right default, rather than a self-cutting valve?
  - Is a 1.5m hose long enough for "ready to connect"?

## Next steps

1. **Review the 8 plumber entries** in `lib/trade-knowledge/plumber.js`. Correct anything a working plumber would disagree with, then set `reviewed: true` on each entry you're happy with. Until then, production behaves exactly as before.
2. **Try it in the app** with `TRADE_KNOWLEDGE=all` in `.env`, then `npm run dev`, and quote a plumbing job.
3. **Stage 2 rollout:** add trades in batches of 3–4, each with its own cases file and review pass. Prioritise by quote volume, and by which materials traders most often reject or add in `material_refinement_events`.
