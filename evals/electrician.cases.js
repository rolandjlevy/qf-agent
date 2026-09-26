// Realistic electrician jobs for scripts/eval.mjs. Each `expect` lists what a good quote
// must contain, written from real-world practice rather than copied from the pack.
import { keyAnswersFor } from './shared.js'
export { FORBIDDEN } from './shared.js'

const key = (answers) => keyAnswersFor('electrician', answers)

export const ELECTRICIAN_CASES = [
  {
    id: 'faulty-switch',
    jobDescription: 'Replace a faulty light switch on the landing.',
    keyAnswers: key({ 'cable routes': 'No new cables' }),
    answers: [[/replaced/i, 'Light switches'], [/finish/i, 'Standard white'], [/work/i, 'Stopped working']],
    expect: {
      asksAny: [/work|finish|type|gang|way|fault|dimmer|metal/i],
      materials: [/switch/i],
      assumptions: [/wiring|circuit|fault|existing/i],
    },
  },
  {
    id: 'consumer-unit',
    jobDescription: 'Replace the old Wylex fuse board with a new consumer unit in a 3-bed semi.',
    keyAnswers: key({ 'cable routes': 'No new cables' }),
    answers: [[/there now/i, 'Old fuse box with rewireable fuses'], [/circuits/i, '7 to 10'], [/where/i, 'Under the stairs']],
    expect: {
      asksAny: [/circuit|fuse|board|earth|rcd|where|location|how many/i],
      materials: [/consumer unit/i, /rcbo|mcb|rcd/i],
      assumptions: [/circuit|wiring|test|isolat|supply/i],
      exclusions: [/fault|remedial|rewir|meter|supply/i],
    },
  },
  {
    id: 'downlights',
    jobDescription: 'Fit 6 LED downlights in the kitchen ceiling in place of the old strip light.',
    keyAnswers: key({ 'cable routes': 'Under floors or via loft' }),
    answers: [[/kind of light/i, 'Recessed downlights'], [/above/i, 'Another room'], [/there now/i, 'Replacing an existing light']],
    expect: {
      asksAny: [/above|ceiling|loft|room|joist|dimm|insulat/i],
      materials: [/downlight/i],
      exclusions: [/decorat|making good|plaster|ceiling/i],
    },
  },
  {
    id: 'extra-sockets',
    jobDescription: 'Add two double sockets in the living room.',
    keyAnswers: key({ 'cable routes': 'Surface trunking is fine' }),
    answers: [[/where/i, 'Same room as an existing socket'], [/heavy/i, 'General use']],
    expect: {
      asksAny: [/where|circuit|room|existing|appliance|position/i],
      materials: [/socket/i, /cable|trunking/i],
      assumptions: [/circuit|capacity|existing|consumer/i],
    },
  },
  {
    id: 'tripping-lights',
    jobDescription: 'Faulty lighting in the kitchen area, the lights keep tripping.',
    keyAnswers: key({ 'cable routes': 'No new cables' }),
    answers: [[/stopped/i, 'A whole circuit'], [/trip/i, 'Trips straight away'], [/happen/i, 'Nothing obvious']],
    expect: {
      asksAny: [/trip|circuit|when|appliance|stopped|all|which/i],
      assumptions: [/fault|find|diagnos|once|cause/i],
      exclusions: [/repair|remedial|appliance|beyond/i],
    },
  },
  {
    id: 'electric-shower',
    jobDescription: 'Install a new 9.5kW electric shower in the bathroom. There is no shower circuit yet.',
    keyAnswers: key({ 'cable routes': 'Under floors or via loft' }),
    answers: [[/there now/i, 'New shower, no circuit'], [/power/i, '9.5kW'], [/far/i, '10–20m']],
    expect: {
      asksAny: [/distance|far|board|consumer|spare|way|fuse|supply|cable/i],
      materials: [/10 ?mm/i, /isolat|pull.?cord/i],
      exclusions: [/plumb|water/i],
    },
  },
  {
    id: 'outside-socket',
    jobDescription: 'Fit an outside double socket on the back wall of the house for the lawnmower.',
    keyAnswers: key({ 'cable routes': 'Surface trunking is fine' }),
    answers: [[/what is being fitted/i, 'Socket'], [/where/i, 'On the house wall']],
    expect: {
      asksAny: [/where|wall|inside|behind|socket|circuit|rcd/i],
      materials: [/outdoor|outside|external|ip66|weatherproof/i],
      assumptions: [/circuit|wall|drill|nearby|existing/i],
    },
  },
  {
    // Not in the pack: checks nothing is forced onto a job it doesn't cover.
    id: 'remove-light',
    jobDescription: 'Remove a light and its light switch from the spare room.',
    keyAnswers: key({ 'cable routes': 'No new cables' }),
    answers: [],
    expect: {
      exclusions: [/making good|plaster|decorat/i],
    },
  },
]
