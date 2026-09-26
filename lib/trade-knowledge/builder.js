// Common general-building jobs, drafted by Claude for Phase 3c stage 2 batch 2 and revised
// after a UK general-building review pass. Each entry stays out of production until a person
// checks it and sets reviewed: true (see ./index.js).
export const BUILDER_JOBS = [
  {
    id: 'remove-internal-wall',
    title: 'Remove an internal wall',
    matches:
      'remove an internal wall, knock through, open plan kitchen diner, take down a wall, knock two rooms into one, steel beam',
    reviewed: true,
    // Key questions that never apply to this job, so they're not asked.
    skipKeyQuestions: ['planning permission'],
    questions: [
      {
        topic: 'load-bearing',
        question: 'Is the wall load-bearing?',
        options: ['Load-bearing', 'Not load-bearing'],
      },
      {
        topic: 'wall construction',
        question: 'What is the wall built from?',
        options: ['Brick or block', 'Timber stud and plasterboard'],
      },
      {
        topic: 'wall length',
        question: 'How long is the section being removed?',
        options: ['Up to 3m', '3m to 5m', 'Over 5m'],
      },
      {
        topic: 'services in the wall',
        question: 'Is there anything in the wall?',
        options: ['Sockets or switches', 'Radiator or pipes', 'Nothing'],
      },
    ],
    variants: [
      {
        when: 'Load-bearing wall replaced by a steel beam',
        materials: [
          'Steel universal beam',
          'Concrete padstone 440mm x 215mm x 100mm',
          'Engineering bricks class B',
          'Steel packers',
        ],
      },
      {
        when: 'Steel beam boxed in for fire protection',
        materials: [
          'Fire resistant plasterboard 12.5mm 2400mm x 1200mm',
          'Metal angle bead 2.4m',
        ],
      },
      {
        when: 'Non load-bearing wall removed',
        materials: [
          'Plasterboard 12.5mm 2400mm x 1200mm',
          'Sawn timber 47mm x 50mm C24',
        ],
      },
      {
        when: 'Walls, ceiling and floor made good',
        materials: [
          'Bonding plaster 25kg',
          'Multi-finish plaster 25kg',
          'Scrim tape',
        ],
      },
    ],
    assumptions: [
      "A structural engineer's beam size is available before work starts",
      'The foundations under the beam ends are adequate',
      'Floor levels on each side of the wall match',
    ],
    exclusions: [
      "Structural engineer's calculations and building control fees",
      'Moving electrics, radiators or pipework in the wall',
      'New flooring across the old wall line',
      'Decorating',
    ],
    pitfalls: [
      'A load-bearing wall cannot be priced properly until an engineer has sized the beam',
      'The beam must be propped and the ceiling above supported while the wall comes out',
      'Walls in older houses often carry some load even when they look like simple partitions',
      'Floors either side of an old wall are often at different levels and need levelling',
      'Chimney breasts and walls carrying the floor above make the job much bigger',
      'Knocking through creates a lot of dust, so the rest of the house needs sheeting off',
    ],
  },
  {
    id: 'new-opening',
    title: 'Form a new door opening',
    matches:
      'new doorway, knock a door through, widen an opening, make an opening in a wall, fit a lintel, turn a window into a door, patio door opening',
    reviewed: true,
    // Key questions that never apply to this job, so they're not asked.
    skipKeyQuestions: ['planning permission'],
    questions: [
      {
        topic: 'opening wall type',
        question: 'Which wall is the opening going in?',
        options: [
          'Internal brick or block wall',
          'Internal stud wall',
          'Outside wall',
        ],
      },
      {
        topic: 'internal wall load',
        question: 'Is the internal wall load-bearing?',
        options: ['Load-bearing', 'Not load-bearing'],
        askWhen: 'the opening is in an internal brick or block wall',
      },
      {
        topic: 'opening width',
        question: 'How wide is the new opening?',
        options: ['Standard door width', 'Wide opening or double doors'],
      },
      {
        topic: 'existing window',
        question: 'Is the opening replacing an existing window?',
        options: ['Yes, dropping a window to a door', 'No, a new opening'],
        askWhen: 'the opening is in an outside wall',
      },
    ],
    variants: [
      {
        when: 'Opening in a non load-bearing brick or block wall',
        materials: ['Concrete lintel 100mm x 65mm x 1200mm', 'Door lining set'],
      },
      {
        when: 'Opening in a load-bearing internal wall',
        materials: [
          'Concrete lintel 100mm x 140mm x 1200mm',
          'Door lining set',
        ],
      },
      {
        when: 'Opening in a stud wall',
        materials: [
          'Sawn timber 47mm x 100mm C24',
          'Door lining set',
          'Plasterboard 12.5mm 2400mm x 1200mm',
        ],
      },
      {
        when: 'Opening in an outside cavity wall',
        materials: [
          'Steel cavity lintel 1200mm',
          'Cavity closer 1200mm',
          'Cavity tray',
          'Weep vents',
        ],
      },
      {
        when: 'Reveals made good',
        materials: [
          'Bonding plaster 25kg',
          'Multi-finish plaster 25kg',
          'Angle bead 2.4m',
        ],
      },
    ],
    assumptions: [
      'The wall above can be supported safely while the lintel goes in',
      'No services run through the area of the new opening',
    ],
    exclusions: ['Supplying and hanging the door', 'Decorating'],
    pitfalls: [
      'A wide opening in a load-bearing wall may need an engineer-sized beam rather than a standard lintel',
      'Outside walls need a cavity tray, closers and weep vents so water cannot track in',
      'Dropping a window to a door means cutting out brickwork below the sill and often altering drains or paths outside',
      'The existing lintel over a window may be too short or too weak for a wider door opening',
      'Cables often run vertically above and below sockets and switches near the opening',
    ],
  },
  {
    id: 'garage-conversion',
    title: 'Convert a garage into a room',
    matches:
      'garage conversion, turn the garage into a room, convert garage to office, brick up the garage door',
    reviewed: true,
    questions: [
      {
        topic: 'garage door opening',
        question: 'What goes where the garage door is?',
        options: ['Wall with a window', 'Full-height glazing', 'Plain wall'],
      },
      {
        topic: 'garage walls',
        question: 'How are the garage walls built?',
        options: [
          'Single skin of brick or block',
          'Cavity wall like the house',
        ],
      },
      {
        topic: 'floor level',
        question: 'How does the garage floor compare with the house floor?',
        options: ['Lower, needs raising', 'Already level'],
      },
      {
        topic: 'garage roof',
        question: 'What is the garage roof like?',
        options: [
          'Part of the house roof or a room above',
          'Separate pitched roof',
          'Flat roof',
        ],
      },
    ],
    variants: [
      {
        when: 'Garage door opening built up',
        materials: [
          'Ready mixed concrete C25',
          'Concrete blocks 440mm x 215mm x 100mm',
          'Facing bricks',
          'Damp proof course roll 112mm',
          'Stainless steel wall ties',
          'Cavity wall insulation batts 100mm',
        ],
      },
      {
        when: 'Window fitted in the built-up opening',
        materials: ['Steel cavity lintel 1200mm', 'Cavity closer 1200mm'],
      },
      {
        when: 'Floor insulated and raised',
        materials: [
          'Damp proof membrane',
          'PIR insulation board 100mm',
          'Chipboard flooring 22mm',
        ],
      },
      {
        when: 'Single-skin walls lined with an insulated stud wall',
        materials: [
          'Treated timber 47mm x 75mm',
          'PIR insulation board 50mm',
          'Vapour control membrane',
          'Plasterboard 12.5mm 2400mm x 1200mm',
        ],
      },
      {
        when: 'Cavity walls dry-lined',
        materials: ['Insulated plasterboard 2400mm x 1200mm'],
      },
      {
        when: 'Ceiling insulated under a pitched roof',
        materials: [
          'Loft insulation roll 200mm',
          'Plasterboard 12.5mm 2400mm x 1200mm',
        ],
      },
    ],
    assumptions: [
      'The existing garage walls and roof are sound',
      'There are foundations under the garage door opening, or they can be formed',
    ],
    exclusions: [
      'Electrical and heating work',
      'Building control fees',
      'Windows and doors unless listed',
      'Replacing a flat garage roof',
      'Decorating and floor coverings',
    ],
    pitfalls: [
      'Garage door openings often have no foundation underneath, so one has to be dug',
      'Single-skin garage walls need insulating and damp protection inside, which takes up floor space',
      'A garage floor is usually lower than the house and needs raising and insulating',
      'Old flat garage roofs often need replacing and insulating before the room is usable',
      'A room off the hall usually needs a fire door, and a room with no other exit needs a window big enough to escape through',
      'Some newer estates have planning conditions that stop garage conversions without permission',
      'Losing the garage can affect parking and the home insurance description',
    ],
  },
  {
    id: 'single-storey-extension',
    title: 'Build a single-storey extension',
    matches:
      'rear extension, kitchen extension, single storey extension, build an extension, side return extension',
    reviewed: true,
    questions: [
      {
        topic: 'extension roof',
        question: 'What kind of roof will it have?',
        options: ['Flat roof', 'Pitched roof', 'Lean-to with roof windows'],
      },
      {
        topic: 'extension size',
        question: 'Roughly how big is the extension?',
        options: ['Up to 10m²', '10–20m²', 'Over 20m²'],
      },
      {
        topic: 'glazing',
        question: 'What glazing is going in?',
        options: [
          'Standard windows and a door',
          'Bi-fold or sliding doors',
          'Large doors plus a roof lantern or rooflights',
        ],
      },
      {
        topic: 'drains nearby',
        question: 'Are there drains or manholes where it will go?',
        options: ['Drains or manhole in the way', 'Clear ground'],
      },
    ],
    variants: [
      {
        when: 'Foundations and walls',
        materials: [
          'Ready mixed concrete C25',
          'Concrete blocks 440mm x 215mm x 100mm',
          'Facing bricks',
          'Cavity wall insulation batts 100mm',
          'Stainless steel wall ties',
          'Damp proof course roll 112mm',
        ],
      },
      {
        when: 'Ground floor slab',
        materials: [
          'Damp proof membrane',
          'PIR insulation board 100mm',
          'Sand and cement screed',
        ],
      },
      {
        when: 'Flat roof',
        materials: [
          'Treated joist 47mm x 195mm C24',
          'OSB3 board 18mm 2440mm x 1220mm',
          'PIR insulation board 120mm',
          'EPDM rubber membrane 1.2mm',
        ],
      },
      {
        when: 'Pitched roof',
        materials: [
          'Treated rafter 47mm x 150mm C24',
          'Breathable roofing membrane',
          'Roofing batten 25mm x 38mm',
          'Concrete interlocking roof tile',
          'PIR insulation board 100mm',
        ],
      },
      {
        when: 'Opening formed into the existing house',
        materials: [
          'Steel universal beam',
          'Concrete padstone 440mm x 215mm x 100mm',
        ],
      },
      {
        when: 'Roof lantern or rooflights',
        materials: ['Roof lantern 2000mm x 1000mm', 'Timber upstand kerb'],
      },
    ],
    assumptions: [
      'Planning and building control approval are in place before work starts',
      'Ground conditions allow standard strip foundations',
      "Drawings and a structural engineer's details are supplied",
    ],
    exclusions: [
      'Drawings, engineering and approval fees',
      'Kitchen, electrical and plumbing fit-out unless listed',
      'Supplying bi-fold doors, windows or roof lanterns unless listed',
      'Landscaping around the extension',
    ],
    pitfalls: [
      'Drains under the footprint may need diverting or a build-over agreement with the water company',
      'Clay soil or nearby trees can mean deeper foundations',
      'Building on or near a shared boundary means serving party wall notices',
      'Tying into the existing house often shows up problems in the old wall',
      'Matching bricks to an older house can be hard, and reclaimed bricks cost more',
      'Large bi-fold doors and roof lanterns have long lead times and often need a steel over the opening',
    ],
  },
  {
    id: 'wall-crack-repair',
    title: 'Repair a cracked wall',
    matches:
      'fix this wall, crack in the wall, cracked brickwork, repair this wall, wall cracking outside, crack above a window',
    reviewed: true,
    // Key questions that never apply to this job, so they're not asked.
    skipKeyQuestions: ['planning permission'],
    questions: [
      {
        topic: 'crack location',
        question: 'Where is the crack?',
        options: ['Outside wall', 'Inside wall'],
      },
      {
        topic: 'crack pattern',
        question: 'What does the crack look like?',
        options: [
          'Stepped along the mortar joints',
          'Straight through the bricks',
          'Above a window or door',
        ],
      },
      {
        topic: 'crack width',
        question: 'How wide is the crack?',
        options: ['Hairline', 'Up to 5mm', 'Wider than 5mm'],
      },
      {
        topic: 'crack getting worse',
        question: 'Is the crack getting bigger?',
        options: ['Stable', 'Getting worse'],
      },
    ],
    variants: [
      {
        when: 'Outside brickwork crack stitched',
        materials: ['Helical crack stitching bar 6mm', 'Crack stitching grout'],
      },
      {
        when: 'Mortar joints repointed on a modern cavity wall',
        materials: [
          'Building sand 25kg',
          'Cement 25kg',
          'Mortar colouring pigment',
        ],
      },
      {
        when: 'Mortar joints repointed on an old solid wall',
        materials: ['Natural hydraulic lime NHL 3.5 25kg', 'Sharp sand 25kg'],
      },
      {
        when: 'Crack above a window or door from a failed lintel',
        materials: ['Steel cavity lintel 1200mm', 'Facing bricks'],
      },
      {
        when: 'Inside crack filled',
        materials: [
          'Flexible crack filler',
          'Scrim tape',
          'Multi-finish plaster 25kg',
        ],
      },
    ],
    assumptions: ['The crack is from old settlement and is no longer moving'],
    exclusions: [
      'Structural investigation or underpinning',
      'Redecorating after the repair',
    ],
    pitfalls: [
      'A crack that is growing points to movement, which needs investigating before any repair',
      'Cracks wider at the top than the bottom often mean subsidence or tree roots',
      'Cracks above windows and doors are often a failed or missing lintel',
      'Old solid walls built before about 1920 should be repointed in lime mortar, as hard cement mortar damages the bricks',
      'New mortar rarely matches old mortar colour exactly',
      'Filling a moving crack only hides it until it reopens',
    ],
  },
];
