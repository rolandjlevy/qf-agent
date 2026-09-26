// Realistic decorator jobs for scripts/eval.mjs. Each `expect` lists what a good quote
// must contain, written from real-world practice rather than copied from the pack.
import { keyAnswersFor } from './shared.js'
export { FORBIDDEN } from './shared.js'

const key = (answers) => keyAnswersFor('decorator', answers)

export const DECORATOR_CASES = [
  {
    id: 'bedroom-repaint',
    jobDescription: 'Bedroom needs repainting, walls and ceiling, same colours as now.',
    keyAnswers: key({ 'approximate area': 'One room' }),
    answers: [[/which surfaces|surfaces/i, 'Walls and ceilings'], [/cleared|furniture/i, 'Customer clears them'], [/high|ceiling/i, 'Standard height']],
    expect: {
      asksAny: [/surface|woodwork|ceiling|furniture|cleared|colour|height/i],
      materials: [/emulsion|paint/i, /filler|caulk/i],
      exclusions: [/plaster|furniture|repair|woodwork|cupboard/i],
    },
  },
  {
    id: 'two-bedrooms',
    jobDescription: 'Repaint walls, ceilings and woodwork in two double bedrooms. A few cracks to fill.',
    keyAnswers: key({ 'approximate area': '2–3 rooms', 'surface condition': 'Need filling and sanding' }),
    answers: [[/cleared|furniture/i, 'Trader moves and covers furniture'], [/finish.*woodwork|woodwork.*now/i, 'Gloss'], [/wanted/i, 'Satin']],
    expect: {
      asksAny: [/woodwork|gloss|satin|furniture|cleared|finish|ceiling/i],
      materials: [/emulsion/i, /satin|gloss|undercoat/i],
      assumptions: [/sound|filling|crack|colour|coat/i],
    },
  },
  {
    id: 'front-of-house',
    jobDescription: 'Paint the front of the house. It is rendered and the old paint is flaking in places.',
    keyAnswers: key({ 'approximate area': 'Exterior only', 'surface condition': 'Need filling and sanding' }),
    answers: [[/outside|exterior/i, 'Masonry walls'], [/walls like|render/i, 'Smooth render'], [/ladder|reach/i, 'Needs a tower or scaffold']],
    expect: {
      asksAny: [/ladder|scaffold|reach|render|surface|woodwork|pebbledash/i],
      materials: [/masonry paint/i, /stabilis|fungicid/i],
      exclusions: [/render|scaffold/i],
    },
  },
  {
    id: 'wallpaper-feature',
    // Already stated in the description, so never asked.
    mustNotAsk: [/where is the paper going|how much is being papered|who is supplying/i],
    jobDescription: 'Hang wallpaper on one feature wall in the lounge. Customer has bought the paper.',
    keyAnswers: key({ 'approximate area': 'One room', 'who supplies materials': 'Split between trader and customer' }),
    answers: [[/on the walls now/i, 'Paint'], [/going up/i, 'Standard wallpaper']],
    expect: {
      asksAny: [/walls now|paper|vinyl|lining|existing|strip/i],
      materials: [/paste|adhesive/i],
      assumptions: [/supplied|customer|rolls|batch|enough/i],
    },
  },
  {
    id: 'woodchip-removal',
    // Already stated in the description, so never asked.
    mustNotAsk: [/what is going up/i],
    jobDescription: 'Strip woodchip from the hallway walls and put up lining paper ready to paint.',
    keyAnswers: key({ 'approximate area': 'One room' }),
    answers: [[/on the walls now/i, 'Woodchip'], [/going up/i, 'Lining paper to paint over']],
    expect: {
      materials: [/lining paper/i, /paste/i],
      exclusions: [/plaster|making good|replaster/i],
    },
  },
  {
    id: 'leak-stain',
    jobDescription: 'Brown water stain on the kitchen ceiling from an old leak upstairs, now fixed. Needs covering up.',
    keyAnswers: key({ 'approximate area': 'One room' }),
    answers: [[/fixed|dried/i, 'Fixed and dry'], [/damaged/i, 'Just stained']],
    expect: {
      asksAny: [/damaged|crack|sag|dry|damp|textur/i],
      materials: [/stain block|stain/i],
      exclusions: [/leak|plaster/i],
    },
  },
  {
    id: 'bathroom-mould',
    // Already stated in the description, so never asked.
    mustNotAsk: [/where is the mould/i],
    jobDescription: 'Black mould on the bathroom ceiling and around the window. Clean it off and repaint.',
    keyAnswers: key({ 'approximate area': 'One room' }),
    answers: [[/where/i, 'Bathroom'], [/how much/i, 'Small patches']],
    expect: {
      materials: [/mould|fungicid/i, /anti-mould|bathroom paint/i],
      exclusions: [/ventilat|extractor|damp|cause/i],
    },
  },
  {
    // Not in the pack: checks nothing is forced onto a job it doesn't cover.
    id: 'paint-fence',
    jobDescription: 'Paint the garden fence panels on both sides of the back garden.',
    keyAnswers: key({ 'approximate area': 'Exterior only' }),
    answers: [],
    expect: {
      materials: [/fence|wood|stain|paint/i],
    },
  },
]
