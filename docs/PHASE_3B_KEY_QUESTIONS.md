# Phase 3b — Trade key questions

A spec for the feature that asks every trader a short, fixed set of trade-specific questions on one page before Phase A (materials proposal). It holds enough detail to rebuild the feature from scratch on top of the Phase 3a + photo-analysis codebase. `CLAUDE.md` describes the current state; this document records *what was built, and why*.

Branch: `trade-key-questions` (off `main` at `fde9ab7`).

---

## 1. Problem

Before this phase:

- **Without photos**, `/quote/new` went straight from the job form to Phase A. Phase A's LLM decided whether to ask anything, one question per round trip. So the questions that shape nearly every quote for a trade (area for a plasterer, who supplies materials, making good) were asked inconsistently, or not at all.
- **With photos**, `lib/analyse-job-photos.js` returned up to 6 free-form `unclear` gaps, and the trader answered them on a `PhotoQuestions` page. That page existed only on the photo path, and its questions were whatever the vision model thought of that day.

## 2. Goal

1. Every trade has 3–4 **fixed key questions** (`lib/key-questions.js`), chosen for what always changes a quote for that trade. Area-priced trades always get an "approximate area" question answered in ranges.
2. The questions are asked **all on one page, with no LLM call**, before Phase A, whether or not there are photos.
3. **With photos**, the vision call is told the key questions and may:
   - mark some as **answered** by a site photo (`keyAnswered`). These are skipped unless the trader later unticks every site observation.
   - mark some as **not applicable** to this job (`keyNotApplicable`). These are dropped.
   - add **up to 3 extra** job-specific gaps of its own. Extras never repeat a key topic.
4. Each question offers tap options plus the automatic `Other` (free text) and `Not sure – assume for now`. Answered questions become Q&A pairs. Skipped or "not sure" questions become **unconfirmed points**, which Phase A never re-asks and Phase B must cover in ASSUMPTIONS or EXCLUSIONS.

## 3. Flow

```
form ──(no photos)────────────────────────────────► keyQuestions ─► proposing ⇄ clarifying ─► refining ─► generating ─► running
  └──(photos)─► analysingPhotos ─► reviewingPhotos ─┤
                                                    └─(nothing left to ask)─► proposing
```

- Without photos, `keyQuestions` is always shown. Every trade has at least 3 key questions (enforced by a test).
- With photos, `keyQuestions` is shown only if `keyQuestionsToAsk()` is non-empty. Otherwise the flow goes straight to Phase A.
- The page title is `"Things the photos can't show"` with photos, or `"A few quick questions"` without them.
- Back from `keyQuestions` goes to `reviewingPhotos` (photos) or `form` (no photos). Back from Phase A's first step (no answered clarifying questions yet) goes to `keyQuestions` if there's anything to ask, or else to `reviewingPhotos`/`form`.

## 4. Data contracts

**Key question** (`lib/key-questions.js`):
```js
{ topic: string, question: string /* ends with '?' */, options: string[] /* 2–5, never "Other"/"Not sure" */ }
```

