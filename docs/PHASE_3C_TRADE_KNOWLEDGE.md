# Phase 3c — Trade knowledge packs (proposal)

**Status:** proposal, not started. Written 2026-09-26.
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

If it clearly helps, the same format extends to the other 16 trades.

**How this fits with Phase 3b:** key questions stay as the fixed questions for each trade, and the packs add questions specific to each job within that trade.

## Open decisions

- **Where packs live:** JS modules next to `lib/key-questions.js`, or data files (JSON/Markdown) loaded at runtime.
- **Matching a job to a pack entry:** keyword match, a cheap classification call in Phase A, or letting Phase A see the trade's whole job list.
- **Who reviews packs** before they go live, and how corrections get back in.
- **Eval tooling:** a vitest suite that calls the real API, or a separate script run by hand.
