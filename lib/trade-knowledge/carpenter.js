// Common carpentry and joinery jobs, drafted by Claude for Phase 3c stage 2 and revised
// after a UK carpentry review pass. Each entry stays out of production until a person
// checks it and sets reviewed: true (see ./index.js).
export const CARPENTER_JOBS = [
  {
    id: 'banisters',
    title: 'Replace banisters, spindles or a handrail',
    matches:
      'replace bannisters, new banister, fit new spindles, missing bannisters on the stairs, new handrail, stair balustrade, new newel posts, glass balustrade',
    reviewed: false,
    questions: [
      {
        topic: 'extent of balustrade work',
        question: 'How much of the balustrade is being replaced?',
        options: [
          'Whole balustrade including newel posts',
          'Spindles and handrail, keeping the newels',
          'Handrail only',
          'Some spindles',
        ],
      },
      {
        topic: 'spindle style',
        question: 'What style are the new spindles?',
        options: [
          'Traditional turned timber',
          'Square-edge timber',
          'Glass panels',
          'Metal spindles',
        ],
      },
      {
        topic: 'balustrade timber',
        question: 'What timber is it?',
        options: ['Pine or softwood, to paint', 'Oak or other hardwood'],
      },
      {
        topic: 'landing',
        question: 'Does a landing need doing as well as the stairs?',
        options: ['Stairs only', 'Stairs and landing'],
      },
    ],
    variants: [
      {
        when: 'Timber spindles and handrail on the stairs',
        materials: [
          'Pine stair spindle 41mm x 900mm',
          'Pine handrail 2.4m',
          'Pine baserail 2.4m',
          'Spindle fillet strip 2.4m',
        ],
      },
      {
        when: 'Oak or hardwood balustrade',
        materials: [
          'Oak stair spindle 41mm x 900mm',
          'Oak handrail 2.4m',
          'Oak baserail 2.4m',
          'Oak spindle fillet strip 2.4m',
        ],
      },
      {
        when: 'New newel posts',
        materials: [
          'Pine newel post 90mm',
          'Newel base 90mm',
          'Newel cap 90mm',
          'Newel fixing kit',
        ],
      },
      {
        when: 'Landing balustrade',
        materials: [
          'Pine stair spindle 41mm x 1100mm',
          'Pine handrail 2.4m',
          'Pine baserail 2.4m',
          'Half newel post 90mm',
        ],
      },
      {
        when: 'Handrail only',
        materials: ['Pine handrail 2.4m', 'Handrail bracket'],
      },
      {
        when: 'Some spindles replaced',
        materials: [
          'Pine stair spindle 41mm x 900mm',
          'Spindle fillet strip 2.4m',
        ],
      },
      {
        when: 'Glass panel balustrade',
        materials: [
          'Toughened glass balustrade panel 10mm',
          'Glass balustrade baserail with 10mm slot',
          'Glass balustrade handrail with 10mm slot',
        ],
      },
      {
        when: 'Metal spindles',
        materials: ['Metal stair spindle 12mm x 900mm', 'Metal spindle shoe'],
      },
    ],
    assumptions: [
      'The existing newel posts are firm and can be reused unless stated',
      'The stair string is sound enough to fix the new baserail to',
    ],
    exclusions: [
      'Repairs to the stair treads or strings',
      'Painting or staining unless included in the finish',
      'Lifting and refitting stair carpet',
    ],
    pitfalls: [
      'Gaps between spindles must be small enough that a small child cannot get through, which sets how many spindles are needed',
      'Loose newel posts are common and need fixing before a new handrail goes on',
      'Old newels are usually cut off above the string and the new post fixed onto a newel base, rather than dug out',
      'Old stairs are rarely square, so each spindle is often cut to its own length and angle',
      'Glass panels are made to measure after a template visit, which adds lead time',
      'Matching an old turned spindle profile may need a specialist turner',
    ],
  },
  {
    id: 'hang-door',
    title: 'Hang an internal door',
    matches:
      'hang a door, new internal door, replace bedroom door, door sticking, fit a fire door, door lining, glazed door, replace all the doors',
    reviewed: false,
    questions: [
      {
        topic: 'door size',
        question: 'What size is the opening?',
        options: [
          'Imperial standard (e.g. 762mm x 1981mm)',
          'Metric standard (e.g. 826mm x 2040mm)',
          'Non-standard or an old frame',
        ],
      },
      {
        topic: 'door construction',
        question: 'What kind of door is it?',
        options: [
          'Hollow core or light door',
          'Solid or heavy door',
          'Glazed door',
          'Fire door',
        ],
      },
      {
        topic: 'frame replaced',
        question: 'Is the frame being replaced as well?',
        options: ['Door only', 'Door and frame'],
      },
      {
        topic: 'number of doors',
        question: 'How many doors are being hung?',
        options: ['1', '2 to 4', '5 or more'],
      },
    ],
    variants: [
      {
        when: 'Hollow core or light internal door',
        materials: [
          'Internal door 762mm x 1981mm',
          'Butt hinges 76mm (pair)',
          'Tubular mortice latch 64mm',
          'Lever door handles on rose',
        ],
      },
      {
        when: 'Solid or heavy internal door',
        materials: [
          'Solid internal door 762mm x 1981mm',
          'Ball bearing hinges 102mm (1.5 pairs)',
          'Tubular mortice latch 64mm',
          'Lever door handles on rose',
        ],
      },
      {
        when: 'Glazed door',
        materials: [
          'Glazed internal door with toughened glass 762mm x 1981mm',
          'Ball bearing hinges 102mm (1.5 pairs)',
          'Tubular mortice latch 64mm',
          'Lever door handles on rose',
        ],
      },
      {
        when: 'Fire door',
        materials: [
          'Fire door FD30 762mm x 1981mm',
          'Fire door hinges 102mm (1.5 pairs)',
          'Intumescent strip with smoke seal',
          'Fire rated tubular latch 64mm',
          'Overhead door closer',
        ],
      },
      {
        when: 'Bathroom door',
        materials: [
          'Bathroom privacy lock 64mm',
          'Bathroom thumbturn and release',
        ],
      },
      {
        when: 'Frame replaced',
        materials: ['Door lining set', 'Architrave set'],
      },
    ],
    assumptions: [
      'The door can be trimmed to fit without cutting into the frame',
      'Floor coverings are already down, so the door is hung to clear them',
      'Handles and hinges supplied match the finish the customer wants',
    ],
    exclusions: [
      'Painting or finishing the door',
      'Making good plaster round a new frame',
    ],
    pitfalls: [
      'Older houses often have non-standard openings that need a made-to-measure door',
      'Frames that are out of square make a new door hard to fit without packing or planing',
      'Hollow doors can only be trimmed a few millimetres before the frame inside is exposed',
      'Heavy and fire doors need three hinges, and fire doors also need their own latch, seals and closer to work properly',
      'Glass in doors should be toughened or laminated',
      'New carpet or flooring fitted later may stop the door closing',
    ],
  },
  {
    id: 'door-lock',
    title: 'Fit or replace a door lock',
    matches:
      'door lock needs fitting, new front door lock, replace a lock, fit a deadlock, change the locks, euro cylinder, sashlock, nightlatch',
    reviewed: false,
    questions: [
      {
        topic: 'door type',
        question: 'What kind of door is it?',
        options: [
          'Timber front or back door',
          'uPVC or composite door',
          'Internal door',
        ],
      },
      {
        topic: 'lock type',
        question: 'What kind of lock is wanted?',
        options: [
          'Deadlock (key only)',
          'Sashlock (handle and key)',
          'Rim nightlatch',
          'Euro cylinder only',
        ],
      },
      {
        topic: 'existing lock',
        question: 'Is there a lock there now?',
        options: [
          'Replacing the same type of lock',
          'Changing to a different lock',
          'New lock, none there now',
        ],
      },
    ],
    variants: [
      {
        when: 'Timber external door with a deadlock',
        materials: ['5 lever mortice deadlock 64mm'],
      },
      {
        when: 'Timber external door with a sashlock',
        materials: [
          '5 lever mortice sashlock 64mm',
          'Lever door handles on backplate',
        ],
      },
      {
        when: 'Timber door with a rim lock',
        materials: ['Nightlatch 60mm'],
      },
      {
        when: 'uPVC or composite door',
        materials: ['Anti-snap euro cylinder 40/40'],
      },
      {
        when: 'Internal door',
        materials: ['Bathroom privacy lock 64mm'],
      },
      {
        when: 'Old lock cut-out needs filling',
        materials: ['Hardwood timber offcut', 'Two-part wood filler'],
      },
    ],
    assumptions: [
      'The door is sound enough to take the new lock',
      'The existing lock mechanism in a uPVC door is working',
    ],
    exclusions: [
      'Repairing or replacing the multipoint gearbox in uPVC doors',
      'Painting round the new lock',
      'Emergency entry to a locked property',
    ],
    pitfalls: [
      'A new mortice lock may not line up with the old cut-out, leaving gaps to fill',
      'Thin or glazed timber doors may not have enough timber to take a mortice lock',
      'uPVC door problems are often the gearbox, not the cylinder',
      'Euro cylinders must be measured on both sides so they sit flush with the handles',
      'Some home insurance policies ask for a particular grade of lock on external doors',
    ],
  },
  {
    id: 'skirting-architrave',
    title: 'Fit skirting boards or architrave',
    matches:
      'new skirting, replace skirting boards, fit architrave, damaged skirting, door trims',
    reviewed: false,
    questions: [
      {
        topic: 'trim being fitted',
        question: 'What is being fitted?',
        options: ['Skirting', 'Architrave', 'Skirting and architrave'],
      },
      {
        topic: 'profile',
        question: 'What profile is it?',
        options: ['Match the existing', 'New profile throughout'],
      },
      {
        topic: 'old trim removed',
        question: 'Is there old skirting or architrave to remove?',
        options: ['Remove and replace', 'None there now'],
      },
      {
        topic: 'number of rooms',
        question: 'How many rooms are being done?',
        options: ['One room', '2 to 3 rooms', 'Whole house'],
      },
    ],
    variants: [
      {
        when: 'MDF skirting',
        materials: [
          'MDF skirting board torus 144mm x 4.2m',
          'Grab adhesive',
          'Lost head nails 50mm',
        ],
      },
      {
        when: 'Pine or hardwood skirting',
        materials: [
          'Pine skirting board torus 144mm x 4.2m',
          'Grab adhesive',
          'Lost head nails 50mm',
        ],
      },
      {
        when: 'Architrave',
        materials: ['MDF architrave set', 'Lost head nails 40mm'],
      },
      {
        when: 'Any trim',
        materials: ["Decorators' caulk", 'Wood filler'],
      },
    ],
    assumptions: [
      'The walls are close enough to straight for the new trim to sit tight',
      'The floor coverings stay in place',
    ],
    exclusions: [
      'Painting the new trim',
      'Plaster repairs where old skirting comes off',
    ],
    pitfalls: [
      'Old skirting often pulls plaster off the wall when removed',
      'Cables and pipes often run behind old skirting, so it must come off carefully',
      'Uneven floors leave gaps under skirting that need scribing or filling',
      'Internal corners on out-of-square walls are best scribed rather than mitred',
      'Old profiles may need a made-to-match run from a joinery shop',
    ],
  },
  {
    id: 'shelving',
    title: 'Shelving or alcove units',
    matches:
      'fix shelving, alcove shelves, built-in cupboards, floating shelves, alcove cupboards, fitted storage',
    reviewed: false,
    questions: [
      {
        topic: 'what is being built',
        question: 'What is being built?',
        options: [
          'Floating shelves',
          'Alcove shelves',
          'Alcove cupboards with shelves above',
        ],
      },
      {
        topic: 'shelf load',
        question: 'What will the shelves hold?',
        options: ['Books or heavy items', 'Light display items'],
      },
      {
        topic: 'number of alcoves',
        question: 'How many alcoves or runs of shelving?',
        options: ['One', 'Two', 'Three or more'],
      },
    ],
    variants: [
      {
        when: 'Floating shelves',
        materials: [
          'Oak veneer floating shelf 900mm',
          'Heavy duty floating shelf bracket',
        ],
      },
      {
        when: 'Alcove shelves on battens',
        materials: [
          'MDF sheet 18mm 2440mm x 1220mm',
          'Planed timber batten 44mm x 44mm',
          'Frame fixings 10mm x 100mm',
        ],
      },
      {
        when: 'Alcove shelves carrying books or spanning a wide alcove',
        materials: [
          'MDF sheet 25mm 2440mm x 1220mm',
          'Planed timber batten 44mm x 44mm',
          'Frame fixings 10mm x 100mm',
        ],
      },
      {
        when: 'Alcove cupboards',
        materials: [
          'MDF sheet 18mm 2440mm x 1220mm',
          'Planed timber 44mm x 22mm',
          'Soft close concealed hinges',
          'Cupboard door knobs',
        ],
      },
    ],
    assumptions: [
      'The alcove walls are sound enough to take the fixings',
      'No cables or pipes run where fixings go',
    ],
    exclusions: [
      'Moving sockets or switches inside the alcoves',
      'Painting unless included in the finish',
    ],
    pitfalls: [
      'Alcoves are rarely square, so shelves and doors need scribing to the walls',
      '18mm MDF sags under books over long spans, so heavy shelves need thicker board or a front lipping',
      'Floating shelves need solid walls or good fixings to carry heavy loads',
      'Old lime plaster crumbles when drilled, so fixings need to reach solid brick',
      'Skirting and picture rails need cutting back or scribing round built-in units',
      'Chimney breast alcoves often hide cables running to sockets',
    ],
  },
  {
    id: 'loft-hatch',
    title: 'Fit or move a loft hatch',
    matches:
      'move a loft hatch, new loft hatch, loft ladder, insulated loft hatch, loft access, make the loft hatch bigger',
    reviewed: false,
    questions: [
      {
        topic: 'hatch job',
        question: 'What needs doing?',
        options: [
          'New hatch where there is none',
          'Move the hatch',
          'Make the hatch bigger',
          'Upgrade the existing hatch',
        ],
      },
      {
        topic: 'loft ladder',
        question: 'Is a loft ladder wanted?',
        options: ['Yes', 'No'],
      },
      {
        topic: 'roof construction',
        question: 'How is the roof built?',
        options: [
          'Trussed rafters (W-shaped timbers)',
          'Traditional roof with joists and purlins',
        ],
      },
    ],
    variants: [
      {
        when: 'New, moved or enlarged hatch',
        materials: [
          'Insulated loft hatch 562mm x 726mm',
          'Sawn timber 47mm x 100mm C24',
          'Plasterboard 12.5mm 2400mm x 1200mm',
        ],
      },
      {
        when: 'Opening trimmed on a traditional roof',
        materials: ['Sawn timber 47mm x 150mm C24', 'Joist hangers 47mm'],
      },
      {
        when: 'Loft ladder fitted',
        materials: ['Loft ladder 3 section', 'Hinged insulated loft hatch'],
      },
      {
        when: 'Existing hatch upgraded',
        materials: ['Insulated loft hatch 562mm x 726mm'],
      },
    ],
    assumptions: [
      'The hatch can go between the existing ceiling joists',
      'The loft is clear enough around the new opening to work',
    ],
    exclusions: [
      'Plastering and decorating the ceiling round the old and new openings',
      'Boarding the loft',
    ],
    pitfalls: [
      'Roofs built with trussed rafters must not have them cut, so the hatch has to fit between them',
      'Cutting a joist on a traditional roof means trimming the opening with new timbers',
      'A loft ladder needs a bigger opening than a basic hatch, plus room below to swing down',
      'Moving a hatch leaves the old opening to board over and make good',
      'Cables often run across the joists where a new hatch goes',
      'Loose, pebble-like loft insulation (vermiculite) may contain asbestos and must not be disturbed until checked',
    ],
  },
  {
    id: 'stair-repair',
    title: 'Stair repairs',
    matches:
      'creaking stairs, broken stair tread, loose handrail, split tread, squeaky stairs, loose newel post',
    reviewed: false,
    questions: [
      {
        topic: 'stair problem',
        question: 'What is wrong with the stairs?',
        options: [
          'Creaking treads',
          'Broken or split tread',
          'Loose newel post or handrail',
        ],
      },
      {
        topic: 'underside access',
        question: 'Can the underside of the stairs be reached?',
        options: ['Open cupboard underneath', 'Plastered underneath'],
      },
      {
        topic: 'stair covering',
        question: 'What is on the stairs now?',
        options: ['Carpet', 'Bare, painted or varnished timber'],
      },
    ],
    variants: [
      {
        when: 'Creaking treads fixed from underneath',
        materials: [
          'Timber glue blocks',
          'Timber stair wedges',
          'PVA wood glue 1L',
          'Wood screws 4.5mm x 50mm',
        ],
      },
      {
        when: 'Creaking treads fixed from above',
        materials: ['Wood screws 4.5mm x 50mm', 'Wood filler'],
      },
      {
        when: 'Tread replaced',
        materials: [
          'Pine stair tread 25mm',
          'Timber stair wedges',
          'PVA wood glue 1L',
        ],
      },
      {
        when: 'Loose newel post',
        materials: ['Newel post fixing bolt', 'Wood screws 5mm x 80mm'],
      },
    ],
    assumptions: [
      'The stair strings are sound',
      'The stair carpet is lifted and refitted by others',
    ],
    exclusions: [
      'Lifting and refitting carpet',
      'Opening and making good a plastered stair soffit',
      'Refinishing bare timber stairs after repairs',
    ],
    pitfalls: [
      'Creaks are much easier to fix from underneath, so a plastered soffit may need opening up',
      'Fixing from above means screwing through the tread, which shows on bare timber stairs',
      'A split tread may be one of several worn by age, not a single fault',
      'A broken tread should not be used until it is repaired',
      'Newel posts often loosen because the joint into the floor has failed',
    ],
  },
];
