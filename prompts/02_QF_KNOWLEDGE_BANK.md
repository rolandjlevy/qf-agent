# QuoteFetch — Knowledge Bank

> Extracted from the original three-stage workflow codebase on 2026-06-24.
> Used as source-of-truth for the agentic rebuild.
> Content only — no architecture, no orchestration.

---

## 1. Trade List

Source: `data/trades.json` (verbatim)

| id | label |
|---|---|
| `bathroom-fitter` | Bathroom Fitter |
| `builder` | General Builder |
| `carpenter` | Carpenter |
| `driveway-specialist` | Driveway & Paving Specialist |
| `electrician` | Electrician |
| `flooring-fitter` | Flooring Fitter |
| `gas-engineer` | Gas Engineer |
| `glazier` | Glazier / Window Fitter |
| `groundworker` | Groundworker |
| `handyman` | Handyman |
| `kitchen-fitter` | Kitchen Fitter |
| `gardener-landscaper` | Gardener / Landscaper |
| `decorator` | Painter & Decorator |
| `plasterer` | Plasterer |
| `plumber` | Plumber |
| `roofer` | Roofer |
| `tiler` | Tiler |

17 trades total. The `id` values are what flows through prompts and validation (e.g. `TRADE: electrician`). The `label` values are user-facing only.

---

## 2. Tone Definitions

Source: `data/tones.json` (verbatim)

### friendly
**Label:** Friendly & Professional
**Description (shown to user):** "Warm and approachable while remaining businesslike — the right fit for most domestic clients"
**Prompt usage:** `Use ${tone} language throughout` — the word "friendly" is passed directly to Claude.

### formal
**Label:** Formal
**Description (shown to user):** "Traditional business language for commercial, corporate, or high-value contracts"
**Prompt usage:** The word "formal" passed to Claude.

### direct
**Label:** Direct & Concise
**Description (shown to user):** "Plain-speaking and no-nonsense — gets straight to the point without filler"
**Prompt usage:** The word "direct" passed to Claude. (Note: the id is `direct` — not "direct & concise".)

### persuasive
**Label:** Confident & Persuasive
**Description (shown to user):** "Emphasises expertise and value — ideal when quoting competitively"
**Prompt usage:** The word "persuasive" passed to Claude. (Note: the id is `persuasive` — not "confident & persuasive".)

> The tone string fed into the Claude prompt is always the **id**, not the label. Both the introduction section and the assembly step are instructed to "Use ${tone} language throughout." No explicit per-tone wording rules exist in the codebase beyond the user-facing description strings above — Claude interprets each tone label using its own knowledge.

---

## 3. Quote Section Specifications

Source: `lib/prompts/generateQuote.ts`

The sections are generated as a JSON object with exactly these seven keys. The key names are camelCase and must match verbatim for downstream parsing.

---

### introduction

**Purpose:** Opens the quote with a greeting and job summary.

**Original prompt text:**
```
"2–3 sentences: ${tone} greeting and a single-sentence summary of the work. No more than 50 words."
```

**Rules:**
- Tone-adaptive greeting
- Maximum 50 words
- Summarises the work in one sentence
- No prices, no compliance claims

---

### scopeOfWork

**Purpose:** Lists the main tasks to be performed.

**Original prompt text:**
```
"Bullet list of the main tasks only — no sub-bullets, no padding. 6–8 items maximum. Around 120 words."
```

**Rules:**
- Flat bullet list only (no nested bullets)
- 6–8 items maximum
- ~120 words target
- No filler or padding
- Safety considerations for the trade included "where genuinely applicable"

---

### materials

**Purpose:** Lists physical materials and equipment, with price placeholders.

**Original prompt text:**
```
"Bullet list of physical materials and equipment to be purchased for this job
(NO PRICES - use '[PRICE TO BE CONFIRMED]' after each item). 4–6 items maximum.
Each line must be ONE specific, purchasable product — no 'or' alternatives,
no disposal fees, no hire costs, no utility charges, no service items.
Do NOT bundle multiple items on one line. Do NOT use markdown tables."
```

**Rules:**
- Every item ends with the exact string `[PRICE TO BE CONFIRMED]`
- 4–6 items maximum
- Each line = exactly one purchasable product
- No "X or Y" phrasing (the scraper cannot handle ambiguous items)
- No disposal fees, hire costs, utility charges, or service items (not purchasable from suppliers)
- No markdown tables
- No bundling ("screws and wall plugs" → two separate lines)

