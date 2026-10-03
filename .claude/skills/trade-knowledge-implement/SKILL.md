---
name: trade-knowledge-implement
description: Turns a trade research file (docs/trade-research/<slug>.md, made by the claude.ai "trade-knowledge-research" skill or by hand) into a QuoteFetch trade knowledge pack, eval cases, docs and a PR-ready branch. Use when the user asks to implement, convert, add or build a trade knowledge pack from research, or names a trade with a research file waiting.
---

# Implement a trade knowledge pack

This is the Claude Code half of the process in `docs/TRADE_KNOWLEDGE_HANDOVER.md`. Research arrives in that document's "Route B" format (section 2.10); this skill delivers "Route A": pack, eval cases, docs and a handover note, on a branch.

Read the handover's Part 2 and the "Trade knowledge packs" and "Never-do rules" sections of `CLAUDE.md` before starting. Where this skill and `CLAUDE.md` disagree, `CLAUDE.md` wins.

## Inputs

- **Trade slug**, one of `VALID_TRADES` in `lib/constants.js`. Ask if it isn't given.
- **`docs/trade-research/<slug>.md`**, in the Route B template. If the user has the file elsewhere (e.g. a download), ask them to put it there.
- **New pack or deepening an existing one:** check whether `lib/trade-knowledge/<slug>.js` exists.

## Steps

### 1. Branch

Follow the PR workflow in memory: work on a new branch from an up-to-date `main` (`git switch main && git pull --ff-only && git switch -c <user>/trade-knowledge-<slug>`). If the working tree has uncommitted changes, ask before switching. Never commit or push until the user asks.

### 2. Check the research file

```bash
node .claude/skills/trade-knowledge-implement/convert.mjs <slug>
```

It parses the YAML blocks and checks every pack entry with the app's own rules:
- **Fields:** required ones present, ids kebab-case and unique, no unknown fields.
- **Questions:** each ends with "?", has 2–5 options, has no Other / Not sure, and doesn't repeat a key question (by topic, near-identical wording or two shared options).
- **Materials:** each passes `isRejectedLabel`.
- **Wording:** no compliance wording and no prices.
- **Topics:** `skipKeyQuestions` and eval `keyAnswers` use real key-question topics.
- **Eval cases:** at least 8.

If it reports problems:
- **Show them to the user.** They are content problems in the research, so the researcher or tradesperson should agree to each fix.
- **Edit the research file, not the script.** Only a clear typo (e.g. a missing "?") can be fixed without asking, and say what you changed.
- **Run it again** until it passes.

Its notes are not errors:
- **New fields** (`siteChecks`, `stages`, `customerPrep`, `handOffs`, `accessAndEquipment`, `photoFocus`) and a **trade profile** aren't written to the pack yet, because no code reads them (handover 2.2 B and C). Mention them in the handover note. Only add one if the user asks, and then build the formatter, the wiring into Phase A or B, and its tests in the same change.
- **A missing "Review record"** means nothing has been checked by a tradesperson.

### 3. Write the pack

```bash
node .claude/skills/trade-knowledge-implement/convert.mjs <slug> --write
```

It writes `lib/trade-knowledge/<slug>.js`, exporting `<TRADE>_JOBS` (e.g. `GAS_ENGINEER_JOBS`), with **every entry `reviewed: false`**.
- When deepening an existing pack, it refuses to overwrite. Show the user the differences first (the old pack against the research), then use `--force` only once they agree.
- Then register the export in `JOBS_BY_TRADE` in `lib/trade-knowledge/index.js` (import it, add it under the slug, keep both lists alphabetical).

**Setting `reviewed: true`:** only for entries the research file's "Review record" says a working tradesperson checked, and only after the user confirms it. Otherwise leave every entry `false`.

### 4. Write the eval cases

