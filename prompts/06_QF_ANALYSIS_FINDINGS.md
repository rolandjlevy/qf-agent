# QuoteFetch — Analysis and Findings

*A companion to `phase-2-brief.md`. This document captures analysis
of QuoteFetch as a project — the competitive landscape, gaps in the
current product, strategic options for what to build next, and
technical observations from reading the codebase handoff.*

*The build brief tells you what to do. This document tells you what
was concluded and why, so future decisions have context.*

---

## About this document

Written after reading the project handoff snapshot (branch
`development-error-handling`, dated 2026-08-27) and discussing the
project's direction. It is analysis, not instructions. Where it makes
recommendations, they are captured in `phase-2-brief.md`.

**Confidence levels are flagged throughout.** Some findings come
from the handoff doc itself and are reliable. Some come from
general knowledge of the UK trades SaaS market and are reasoning,
not reporting. The document distinguishes between them.

---

## 1. Competitive landscape

QuoteFetch sits in adjacent territory to four groups of competitors.
None of them do exactly what QuoteFetch does, but each occupies
overlapping ground worth being aware of.

### Group 1 — Job/CRM SaaS for trades

*Confidence: high on category, medium on specific product features
(may have changed since knowledge cutoff)*

Established players: Powered Now, Tradify, YourTradebase, Fergus,
ServiceM8, Joblogic, Jobber.

These are end-to-end business systems for tradespeople. Quotes,
invoices, scheduling, payments, sometimes CRM. All of them include
quote generation, usually from templates the trader fills in
manually. As of the last few years, none appears to offer AI-assisted
drafting from a plain-English job description — the wedge QuoteFetch
has.

**Where they beat QuoteFetch:** they're end-to-end. A trader using
Tradify has their whole business in one place. QuoteFetch is a point
solution.

**Where QuoteFetch beats them:** setup friction and time-to-first-
quote. A sole trader signing up to Tradify spends a weekend
configuring templates, rates, customer records. A trader using
QuoteFetch types a job description and gets a quote in 30 seconds.

**Strategic risk:** any of these could add "AI-drafts-your-quote"
as a feature within a release cycle. They have the customer
relationships and the trader data. If they do, QuoteFetch's
differentiation narrows to "we do this one thing better."

### Group 2 — Generic AI writing tools

*Confidence: high*

ChatGPT, Claude web, Copilot Pro, etc.

An uncomfortable competitor to name, because it's technically
possible today: a competent tradesperson with a paid ChatGPT
subscription can prompt their way to something that resembles a
QuoteFetch output. It won't have real prices, won't have the
guardrails, and will vary in structure — but it exists at zero
marginal cost in a tab they already have open.

**Where they beat QuoteFetch:** no signup, no learning curve,
already paid for.

**Where QuoteFetch beats them:** the never-do rules (no invented
prices, no false compliance claims, no markdown tables), the
format designed to paste cleanly into an email client, the
consistency between runs. These are real advantages, but they
require the trader to notice them.

### Group 3 — Emerging AI-for-trades products

*Confidence: medium — this space moves fast*

Elec-Mate's AI Remedial Cost Estimator, Surveyor AI, TradesGPT,
various pilots.

Same category of underlying technology (LLMs applied to trades),
different wedges. Elec-Mate prices electrical remedial work inline
with EICR certificates. Surveyor AI generates RICS reports. None
appears to have QuoteFetch's specific combination: plain-language
input → structured written quote with real-ish prices → format
designed to paste into an email.

**Strategic risk:** these are the competitors most likely to notice
what QuoteFetch is doing and add a similar feature. The specific
gap QuoteFetch occupies is available now. It won't be forever.

### Group 4 — Lead marketplaces

*Confidence: high on existence, medium on specific behaviours*

Checkatrade, MyBuilder, Rated People, Bark.

Not direct competitors in the quote-generation sense, but relevant
because they're where many traders' inbound leads arrive. If one of
them (Checkatrade is the most likely) added an "AI-drafted first
response" feature, they would commoditise a portion of what
QuoteFetch does, particularly under an inbound-lead-response
positioning.

---

## 2. Current product gaps

*Confidence on gap existence: high (from handoff doc). Confidence
on severity: mixed (some are objective, some depend on positioning).*

Gaps depend on what QuoteFetch is trying to be. Both interpretations
below are consistent with the current code.

### If QuoteFetch stays as a quote-document-generation tool

**Load-bearing gaps:**

- **No real prices.** All 50 entries in `data/sample-prices.json`
  are `verified: false` (placeholder). Every quote goes out with an
  auto-note that prices need checking. Traders can't send these
  quotes without verifying each price, which erodes most of the
  time-saving value. This is Phase 3 in the roadmap, but it's the
  most visible current gap.
