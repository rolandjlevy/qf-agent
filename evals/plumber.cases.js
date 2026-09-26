// Realistic plumber jobs for scripts/eval.mjs. Each `expect` lists what a good quote
// must contain, written from real-world practice rather than copied from the pack.
export { FORBIDDEN } from './shared.js'

const key = (pipework, access, makingGood = 'Customer or another trade', supplies = 'Trader supplies everything') => [
  { question: 'What is the existing pipework made of?', answer: pipework },
  { question: 'How easy is it to get to the pipes?', answer: access },
  { question: 'Who makes good walls, ceilings and floors after the work?', answer: makingGood },
  { question: 'Who is supplying the materials?', answer: supplies },
]

export const PLUMBER_CASES = [
  {
    id: 'mixer-dripping',
    jobDescription: 'Kitchen mixer tap keeps dripping from the spout even when turned off hard.',
    keyAnswers: key('Copper', 'Exposed or easy to reach'),
    answers: [[/lever|mixer|handle|turn/i, 'Single lever mixer'], [/where|coming from/i, 'Drips from the spout'], [/isolat|valve/i, 'Yes, both pipes']],
    expect: {
      asksAny: [/where|spout|handle|lever|type of tap|mixer|cartridge|make|brand/i],
      materials: [/cartridge/i],
      assumptions: [/isolat|stopcock|shut.?off|parts?.*availab/i],
    },
  },
  {
    id: 'pillar-tap-drip',
    jobDescription: 'Old bathroom basin hot tap drips constantly. It takes several turns to shut off.',
    keyAnswers: key('Copper', 'Exposed or easy to reach'),
    answers: [[/turn off|mechanism/i, 'Several full turns'], [/where|coming from/i, 'Drips from the spout'], [/isolat|valve/i, 'No valves']],
    expect: {
      asksAny: [/where|spout|handle|isolat|valve/i],
      materials: [/washer/i],
      assumptions: [/isolat|stopcock|shut.?off/i],
    },
  },
  {
    id: 'toilet-running',
    jobDescription: 'Toilet keeps running into the pan after flushing. Push button flush on a close-coupled toilet.',
    keyAnswers: key('Plastic', 'Exposed or easy to reach'),
    answers: [[/doing|fault|running|overflow/i, 'Water keeps running into the pan']],
    expect: {
      asksAny: [/flush|fill|overflow|running|cistern|make|brand/i],
      materials: [/flush valve|valve seal|washer/i],
      assumptions: [/crack|cistern|pan|parts?.*availab/i],
    },
  },
  {
    id: 'cistern-overflow',
    jobDescription: 'Water dripping from the overflow pipe outside, comes from the upstairs toilet cistern.',
    keyAnswers: key('Copper', 'Exposed or easy to reach'),
    answers: [[/doing|fault/i, 'Cistern overflows']],
    expect: {
      asksAny: [/fill|float|ball|valve|inlet|type|pipe join|side|underneath/i],
      materials: [/fill valve|float valve|ballcock|inlet valve/i],
      assumptions: [/isolat|stopcock|cistern|crack|access/i],
    },
  },
  {
    id: 'slow-basin',
    jobDescription: 'Bathroom basin drains really slowly and smells.',
    keyAnswers: key('Plastic', 'Exposed or easy to reach'),
    answers: [[/other|elsewhere|more than one|several/i, 'Only this one']],
    expect: {
      asksAny: [/other|elsewhere|more than one|several|main drain/i],
      materials: [/trap/i],
      exclusions: [/drain|sewer|underground/i],
    },
  },
  {
    id: 'radiator-swap',
    jobDescription: 'Replace a leaking living room radiator with a new one the same size. Combi boiler.',
    keyAnswers: key('Copper', 'Exposed or easy to reach'),
    answers: [[/valve/i, 'Fit new thermostatic valves'], [/size/i, 'Same size']],
    expect: {
      asksAny: [/valve|size|same|position/i],
      materials: [/radiator/i, /inhibitor|thermostatic|trv|valve/i],
      assumptions: [/drain|refill|wall|bracket|pipe/i],
      exclusions: [/decorat|making good|flush|redecorat/i],
    },
  },
  {
    id: 'ceiling-stain',
    jobDescription: 'Brown water stain spreading on the kitchen ceiling under the bathroom.',
    keyAnswers: key('Copper', 'Under floorboards', 'Customer or another trade'),
    answers: [[/see|where|location|find/i, 'Under the floor'], [/material|made of/i, 'Copper']],
    expect: {
      asksAny: [/where|see|locat|find|source|bath|shower|toilet/i],
      exclusions: [/decorat|plaster|ceiling|making good|damage/i],
      assumptions: [/leak|floor|access|board/i],
    },
  },
  {
    id: 'outside-tap',
    jobDescription: 'Fit an outside tap on the back wall of the kitchen for a garden hose.',
    keyAnswers: key('Copper', 'Exposed or easy to reach'),
    answers: [[/behind|near|pipe|supply/i, 'Yes, directly behind'], [/wall/i, 'Cavity wall']],
    expect: {
      asksAny: [/wall|supply|pipe|behind|near|position/i],
      materials: [/outside tap|outdoor tap|garden tap|bib tap/i],
      assumptions: [/pipe|supply|wall|drill/i],
    },
  },
  {
    id: 'washing-machine',
    jobDescription: 'Plumb in a new washing machine next to the kitchen sink. No existing connections.',
    keyAnswers: key('Copper', 'Exposed or easy to reach'),
    answers: [[/connection|existing/i, 'None'], [/far|distance|where/i, 'Next to the sink']],
    expect: {
      asksAny: [/connection|waste|trap|valve|position|far|socket/i],
      materials: [/washing machine valve|appliance valve|isolating valve/i, /trap|waste/i],
      exclusions: [/electric|socket|dispos|old appliance/i],
    },
  },
  {
    id: 'new-kitchen-tap',
    jobDescription: 'Customer has bought a new kitchen mixer tap and wants it fitted in place of the old one.',
    keyAnswers: key('Copper', 'Exposed or easy to reach', 'Customer or another trade', 'Customer supplies everything'),
    answers: [[/hole/i, 'One hole'], [/pressure|boiler|system/i, 'Combi boiler']],
    expect: {
      asksAny: [/hole|pressure|system|boiler|isolat|connect/i],
      assumptions: [/pressure|hole|fit|pipe|supplied/i],
      exclusions: [/sink|worktop|waste/i],
    },
  },
]
