// Realistic plasterer jobs for scripts/eval.mjs. Each `expect` lists what a good quote
// must contain, written from real-world practice rather than copied from the pack.
import { keyAnswersFor } from './shared.js'
export { FORBIDDEN } from './shared.js'

const key = (answers) => keyAnswersFor('plasterer', answers)

export const PLASTERER_CASES = [
  {
    id: 'leak-ceiling',
    jobDescription: 'Ceiling plaster needs repairing due to a leak in the bathroom above, now fixed.',
    keyAnswers: key({ 'approximate area': 'Under 10m²', 'finish required': 'Patch repair only', 'existing surface': 'Plasterboard' }),
    answers: [[/leak|dry/i, 'Fixed and dry'], [/sagging|loose/i, 'Sagging or loose in places']],
    expect: {
      asksAny: [/dry|damp|leak|sag|loose|joist/i],
      materials: [/plasterboard/i, /multi-finish|skim|plaster/i],
      exclusions: [/leak|paint|decorat|light/i],
    },
  },
  {
    id: 'cracked-ceiling',
    jobDescription: 'Living room ceiling about 4m x 4m with several long cracks. Board over where needed and skim, ready to paint.',
    keyAnswers: key({ 'approximate area': '10–25m²', 'finish required': 'Full skim, ready to decorate', 'existing surface': 'Old plaster' }),
    answers: [[/leak|dry/i, 'No leak involved'], [/sagging|loose/i, 'Firm'], [/textured/i, 'No, smooth']],
    expect: {
      asksAny: [/sag|loose|textur|artex|firm|lath/i],
      materials: [/multi-finish|plaster/i, /scrim|plasterboard/i],
      exclusions: [/paint|decorat|light/i],
    },
  },
  {
    id: 'skim-lounge',
    jobDescription: 'Skim all four walls in the lounge ready for decorating.',
    keyAnswers: key({ 'approximate area': '25–50m²', 'finish required': 'Full skim, ready to decorate', 'existing surface': 'Old plaster' }),
    answers: [[/sound/i, 'Blown or loose in places'], [/textured/i, 'No, smooth']],
    expect: {
      asksAny: [/sound|blown|loose|textur|condition/i],
      materials: [/multi-finish/i, /bonding|pva/i],
      exclusions: [/decorat|skirting|socket|radiator/i],
    },
  },
  {
    id: 'fill-hole',
    jobDescription: 'Fill a hole in the hallway wall where an old light switch was moved.',
    keyAnswers: key({ 'approximate area': 'Under 10m²', 'finish required': 'Patch repair only', 'existing surface': 'Plasterboard' }),
    answers: [[/how big/i, 'Up to A4 size'], [/through plasterboard/i, 'Through plasterboard']],
    expect: {
      asksAny: [/big|size|plasterboard|brick|through/i],
      materials: [/plasterboard|one coat|filler|multi-finish/i],
      exclusions: [/paint|decorat/i],
    },
  },
  {
    id: 'artex-ceiling',
    jobDescription: 'Cover the artex ceiling in the bedroom so it is smooth.',
    keyAnswers: key({ 'approximate area': '10–25m²', 'finish required': 'Full skim, ready to decorate', 'existing surface': 'Old plaster' }),
    answers: [[/tested/i, 'Not tested'], [/fixed to the ceiling/i, 'Just a light']],
    expect: {
      asksAny: [/asbestos|test|light|coving|fitting/i],
      materials: [/plasterboard/i, /multi-finish|skim/i],
      exclusions: [/asbestos|electric|light|decorat/i],
    },
  },
  {
    id: 'blown-render',
    jobDescription: 'Repair blown render on the side wall of the house, a few patches.',
    keyAnswers: key({ 'approximate area': 'Under 10m²', 'finish required': 'Patch repair only', 'existing surface': 'Bare brick or block' }),
    answers: [[/type of render/i, 'Sand and cement'], [/how much/i, 'Small patches']],
    expect: {
      asksAny: [/render|type|pebbledash|how much|colour|paint/i],
      materials: [/sand|cement|render/i],
      exclusions: [/scaffold|paint/i],
    },
  },
  {
    id: 'new-plasterboard-wall',
    jobDescription: 'Tape and joint a new plasterboard stud wall in the loft conversion.',
    keyAnswers: key({ 'approximate area': '10–25m²', 'finish required': 'Tape and joint only', 'existing surface': 'Plasterboard' }),
    answers: [],
    expect: {
      materials: [/joint|tape|filler/i],
    },
  },
  {
    // Not in the pack: checks nothing is forced onto a job it doesn't cover.
    id: 'coving',
    jobDescription: 'Fit new plaster coving around the lounge ceiling.',
    keyAnswers: key({ 'approximate area': '10–25m²', 'finish required': 'Patch repair only', 'existing surface': 'Old plaster' }),
    answers: [],
    expect: {
      materials: [/coving/i, /adhesive/i],
    },
  },
]