- **No trader context.** Every quote starts with `[BUSINESS NAME]`
  and `[CONTACT DETAILS]` as placeholders. Every quote requires
  manual find-and-replace before sending. Fixing this is cheap and
  transformative — see `phase-2-brief.md`.
- **No customer context.** The quote is addressed abstractly. No
  named customer, no address, no delivery timeframe from the
  customer's brief. Real quotes are personal; these aren't.

**Non-load-bearing but real gaps:**

- **No revision workflow.** Real quotes get revised. Right now
  QuoteFetch produces v1 and stops. No way to say "same quote but
  with 30mm insulation instead of 25mm" without regenerating.
- **No output beyond markdown.** Design deliberately avoids tables
  and keeps output paste-friendly (good), but real quotes often
  need to be PDFs (for filing, formal delivery). PDF export would
  extend reach without breaking the design.
- **No feedback loop.** No way to record "this quote won the job,
  this one didn't" and have the system learn.
- **No automated tests.** Handoff doc acknowledges this. Three
  manual CLI test cases in `README.md`. Not fatal now; will be as
  the product grows.

### If QuoteFetch pivots to inbound-lead response

Different gaps entirely — and much larger ones:

- **No inbound channel.** Currently the trader has to run a CLI
  command with the job description. There's no "customer emails
  you → quote drafted automatically" loop.
- **No approval workflow.** The trader would need to see and
  approve drafts before they go out. Currently no "send" step at
  all.
- **No delivery mechanism.** No way to actually get the quote to
  the customer via email, WhatsApp, SMS, anything.
- **No trader identity persistence.** For this positioning, the
  tool must know who the trader is to send quotes on their behalf.

---

## 3. Strategic options for what comes next

*Confidence: this is analysis, not prescription. All five options
are defensible; the right one depends on facts about the market
and about the founder that I don't have.*

Five options, in rough order of engineering effort.

### Option A — Phase 2 as originally planned

Web frontend, `qf.js` becomes an API route, same underlying product.

**Who it's for:** sole traders who want a faster interface than a
terminal.

**Honest assessment:** Perfectly buildable. Adds real value
(persisted trader identity, better UX). But doesn't fundamentally
change what QuoteFetch is — makes the existing thing more usable.
Doesn't address the biggest gap (real prices) until Phase 3.
Doesn't shift to a category with clearer willingness-to-pay.

### Option B — Pivot to inbound-lead positioning

Rebuild the entry point: trader gets a QuoteFetch email address they
publish. Enquiries come in, QuoteFetch drafts, trader approves via
a link, quote goes out.

**Who it's for:** sole traders drowning in enquiries they can't
respond to fast enough.

**Honest assessment:** Much sharper pitch ("never miss a lead" is
a real promise; "type a job description and get a quote" is a
feature). Higher engineering cost — email intake, approval flows,
sending from a QuoteFetch address on the trader's behalf.
Deliverability and trust questions.

**Risk:** building the *idea* rather than a next iteration of what's
been validated. If Phase 1 isn't yet in the hands of real traders
getting real value, pivoting now is building on speculation.

### Option C — Paid pilot before more engineering

Instead of building Phase 2, put Phase 1 in front of 5-10 real
traders. Charge £20/month. Have them use the CLI (with handholding).
Find out what they actually want. Then build Phase 2 based on what
you learn.

**Who it's for:** the founder, trying to figure out what to build.

**Honest assessment:** This is what "talk to customers first" looks
like in practice. Doesn't feel like progress — no new code. But it
converts the biggest risk (building the wrong thing) into signal
you can act on.

**Risk:** the CLI is genuinely too rough for most traders. You'd
need to handhold or wrap it in the thinnest possible web UI to
enable the pilot. But that's much cheaper than a full Phase 2.

### Option D — Reposition as B2B feature

Sell the quote-drafting engine as a feature to be embedded in
existing products. Powered Now, Checkatrade, or a builders'
merchant could plausibly want "AI-drafted quote from job
description" as a feature.

**Who it's for:** not tradespeople, but companies who serve them.

**Honest assessment:** Higher-value contracts, dramatically fewer
of them, longer sales cycle. Fundamentally different business model.

**Risk:** can spend six months in sales conversations to close one
deal, with no consumer traction to point at.

### Option E — Verticalise on one trade

QuoteFetch supports multiple trades. Instead, do only electricians —
with a real, verified electrical wholesaler price feed, EICR
awareness, Part P as context (not compliance claims), and direct
competition to Elec-Mate.

**Who it's for:** electricians who need to quote fast and accurately.

**Honest assessment:** Verticalisation trade — smaller market,
deeper value. Real prices become tractable when scoped to one
supplier ecosystem. Might command higher pricing.

