// Realistic roofer jobs for scripts/eval.mjs. Each `expect` lists what a good quote
// must contain, written from real-world practice rather than copied from the pack.
import { keyAnswersFor } from './shared.js'
export { FORBIDDEN } from './shared.js'

const key = (answers) => keyAnswersFor('roofer', answers)

export const ROOFER_CASES = [
  {
    id: 'missing-tiles',
    jobDescription: 'Replace missing tiles on the front roof slope after the storm.',
    keyAnswers: key({ 'building height': 'Two storeys', scaffolding: 'Not needed' }),
    answers: [[/covered/i, 'Concrete tiles'], [/water/i, 'Yes, leaking inside']],
    expect: {
      asksAny: [/tile|slate|covered|type|leak|how many/i],
      materials: [/tile/i],
      assumptions: [/match|batten|felt|sourc|availab/i],
      exclusions: [/internal|ceiling|decorat|damage/i],
    },
  },
  {
    id: 'slipped-slates',
    jobDescription: 'A few slates have slipped on the back roof.',
    keyAnswers: key({ 'building height': 'Two storeys', scaffolding: 'Not needed' }),
    answers: [[/covered/i, 'Slate'], [/water/i, 'No leak yet']],
    expect: {
      asksAny: [/slate|leak|how many|where|covered/i],
      materials: [/slate/i, /hook|rivet|nail|clip/i],
    },
  },
  {
    id: 'garage-flat-roof',
    jobDescription: 'Replace the flat roof on the garage, it is leaking.',
    keyAnswers: key({ 'extent of roof work': 'Whole roof', 'building height': 'Bungalow', scaffolding: 'Not needed' }),
    answers: [[/covering/i, 'EPDM rubber'], [/over/i, 'Garage'], [/underfoot/i, 'Soft or sagging in places']],
    expect: {
      asksAny: [/covering|material|deck|size|joist|underfoot|soft|epdm|felt|grp/i],
      materials: [/epdm|rubber|membrane|felt|grp/i, /osb|deck|board/i],
      assumptions: [/joist|deck|timber|structure/i],
      exclusions: [/joist|internal|ceiling|decorat/i],
    },
  },
  {
    id: 'gutter-clearing',
    jobDescription: 'Gutter needs clearing at the front and back.',
    keyAnswers: key({ 'building height': 'Two storeys', scaffolding: 'Not needed' }),
    answers: [[/need/i, 'Clearing only'], [/made of/i, 'Plastic']],
    expect: {
      asksAny: [/clear|leak|repair|downpipe|made|replace|blocked/i],
      exclusions: [/drain|repair|replac|fascia/i],
    },
  },
  {
    id: 'replace-guttering',
    jobDescription: 'Replace the old leaking guttering along the back of the house.',
    keyAnswers: key({ 'building height': 'Two storeys', scaffolding: 'Not needed' }),
    answers: [[/need/i, 'Replacing gutter runs'], [/made of/i, 'Plastic'], [/shape/i, 'Half round']],
    expect: {
      asksAny: [/made|material|profile|shape|length|downpipe|fascia/i],
      materials: [/gutter/i, /bracket|downpipe|outlet|union/i],
      assumptions: [/fascia|board|sound|fix/i],
    },
  },
  {
    id: 'loose-ridge',
    jobDescription: 'Ridge tiles are loose and the mortar is cracking.',
    keyAnswers: key({ 'building height': 'Two storeys' }),
    answers: [[/wrong/i, 'Loose ridge tiles'], [/fixed/i, 'Bedded in mortar']],
    expect: {
      asksAny: [/ridge|mortar|dry|how many|fixed|length/i],
      materials: [/mortar|sand|cement|dry ridge|ridge/i],
    },
  },
  {
    id: 'chimney-leak',
    jobDescription: 'Damp patch on the bedroom chimney breast, we think the chimney flashing is leaking.',
    keyAnswers: key({ 'building height': 'Two storeys' }),
    answers: [[/where/i, 'Where the chimney meets the roof'], [/round the base/i, 'Mortar fillet'], [/in use/i, 'Not in use']],
    expect: {
      asksAny: [/flashing|lead|chimney|use|pot|stack|where/i],
      materials: [/lead|flashing/i],
      exclusions: [/internal|damp|decorat|rebuild|stack/i],
    },
  },
  {
    id: 'fascias-soffits',
    jobDescription: 'Replace the rotten timber fascias and soffits with uPVC.',
    keyAnswers: key({ 'building height': 'Two storeys' }),
    answers: [[/replaced/i, 'Fascias and soffits'], [/made of now/i, 'Timber'], [/gutters/i, 'New gutters too']],
    expect: {
      asksAny: [/gutter|asbestos|length|how much|colour|timber|made|vent/i],
      materials: [/fascia/i, /soffit/i],
      assumptions: [/rafter|asbestos|sound|bird|bat/i],
      exclusions: [/rafter|asbestos|rot/i],
    },
  },
]
