// Realistic bathroom-fitter jobs for scripts/eval.mjs. Each `expect` lists what a good quote
// must contain, written from real-world practice rather than copied from the pack.
import { keyAnswersFor } from './shared.js'
export { FORBIDDEN } from './shared.js'

const key = (answers) => keyAnswersFor('bathroom-fitter', answers)

export const BATHROOM_FITTER_CASES = [
  {
    id: 'vanity-units',
    jobDescription: 'Replace 3 vanity units in the family bathroom and en-suites.',
    keyAnswers: key({ 'extent of refit': 'One or two items' }),
    answers: [[/fitted|type/i, 'Vanity unit with a basin'], [/pipe/i, 'Same position']],
    expect: {
      asksAny: [/vanity|basin|pipe|wall|size|width|tap/i],
      materials: [/vanity/i, /trap|waste/i],
      exclusions: [/tile|making good|wall|decorat/i],
    },
  },
  {
    id: 'full-refit',
    jobDescription: 'Upgrade this dated bathroom: walk-in shower instead of the bath, new wall and floor tiles, new toilet and basin.',
    keyAnswers: key({ 'layout change': 'Some items move' }),
    answers: [[/kind of shower/i, 'Mixer shower from the hot water system'], [/floor/i, 'Floor tiles'], [/bath is now/i, 'Walk-in shower instead']],
    expect: {
      asksAny: [/shower|floor|hot water|boiler|pressure|joist/i],
      materials: [/tray/i, /toilet/i, /adhesive/i],
      assumptions: [/floor|joist|pipe|soil|hot water|pressure|wall/i],
      exclusions: [/electric|extractor|light|joist|floor/i],
    },
  },
  {
    id: 'replace-bath',
    jobDescription: 'Replace the old bath with a new one the same size.',
    keyAnswers: key({ 'extent of refit': 'One or two items' }),
    answers: [[/size/i, 'Standard 1700mm x 700mm'], [/tiles/i, 'Tiles sit on the bath edge'], [/shower/i, 'No shower']],
    expect: {
      asksAny: [/tile|size|shower|tap|panel|material|steel|acrylic/i],
      materials: [/bath/i, /waste|panel/i],
      assumptions: [/tile|floor|size|fit|space/i],
    },
  },
  {
    id: 'cracked-tray',
    jobDescription: 'Shower tray is cracked and leaking, needs replacing.',
    keyAnswers: key({ 'extent of refit': 'One or two items' }),
    answers: [[/why/i, 'Cracked'], [/enclosure/i, 'Reuse the existing enclosure']],
    expect: {
      asksAny: [/enclosure|size|floor|tile|leak|screen/i],
      materials: [/tray/i],
      exclusions: [/damage|floor|ceiling|tile/i],
    },
  },
  {
    id: 'reseal-shower',
    jobDescription: 'Shower sealant renewal, the silicone round the shower tray has gone black.',
    keyAnswers: key({ 'extent of refit': 'One or two items' }),
    answers: [[/what needs/i, 'Shower tray'], [/move/i, 'Solid']],
    expect: {
      asksAny: [/move|tray|bath|which|grout|tile|mould/i],
      materials: [/silicone|sealant/i],
      exclusions: [/grout|tile|damage/i],
    },
  },
  {
    id: 'replace-toilet',
    jobDescription: 'Replace the cracked toilet with a new close coupled one.',
    keyAnswers: key({ 'extent of refit': 'One or two items' }),
    answers: [[/type/i, 'Close coupled'], [/waste|soil/i, 'Straight back through the wall']],
    expect: {
      asksAny: [/waste|soil|type|floor|valve|seat|pipe/i],
      materials: [/toilet|pan/i, /connector/i],
      exclusions: [/floor|soil|stack/i],
    },
  },
  {
    id: 'wall-hung-basin',
    jobDescription: 'Fit a wall-hung basin in the cloakroom in place of the old pedestal basin.',
    keyAnswers: key({ 'extent of refit': 'One or two items' }),
    answers: [[/fitted|type/i, 'Wall-hung basin'], [/pipe/i, 'Same position']],
    expect: {
      asksAny: [/wall|stud|pipe|tap|size/i],
      materials: [/basin/i, /bracket|fixing/i],
      assumptions: [/wall|fix|stud|support/i],
    },
  },
  {
    // Not in the pack: checks nothing is forced onto a job it doesn't cover.
    id: 'extractor-fan',
    jobDescription: 'I need to replace an extractor fan in the bathroom.',
    keyAnswers: key({ 'extent of refit': 'One or two items' }),
    answers: [],
    expect: {
      materials: [/extractor|fan/i],
    },
  },
]