**Risk:** commit to a specific competitor and market segment. Wrong
pick and you have to unwind.

### The recommendation captured in the build brief

`phase-2-brief.md` implements a variant of **Option A**, but with a
specific emphasis: build the *trader identity layer* (which
addresses two of the biggest current gaps at once — no trader
context, unreliable prices) and a *lightweight UI* to make Phase 1
usable without a terminal. The scraper is deliberately deferred.

The reasoning for that recommendation is in section 4 below.

---

## 4. Why not build real prices next

*Confidence: high on the arguments, medium on the specifics of
each merchant's anti-bot posture (they change).*

The Phase 3 plan — replace `tools/lookup-price.js` with a Playwright
scraper — is architecturally elegant. The seam exists. It looks like
the natural next step. But the implementation cost is much higher
than it appears and the value depends on positioning.

### The real cost of a scraper

- **Anti-bot detection.** Screwfix, Toolstation, City Plumbing use
  Cloudflare, Akamai, and fingerprinting-based mitigations. A naive
  Playwright scraper works for a week, then starts getting CAPTCHAs,
  then rate-limits, then IP-bans. You end up running headed browsers
  or paying for residential proxy pools ($200-500/month at low
  volume). Ongoing cost, not fixed engineering cost.
- **Site structure changes.** A merchant redesigns a category page,
  the selector breaks, quotes are wrong for hours until someone
  fixes it. Needs monitoring, alerting, on-call rotation. If you're
  a solo founder, you're that rotation.
- **Legal exposure.** Scraping public prices isn't illegal in the
  UK (broadly), but is often against terms of service. Nobody sues
  at small scale; at visible success, the legal picture gets
  uncomfortable.
- **Price accuracy is nuanced.** Traders pay their own account
  prices, not public rates. Scraping public prices delivers only
  one price shape, and it's not the most useful one. A trader with
  a City Plumbing account pays 15-30% less than the public rate,
  and a quote priced at public rates makes them look expensive.
- **Product matching is the harder half.** "40mm compression
  fitting" is dozens of variants across brands, materials, pack
  sizes. Getting the wrong one is worse than a placeholder.

### The value of real prices depends on positioning

- **For the CLI/web product** (Option A): real prices are a
  nice-to-have. The trader can currently spot-check and send.
  Reducing that friction is valuable but not decisive.
- **For the inbound-lead-response product** (Option B): real prices
  are load-bearing. If the trader has to check every price, the
  whole "responds fast so you win the job" pitch collapses.

So "should we build real prices" is really "which product are we
building." Under Option A, the trader's own historical prices (from
Phase 2a in the build brief) address most of the pain without a
scraper.

### Alternatives that get most of the value

Three cheaper approaches in the build brief, in rough order of
sophistication:

1. **Get real prices from the trader**, once, by importing their
   past quotes. Prices become the trader's own vetted rates. This
   is what Phase 2a does. Engineering cost: 1-2 weeks. Ongoing cost:
   near zero.
2. **One supplier via a real integration.** Some UK trade merchants
   have affiliate program APIs. Legitimate feed, no anti-bot war,
   one supplier. Engineering: hours to days once you have access.
   Getting access is business development, not engineering.
3. **Scrape opportunistically, cache aggressively.** Only scrape
   when a trader asks, cache for a week, hand-verify. Turns
   "operational scraping at scale" into "occasional lookups with
   quality checks" until volume justifies proper infrastructure.

### The uncomfortable meta-question

"Should I build the scraper" can secretly mean "I've been building
this a while, the scraper is the obvious hard problem, solving hard
problems feels like progress." This is a real trap.

Building the hard technical thing feels like moving forward. Often
the more useful thing is smaller, less impressive, more directly
connected to a paying customer. The trader who won't pay you today
won't be persuaded by better prices tomorrow if the underlying
value proposition isn't landing.

---

## 5. Technical observations from the handoff

*Confidence: from the handoff doc, not from reading the code
directly. Anything below that turns out to be wrong is a doc-vs-
code mismatch worth capturing separately.*

Things worth noting about the codebase as of the handoff.

### Strengths

- **Deliberate reuse boundary at `agent.js`.** The generic agent
  loop with zero domain logic is a good design decision. It makes
  Phase 2 (web frontend) reuse cheap and Phase 3 (scraper swap) low-
  risk. Worth protecting in any future work — don't drift domain
  logic into `agent.js`.
- **Never-do rules enforced in two places.** The
  `NEVER_DO_RULES`/prompt-level enforcement plus the code-level
  post-filter in `tools/identify-materials.js` is the right pattern
  for safety-critical constraints. Trust the model for style,
  belt-and-braces for anything that matters.
