// Common plastering jobs, drafted by Claude for Phase 3c stage 2 batch 2 and revised after a
// UK plastering review pass. Each entry stays out of production until a person checks it and
// sets reviewed: true (see ./index.js).
export const PLASTERER_JOBS = [
  {
    id: 'ceiling-repair',
    title: 'Repair a damaged ceiling',
    matches:
      'ceiling plaster needs repairing, ceiling damaged by a leak, cracked ceiling, sagging ceiling, hole in the ceiling, lath and plaster ceiling',
    reviewed: true,
    questions: [
      {
        topic: 'ceiling construction',
        question: 'What is the ceiling made of?',
        options: ['Plasterboard', 'Lath and plaster'],
      },
      {
        topic: 'leak dried out',
        question: 'If there was a leak, is it fixed and dry?',
        options: ['Fixed and dry', 'Still damp', 'No leak involved'],
      },
      {
        topic: 'ceiling sagging',
        question: 'Is the ceiling sagging or loose?',
        options: ['Firm', 'Sagging or loose in places'],
      },
    ],
    variants: [
      {
        when: 'Damaged section cut out and replaced',
        materials: [
          'Plasterboard 12.5mm 2400mm x 1200mm',
          'Plasterboard screws 38mm',
          'Scrim tape',
          'Multi-finish plaster 25kg',
        ],
      },
      {
        when: 'Cracks taped and skimmed',
        materials: ['Scrim tape', 'Multi-finish plaster 25kg'],
      },
      {
        when: 'Lath and plaster ceiling boarded over',
        materials: [
          'Plasterboard 12.5mm 2400mm x 1200mm',
          'Plasterboard screws 50mm',
          'Scrim tape',
          'Multi-finish plaster 25kg',
        ],
      },
      {
        when: 'Water stain left on the new finish',
        materials: ['Stain block primer 750ml'],
      },
    ],
    assumptions: [
      'Any leak has been fixed and the ceiling has dried out',
      'The ceiling joists are sound',
    ],
    exclusions: [
      'Finding or repairing the leak',
      'Painting the ceiling',
      'Moving or refitting light fittings',
    ],
    pitfalls: [
      'Wet plasterboard must dry out or be replaced, as skimming over damp board fails',
      'Old lath and plaster ceilings can come down in larger sections than expected, so boarding over the whole ceiling is often better value than patching',
      'A sagging lath and plaster ceiling needs securing before anyone works under it',
      'A textured ceiling coating should be tested for asbestos before it is sanded or cut',
      'New plaster takes several days to dry before it can be painted',
    ],
  },
  {
    id: 'skim-walls',
    title: 'Skim walls or a whole room',
    matches:
      'skim the walls, replaster a room, skim coat, plaster the lounge, reskim bedroom walls, skim walls and ceiling',
    reviewed: true,
    questions: [
      {
        topic: 'skim extent',
        question: 'What is being skimmed?',
        options: ['Walls only', 'Walls and ceiling', 'Ceiling only'],
      },
      {
        topic: 'wall condition',
        question: 'Is the old plaster sound?',
        options: ['Sound', 'Blown or loose in places', 'Damp or crumbling'],
      },
      {
        topic: 'textured coating',
        question: 'Is there a textured coating on the walls or ceiling?',
        options: ['Yes, textured', 'No, smooth'],
      },
    ],
    variants: [
      {
        when: 'Painted or low-suction walls skimmed',
        materials: [
          'Multi-finish plaster 25kg',
          'Grit bonding primer 5L',
          'Scrim tape',
        ],
      },
      {
        when: 'Dusty or high-suction walls skimmed',
        materials: [
          'Multi-finish plaster 25kg',
          'PVA bonding agent 5L',
          'Scrim tape',
        ],
      },
      {
        when: 'Blown plaster hacked off and replaced on brick or block',
        materials: ['Hardwall plaster 25kg', 'Multi-finish plaster 25kg'],
      },
      {
        when: 'Walls replastered after damp treatment',
        materials: ['Renovating plaster 25kg', 'Multi-finish plaster 25kg'],
      },
      {
        when: 'External corners and edges',
        materials: ['Angle bead 2.4m', 'Stop bead 3m'],
      },
    ],
    assumptions: [
      'The room is cleared and floors are protected',
      'Sockets and switches can be loosened off the wall by a qualified electrician if needed',
    ],
    exclusions: [
      'Decorating',
      'Removing and refitting skirting, sockets or radiators unless listed',
      'Fixing the cause of damp',
    ],
    pitfalls: [
      'Blown plaster sounds hollow when tapped and must come off before skimming',
      'Painted walls need a grit bonding primer, as PVA alone can let the skim fail',
      'Plaster on a damp wall blows again unless the damp is fixed first',
      'Old lime plaster in older houses is best repaired with lime, as gypsum patches can crack away from it',
      'Radiators, sockets and switches need taking off or loosening to skim behind them',
      'Artex-style coatings should be tested for asbestos before they are disturbed',
    ],
  },
  {
    id: 'patch-repair',
    title: 'Patch repair holes or damaged plaster',
    matches:
      'fill a hole, patch repair, damaged plaster, hole in the wall, plaster repair after electrics, make good after a rewire',
    reviewed: true,
    // Key questions that never apply to this job, so they're not asked.
    skipKeyQuestions: ['approximate area'],
    questions: [
      {
        topic: 'damage size',
        question: 'How big is the damage?',
        options: ['Small holes or chips', 'Up to A4 size', 'Larger areas'],
      },
      {
        topic: 'patch surface',
        question: 'Is the hole through plasterboard?',
        options: ['Through plasterboard', 'Plaster on brick'],
      },
      {
        topic: 'number of repairs',
        question: 'How many separate repairs are there?',
        options: [
          'One or two',
          'Several around the house',
          'Cable chases after a rewire',
        ],
      },
    ],
    variants: [
      {
        when: 'Small holes filled',
        materials: ['One coat plaster 10kg'],
      },
      {
        when: 'Hole through plasterboard',
        materials: [
          'Plasterboard 12.5mm 1200mm x 900mm',
          'Plasterboard screws 38mm',
          'Scrim tape',
          'Multi-finish plaster 25kg',
        ],
      },
      {
        when: 'Deep repair or cable chases on masonry',
        materials: ['Bonding plaster 25kg', 'Multi-finish plaster 25kg'],
      },
    ],
    assumptions: ['The surrounding plaster is sound'],
    exclusions: ['Painting over the repair'],
    pitfalls: [
      'A patch usually shows through paint unless the whole wall is repainted',
      'Holes in plasterboard need a backing piece so the patch has something to fix to',
      'Patches need to be built up in layers and left to set, so deep repairs may need a second visit',
      'Minimum visit charges often make several small repairs better value done together',
    ],
  },
  {
    id: 'overboard-ceiling',
    title: 'Overboard and skim a textured ceiling',
    matches:
      'artex ceiling, cover a textured ceiling, board over artex, smooth out a ceiling, overboard the ceiling, skim over artex',
    reviewed: true,
    // Key questions that never apply to this job, so they're not asked.
    skipKeyQuestions: ['finish required', 'existing surface'],
    questions: [
      {
        topic: 'coating tested',
        question: 'Has the textured coating been tested for asbestos?',
        options: ['Tested clear', 'Not tested'],
      },
      {
        topic: 'texture depth',
        question: 'How deep is the texture?',
        options: ['Shallow swirls or patterns', 'Deep peaks or stipple'],
      },
      {
        topic: 'ceiling fittings',
        question: 'What is fixed to the ceiling?',
        options: [
          'Just a light',
          'Several lights or downlights',
          'Coving to keep',
        ],
      },
    ],
    variants: [
      {
        when: 'Ceiling boarded over and skimmed',
        materials: [
          'Plasterboard 12.5mm 2400mm x 1200mm',
          'Plasterboard screws 50mm',
          'Scrim tape',
          'Multi-finish plaster 25kg',
        ],
      },
      {
        when: 'Shallow coating tested clear and skimmed directly',
        materials: ['Grit bonding primer 5L', 'Multi-finish plaster 25kg'],
      },
    ],
    assumptions: [
      'The existing ceiling is firm enough to screw through into the joists',
      'Light fittings are taken down and put back by an electrician',
    ],
    exclusions: [
      'Asbestos testing or removal',
      'Electrical work on light fittings',
      'Decorating',
    ],
    pitfalls: [
      'Overboarding avoids disturbing the coating, which matters if it has not been tested',
      'Skimming straight over a coating only works on shallow texture that has been tested clear, and usually takes two coats',
      'Deep peaks must never be scraped or sanded flat unless the coating has been tested clear',
      'Boarding lowers the ceiling slightly, so coving and light fittings need adjusting',
      'Long screws are needed to reach through the old ceiling into the joists',
    ],
  },
  {
    id: 'render-repair',
    title: 'Repair external render',
    matches:
      'repair rendering, blown render, cracked render, render patch, pebbledash repair',
    reviewed: true,
    // Key questions that never apply to this job, so they're not asked.
    skipKeyQuestions: ['finish required', 'existing surface'],
    questions: [
      {
        topic: 'render type',
        question: 'What type of render is it?',
        options: [
          'Sand and cement',
          'Pebbledash',
          'Coloured through-render',
          'Lime render on an old house',
        ],
      },
      {
        topic: 'render damage extent',
        question: 'How much of it is damaged?',
        options: ['Small patches', 'Large areas', 'Whole wall'],
      },
      {
        topic: 'reaching the render',
        question: 'Can the damaged render be reached from a ladder?',
        options: ['Ladder is fine', 'Needs a tower or scaffold'],
      },
    ],
    variants: [
      {
        when: 'Sand and cement patches',
        materials: [
          'Sharp sand 25kg',
          'Building sand 25kg',
          'Cement 25kg',
          'Waterproofer 5L',
          'Render plasticiser 5L',
        ],
      },
      {
        when: 'Pebbledash patched',
        materials: [
          'Pebbledash aggregate 25kg',
          'Building sand 25kg',
          'Cement 25kg',
        ],
      },
      {
        when: 'Coloured through-render patched',
        materials: ['Through-coloured render 25kg'],
      },
      {
        when: 'Lime render patched on an older solid wall',
        materials: ['Natural hydraulic lime NHL 3.5 25kg', 'Sharp sand 25kg'],
      },
      {
        when: 'New corners and edges',
        materials: ['Stainless steel render bead 2.5m'],
      },
    ],
    assumptions: [
      'The wall behind the render is sound',
      'The work can be reached from ladders unless scaffolding is listed',
    ],
    exclusions: ['Scaffolding unless listed', 'Painting the repaired render'],
    pitfalls: [
      'Patches rarely match old render exactly, so repainting the wall is usually needed',
      'Coloured through-render is very hard to patch invisibly, so whole panels may need redoing',
      'Cement render on an old solid wall traps moisture, so older houses need lime render',
      'Blown render often extends further than it looks until it is tapped out',
      'Render should not be applied in frost or heavy rain, and hot sun dries it too fast',
    ],
  },
];
