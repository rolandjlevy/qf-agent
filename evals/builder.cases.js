// Realistic builder jobs for scripts/eval.mjs. Each `expect` lists what a good quote
// must contain, written from real-world practice rather than copied from the pack.
import { keyAnswersFor } from './shared.js'
export { FORBIDDEN } from './shared.js'

const key = (answers) => keyAnswersFor('builder', answers)

export const BUILDER_CASES = [
  {
    id: 'kitchen-diner-wall',
    jobDescription: 'Remove the wall between the kitchen and dining room in a 1930s semi to make one open-plan room.',
    keyAnswers: key({ 'planning permission': 'Not needed' }),
    answers: [[/load/i, 'Load-bearing'], [/built from|made of/i, 'Brick or block'], [/anything in the wall/i, 'Sockets or switches']],
    expect: {
      asksAny: [/load|structural|beam|built|brick|stud|socket|services/i],
      materials: [/beam|rsj|steel/i, /padstone|plaster/i],
      exclusions: [/engineer|building control|electric|decorat/i],
    },
  },
  {
    id: 'stud-wall-removal',
    jobDescription: 'Remove an internal stud wall between two small bedrooms.',
    keyAnswers: key({ 'planning permission': 'Not needed' }),
    answers: [[/load/i, 'Not load-bearing'], [/built from|made of/i, 'Timber stud and plasterboard'], [/anything in the wall/i, 'Nothing']],
    expect: {
      asksAny: [/load|built|stud|anything|services|floor/i],
      materials: [/plaster/i],
      exclusions: [/decorat|floor|electric/i],
    },
  },
  {
    id: 'new-doorway',
    jobDescription: 'Knock a new doorway through from the hall into the lounge.',
    keyAnswers: key({ 'planning permission': 'Not needed' }),
    answers: [[/which wall|outside/i, 'Internal wall'], [/wide/i, 'Standard door width']],
    expect: {
      asksAny: [/load|wall|wide|lintel|door|brick/i],
      materials: [/lintel/i],
      exclusions: [/door|decorat/i],
    },
  },
  {
    id: 'garage-conversion',
    jobDescription: 'Convert the single garage into a home office with a window where the garage door is.',
    keyAnswers: key({ 'planning permission': 'Already approved' }),
    answers: [[/garage door/i, 'Wall with a window'], [/floor/i, 'Lower, needs raising']],
    expect: {
      asksAny: [/floor|door|window|insulat|level|wall/i],
      materials: [/block|brick/i, /insulation|pir|membrane/i],
      exclusions: [/electric|heating|window|decorat|floor cover/i],
    },
  },
  {
    id: 'rear-extension',
    jobDescription: 'Single-storey rear kitchen extension, about 4m by 3m, flat roof.',
    keyAnswers: key({ 'planning permission': 'Already approved', 'site access': 'Rear or side access only' }),
    answers: [[/roof/i, 'Flat roof'], [/big|size/i, '10–20m²'], [/drain|manhole/i, 'Clear ground']],
    expect: {
      asksAny: [/drain|manhole|foundation|roof|size|soil|boundary/i],
      materials: [/concrete|block/i, /joist|osb|epdm|membrane/i],
      assumptions: [/foundation|ground|drawing|engineer|approval/i],
      exclusions: [/kitchen|electric|plumb|drawing|fee/i],
    },
  },
  {
    id: 'cracked-wall',
    jobDescription: 'Please fix this wall, there is a crack in the brickwork on the side of the house.',
    keyAnswers: key(),
    answers: [[/where/i, 'Outside wall'], [/wide/i, 'Up to 5mm'], [/bigger|worse/i, 'Stable']],
    expect: {
      asksAny: [/wide|where|worse|bigger|moving|crack/i],
      materials: [/stitch|sand|cement|mortar|repoint/i],
      exclusions: [/structural|underpin|investigat|decorat/i],
    },
  },
  {
    id: 'internal-crack',
    jobDescription: 'Diagonal crack above the lounge door frame, been there a few years.',
    keyAnswers: key({ 'waste removal': 'Customer arranges it' }),
    answers: [[/where/i, 'Inside wall'], [/wide/i, 'Hairline'], [/bigger|worse/i, 'Stable']],
    expect: {
      materials: [/filler|scrim|plaster/i],
      assumptions: [/settle|stable|moving|old/i],
    },
  },
  {
    // Not in the pack: checks nothing is forced onto a job it doesn't cover.
    id: 'chimney-breast-removal',
    jobDescription: 'Remove the chimney breast in the back bedroom.',
    keyAnswers: key({ 'planning permission': 'Not needed' }),
    answers: [],
    expect: {
      exclusions: [/engineer|building control|decorat|making good|structural/i],
    },
  },
]
