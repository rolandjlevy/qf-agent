# Setting up the trade-knowledge-research skill on claude.ai

This creates the claude.ai skill that researches one trade at a time and produces a research file for QuoteFetch. You do it once. After that, each trade is a single request, followed by a tradesperson's review and the `trade-knowledge-implement` skill in Claude Code.

The full process and the rules are in `docs/TRADE_KNOWLEDGE_HANDOVER.md`.

---

## Step 1: Download the 7 files

Open each link while signed in to GitHub (the repo may be private), then click the **Download raw file** button (the down-arrow icon at the top right of the file view):

1. https://github.com/rolandjlevy/qf-agent/blob/main/docs/TRADE_KNOWLEDGE_HANDOVER.md
2. https://github.com/rolandjlevy/qf-agent/blob/main/lib/trade-knowledge/plumber.js
3. https://github.com/rolandjlevy/qf-agent/blob/main/lib/key-questions.js
4. https://github.com/rolandjlevy/qf-agent/blob/main/lib/material-rules.js
5. https://github.com/rolandjlevy/qf-agent/blob/main/lib/trade-knowledge/packs.test.js
6. https://github.com/rolandjlevy/qf-agent/blob/main/evals/plumber.cases.js
7. https://github.com/rolandjlevy/qf-agent/blob/main/evals/shared.js

Put them in one folder on your computer so they're easy to attach together.

## Step 2: Turn on what the skill needs in claude.ai

In claude.ai, open **Settings** and find the capabilities section. The exact names may differ slightly from these:

- **Code execution and file creation:** on. skill-creator needs it to build the skill and its validation script.
- **Skills:** on. Check that **skill-creator** is listed and enabled. It's one of Anthropic's built-in example skills.
- **Web search:** on. The research skill uses it to look up merchant product names and sources.

## Step 3: Ask skill-creator to build the skill

1. Start a **new chat**.
2. Attach all 7 files: drag them in, or use the paperclip.
3. Paste the wording below, then send it.
4. skill-creator may ask questions before building, such as how strict to be or what to name things. Answer them using the wording as your guide. If unsure, say "follow the attached TRADE_KNOWLEDGE_HANDOVER.md".
5. It will draft the skill (a `SKILL.md`, the 7 files as references, and a Python validation script), then test it on gas engineer as the wording asks.

### Wording to paste

```text
Create a skill called "trade-knowledge-research" for QuoteFetch, an AI quote drafter for UK tradespeople.

What the skill does: given one trade, it researches that trade and produces a single Markdown file, docs/trade-research/<slug>.md, following EXACTLY the "Route B" template in section 2.10 of the attached TRADE_KNOWLEDGE_HANDOVER.md. That file is later converted into code in a separate repository, so its YAML blocks must match the template field for field.

Inputs, asked for at the start if not given:
- trade slug, from this list: bricklayer, driveway-specialist, fencer, flooring-fitter, gas-engineer, glazier, groundworker, handyman, kitchen-fitter, tiler, tree-surgeon (or an existing trade: plumber, bathroom-fitter, electrician, carpenter, roofer, decorator, builder, gardener-landscaper, plasterer)
- mode: "new pack" or "deepen existing pack" (if deepening, ask me to paste the existing lib/trade-knowledge/<slug>.js)
- any interview notes or sources I have for this trade (optional)

Bundle these attached files as references and read them before every run:
- TRADE_KNOWLEDGE_HANDOVER.md: the specification; Part 2 is the rules and 2.10 is the output format
- plumber.js: an example of a finished, reviewed pack (the quality bar)
- key-questions.js: each trade's key questions; pack questions must never repeat them by topic, wording or two shared options
- material-rules.js: the rules every material label must pass
- packs.test.js: the guardrails, including the banned compliance wording
- plumber.cases.js and shared.js: example eval cases and the FORBIDDEN patterns

Steps the skill follows:
1. Read the references. Look up this trade's key questions in key-questions.js.
2. Research the trade with web search: the 10 jobs it quotes most often in the UK; product names and sizes as listed by Screwfix, Toolstation, B&Q and trade merchants; manufacturer fitting guides; trade association consumer guides. Record every source with a date and the items it supports.
3. Choose 5–8 jobs and say why. Draft the pack entries, trade profile and at least 8 eval cases (including one job the pack doesn't cover and two hard ones) in the template's YAML blocks. Write eval expectations from real-world practice, not from the pack's own wording.
4. Put qualifications, registrations, skills, experience levels, attitudes, business realities and what traders need from QuoteFetch ONLY in the "Research only (not for prompts)" section.
5. Mark anything not backed by a source as "unverified: needs a tradesperson", and list the open questions a working tradesperson must answer.
6. Run the bundled validation script on the YAML, fix every problem it reports, and run it again until it passes.
7. Return the finished Markdown file for download, plus a short summary: jobs chosen, sources, unverified points, open questions.

Hard rules, never broken:
- No prices, rates or costs of any kind.
- No compliance or approval wording anywhere outside the research-only section: never "Part P", "Gas Safe", "BS 7671", "Water Regulations", "compliant", "certified", "certificate", "Building Regs", "WRAS" or "approved". Describe practical facts instead ("gas work is handed to a gas engineer").
- Each material is one specific product with its size or spec. No "X or Y", no two items on one line, no service items (disposal, hire, labour), no vague terms (sundries, consumables).
- Each question ends with "?", has 2–5 options, never includes "Other" or "Not sure", and never repeats one of the trade's key questions.
- UK English, UK products and plain words a customer understands.
- Every entry is a draft: never claim it has been reviewed.

Also create a bundled Python validation script that checks the YAML blocks in the output file:
- required fields present, and ids unique and kebab-case;
- question rules (ends with "?", 2–5 options, no Other / Not sure);
- no topic or near-identical wording shared with the trade's key questions (parsed from key-questions.js);
- material labels: no " or ", no "&" or " and " joining two products, nothing matching the skip words in material-rules.js;
- no banned compliance wording or "£" amounts outside the research-only section;
- eval cases: at least 8, each with id, jobDescription and expect.
It prints each problem with its location, and exits non-zero if there are any.

Test the skill on gas-engineer, the hardest case for compliance wording.
```