**`analyseJobPhotos` return value** (the shape is unchanged; `unclear`'s contents changed):
```js
{
  photos, observations,
  resolved: string[],            // model's resolved topics ∪ key topics answered by photos (deduped)
  unclear: [
    ...keyQuestions,             // trade key questions minus keyNotApplicable, each with answeredByPhotos: boolean
    ...extras,                   // ≤3 model gaps, key topics filtered out, no answeredByPhotos field
  ],
}
```

**Vision model output** (two new fields):
```json
{ "photos": [], "observations": [], "resolved": [],
  "keyAnswered": ["exact key topic"], "keyNotApplicable": ["exact key topic"],
  "unclear": [{ "topic": "", "question": "", "options": [] }] }
```

**Client answer state**: `keyAnswers = { [topic]: { choice, otherText } }`.

**Sent to Phase A / Phase B** (the existing fields, now fed by key questions):
- `priorQuestions` (Phase A) and `followUpAnswers` (Phase B) are prefixed with `keyQuestionPairs()`, the answered key questions as `{ question, answer }`. **These count toward Phase A's `MAX_CLARIFYING_QUESTIONS` cap of 4.** So a trader who answers all 4 key questions gets no further LLM clarifying question. That is intended: the key questions replace most of what Phase A would ask.
- `photoFindings` is now built by `jobFindings()`, and it is sent **even without photos** whenever there are unanswered key questions: `{ observations: [], resolved: [], unclear: [topics] }`.

## 5. Files

### New: `lib/key-questions.js`
- Shared question objects reused across trades: `whoSupplies`, `makingGood`, `wasteRemoval`, `roomCleared`, `wallType`, and an `area(question, options)` helper (topic `'approximate area'`).
- `KEY_QUESTIONS_BY_TRADE`: one entry per `VALID_TRADES` value (see §6).
- `keyQuestionsFor(trade)` returns the trade's list, or `[]` for an unknown trade.

### New: `app/key-questions-form.js` (client component)
- Replaces `PhotoQuestions`/`photoQuestionAnswer` from `app/job-photos.js`, which were deleted. It has the same UI, is renamed and generalised, and takes a `title` prop.
- `OTHER_OPTION = 'Other'` and `NOT_SURE_OPTION = 'Not sure – assume for now'`.
- `keyQuestionAnswer(entry)`: returns `null` if the question has no choice or is not sure. For `Other`, it returns the trimmed `otherText` (or `null` if that's empty). Otherwise it returns the choice.
- `KeyQuestions({ title, questions, answers, onChange, onBack, onContinue })`: one `<fieldset>` of radios per question. It adds a text input when `Other` is picked, with the helper line "Anything you skip or aren't sure about is written into the quote as an assumption."

### Changed: `app/job-photos.js`
- `PhotoFindingsReview` takes a new `questionCount` prop and uses it for the "Next, N quick questions…" line, instead of `analysis.unclear.length`.
- `PhotoQuestions` and its helpers were removed (moved to `key-questions-form.js`).

### Changed: `lib/analyse-job-photos.js`
- `MAX_EXTRA_QUESTIONS = 3`. `MAX_TOPICS` (6) still caps `resolved` and the raw `unclear` list before filtering.
- `buildInstructions` injects a `<key_questions>` block listing `- topic: question`. It adds instructions for `keyAnswered` (only from "site" photos, with the answer recorded in observations) and `keyNotApplicable`. It rewords `unclear` to "at most 3 further things… never repeat a key question", and updates the output format and the worked example (`keyAnswered: []`, `keyNotApplicable: ["cable routes"]`).
- `normalizeUnclear(list, max)` now takes a cap.
- New `keyQuestionsAfterPhotos(trade, parsed, hasSiteEvidence)`. A key question counts as answered only when there is surviving site evidence. Not-applicable topics are dropped. Every key question comes back flagged, so the client can still ask one if the trader unticks the observation that answered it.
- The return value merges the key questions and extras as described in §4.

**Prompt changes, verbatim.** `buildInstructions` builds this block and interpolates it as `${keyBlock}`, replacing the blank line between `</job_description>` and `<instructions>`:

```js
const keyQuestions = keyQuestionsFor(trade)
const keyBlock = keyQuestions.length
  ? `\n<key_questions>\nThe trader is asked each of these unless you list its exact topic in "keyAnswered" or "keyNotApplicable":\n${keyQuestions.map((q) => `- ${q.topic}: ${q.question}`).join('\n')}\n</key_questions>\n`
  : ''
```

In `<instructions>`, these two bullets go straight after the `"resolved"` bullet, and the `"unclear"` bullet's opening sentence is replaced. Its three sub-bullets (topic/question/options) and the asbestos bullet are unchanged.

```
- "keyAnswered": exact topics from key_questions that a "site" photo plainly answers, with that answer recorded in "observations". Never from a "reference" photo.
- "keyNotApplicable": exact topics from key_questions that clearly don't apply to this job at all.
- "unclear": at most ${MAX_EXTRA_QUESTIONS} further things that matter for this job's quote but the photos can't show, most important first. Never repeat a key question. The trader is asked every one of these, so only include what the trader or customer could answer before the job starts. Each has:
```

`<output_format>` becomes:

```
{ "photos": [ { "imageIndex": 1, "kind": "site|reference|irrelevant" } ], "observations": [ { "imageIndex": 1, "observation": "string", "confidence": "high|medium|low" } ], "resolved": ["string"], "keyAnswered": ["string"], "keyNotApplicable": ["string"], "unclear": [ { "topic": "string", "question": "string", "options": ["string"] } ] }
```

The `<example>` JSON becomes (it gains `keyAnswered`/`keyNotApplicable` and drops the "who supplies the consumer unit" gap, which is now a key question):

```
{ "photos": [ { "imageIndex": 1, "kind": "site" }, { "imageIndex": 2, "kind": "site" } ], "observations": [ { "imageIndex": 1, "observation": "Wylex fuse box with 6 rewireable fuse carriers, no RCD", "confidence": "high" }, { "imageIndex": 2, "observation": "Meter tails appear to be older, thinner cable than modern 25mm tails", "confidence": "low" } ], "resolved": ["existing consumer unit type", "number of circuits"], "keyAnswered": [], "keyNotApplicable": ["cable routes"], "unclear": [ { "topic": "number of circuits needed", "question": "How many circuits will the new consumer unit need to serve?", "options": ["Same as now", "One or two extra", "Three or more extra"] } ] }
```

The return statement and helper, verbatim:

```js
// Key questions always come back, flagged when site photos answer them, so the client can
// still ask one if the trader unticks the observation that answered it.
function keyQuestionsAfterPhotos(trade, parsed, hasSiteEvidence) {
  const answered = new Set(hasSiteEvidence ? normalizeTopics(parsed.keyAnswered) : [])
  const notApplicable = new Set(normalizeTopics(parsed.keyNotApplicable))
  return keyQuestionsFor(trade)
    .filter((q) => !notApplicable.has(q.topic))
    .map((q) => ({ ...q, answeredByPhotos: answered.has(q.topic) }))
}

// ...at the end of analyseJobPhotos:
const keyQuestions = keyQuestionsAfterPhotos(trade, parsed, hasSiteEvidence)
const keyTopics = new Set(keyQuestionsFor(trade).map((q) => q.topic))
const extras = normalizeUnclear(parsed.unclear, MAX_TOPICS)
  .filter((q) => !keyTopics.has(q.topic))
  .slice(0, MAX_EXTRA_QUESTIONS)

const answeredKeyTopics = keyQuestions.filter((q) => q.answeredByPhotos).map((q) => q.topic)
return {
  photos,
  observations,
  resolved: [...new Set([...resolved, ...answeredKeyTopics])],
  unclear: [...keyQuestions, ...extras],
}
```

### Changed: `app/quote/new/page.js`
- The `photoAnswers` state was renamed to `keyAnswers`. The `'photoQuestions'` phase was renamed to `'keyQuestions'`.
- `hasCheckedSiteEvidence(analysis)` is true if any ticked observation comes from a `kind: 'site'` photo.
- `keyQuestionsToAsk(analysis = photoAnalysis)`: with no analysis, it returns `keyQuestionsFor(trade)`. Otherwise it returns `analysis.unclear` minus items that are `answeredByPhotos` while site evidence is still ticked.
- `jobFindings()` (was `confirmedPhotoFindings`): `unclear` is the unanswered topics from `keyQuestionsToAsk()`. Without photos it returns `undefined` if nothing is unanswered.
- `keyQuestionPairs()` (was `photoQuestionPairs`) is always prepended in `callProposeMaterials` and in Phase B's `followUpAnswers`.
- The no-photos submit calls `setPhase('keyQuestions')` instead of calling Phase A directly. `handleContinueFromKeyQuestions` resets clarifying state and calls Phase A with fresh caches.
- `setPhotoAnswers({})` was removed after photo analysis, so answers survive a Back-then-Continue. A full reset still clears them.

### Changed: `lib/photo-findings.js`
- The comments and `UNCONFIRMED_NOTE` were reworded, because `unclear` no longer implies photos: *"The trader was asked about these before the quote and couldn't confirm them"*. The Phase A/B formatting is otherwise unchanged. With no observations, the Phase A block still renders when `unclear` is non-empty.

### Changed: `CLAUDE.md`
- The Materials refinement step 2 state machine now includes `[analysingPhotos → reviewingPhotos →] keyQuestions` and describes this feature.

## 6. Question catalogue

`lib/key-questions.js` in full, verbatim.

```js
// The few questions that always shape a quote for each trade, asked on one page before
// Phase A. With photos, analyseJobPhotos skips any the photos answer or that don't apply.
// Options never include "Other" or "Not sure": app/key-questions-form.js's KeyQuestions adds both.

const whoSupplies = {
  topic: 'who supplies materials',
  question: 'Who is supplying the materials?',
  options: ['Trader supplies everything', 'Split between trader and customer', 'Customer supplies everything'],
}

const makingGood = {
  topic: 'making good afterwards',
  question: 'Who makes good walls, ceilings and floors after the work?',
  options: ['Included in this quote', 'Customer or another trade'],
}

const wasteRemoval = {
  topic: 'waste removal',
  question: 'Who is taking away the waste?',
  options: ['Included in this quote', 'Customer arranges it'],
}

const roomCleared = {
  topic: 'furniture in the work area',
  question: 'Will the work area be cleared before you start?',
  options: ['Customer clears it', 'Trader moves and covers things'],
}

const wallType = {
  topic: 'wall type for fixings',
  question: 'What are the walls made of where things are being fixed?',
  options: ['Brick or block', 'Stud and plasterboard', 'A mix of both'],
}

// Area-priced trades: the scale drives labour time and quantities, so it's asked as ranges.
const area = (question, options) => ({ topic: 'approximate area', question, options })

export const KEY_QUESTIONS_BY_TRADE = {
  'bathroom-fitter': [
    { topic: 'extent of refit', question: 'How much of the bathroom is being refitted?', options: ['Full strip-out and refit', 'Suite only', 'One or two items'] },
    { topic: 'layout change', question: 'Is the layout staying the same?', options: ['Same layout', 'Some items move', 'Completely new layout'] },
    { topic: 'wall finish', question: 'What finish is going on the walls?', options: ['Fully tiled', 'Part tiled', 'Wall panels', 'Paint only'] },
    whoSupplies,
  ],
  builder: [
    { topic: 'planning permission', question: 'Where is the planning permission at?', options: ['Already approved', 'Not needed', 'Not yet applied for'] },
    { topic: 'site access', question: 'How easy is access for materials?', options: ['Easy front access', 'Rear or side access only', 'Only through the house'] },
    wasteRemoval,
    whoSupplies,
  ],
  carpenter: [
    wallType,
    { topic: 'finish on joinery', question: 'How should the new joinery be left?', options: ['Ready for painting', 'Painted or finished', 'Pre-finished items'] },
    makingGood,
    whoSupplies,
  ],
  'driveway-specialist': [
    area('Roughly how big is the driveway?', ['Under 30m²', '30–60m²', '60–100m²', 'Over 100m²']),
    { topic: 'existing surface', question: 'What is there now?', options: ['Surface to break out', 'Lay over existing', 'Soil or lawn'] },
    { topic: 'dropped kerb', question: 'Is there a dropped kerb already?', options: ['Already in place', 'Needs one'] },
    wasteRemoval,
  ],
  electrician: [
    { topic: 'property type', question: 'What type of property is it?', options: ['House', 'Flat', 'Commercial premises'] },
    { topic: 'cable routes', question: 'How can new cables be run?', options: ['Surface trunking is fine', 'Chased into walls', 'Under floors or via loft', 'No new cables'] },
    makingGood,
    whoSupplies,
  ],
  'flooring-fitter': [
    area('Roughly how much floor is being laid?', ['Under 10m²', '10–25m²', '25–50m²', 'Over 50m²']),
    { topic: 'existing floor covering', question: 'What happens to the existing floor covering?', options: ['Trader lifts and disposes', 'Customer lifts it', 'Nothing to lift'] },
    roomCleared,
    whoSupplies,
  ],
  'gas-engineer': [
    { topic: 'appliance position', question: 'Is the new appliance going where the old one was?', options: ['Same position', 'New position', 'No existing appliance'] },
    { topic: 'property type', question: 'What type of property is it?', options: ['House', 'Flat', 'Commercial premises'] },
    makingGood,
    whoSupplies,
  ],
  glazier: [
    { topic: 'number of units', question: 'How many windows or doors are involved?', options: ['1', '2–4', '5–10', 'More than 10'] },
    { topic: 'glass or whole frame', question: 'What is being replaced?', options: ['Glass only', 'Whole frames'] },
    { topic: 'working height', question: 'What is the highest one?', options: ['Ground floor', 'First floor', 'Second floor or above'] },
  ],
  groundworker: [
    area('Roughly how big is the area being dug or laid?', ['Under 20m²', '20–50m²', '50–100m²', 'Over 100m²']),
    { topic: 'machine access', question: 'Can a digger get to the work area?', options: ['Mini digger fits', 'Hand dig only'] },
    { topic: 'spoil removal', question: 'What happens to the dug-out soil?', options: ['Removed from site', 'Left on site'] },
  ],
  handyman: [
    { topic: 'number of tasks', question: 'How many separate jobs are there?', options: ['Just one', '2–3', '4 or more'] },
    wallType,
    whoSupplies,
  ],
  'kitchen-fitter': [
    { topic: 'extent of kitchen work', question: 'How much of the kitchen is being done?', options: ['Full replacement', 'Units only', 'Worktops only', 'A few items'] },
    { topic: 'layout change', question: 'Is the layout staying the same?', options: ['Same layout', 'Some items move', 'Completely new layout'] },
    { topic: 'appliance fitting', question: 'Which appliances are you fitting?', options: ['All of them', 'Some of them', 'None'] },
    whoSupplies,
  ],
  'gardener-landscaper': [
    area('Roughly how big is the area being worked on?', ['Under 20m²', '20–50m²', '50–100m²', 'Over 100m²']),
    { topic: 'garden access', question: 'How do you get into the garden?', options: ['Side gate or wide access', 'Rear lane access', 'Only through the house'] },
    wasteRemoval,
    whoSupplies,
  ],
  decorator: [
    area('How much is being decorated?', ['One room', '2–3 rooms', '4 or more rooms', 'Exterior only']),
    { topic: 'surface condition', question: 'What state are the surfaces in?', options: ['Good, just repainting', 'Need filling and sanding', 'Bare or new plaster'] },
    { topic: 'colour change', question: 'How big is the colour change?', options: ['Similar colour', 'Light over dark', 'Dark over light'] },
    whoSupplies,
  ],
  plasterer: [
    area('Roughly how much area is being plastered or boarded?', ['Under 10m²', '10–25m²', '25–50m²', 'Over 50m²']),
    { topic: 'finish required', question: 'What finish is needed?', options: ['Full skim, ready to decorate', 'Tape and joint only', 'Patch repair only'] },
    { topic: 'existing surface', question: 'What is the surface being covered?', options: ['Plasterboard', 'Old plaster', 'Bare brick or block', 'Bare timber or studs'] },
    whoSupplies,
  ],
  plumber: [
    { topic: 'pipework material', question: 'What is the existing pipework made of?', options: ['Copper', 'Plastic', 'A mix'] },
    { topic: 'access to pipework', question: 'How easy is it to get to the pipes?', options: ['Exposed or easy to reach', 'Under floorboards', 'Boxed in or behind tiles'] },
    makingGood,
    whoSupplies,
  ],
  roofer: [
    { topic: 'extent of roof work', question: 'How much of the roof is involved?', options: ['Repair to one area', 'One roof slope', 'Whole roof'] },
    { topic: 'building height', question: 'How tall is the building?', options: ['Bungalow', 'Two storeys', 'Three storeys or more'] },
    { topic: 'scaffolding', question: 'Who is arranging scaffolding?', options: ['Included in this quote', 'Customer arranges it', 'Not needed'] },
    wasteRemoval,
  ],
  tiler: [
    area('Roughly how much area is being tiled?', ['Under 5m²', '5–15m²', '15–30m²', 'Over 30m²']),
    { topic: 'existing tiles', question: 'What happens to any existing tiles?', options: ['Remove old tiles', 'Tile over them', 'No existing tiles'] },
    { topic: 'tile size', question: 'How big are the new tiles?', options: ['Small (under 30cm)', 'Medium (30–60cm)', 'Large format (over 60cm)'] },
    whoSupplies,
  ],
}

export function keyQuestionsFor(trade) {
  return KEY_QUESTIONS_BY_TRADE[trade] ?? []
}
```

## 7. Tests

- **`lib/key-questions.test.js`** (new). For every `VALID_TRADES` value: 3–4 questions, unique topics, each question ends with `?`, 2–5 options, and no `Other`/`Not sure` option. The area-priced trades (plasterer, decorator, tiler, flooring-fitter, driveway-specialist) include `approximate area`. The catalogue keys equal `VALID_TRADES`, and an unknown trade gets `[]`.
- **`lib/analyse-job-photos.test.js`**:
  - Existing tests now use a `noKeys` fixture (`trade: 'unknown-trade'`), so `unclear` holds only the model's output.
  - The cap test now expects 3 extras, not 6.
  - The asbestos test checks `unclear.at(-1)`.
  - New: key questions come first. `keyAnswered` sets `answeredByPhotos` and adds to `resolved`. Unknown `keyAnswered` topics are ignored. `keyNotApplicable` drops a question. An extra that duplicates a key topic is filtered out. The prompt contains `<key_questions>`.
  - New: a `keyAnswered` topic backed only by a reference photo is never marked answered.
- No tests for `app/` components, consistent with CLAUDE.md's "Known caveats".

## 8. Acceptance checks

1. No photos, plasterer: after Submit, the "A few quick questions" page shows 4 questions, including the area ranges. Answer 2, mark 1 "Not sure", skip 1. Phase A receives the 2 answered as `priorQuestions` and the 2 others in `photoFindings.unclear`. The saved quote's ASSUMPTIONS/EXCLUSIONS covers both unanswered topics.
2. Photos, electrician, where the model returns `keyNotApplicable: ["cable routes"]`: that question never appears.
3. Photos where the model returns `keyAnswered` for a topic, then the trader unticks every site observation: that question reappears on the key-questions page, and the topic leaves `resolved`.
4. Back from Phase A's first clarifying step returns to the key-questions page with the answers intact.
5. `npm test` passes.

## 9. Known loose ends

- Because key answers count toward Phase A's cap, trades with 4 key questions leave Phase A no room for its own clarifying question once all 4 are answered. That is deliberate for now. Revisit if traders report quotes missing job-specific detail.