Convert the research file's "Eval cases" YAML into `evals/<slug>.cases.js`, following `evals/plumber.cases.js`.
- Re-export `FORBIDDEN` from `./shared.js`, and export `<TRADE>_CASES` (e.g. `GAS_ENGINEER_CASES`).
- `keyAnswers: { topic: answer }` becomes `keyAnswersFor('<slug>', { topic: answer })` from `./shared.js`.
- `traderAnswers: { about: answer }` becomes `answers: [[/about|synonyms/i, 'answer'], …]`. Make each pattern match the ways Phase A might word that question.
- In `expect`, `asksAbout`, `materials`, `assumptions`, `exclusions` and `scope` become arrays of case-insensitive regexes (`asksAbout` becomes `asksAny`). Keep each check as broad as the plain words mean, and no broader. Every word list in `asksAbout` is one regex, as only one needs to match.
- `mustNotAsk` becomes regexes for questions the description already answers.
- Write patterns from what the research says a good quote needs, never copied from the pack's wording.
- No registration is needed: `scripts/eval.mjs` loads `evals/<slug>.cases.js` and its `<SLUG>_CASES` export by name, so both names must match exactly.

### 5. Photo hints

Make this trade's `PHOTO_FOCUS_BY_TRADE` (`lib/analyse-job-photos.js`) and `PHOTO_PROMPTS` (`lib/example-jobs.js`) cover what the pack's jobs need to see. If the research gives `photoFocus` per job, use it here. The two must stay in step (see CLAUDE.md).

### 6. Test

```bash
npx vitest run lib/trade-knowledge   # the pack guardrails, run over every pack
npx vitest run                       # everything
```

All must pass. Fix the pack, never the guardrail tests, unless the user agrees a test is wrong.

Then measure the Phase A prompt size; keep it under about 3,500 tokens (handover 2.1):

```bash
TRADE_KNOWLEDGE=all node --input-type=module -e "import { formatJobsForPhaseA } from './lib/trade-knowledge/index.js'; console.log(Math.round(formatJobsForPhaseA('<slug>').length / 4), 'tokens')"
```

### 7. Evals: these spend real API credit

1. **Smoke test** one or two cases first: `npm run eval -- --trade=<slug> --case=<id>` (with `TRADE_KNOWLEDGE=all`, since entries are unreviewed). Fix patterns that fail because of how they're written, not because of the quote.
2. **Stop and ask the user** before the full comparison. Tell them roughly how many API calls it makes: cases × 3 runs × 2 modes, each case one to three Phase A rounds plus three section drafts.
3. **Once they agree,** run it:
   ```bash
   npm run eval -- --trade=<slug> --knowledge=off --runs=3
   TRADE_KNOWLEDGE=all npm run eval -- --trade=<slug> --runs=3
   ```
4. **Report the mean and range** for each. The pack clearly helps if the ranges don't overlap. If the baseline is already near the ceiling, say so: the cases need to be harder before a gain can show.

### 8. Docs

- **`docs/PHASE_3C_TRADE_KNOWLEDGE.md`:** add this trade's eval results table and a review checklist (per entry, the specific points only a working tradesperson can settle), in the style of the existing batches. Put the research file's open questions into that checklist.
- **`CLAUDE.md`:** add the trade to the list of trades with packs in "Trade knowledge packs (Phase 3c)".

### 9. Handover note

Finish with a note the user can paste as the PR description:
- what was built and the files changed;
- `npx vitest run` passing;
- the Phase A token count;
- the eval table;
- the sources from the research file;
- which entries are still `reviewed: false` and what the reviewer must check;
- new fields or trade profile content left out, and why;
- anything that couldn't follow the rules.

Then ask whether to commit and push. If they say yes, give them the GitHub "new pull request" link for the branch (`gh` isn't installed).

## Never

- Set `reviewed: true` without a recorded tradesperson review **and** the user's confirmation.
- Add prices, rates or compliance and approval wording to a pack, even if the research file has them outside its research-only section.
- Rename a trade slug.
- Weaken `lib/trade-knowledge/packs.test.js` or `convert.mjs` to make content pass.
- Run the full eval comparison without asking.