**Critical:** The placeholder string is `[PRICE TO BE CONFIRMED]` — all caps, square brackets, exact wording. The scraper parses for this exact string.

---

### assumptions

**Purpose:** States what the quote assumes to be true about the job.

**Original prompt text:**
```
"3–4 bullet points covering the most important assumptions. Around 60 words."
```

**Rules:**
- 3–4 bullet points
- ~60 words
- Covers what is assumed true (site conditions, access, customer-provided items, etc.)

---

### exclusions

**Purpose:** Explicitly states what is NOT included in the quote.

**Original prompt text:**
```
"3–4 bullet points of what is explicitly not included. Around 50 words."
```

**Rules:**
- 3–4 bullet points
- ~50 words
- Protects the tradesperson from scope creep

---

### nextSteps

**Purpose:** Tells the customer what happens next.

**Original prompt text:**
```
"2–3 bullet points on next actions. Around 50 words."
```

**Rules:**
- 2–3 bullet points
- ~50 words
- Action-oriented; guides the customer toward acceptance

---

### disclaimers

**Purpose:** Legal/professional boilerplate for the quote.

**Original prompt text:**
```
"Professional disclaimers (quote validity, subject to site inspection, customer acceptance, etc.)"
```

**Rules:**
- Generated by Claude unless the user has provided `customDisclaimers`
- If `customDisclaimers` is provided in the input, the prompt says: *"Use it as the disclaimers section content"* — Claude does not override it
- No compliance claims; no guaranteed outcomes

---

### Output format for the assembled document

Source: `lib/assembleQuoteText.ts`

The plain-text document assembled for copy/download follows this exact structure:

```
[BUSINESS NAME]
[CONTACT DETAILS]

Date: [date in "d MMMM yyyy" format, e.g. "24 June 2026"]

Dear [customerName],     ← omitted entirely if no customerName
[introduction text]

SCOPE OF WORK
[scopeOfWork text]

MATERIALS & EQUIPMENT
[materials text]

ASSUMPTIONS
[assumptions text]

EXCLUSIONS
[exclusions text]

NEXT STEPS
[nextSteps text]

DISCLAIMERS
[disclaimers text]
```

Section headings are all-caps. No trailing newline (`.trimEnd()`). The business header fallbacks are `[YOUR BUSINESS NAME]` and `[YOUR CONTACT DETAILS]`.

---

## 4. Disclaimer Text (verbatim)

### In-quote warning shown to the user before copy/download

Source: `components/quotes/QuoteOutput.tsx` — the "Important - Please Read" card:

```
• This quote is AI-generated and may contain errors or omissions
• You must review and edit all details before sending
• You are fully responsible for prices, measurements, and all content
• QuoteFetch is not liable for any outcomes or decisions based on this quote
```

### Before-use checklist (shown alongside the quote)

```
□ Review all work items for accuracy and completeness
□ Add or confirm all prices (AI does not generate prices)
□ Check assumptions and exclusions are appropriate
□ Verify any measurements or specifications
□ Add your business contact details
□ Ensure compliance with any relevant regulations for your trade
```

### Terms & Conditions (verbatim from `TermsModal.tsx`)

**Key Points Summary:**
```
• AI-generated quotes are drafts only
• You are fully responsible for all content and outcomes
• QuoteFetch provides no guarantees or warranties
• You must verify all information before use
• QuoteFetch is not liable for any losses or damages
```

**Full terms text:**

**1. Service Description**
QuoteFetch is an AI-powered tool that generates draft quotes for tradespeople. All quotes are drafts that require review, editing, and approval by you before use.

**2. Your Responsibility** — You are solely responsible for:
- Reviewing and verifying all quote content
- Adding accurate prices and measurements
- Ensuring compliance with relevant regulations
- All decisions based on generated quotes
- Any outcomes from using the quotes

**3. No Guarantees** — QuoteFetch makes no warranties about:
- Accuracy or completeness of generated content
- Suitability for any particular purpose
- Compliance with laws or regulations
- Professional or technical correctness

**4. AI Limitations** — AI-generated content may contain:
- Errors, omissions, or inaccuracies
- Incomplete or outdated information
- Inappropriate suggestions for your specific situation
- Content that requires professional verification

