// Common painting and decorating jobs, drafted by Claude for Phase 3c stage 2 batch 2 and
// revised after a UK decorating review pass. Each entry stays out of production until a
// person checks it and sets reviewed: true (see ./index.js).
export const DECORATOR_JOBS = [
  {
    id: 'interior-repaint',
    title: 'Repaint rooms (walls and ceilings)',
    matches:
      'paint a room, painting a bedroom, bedrooms need decorating, repaint the lounge, freshen up the walls, paint walls and ceilings, redecorate the house',
    reviewed: true,
    questions: [
      {
        topic: 'surfaces included',
        question: 'Which surfaces are being painted?',
        options: [
          'Walls only',
          'Walls and ceilings',
          'Walls, ceilings and woodwork',
        ],
      },
      {
        topic: 'paint range',
        question: 'What paint is being used?',
        options: [
          'Standard trade paint',
          'Premium brand chosen by the customer',
        ],
      },
      {
        topic: 'furniture in the rooms',
        question: 'Will the rooms be cleared before work starts?',
        options: ['Customer clears them', 'Trader moves and covers furniture'],
      },
      {
        topic: 'ceiling height',
        question: 'How high are the ceilings?',
        options: ['Standard height', 'High ceilings or a stairwell'],
      },
    ],
    variants: [
      {
        when: 'Walls repainted',
        materials: [
          'Trade matt emulsion white 10L',
          'Fine surface filler',
          "Decorators' caulk",
        ],
      },
      {
        when: 'Kitchen or bathroom walls',
        materials: ['Kitchen and bathroom emulsion white 2.5L'],
      },
      {
        when: 'Ceilings repainted',
        materials: ['Ceiling matt emulsion white 5L'],
      },
      {
        when: 'Woodwork included',
        materials: ['Satinwood paint white 2.5L', 'Sanding sponge fine'],
      },
      {
        when: 'Bare or new plaster needing a mist coat',
        materials: ['Contract matt emulsion white 10L'],
      },
      {
        when: 'Old water, smoke or nicotine stains on walls or ceilings',
        materials: ['Stain block primer 750ml'],
      },
      {
        when: 'Any interior job',
        materials: [
          'Masking tape 50mm',
          'Cotton dust sheet',
          'Sanding sponge medium',
          'Sugar soap 1L',
        ],
      },
    ],
    assumptions: [
      'Walls and ceilings are sound and only need normal filling and sanding',
      'Colours are similar to the existing ones, so two coats will cover',
    ],
    exclusions: [
      'Plaster repairs beyond minor filling',
      'Moving heavy furniture unless included',
      'Painting inside cupboards unless listed',
    ],
    pitfalls: [
      'New plaster needs a thinned mist coat before normal emulsion or the paint peels',
      'Strong colour changes, especially light over dark, can need a third coat',
      'Premium brand paints can cost several times more than trade paint and some need extra coats',
      'Kitchens and bathrooms need a wipeable, moisture-resistant finish rather than contract matt',
      'Stairwells need a tower or ladder platform to reach safely',
      'Old water stains and nicotine bleed through emulsion unless they are sealed with a stain block first',
    ],
  },
  {
    id: 'woodwork',
    title: 'Paint doors, frames and skirting',
    matches:
      'paint the woodwork, gloss the skirting, paint doors, repaint window frames, paint banisters, paint the spindles',
    reviewed: true,
    questions: [
      {
        topic: 'woodwork included',
        question: 'Which woodwork is being painted?',
        options: [
          'Skirting and door frames',
          'Doors, frames and skirting',
          'Everything including windows and banisters',
        ],
      },
      {
        topic: 'existing woodwork finish',
        question: 'What finish is on the woodwork now?',
        options: ['Oil-based gloss', 'Satin or eggshell', 'Bare wood'],
      },
      {
        topic: 'finish wanted',
        question: 'What finish is wanted?',
        options: ['Gloss', 'Satin', 'Eggshell'],
      },
    ],
    variants: [
      {
        when: 'Painted woodwork recoated in satin or eggshell',
        materials: ['Satinwood paint white 2.5L', 'Sanding sponge fine'],
      },
      {
        when: 'Gloss finish',
        materials: [
          'Undercoat white 2.5L',
          'Gloss paint white 2.5L',
          'Sanding sponge fine',
        ],
      },
      {
        when: 'Water-based paint over old oil-based gloss',
        materials: ['Adhesion primer 750ml', 'Sugar soap 1L'],
      },
      {
        when: 'Bare wood',
        materials: [
          'Knotting solution',
          'Wood primer white 1L',
          'Undercoat white 2.5L',
        ],
      },
      {
        when: 'Dents and gaps filled',
        materials: ['Two-part wood filler', "Decorators' caulk"],
      },
    ],
    assumptions: [
      'The existing paint is sound and only needs a light sand',
      'Doors can be painted in place without removal',
    ],
    exclusions: [
      'Stripping old paint back to bare wood unless listed',
      'Repairs to damaged joinery',
    ],
    pitfalls: [
      'Old oil-based gloss needs a good sand and an adhesion primer, or new water-based paint will peel',
      'Paint on houses built before 1970 may contain lead, so it is sanded wet or not sanded at all',
      'Oil-based white gloss yellows over time, especially away from daylight',
      'Banisters and spindles take far longer than their size suggests',
      'Door handles, hinges and hardware need removing or masking for a clean finish',
    ],
  },
  {
    id: 'wallpapering',
    title: 'Hang wallpaper',
    matches:
      'wallpaper a room, feature wall, strip wallpaper, hang lining paper, remove woodchip, paper the walls',
    reviewed: true,
    questions: [
      {
        topic: 'papering extent',
        question: 'Where is the paper going?',
        options: [
          'One feature wall',
          'Whole room',
          'Whole room and the ceiling',
        ],
      },
      {
        topic: 'existing wall covering',
        question: 'What is on the walls now?',
        options: ['Paint', 'Old wallpaper', 'Woodchip or painted-over paper'],
      },
      {
        topic: 'paper type',
        question: 'What is going up?',
        options: [
          'Standard paste-the-paper',
          'Paste-the-wall',
          'Heavy vinyl or textured',
          'Lining paper to paint over',
        ],
      },
    ],
    variants: [
      {
        when: 'Old wallpaper or woodchip removed',
        materials: ['Wallpaper stripper solution', 'Fine surface filler'],
      },
      {
        when: 'Walls sized before papering',
        materials: ['Wallpaper size'],
      },
      {
        when: 'Standard wallpaper hung',
        materials: ['Ready mixed wallpaper paste 10kg'],
      },
      {
        when: 'Paste-the-wall paper hung',
        materials: ['Paste the wall adhesive 10kg'],
      },
      {
        when: 'Heavy vinyl hung',
        materials: ['Heavy duty wallpaper adhesive 10kg'],
      },
      {
        when: 'Lining paper hung',
        materials: [
          'Lining paper 1400 grade',
          'Ready mixed wallpaper paste 10kg',
        ],
      },
    ],
    assumptions: [
      'The customer supplies the wallpaper, with enough rolls from one batch',
      'Walls are sound under any old paper',
    ],
    exclusions: [
      'Replastering walls damaged when old paper comes off',
      'Supplying the wallpaper itself unless listed',
    ],
    pitfalls: [
      'Old paper often pulls plaster off, which needs making good before papering',
      'Painted woodchip and painted-over paper can take far longer to strip than expected',
      'Bare or new plaster needs sizing first or the paper will not slide and bond properly',
      'Patterned paper needs extra rolls to match the pattern',
      'Rolls from different batches can differ in shade',
      'Heavy or expensive papers often need lining paper hung first for a good finish',
    ],
  },
  {
    id: 'exterior-painting',
    title: 'Paint the outside of the house',
    matches:
      'paint the front of the house, masonry paint, repaint render, paint exterior walls, paint fascias and windows, paint pebbledash',
    reviewed: true,
    questions: [
      {
        topic: 'exterior surfaces',
        question: 'What is being painted outside?',
        options: [
          'Masonry walls',
          'Windows, doors and fascias',
          'Walls and woodwork',
        ],
      },
      {
        topic: 'wall surface',
        question: 'What are the outside walls like?',
        options: [
          'Smooth render',
          'Pebbledash',
          'Brick, never painted',
          'Brick, already painted',
        ],
        askWhen: 'masonry walls are being painted',
      },
      {
        topic: 'house height',
        question: 'How tall is the house?',
        options: ['Bungalow', 'Two storeys', 'Three storeys or more'],
      },
      {
        topic: 'reaching the work',
        question: 'Can the top of the walls be reached from a ladder?',
        options: ['Ladder is fine', 'Needs a tower or scaffold'],
      },
    ],
    variants: [
      {
        when: 'Smooth render or painted brick',
        materials: [
          'Smooth masonry paint white 10L',
          'Stabilising solution 5L',
          'Fungicidal wash 5L',
          'Exterior masonry filler',
        ],
      },
      {
        when: 'Pebbledash painted',
        materials: [
          'Smooth masonry paint white 10L',
          'Stabilising solution 5L',
          'Fungicidal wash 5L',
        ],
      },
      {
        when: 'Smooth render with fine cracking to hide',
        materials: ['Textured masonry paint white 10L'],
      },
      {
        when: 'Exterior woodwork painted',
        materials: [
          'Exterior undercoat white 2.5L',
          'Exterior gloss white 2.5L',
          'Exterior wood filler',
          'Exterior wood primer 1L',
        ],
      },
    ],
    assumptions: [
      'The render is sound apart from small cracks that can be filled',
      'The weather is dry enough to paint when work is booked',
      "All walls can be reached from the property without needing a neighbour's access",
    ],
    exclusions: [
      'Render repairs beyond filling small cracks',
      'Scaffolding unless listed',
      'Painting uPVC windows, doors or fascias',
    ],
    pitfalls: [
      'Blown or hollow render must be repaired before painting or the paint fails with it',
      'Masonry paint needs dry weather, temperatures above about 5°C, and time to dry before evening dew',
      'Chalky old paint needs a stabilising solution first or the new coat flakes',
      'Pebbledash uses far more paint per square metre than smooth render',
      'Painting bare brick for the first time is hard to undo and can trap moisture, so only breathable masonry paint should be used',
      "Semi-detached and terraced houses may need a neighbour's permission to reach a side wall or set up a ladder",
    ],
  },
  {
    id: 'stain-cover',
    title: 'Cover a water stain on a ceiling',
    matches:
      'water stain on the ceiling, brown mark on ceiling, cover up a leak stain, ceiling stain after a leak',
    reviewed: true,
    // Key questions that never apply to this job, so they're not asked.
    skipKeyQuestions: ['approximate area', 'colour change'],
    questions: [
      {
        topic: 'leak fixed',
        question: 'Has the leak been fixed and the ceiling dried out?',
        options: ['Fixed and dry', 'Still damp or recent'],
      },
      {
        topic: 'ceiling damage',
        question: 'Is the ceiling itself damaged?',
        options: ['Just stained', 'Cracked or sagging'],
      },
      {
        topic: 'ceiling finish',
        question: 'Is the ceiling smooth or textured?',
        options: ['Smooth', 'Textured or Artex'],
      },
    ],
    variants: [
      {
        when: 'Stain sealed and ceiling repainted',
        materials: [
          'Oil-based stain block primer 750ml',
          'Ceiling matt emulsion white 5L',
        ],
      },
    ],
    assumptions: [
      'The leak has been repaired and the ceiling has fully dried',
      'The whole ceiling is repainted so the repair does not show',
    ],
    exclusions: [
      'Finding or fixing the leak',
      'Plaster or plasterboard repairs to a damaged ceiling',
    ],
    pitfalls: [
      'Painting before the ceiling is fully dry brings the stain back',
      'Oil-based stain blocks seal water stains far more reliably than water-based ones',
      'A sagging ceiling is a plastering job before it is a decorating job',
      'Textured ceilings in pre-2000 homes may contain asbestos, so they are painted over but never sanded or scraped',
      'Patch painting one area usually shows, so the whole ceiling is normally repainted',
    ],
  },
  {
    id: 'mould-treatment',
    title: 'Treat mould and repaint',
    matches:
      'black mould on the walls, mouldy bathroom ceiling, mould in the bedroom corner, damp patches with mould',
    reviewed: true,
    // Key questions that never apply to this job, so they're not asked.
    skipKeyQuestions: ['colour change'],
    questions: [
      {
        topic: 'mould location',
        question: 'Where is the mould?',
        options: ['Bathroom', 'Kitchen', 'Bedroom or living room'],
      },
      {
        topic: 'mould extent',
        question: 'How much of the surface is affected?',
        options: ['Small patches', 'Large areas'],
      },
      {
        topic: 'suspected cause',
        question: 'What seems to be causing it?',
        options: [
          'Condensation (steamy room, cold corners)',
          'Possible leak or damp coming through the wall',
        ],
      },
    ],
    variants: [
      {
        when: 'Mould cleaned and treated',
        materials: ['Mould remover spray', 'Fungicidal wash 5L'],
      },
      {
        when: 'Repainted with anti-mould paint',
        materials: [
          'Anti-mould bathroom paint white 2.5L',
          'Stain block primer 750ml',
        ],
      },
    ],
    assumptions: [
      'The mould is caused by condensation, not a leak or penetrating damp',
    ],
    exclusions: [
      'Fixing the cause of damp, such as ventilation, leaks or damp-proofing',
      'Replastering walls damaged by damp',
    ],
    pitfalls: [
      'Mould returns unless the room is better ventilated, so the cause should be pointed out to the customer',
      'Anti-mould paint slows mould down but does not fix condensation',
      'Mould on an outside wall can be penetrating damp rather than condensation',
      'Painting over mould without killing it first lets it grow back through the new paint',
      'Heavy mould releases spores when disturbed, so the room should be ventilated and a mask worn',
    ],
  },
];