## Step 4: Check the test run before saving

Look at the gas-engineer file it produced and check that:

- [ ] it has these sections, in this order: **Sources**, **Jobs chosen**, **Pack entries**, **Trade profile**, **Eval cases**, **Research only (not for prompts)**, **Open questions for the reviewer**, **Review record**
- [ ] Pack entries, Trade profile and Eval cases are each in a fenced `yaml` block
- [ ] the validation script ran and **passed**. Ask "show me the validation output" if it didn't say
- [ ] there are **no prices** and **no "Gas Safe", "certified", "compliant" or "approved"** anywhere except the "Research only" section
- [ ] points without a source are marked **"unverified: needs a tradesperson"**
- [ ] there are **at least 8 eval cases**

If anything's off, tell skill-creator what to fix in the skill, not just in this one file, and let it re-test.

## Step 5: Save the skill

When you're happy, ask skill-creator to package the skill.

- **It may install it for you.** Otherwise it gives you a file, usually a `.zip` or `.skill`. Upload that in Settings, in the Skills section, with the upload option.
- **Check it shows** as **trade-knowledge-research** in your skills list, switched on.

## Step 6: Try it for real

1. Start a **fresh chat**, so it runs from the saved skill rather than the build conversation.
2. Type: **"Run trade-knowledge-research for gas-engineer, new pack"**.
3. Download the `gas-engineer.md` it returns.

## Optional: a quick format check before the tradesperson review

Put the downloaded file in this project at `docs/trade-research/gas-engineer.md`, then ask Claude Code to "check the gas-engineer research". It runs the converter's checks only. That writes nothing, uses no API credit, and confirms the file is in the right format before you take it to a gas engineer for review.

You can run the same check yourself:

```bash
node .claude/skills/trade-knowledge-implement/convert.mjs gas-engineer
```

---

## Then, for each trade

1. **claude.ai:** "Run trade-knowledge-research for <trade>, new pack". Download `<trade>.md`.
2. **A working tradesperson reviews it.** Make their corrections and fill in the "Review record" with their role and years in the trade (no names). This is the step that makes the packs trustworthy.
3. **Put the file** in this project at `docs/trade-research/<trade>.md`.
4. **Claude Code:** "implement the <trade> trade knowledge" (the `trade-knowledge-implement` skill).
   - It checks the file, writes the pack and eval cases, and runs the tests.
   - It asks before the eval run that spends API credit.
   - It writes the docs and gives you a PR description.
5. **Merge the PR.** Entries go live in production only after they're marked reviewed, which needs both the recorded review and your confirmation.

**Suggested order:** gas engineer, kitchen fitter, tiler, handyman; then bricklayer, groundworker, driveway specialist, fencer; then flooring fitter, glazier, tree surgeon. After that, run the same loop in "deepen existing pack" mode for the 9 trades that already have packs.