**5. Limitation of Liability** — QuoteFetch and its operators are not liable for:
- Any losses or damages from using generated quotes
- Incorrect pricing, measurements, or specifications
- Disputes with customers or regulatory issues
- Business losses or missed opportunities
- Any direct, indirect, or consequential damages

**6. Professional Advice** — QuoteFetch does not provide:
- Legal advice or regulatory guidance
- Technical or professional expertise
- Business or financial advice
- Guarantees of customer acceptance

**7. Your Acknowledgment** — By using QuoteFetch, you acknowledge that:
- You have read and understood these terms
- You accept full responsibility for using generated quotes
- You will verify all content before sending to customers
- You understand the limitations of AI-generated content

**8. Changes to Terms**
We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of modified terms.

### Price-sourcing caveat (appended to the materials section after price enrichment)

When prices are found:
```
Price estimates sourced from: [Supplier1, Supplier2] — verify all prices before quoting
```

When some items remain unpriced after enrichment:
```
Price estimates sourced from: [Supplier1] (N item[s] still unpriced — add manually)
```

When a price is inStock=false, the inline replacement reads:
```
£12.99 (Screwfix, check stock) — https://...
```

---

## 5. Validation Rules

Source: `lib/validation.ts` (Zod schemas)

### GenerateQuoteSchema — the primary quote input

| Field | Type | Required | Constraints |
|---|---|---|---|
| `trade` | string | Yes | min 1 char |
| `tone` | string | Yes | min 1 char |
| `jobDescription` | string | Yes | min 10 chars, max 3000 chars |
| `propertyType` | string | No | optional |
| `accessNotes` | string | No | optional |
| `urgency` | string | No | optional |
| `location` | string | No | optional |
| `customerName` | string | No | optional |
| `budgetRange` | string | No | optional |
| `timeline` | string | No | optional |
| `propertyAge` | string | No | optional |
| `knownIssues` | string | No | optional |
| `existingSetup` | string | No | optional |
| `followUpAnswers` | `Record<string, string>` | No | optional; key = questionId, value = answer text |

The form submit button is disabled client-side until: `trade`, `tone`, and `jobDescription >= 10 chars` are all filled. The 3000-char max is enforced both client-side (textarea `maxLength`) and server-side (Zod).

### UserProfileSchema — saved business settings

| Field | Type | Required | Constraints |
|---|---|---|---|
| `businessName` | string | No | max 100 chars |
| `contactDetails` | string | No | max 500 chars |
| `defaultTrade` | string | No | optional |
| `defaultTone` | string | No | optional |
| `defaultDisclaimers` | string | No | max 1000 chars |

### RegisterSchema

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | Yes | valid email |
| `password` | string | Yes | min 8 chars |
| `confirmPassword` | string | Yes | must match `password` |

### Follow-up questions format