- **Single choke point for tool errors** (`executeTool` in
  `tools/index.js`). Structured `{ error: true, message }` returns
  let Claude adapt to failures mid-run instead of crashing. Good
  design.
- **Centralised Anthropic client** with retry/backoff, timeout,
  `TruncatedResponseError` on `max_tokens`. Good discipline. The
  truncation-throws-rather-than-silently-accepts pattern is
  particularly valuable — silent truncation is a category of bug
  that's hard to notice in production.
- **Multiple tool calls per turn handled correctly.** All
  `tool_result` entries returned in a single message, as required
  by the API.
- **Devcontainer `remoteEnv=""` handling in `qf.js`.** Small but
  thoughtful — pre-`dotenv` env var handling stops the empty-string
  default from suppressing the real value. Easy to break in a
  refactor; worth preserving.

### Potential concerns (from doc only, not verified in code)

- **No automated tests.** Handoff acknowledges this. Three manual
  CLI test cases in README. Fine for Phase 1; risky for anything
  that ships.
- **Fuzzy-match score threshold of 40** in `lookup-price.js`. Is
  this the right number? Would need real-usage data to know if it
  over- or under-matches. Worth measuring once real trader queries
  exist.
- **Post-filter skip-keyword list** in `identify-materials.js`.
  How exhaustive is it? Are there materials that legitimately match
  a skip keyword? Unclear from the doc alone; worth reviewing.
- **50 sample prices, all unverified.** Not a bug — a deliberate
  Phase 1 state. But every quote's `verified: false` note is a
  reminder that the product currently produces "please double-check"
  outputs, not "send as-is" outputs.
- **`prompts/02_QF_KNOWLEDGE_BANK.md` at 828 lines.** Doing a lot
  of work; hard to review without reading. Worth periodic pruning
  to check what's still authoritative vs what's aspirational.
- **`prompts/03_QF_AGENT_PROMPT.md` at 558 lines** — described as
  "original agent prompt design doc." If it's a historical artefact,
  worth marking as such so future readers don't treat it as current
  spec.

### Design decisions worth capturing

Things that appear intentional but are easy to lose in a refactor:

- **Plain ESM, no build step.** Fast to iterate, no bundler
  configuration to maintain. Preserve unless there's a specific
  reason to introduce a build step.
- **No markdown tables in quote output.** Deliberate — must paste
  cleanly into email clients. Any future PDF export should preserve
  this constraint.
- **Section order in `save-quote.js` is fixed.** Not model-driven.
  This is a good idea — the model can pick section content freely,
  but the structure is a hard constraint.
- **`sample-prices.json` sorted priority-first.** Not alphabetical.
  Consumer units, MCBs, copper pipe, etc. first. Presumably reflects
  common query patterns; worth preserving unless there's a reason to
  change.

---

## 6. Open questions for the founder

*Not for Claude Code to answer — for future decisions.*

These questions don't have engineering answers. They need
founder-level judgement, ideally informed by conversations with
real traders.

- **Which of the five options is QuoteFetch actually pursuing?**
  The build brief commits to a variant of Option A. That's a bet.
  If the answer should be Option B, C, or E, the build brief is
  wrong.
- **How many real traders have used Phase 1?** If zero, the
  question above should be answered by conversations with traders
  before building further, not by reasoning.
- **What's the target: lifestyle business, VC-scale startup, or
  something in between?** The strategic options aren't equally
  suited to each. Option E (verticalised) is a good lifestyle-
  business bet; Option D (B2B) is a good startup bet; Option B
  (inbound-lead) sits between.
- **What's the founder's actual availability?** A solo founder
  running Phase 2 + selling + supporting real customers is a lot.
  A solo founder building Phase 3 (the scraper) *and* everything
  above is too much.
- **Is there an existing merchant relationship?** Any warm contact
  at Screwfix, Toolstation, City Plumbing, or a wholesaler makes
  Option E or the "one supplier real integration" path
  dramatically more tractable.

---

## 7. What this document is not

Honest limits worth naming:

- **Not a market analysis.** The competitor list is from general
  knowledge, not primary research. Numbers, market sizes, and
  exact feature comparisons should be verified before commitment.
- **Not a code review.** Everything in section 5 is from the
  handoff doc, not from reading the code. Anything that turns out
  to be wrong when checked against the actual code is a
  doc-vs-code mismatch worth capturing.
- **Not a business plan.** The strategic options are directional,
  not detailed. Turning any of them into a real plan needs pricing
  work, customer discovery, and probably a period of hand-selling
  to test the pitch.
- **Not authoritative.** The reasoning is transparent so it can be
  challenged. If any conclusion here contradicts what you've seen
  from actual traders, trust the traders.

---

*End of analysis document. See `phase-2-brief.md` for the
implementation plan derived from these findings.*