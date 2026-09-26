// Realistic gardener / landscaper jobs for scripts/eval.mjs. Each `expect` lists what a good
// quote must contain, written from real-world practice rather than copied from the pack.
import { keyAnswersFor } from './shared.js'
export { FORBIDDEN } from './shared.js'

const key = (answers) => keyAnswersFor('gardener-landscaper', answers)

export const GARDENER_LANDSCAPER_CASES = [
  {
    id: 'sandstone-patio',
    jobDescription: 'Lay an Indian sandstone patio at the back of the house, replacing part of the lawn.',
    keyAnswers: key({ 'approximate area': '20–50m²' }),
    answers: [[/paving/i, 'Indian sandstone'], [/there now/i, 'Lawn'], [/house wall|meet/i, 'Yes, against the house']],
    expect: {
      asksAny: [/house|damp|level|drain|fall|paving|sub-base|there now/i],
      materials: [/sandstone|slab/i, /sub-base|type 1|mot/i],
      assumptions: [/ground|drain|firm|level/i],
    },
  },
  {
    id: 'porcelain-patio',
    jobDescription: 'Replace the old concrete slabs with a porcelain patio.',
    keyAnswers: key({ 'approximate area': '20–50m²' }),
    answers: [[/paving/i, 'Porcelain'], [/there now/i, 'Old paving to lift'], [/house wall|meet/i, 'No, away from the house']],
    expect: {
      materials: [/porcelain/i, /primer|slurry/i],
      exclusions: [/drain|planting|lawn|manhole/i],
    },
  },
  {
    id: 'new-turf',
    jobDescription: 'Returf the back lawn, the old one is patchy and full of moss.',
    keyAnswers: key({ 'approximate area': '20–50m²' }),
    answers: [[/there now/i, 'Old lawn'], [/turf or seed/i, 'Turf']],
    expect: {
      asksAny: [/turf|seed|drain|level|there now|soil/i],
      materials: [/turf/i, /topsoil/i],
      exclusions: [/water|aftercare|edging|planting/i],
    },
  },
  {
    id: 'rotten-stump',
    jobDescription: 'Remove an old rotten tree stump from the back garden.',
    keyAnswers: key({ 'approximate area': 'Under 20m²' }),
    answers: [[/wide/i, '30–60cm'], [/grinder|access/i, 'Clear access'], [/afterwards/i, 'Filled and seeded']],
    expect: {
      asksAny: [/wide|size|access|grinder|roots|afterwards/i],
      exclusions: [/root|paving|wall/i],
    },
  },
  {
    id: 'paving-to-beds',
    jobDescription: 'Replace this paving in the garden with a combination of new grass and flower beds.',
    keyAnswers: key({ 'approximate area': '20–50m²' }),
    answers: [[/there now/i, 'Paving or gravel'], [/planting|kind/i, 'Mixed flowers and perennials'], [/turf or seed/i, 'Turf']],
    expect: {
      materials: [/topsoil/i, /turf|seed|compost/i],
      exclusions: [/plant/i],
    },
  },
  {
    id: 'overgrown-clearance',
    jobDescription: 'The back garden is very overgrown. Clear it and cut back the hedges.',
    keyAnswers: key({ 'approximate area': '50–100m²', 'waste removal': 'Included in this quote' }),
    answers: [[/needs doing/i, 'Full clearance of an overgrown garden'], [/how overgrown/i, 'Very overgrown']],
    expect: {
      asksAny: [/overgrown|hedge|what needs|waste|tree/i],
      exclusions: [/tree|rubbish/i],
    },
  },
  {
    id: 'artificial-lawn',
    jobDescription: 'Replace the small front lawn with artificial grass.',
    keyAnswers: key({ 'approximate area': 'Under 20m²' }),
    answers: [[/there now/i, 'Lawn']],
    expect: {
      materials: [/artificial grass/i, /sub-base|type 1|granite|membrane/i],
      assumptions: [/drain/i],
    },
  },
  {
    // Not in the pack: checks nothing is forced onto a job it doesn't cover.
    id: 'garden-pond',
    jobDescription: 'Dig and line a small wildlife pond in the back garden.',
    keyAnswers: key({ 'approximate area': 'Under 20m²' }),
    answers: [],
    expect: {
      materials: [/liner|underlay/i],
    },
  },
]