The questions Claude returns must conform to this shape (validated implicitly by the UI's renderer, not a Zod schema):

```json
[
  {
    "id": "q1",
    "question": "string",
    "type": "text" | "textarea" | "select" | "checkbox",
    "options": [{ "id": "string", "label": "string" }],  // required for select/checkbox
    "placeholder": "string",  // optional, for text/textarea only
    "required": true | false
  }
]
```

Rules from the prompt:
- 3–5 questions total
- First 2 questions: `required: true`; remaining: `required: false`
- `select` and `checkbox` must have an `options` array
- `select` should include `{ "id": "other", "label": "Other" }` as last option when free text might be needed
- `placeholder` only on text/textarea types
- `checkbox`: multiple options may apply simultaneously
- `select`: exactly one option applies

---

## 6. Material Taxonomy

Source: `lib/scraper/integration.ts` — SKIP_KEYWORDS and parseItemName

### Terms that produce meaningless search results (never price these)

The scraper explicitly skips any materials line whose name matches one of these patterns:

**Generic/vague terms:**
```
sundry, sundries, consumables, miscellaneous, general materials,
general supplies, minor materials, various, assorted
```

**Non-purchasable service/cost items:**
```
disposal fee, disposal cost, hire cost, hire fee, rental cost,
rental fee, skip hire, waste disposal, collection fee
```

### Item name parsing rules (what constitutes a valid search term)

From `parseItemName()` in integration.ts:

1. Strip leading bullet (`-`, `*`, `•`)
2. Strip the `[PRICE TO BE CONFIRMED]` placeholder
3. Strip parenthetical notes in `(...)` — e.g. "(colour TBC)"
4. Strip trailing qualifiers: `as required`, `if needed`, `as applicable`, etc.
5. Strip installation qualifiers: `suitable for X`, `for stud mounting`, `for masonry fixing`, etc.
6. Strip trailing colons, dashes, em-dashes
7. Strip curly quotes / inch-marks that Claude sometimes emits
8. Collapse whitespace

**Then reject if:**
- Name is fewer than 4 characters
- Name matches any SKIP_KEYWORDS entry (word-boundary match)
- Name contains ` or ` — ambiguous alternatives; scraper picks the wrong product
- Name has 2+ commas, or 1+ comma AND ` and ` — compound items

### Supplier coverage

Three UK suppliers are scraped:

| Supplier | Domain | Method | Confidence (hardcoded) |
|---|---|---|---|
| Screwfix | screwfix.com | DOM selectors + product redirect detection | 0.95 |
| Toolstation | toolstation.com | XHR interception (`/api/search/crs` JSON) | 0.95 |
| B&Q | diy.com | JSON-LD `<script type="application/ld+json">` | 0.90 |

B&Q is slightly lower confidence because JSON-LD availability depends on the page type and product.

### Price enrichment item name cleanup — patterns stripped (regex)

```
trailing qualifiers:  /\b(as|if|where)\s+(required|needed|applicable|necessary|warranted)\b.*$/i
installation notes:   /\s+(?:suitable\s+for\b|for\s+(?:stud|masonry|timber|brick|concrete|plasterboard)\s+(?:mounting|fixing|installation|use)\b).*/i
```

> There is no pre-built material taxonomy file in the codebase. Materials are generated dynamically by Claude per job. The taxonomy knowledge lives in the skip-list and parsing rules above, plus the "never do" rules in section 8.

---

## 7. Edge Cases & Workarounds

### Claude wrapping JSON in markdown fences

**Symptom:** `JSON.parse(responseText)` throws even when Claude was instructed to return only JSON.
**Cause:** Claude sometimes wraps output in ` ```json ... ``` ` fences despite explicit instructions not to.
**Fix:** Always extract with regex before parsing:
- For JSON objects: `/\{[\s\S]*\}/`
- For JSON arrays: `/\[[\s\S]*\]/`

This pattern is used in: the sections call, the follow-up questions call, and the agentic scraper's price extraction call.

---

### Empty or unparseable follow-up questions response

**Symptom:** Claude returns an empty string, malformed JSON, or an array with zero items.
**Cause:** Occasionally Claude misunderstands the prompt or the job description is very simple.
**Fix:** If the response is empty or unparseable, skip the follow-up questions step entirely and proceed straight to quote generation. Do not block the user.

---

### Screwfix direct product page redirect

**Symptom:** A search URL navigates directly to a product detail page (URL contains `/p/`) instead of a search results page.
**Cause:** Screwfix redirects single-match searches to the product page.
**Fix:** Detect `page.url().includes('/p/')` after navigation. On a product page, wait for the price element to contain non-empty text (React hydration delay), then extract differently. Do not wait 8s for the product-card selector that will never appear.

---

### Toolstation SPA crash under concurrency

**Symptom:** Multiple simultaneous Toolstation page loads crash Chromium (OOM or render process failure).
**Cause:** Toolstation's Bloomreach/Hawksearch SPA fires XHR calls that exhaust render process resources when 2+ pages are open simultaneously.
**Fix:** Serialise all Toolstation requests with a promise-chain mutex (`withToolstationLock`). Only one Toolstation context may be open at a time.

---

### Multi-browser concurrency RAM exhaustion

**Symptom:** Codespaces crashes at 3 concurrent `chromium.launch()` calls.
**Cause:** Each Playwright browser is a full Chromium process.
**Fix:** Never run multiple `chromium.launch()` calls concurrently. Open **one** browser per enrichment job and create multiple contexts within it. Multiple contexts within one browser are safe and required for performance.

---

### Cloudflare / WAF bot challenge on Screwfix

**Symptom:** The scraper navigates to a page with title matching `just a moment|access denied|forbidden|are you a human|captcha|ddos`.
**Cause:** Screwfix's CDN detects the scraper as a bot.
**Fix:** Check `page.title()` immediately after navigation. If it matches, return null immediately — do not wait 8s for product selectors.

---

### Claude fallback on CAPTCHA/error pages

**Symptom:** The hardcoded scraper returns null; the Claude fallback is called; Claude is given a CAPTCHA page and cannot find a price.
**Cause:** Supplier bot-blocked the page before hardcoded selectors had a chance.
**Fix:** Before calling the Claude price extraction, classify the page with `analyzePageStructure()`. Skip Claude only if `pageType === 'captcha'` or `pageType === 'error'`. Do NOT skip on `pageType === 'unknown'` — SPAs look opaque in their first few KB and would be incorrectly skipped.

---

### Toolstation XHR timing

**Symptom:** Toolstation's API call fires after `domcontentloaded`, so no API data is available immediately.
**Cause:** Toolstation is a Bloomreach SPA; product data comes from an XHR to `/api/search/crs`, not the initial HTML.
**Fix:** Intercept the `/api/search/crs` response with `page.on('response', ...)` before navigating. Add a 7-second fallback timeout — if no XHR fires (no results case), resolve anyway.

---

### B&Q product page redirect

**Symptom:** B&Q search URL redirects to a single product page (type `Product`) instead of a listing (type `ItemList`).
**Cause:** B&Q redirects single-match searches to the product page.
**Fix:** The B&Q scraper handles both JSON-LD types: `ItemList` (search results) and `Product` (redirect). Check `data['@type']` to branch correctly.

---

### Screwfix price element has mixed text content

**Symptom:** Extracting `priceEl.textContent` returns "£12.99Inc Vat" — parse fails or gets wrong value.
**Cause:** The price element contains a child `<span>Inc Vat</span>` alongside the price text.
**Fix:** Use `priceEl.childNodes[0]?.textContent?.trim()` to get only the first text node (the price), not the full element text.

---

### Timeout returning partial enrichment

**Symptom:** Some materials remain unpriced after the 35-second scrape window.
**Cause:** Too many materials, slow supplier responses, or Toolstation fallback needed.
**Fix:** The enrichment function uses `Promise.race()` between the actual work and a 35s timeout. The timeout resolves with whatever partial enrichment has accumulated so far. The caveat "(N items still unpriced — add manually)" is appended to the result.

---

### Items staggered to avoid simultaneous supplier requests

**Cause:** Multiple items scraping in parallel within one browser would hit the same supplier simultaneously.
**Fix:** Each item is delayed by `index * 1500ms` before starting. This staggers requests so no supplier sees simultaneous hits from the same session.

---

### Toolstation `sale_price` vs `price`

**Symptom:** Wrong price shown — original price used instead of sale price.
**Cause:** Toolstation's API returns both `price` (original) and `sale_price` (current selling price).
**Fix:** Use `first.sale_price ?? first.price` — prefer `sale_price` when present.

---

## 8. "Never Do" Rules

Source: `lib/prompts/system.ts`, `lib/prompts/generateQuote.ts`, `ARCHITECTURE.md`, `CLAUDE.md`

These are the rules Claude must never violate, and they must survive the rebuild:

### Never generate prices

Claude must **never** generate, suggest, or estimate prices, costs, or monetary amounts. Materials always use the exact placeholder `[PRICE TO BE CONFIRMED]`. Real prices are sourced externally (supplier scraping or Tavily) and inserted afterward as a separate, clearly-sourced step.

This is a safety guardrail — not a UX choice. An incorrect AI-invented price that a tradesperson sends to a customer without checking could result in financial loss or a dispute.

### Never claim regulatory compliance

Claude must **never** claim legal compliance, regulatory adherence, or guarantee that work will comply with specific regulations (e.g. "This work will comply with Part P" or "This meets BS 7671").

### Never guarantee outcomes

Claude must **never** guarantee outcomes or results (e.g. "This will fix your damp problem"). The quote is a draft.

### Never use markdown tables

No markdown tables anywhere in quote output. Quote text must paste cleanly into email clients, which do not render markdown tables. Use bullet point lists only.

### Never generate prose assembly with JSON formatting

The assembly call (which turns sections into a flowing document) must return **plain text**, not JSON. The output goes directly to the user.

### Never return error.message to the client

Server-side errors must be logged with `console.error` and a fixed string returned to the client. Never surface internal error messages to users.

### Never use "or" alternatives in materials lines

Materials must be single specific products. "Copper pipe or plastic push-fit" is forbidden — the scraper cannot handle ambiguous items and will return the wrong product.

### Never bundle multiple products on one materials line

"Screws and wall plugs" must be two separate lines. The scraper matches one line to one search query.

---

## 9. Hard-Won Scraping Constraints

Source: `lib/scraper/utils.ts`, `lib/scraper/integration.ts`, `lib/scraper/self-healing-scraper.ts`, `ARCHITECTURE.md`

These constraints were each learned from a real failure. Violating any of them restores the failure.

---

### Set User-Agent via `browser.newContext({ userAgent })`, not `page.setExtraHTTPHeaders()`

**Rule:** Always set the user agent at context creation: `browser.newContext({ userAgent: SCRAPER_USER_AGENT })`.
**Never use:** `page.setExtraHTTPHeaders({ 'User-Agent': '...' })`.
**Why:** Screwfix, Toolstation, and B&Q all perform JS-side UA checks. `setExtraHTTPHeaders` only sets the HTTP header — `navigator.userAgent` in JavaScript still returns the Chromium default, which may differ. `newContext({ userAgent })` sets both consistently.

**User-Agent in use:**
```
Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
```

**For robots.txt fetches**, use the honest bot identity instead:
```
QuoteFetch/1.0 (+https://quotefetch.com; help@quotefetch.com)
```

---

### Never run multiple `chromium.launch()` calls concurrently

**Rule:** Open exactly one browser per enrichment job. All scraping for all materials happens within that single browser via multiple contexts.
**Why:** Three concurrent `chromium.launch()` calls exhausted RAM and crashed Codespaces. Each Playwright browser is a full Chromium process.
**Multiple contexts within one browser are safe** and required for parallelism.

---

### Toolstation must go through the `withToolstationLock` mutex

**Rule:** Every Toolstation scrape call must be wrapped in `withToolstationLock()`.
**Why:** Toolstation's Bloomreach/Hawksearch SPA crashes Chromium when 2+ page contexts are open simultaneously. The mutex is a promise chain that guarantees only one Toolstation context is ever active at a time.
**Implementation:** The lock uses promise chaining — the lock promise is replaced with the in-flight promise every time a new request arrives. This ensures requests queue correctly even if they arrive before the previous one completes.

---

### Never block stylesheets in Playwright route filtering

**Rule:** Block `image` and `media` resource types only. Never block `stylesheet`.
**Why:** Toolstation and B&Q (both JS-framework apps — Nuxt/React) depend on CSS being loaded to trigger their hydration and fire their XHR/API calls. Blocking stylesheets prevents their data APIs from ever being called, resulting in empty pages.
**Correct route filter:**
```js
if (['image', 'media'].includes(resourceType)) { route.abort() } else { route.continue() }
```

---

### Retries are disabled for Screwfix and B&Q

**Rule:** Both Screwfix and B&Q scrapers use `withRetry(..., 0)` — zero retries.
**Why:** The two main failure modes are structural:
1. Bot-block / Cloudflare challenge — retrying the same request hits the same block.
2. JSON-LD not found / no product card — the page doesn't have the data; retrying won't add it.
Retrying wastes time without improving outcomes.

---

### Toolstation: wait for XHR before reading results

**Rule:** Intercept the `/api/search/crs` response before navigating. Add a 7-second timeout as a fallback.
**Why:** Toolstation renders search results from an XHR that fires after `domcontentloaded`. There is no DOM element to wait for — the page may appear loaded but the product data hasn't arrived.
**Render wait:** After `domcontentloaded`, the self-healing scraper waits an extra **4,000ms** for Toolstation (vs 1,000ms for Screwfix and 2,000ms for B&Q) before capturing page HTML for the Claude fallback.

---

### Screwfix's bot-challenge detection

**Rule:** Check `page.title()` immediately after navigation. If it matches `/just a moment|access denied|forbidden|are you a human|captcha|ddos/i`, return null immediately.
**Why:** Cloudflare JS-challenges never contain product data. Waiting for the product-card selector burns 8 seconds before timing out.

---

### Toolstation `sale_price` takes precedence over `price`

**Rule:** Always use `first.sale_price ?? first.price` from Toolstation's API response.
**Why:** Toolstation's `/api/search/crs` response includes both `price` (RRP) and `sale_price` (current selling price). Using `price` instead of `sale_price` shows the wrong (higher) price.

---

### B&Q uses JSON-LD, not CSS selectors

**Rule:** Extract B&Q prices from `<script type="application/ld+json">` blocks only.
**Why:** B&Q's product prices are available in structured JSON-LD embedded in the page for SEO purposes. This is more reliable than CSS selectors because the structured data survives layout redesigns. B&Q can return either an `ItemList` (search results) or a `Product` (redirect) — handle both.

---

### CAPTCHA/error pages: skip Claude fallback, but not on "unknown"

**Rule:** Call `analyzePageStructure()` before the Claude price-extraction call. Only skip extraction if `pageType === 'captcha'` or `pageType === 'error'`. Do **not** skip on `pageType === 'unknown'`.
**Why:** SPAs (like Toolstation) often look opaque in the first few KB of HTML that page classification sees. Classifying them as "unknown" is correct — but earlier versions of the code skipped Claude on "unknown" too, which caused Toolstation fallback to never fire even on valid pages.

---

### HTML preprocessing before Claude extraction

**Rule:** Strip `<script>` tags (except `application/ld+json`), `<style>`, `<svg>`, and HTML comments before sending to Claude. Truncate to 15,000 characters.
**Why:** Raw HTML is too large for the context window and filled with irrelevant noise (analytics scripts, CSS, SVG icons). Keeping JSON-LD scripts preserves supplier structured data that Claude can extract prices from directly.

**Preprocessing regex chain:**
```js
.replace(/<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, '')
.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
.replace(/<!--[\s\S]*?-->/g, '')
.replace(/\s{2,}/g, ' ')
.slice(0, 15_000)
```

---

### Claude scraper model: Haiku, not Sonnet

**Rule:** Use `claude-haiku-4-5-20251001` for scraper HTML extraction. Override with `CLAUDE_SCRAPER_MODEL` if needed.
**Why:** Haiku is more than capable for HTML extraction and is approximately 4× cheaper than Sonnet per call. Each scrape attempt costs ~$0.004 with Haiku.

**Confidence threshold:** Claude returns a 0–1 confidence score. Results below **0.70** are discarded. The hardcoded scrapers emit **0.95** (Screwfix/Toolstation) or **0.90** (B&Q) for successful clean matches.

---

### robots.txt compliance

**Rule:** Check robots.txt before every scrape request. Cache the result for 1 hour. Set `SCRAPER_IGNORE_ROBOTS_TXT=true` to bypass (requires reviewing each supplier's ToS first).
**Why:** All three suppliers disallow `/search` under `User-agent: *`. The env-var bypass is intentional but must be an explicit opt-in decision, not a default.

---

### Price cache TTL: 24 hours by default

**Rule:** Cached prices expire after 24 hours. Override with `PLAYWRIGHT_CACHE_MAX_AGE_HOURS`.
**Why:** Supplier prices change — a 24-hour cache balances freshness against scraping frequency. The daily cron job at 02:00 UTC refreshes prices for materials seen in quotes over the last 7 days.

---

### Next.js 14 Playwright config key

**Rule:** Use `experimental.serverComponentsExternalPackages` in `next.config.js` to keep Playwright out of the webpack bundle.
**Why:** Next.js 14 uses the `experimental` key. Next.js 15 renamed it to `serverExternalPackages` (no `experimental` wrapper). Using the wrong key silently fails to exclude Playwright, causing bundle errors.

---

## 10. Materials Worth Pre-Loading

These are the 18 most commonly needed materials across the supported trades, ranked by frequency of appearance in UK trade quotes. This list seeds a new project's `sample-prices.json` — **manually verify all prices against live suppliers before shipping.**

> Confidence note: this list is inferred from trade domain knowledge combined with context from the scraper code (e.g. "5l emulsion paint" appears as a normalised item name in the DB schema comments). No explicit "top materials" list exists in the codebase.

| Rank | Trade | Item name (use as search term) | Common aliases |
|---|---|---|---|
| 1 | decorator | 5l emulsion paint white | silk emulsion, matt emulsion, Dulux emulsion 5L |
| 2 | electrician | 2.5mm twin and earth cable | 2.5mm T&E, flat twin cable |
| 3 | plumber | 15mm copper pipe 3m | 15mm straight pipe, plumbing pipe |
| 4 | tiler | floor tile adhesive 20kg | tile fix, BAL adhesive, Mapei adhesive |
| 5 | plasterer | multi-finish plaster 25kg | Thistle multi-finish, finish plaster |
| 6 | electrician | double socket outlet white | double plug socket, 13A socket |
| 7 | plumber | 15mm push-fit straight connector | Speedfit connector, push-fit fitting |
| 8 | decorator | masking tape 50mm | painters tape, decorating tape |
| 9 | builder | plasterboard 2400x1200 | 9.5mm plasterboard, 12.5mm plasterboard, gypsum board |
| 10 | tiler | flexible grout 5kg grey | wall and floor grout, Ardex grout |
| 11 | electrician | LED downlight 6W white | recessed downlight, LED spotlight |
| 12 | plumber | radiator valve 15mm | TRV, thermostatic radiator valve |
| 13 | carpenter | 50mm wood screws | timber screws, pozidrive screws |
| 14 | roofer | roofing felt type 1F | underlay felt, shed felt |
| 15 | groundworker | sharp sand 25kg | building sand, grit sand |
| 16 | builder | 3.5mm plasterboard screws 1000pk | drywall screws, self-tapping screws |
| 17 | flooring-fitter | floor adhesive 5L | carpet adhesive, LVT adhesive |
| 18 | decorator | fine surface filler 400g | polyfilla, ready-mixed filler |

**Supplier coverage notes:**
- Screwfix and Toolstation cover electrician, plumber, and builder materials well
- B&Q covers decorator and DIY materials well; less strong on trade-specialist items
- For roofing and groundwork materials, Screwfix is primary; Toolstation as fallback

---

## 11. Notes & Caveats

### High-confidence sections (well-documented in code)

- **Trade list** — verbatim from `data/trades.json`. Complete and authoritative.
- **Tone definitions** — verbatim from `data/tones.json`. The `id` vs `label` distinction is important and confirmed in the code.
- **Section specs and prompt wording** — extracted verbatim from `lib/prompts/generateQuote.ts`. The exact word counts, bullet limits, and material line rules are all in the source prompt.
- **Validation rules** — verbatim Zod schemas from `lib/validation.ts`. The 10-char minimum and 3000-char maximum on jobDescription are confirmed in both the schema and the form.
- **Scraping constraints** — almost every constraint has an accompanying code comment or was explicitly documented in `ARCHITECTURE.md`. High confidence.
- **Never-do rules** — the system prompt and sections prompt both state these explicitly. Verbatim.
- **Placeholder string** — `[PRICE TO BE CONFIRMED]` is used in exactly this form throughout the codebase. The scraper parses for this exact string.
- **JSON parsing workaround** — regex extraction before `JSON.parse` is used in multiple places and documented in both `ARCHITECTURE.md` and `CLAUDE.md`.

### Medium-confidence sections (inferred or partially documented)

- **Tone behaviour** — the codebase documents the user-facing descriptions but does not constrain Claude's interpretation of each tone beyond passing the tone `id` string as a prompt variable. The exact output style per tone is Claude's inference from the label word alone.
- **Assembly prompt** — `buildAssembleQuotePrompt()` is simple: it reassembles the sections with section headers and asks for plain text. The output format (the "SCOPE OF WORK" style headings) actually comes from `assembleQuoteText.ts` in the client, not from the Claude assembly call — Claude's assembly call was possibly used earlier in development and the client-side function replaced it. The document format in section 3 comes from `assembleQuoteText.ts` and is high-confidence.
- **Disclaimer text in the quote itself** — Claude generates the disclaimers section content unless `customDisclaimers` is provided. The exact wording will vary per job. The verbatim T&C text in section 4 is the *app* terms, shown to the tradesperson, not what appears in the final quote.

### Lower-confidence sections

- **Material taxonomy / pre-load list (section 10)** — no explicit materials list exists in the codebase. The SKIP_KEYWORDS list (section 6) is verbatim. The "top 18 materials" list in section 10 is based on trade domain knowledge combined with context from the codebase; prices must be manually verified before use.
- **Property types** — included in the data file and passed as optional context to the prompt, but the codebase does not document how (or whether) each property type substantively changes Claude's output.

### Implementation notes for the rebuild

The assembly step (turning structured sections into a flowing document) should probably be done in code rather than via a second Claude call. The existing `assembleQuoteText.ts` function does this in ~45 lines with a fixed template — it's clean, fast, and deterministic. The agentic rebuild can call that same logic or replicate it without a Claude call.

The follow-up questions step could be an agent tool call that Claude decides to use or skip based on the job description's completeness. The existing prompt (section 3, follow-up prompt) transfers directly.
