// Realistic carpenter jobs for scripts/eval.mjs. Each `expect` lists what a good quote
// must contain, written from real-world practice rather than copied from the pack.
import { keyAnswersFor } from './shared.js'
export { FORBIDDEN } from './shared.js'

const key = (answers) => keyAnswersFor('carpenter', answers)

export const CARPENTER_CASES = [
  {
    id: 'new-banisters',
    jobDescription: 'Replace the bannisters on the stairs with new timber spindles and a handrail.',
    keyAnswers: key({ 'finish on joinery': 'Ready for painting' }),
    answers: [[/how much/i, 'Whole balustrade'], [/style/i, 'Traditional turned timber'], [/landing/i, 'Stairs and landing']],
    expect: {
      asksAny: [/newel|landing|style|how much|spindle|handrail|whole/i],
      materials: [/spindle/i, /handrail/i],
      assumptions: [/newel|string|sound|existing|firm/i],
    },
  },
  {
    id: 'missing-spindles',
    jobDescription: 'Fit some missing bannisters on the stairs of a semi-detached house.',
    keyAnswers: key({ 'finish on joinery': 'Ready for painting' }),
    answers: [[/how much/i, 'Some spindles'], [/style/i, 'Traditional turned timber']],
    expect: {
      asksAny: [/how many|style|match|profile|missing|which|how much/i],
      materials: [/spindle/i],
    },
  },
  {
    id: 'hang-door',
    jobDescription: 'Hang a new internal door to the back bedroom.',
    keyAnswers: key({ 'finish on joinery': 'Ready for painting' }),
    answers: [[/standard/i, 'Standard size'], [/frame/i, 'Door only'], [/fire/i, 'No']],
    expect: {
      asksAny: [/size|standard|frame|fire|handle|latch/i],
      materials: [/door/i, /hinge/i],
      exclusions: [/paint|decorat|finish/i],
    },
  },
  {
    id: 'door-lock',
    jobDescription: 'Door lock needs fitting on the timber back door.',
    keyAnswers: key(),
    answers: [[/kind of door/i, 'Timber front or back door'], [/there now/i, 'Replacing an existing lock']],
    expect: {
      asksAny: [/lock|type|existing|door|key|night/i],
      materials: [/lock|deadlock|nightlatch|cylinder/i],
    },
  },
  {
    id: 'skirting',
    jobDescription: 'Replace the damaged skirting boards in the lounge.',
    keyAnswers: key({ 'finish on joinery': 'Ready for painting' }),
    answers: [[/fitted/i, 'Skirting'], [/profile/i, 'Match the existing'], [/remove/i, 'Remove and replace']],
    expect: {
      asksAny: [/profile|match|height|style|remove|length/i],
      materials: [/skirting/i],
      exclusions: [/paint|decorat|plaster/i],
    },
  },
  {
    id: 'alcove-shelves',
    jobDescription: 'Build shelves in both alcoves beside the chimney breast.',
    keyAnswers: key({ 'wall type for fixings': 'Brick or block' }),
    answers: [[/built/i, 'Alcove shelves'], [/hold/i, 'Books or heavy items']],
    expect: {
      asksAny: [/what|load|hold|cupboard|shelves|how many|depth|doors/i],
      materials: [/mdf|timber|shelf|batten|board/i],
      assumptions: [/wall|fixing|cable|pipe|sound/i],
    },
  },
  {
    id: 'move-loft-hatch',
    jobDescription: 'Move a loft hatch from the hallway to the bedroom.',
    keyAnswers: key(),
    answers: [[/needs doing/i, 'Move the hatch'], [/ladder/i, 'No']],
    expect: {
      asksAny: [/ladder|joist|truss|size|insulat|move|loft/i],
      materials: [/hatch/i],
      exclusions: [/plaster|decorat|making good|ceiling/i],
    },
  },
  {
    // Not in the pack: checks nothing is forced onto a job it doesn't cover.
    id: 'varnish-banisters',
    jobDescription: 'Strip, sand and varnish the bannisters.',
    keyAnswers: key(),
    answers: [],
    expect: {
      materials: [/varnish|sand ?paper|abrasive|stripper/i],
    },
  },
]
