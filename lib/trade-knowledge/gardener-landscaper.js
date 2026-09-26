// Common gardening and landscaping jobs, drafted by Claude for Phase 3c stage 2 batch 2 and
// revised after a UK landscaping review pass. Each entry stays out of production until a
// person checks it and sets reviewed: true (see ./index.js).
export const GARDENER_LANDSCAPER_JOBS = [
  {
    id: 'patio',
    title: 'Lay a patio',
    matches:
      'new patio, lay a sandstone patio, porcelain patio, replace the paving, paved area at the back, patio with steps',
    reviewed: true,
    questions: [
      {
        topic: 'paving type',
        question: 'What paving is going down?',
        options: ['Indian sandstone', 'Porcelain', 'Concrete slabs'],
      },
      {
        topic: 'ground now',
        question: 'What is there now?',
        options: ['Lawn', 'Old paving to lift', 'Bare soil'],
      },
      {
        topic: 'garden slope',
        question: 'Is the ground level where the patio is going?',
        options: ['Fairly level', 'Sloping, needs steps or a retaining wall'],
      },
      {
        topic: 'patio against the house',
        question: 'Does the patio meet the house wall?',
        options: ['Yes, against the house', 'No, away from the house'],
      },
    ],
    variants: [
      {
        when: 'Any patio sub-base',
        materials: [
          'MOT type 1 sub-base bulk bag',
          'Weed control fabric 1m x 10m',
        ],
      },
      {
        when: 'Natural stone patio',
        materials: [
          'Indian sandstone paving slab',
          'Slurry primer for natural stone',
          'Sharp sand bulk bag',
          'Cement 25kg',
        ],
      },
      {
        when: 'Porcelain patio',
        materials: [
          'Porcelain paving slab 600mm x 600mm',
          'Slurry primer for porcelain',
          'Sharp sand bulk bag',
          'Cement 25kg',
        ],
      },
      {
        when: 'Concrete slab patio',
        materials: [
          'Concrete paving slab 600mm x 600mm',
          'Sharp sand bulk bag',
          'Cement 25kg',
        ],
      },
      {
        when: 'Joints filled',
        materials: ['Brush-in jointing compound 20kg'],
      },
      {
        when: 'Patio edge next to lawn',
        materials: ['Concrete edging kerb'],
      },
      {
        when: 'Patio against the house where it cannot sit 150mm below the damp-proof course',
        materials: ['Linear drainage channel 1m'],
      },
      {
        when: 'Sloping garden with steps or a retaining wall',
        materials: [
          'Concrete blocks 440mm x 215mm x 100mm',
          'Paving step tread',
          'Ready mixed concrete C20',
        ],
      },
    ],
    assumptions: [
      'The ground is firm once the topsoil is dug out',
      'Surface water can drain away across the garden',
    ],
    exclusions: [
      'Drainage channels or soakaways unless listed',
      'Moving drain covers or manholes',
      'Planting and lawn repairs around the edges',
    ],
    pitfalls: [
      'A patio against the house must sit at least 150mm below the damp-proof course, or needs a drainage channel next to the wall',
      'Paving needs a slight fall away from the house so water runs off',
      'Porcelain and sandstone need a slurry primer on the back of each slab or they will not bond',
      'Porcelain is slow to cut and needs special blades, so complicated layouts take much longer',
      'Sloping gardens need steps or retaining walls, which can cost as much as the paving itself',
      'Old paving and soil dug out adds up to several tonnes of waste',
    ],
  },
  {
    id: 'new-lawn',
    title: 'Lay a new lawn',
    matches:
      'new lawn, lay turf, returf the garden, replace the grass, seed a lawn, level the lawn',
    reviewed: true,
    questions: [
      {
        topic: 'lawn ground now',
        question: 'What is there now?',
        options: ['Old lawn', 'Bare soil', 'Paving or gravel to remove'],
      },
      {
        topic: 'turf or seed',
        question: 'Turf or seed?',
        options: ['Turf', 'Seed'],
      },
      {
        topic: 'lawn ground condition',
        question: 'What is the ground like?',
        options: [
          'Fairly level and drains well',
          'Uneven, needs levelling',
          'Heavy clay or gets waterlogged',
        ],
      },
    ],
    variants: [
      {
        when: 'Turfed lawn',
        materials: [
          'Lawn turf roll',
          'Topsoil bulk bag',
          'Pre-turf fertiliser',
        ],
      },
      {
        when: 'Seeded lawn',
        materials: [
          'Grass seed 1kg',
          'Topsoil bulk bag',
          'Pre-seed fertiliser',
        ],
      },
      {
        when: 'Uneven ground levelled',
        materials: ['Topsoil bulk bag'],
      },
      {
        when: 'Heavy clay improved',
        materials: ['Sharp sand bulk bag', 'Soil improver bulk bag'],
      },
    ],
    assumptions: [
      'The ground drains reasonably well',
      'The customer will water the new lawn for the first few weeks',
    ],
    exclusions: [
      'Watering and aftercare after the job',
      'Edging, borders or planting unless listed',
      'Drainage works for waterlogged ground',
    ],
    pitfalls: [
      'Turf must be laid within a day or so of delivery or it yellows',
      'Heavy clay needs improving or the lawn waterlogs',
      'Seed is best sown in spring or early autumn, and fails in hot, dry weather without regular watering',
      'Ground under old paving or gravel is usually compacted rubble that needs digging out and replacing with topsoil',
    ],
  },
  {
    id: 'stump-removal',
    title: 'Remove a tree stump',
    matches:
      'remove a tree stump, old rotten stump, stump grinding, dig out a stump',
    reviewed: true,
    // Key questions that never apply to this job, so they're not asked.
    skipKeyQuestions: ['approximate area'],
    questions: [
      {
        topic: 'stump size',
        question: 'How wide is the stump?',
        options: ['Under 30cm', '30–60cm', 'Over 60cm'],
      },
      {
        topic: 'stump position',
        question: 'Where is the stump?',
        options: [
          'In a lawn or border',
          'Close to a wall, fence or building',
          'In paving or concrete',
        ],
      },
      {
        topic: 'stump access',
        question: 'Can a stump grinder get to it?',
        options: ['Clear access', 'Tight or narrow access'],
      },
      {
        topic: 'after the stump',
        question: 'What happens to the ground afterwards?',
        options: ['Filled and seeded', 'Left for planting'],
      },
    ],
    variants: [
      {
        when: 'Hole filled and seeded',
        materials: ['Topsoil 25kg bag', 'Grass seed 1kg'],
      },
      {
        when: 'Stump treated to stop regrowth instead of grinding',
        materials: ['Stump killer'],
      },
    ],
    assumptions: [
      'No pipes or cables run near the stump',
      'Grinding to about 30cm below ground is enough',
    ],
    exclusions: [
      'Removing roots beyond the stump itself',
      'Repairing paving or walls lifted by roots',
    ],
    pitfalls: [
      'Large roots spread well beyond the stump and are not all removed',
      'Pipes and cables are sometimes wrapped around old roots',
      'Grinders need an access gap, usually at least 70cm wide',
      'Stumps close to walls or buildings may need hand digging rather than grinding',
      'Some trees, such as poplar and willow, throw up suckers unless the stump is treated',
      'Grindings and soil left behind can be a lot of waste',
    ],
  },
  {
    id: 'planting-beds',
    title: 'Create new planting beds',
    matches:
      'new flower beds, borders, replace paving with grass and beds, planting scheme, raised beds',
    reviewed: true,
    questions: [
      {
        topic: 'bed ground now',
        question: 'What is there now?',
        options: ['Lawn', 'Paving or gravel', 'Overgrown ground'],
      },
      {
        topic: 'planting style',
        question: 'What kind of planting?',
        options: [
          'Low-maintenance shrubs',
          'Mixed flowers and perennials',
          'Raised vegetable beds',
        ],
      },
      {
        topic: 'bed edging',
        question: 'How are the bed edges finished?',
        options: ['Steel edging', 'Timber edging', 'Cut edge, no edging'],
      },
    ],
    variants: [
      {
        when: 'New beds dug out',
        materials: [
          'Topsoil bulk bag',
          'Multi-purpose compost 50L',
          'Bark mulch bulk bag',
        ],
      },
      {
        when: 'Low-maintenance beds',
        materials: ['Weed control fabric 1m x 10m'],
      },
      {
        when: 'Steel edging',
        materials: ['Steel lawn edging 1m'],
      },
      {
        when: 'Timber edging',
        materials: ['Treated timber edging board 3.6m', 'Timber edging pegs'],
      },
      {
        when: 'Raised beds',
        materials: [
          'Treated softwood sleeper 2.4m',
          'Sleeper screws',
          'Topsoil bulk bag',
        ],
      },
    ],
    assumptions: ['The customer chooses and supplies the plants unless listed'],
    exclusions: ['Plants unless listed', 'Ongoing maintenance and watering'],
    pitfalls: [
      'Ground under old paving is usually compacted rubble that needs removing and replacing with topsoil',
      'Perennial weeds like bindweed come back unless the roots are dug out',
      'Raised beds need drainage at the bottom',
      'Old railway sleepers contain creosote and should not be used for vegetable beds',
    ],
  },
  {
    id: 'garden-clearance',
    title: 'Garden clearance and maintenance',
    matches:
      'mow the lawn, cut the hedge, tidy the garden, garden clearance, overgrown garden, regular gardener',
    reviewed: true,
    questions: [
      {
        topic: 'clearance work',
        question: 'What needs doing?',
        options: [
          'Lawn mowing',
          'Hedge cutting',
          'Full clearance of an overgrown garden',
        ],
      },
      {
        topic: 'visit frequency',
        question: 'Is this a one-off job or regular visits?',
        options: ['One-off visit', 'Regular visits'],
      },
      {
        topic: 'hedge height',
        question: 'How tall is the hedge?',
        options: ['Under 2m', '2–3m', 'Over 3m, needs a platform'],
        askWhen: 'hedge cutting is included',
      },
      {
        topic: 'how overgrown',
        question: 'How overgrown is it?',
        options: ['Just needs a tidy', 'Very overgrown'],
      },
    ],
    variants: [
      {
        when: 'Regular mowing or hedge cutting',
        materials: [],
      },
      {
        when: 'Clearance with green waste bagged',
        materials: ['Garden waste sacks'],
      },
    ],
    assumptions: [
      'There is somewhere to put green waste, or it is taken away as agreed',
    ],
    exclusions: [
      'Tree work beyond hedge height',
      'Removing rubbish that is not garden waste',
      'Treating Japanese knotweed or other invasive plants',
    ],
    pitfalls: [
      'Hedges should not be cut back hard while birds are nesting, roughly March to August',
      'Conifer hedges such as leylandii do not regrow if cut back into brown wood',
      'Very overgrown gardens often hide rubble, old fencing or dumped rubbish',
      'Japanese knotweed must not be cut and taken away as ordinary green waste, so it needs a specialist',
      'Green waste from a big clearance can fill several trailer loads',
    ],
  },
  {
    id: 'artificial-grass',
    title: 'Lay artificial grass',
    matches:
      'artificial grass, fake lawn, astroturf the garden, replace the lawn with artificial grass',
    reviewed: true,
    questions: [
      {
        topic: 'artificial grass base',
        question: 'What is there now?',
        options: ['Lawn', 'Paving or concrete', 'Bare soil'],
      },
      {
        topic: 'artificial grass quality',
        question: 'What quality of grass?',
        options: ['Budget, short pile', 'Mid-range', 'Premium, long pile'],
      },
      {
        topic: 'drainage',
        question: 'Does the area drain well after rain?',
        options: ['Drains well', 'Puddles or gets waterlogged'],
      },
    ],
    variants: [
      {
        when: 'Laid on a new sub-base',
        materials: [
          'Artificial grass 4m wide',
          'MOT type 1 sub-base bulk bag',
          'Granite dust bulk bag',
          'Weed control fabric 1m x 10m',
          'Galvanised ground pins',
        ],
      },
      {
        when: 'Laid over paving or concrete',
        materials: [
          'Artificial grass 4m wide',
          'Foam underlay 10mm',
          'Artificial grass adhesive',
        ],
      },
      {
        when: 'Joins and edges',
        materials: [
          'Artificial grass joining tape',
          'Artificial grass adhesive',
          'Timber edging board',
        ],
      },
      {
        when: 'Sand infill brushed in',
        materials: ['Kiln-dried sand 25kg'],
      },
    ],
    assumptions: ['The area drains freely'],
    exclusions: ['Drainage works', 'Ongoing cleaning'],
    pitfalls: [
      'Artificial grass laid over poor drainage floods and smells',
      'Concrete or paving underneath needs drainage holes drilled or water sits under the grass',
      'Rolls come 2m or 4m wide, so awkward shapes mean extra joins and wasted offcuts',
      'Joins show unless all pieces run in the same pile direction',
      'Dog urine can smell unless the base drains well and the grass is cleaned regularly',
      'It gets very hot in full sun and can be damaged by barbecues',
    ],
  },
];
