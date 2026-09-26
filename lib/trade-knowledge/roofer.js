// Common roofing jobs, drafted by Claude for Phase 3c stage 2. Each entry stays out of
// production until a person checks it and sets reviewed: true (see ./index.js).
export const ROOFER_JOBS = [
  {
    id: 'slipped-tiles',
    title: 'Replace slipped or missing tiles or slates',
    matches:
      'replace missing tiles, slipped tiles, broken roof tiles, missing slates, roof leak after a storm',
    reviewed: true,
    questions: [
      {
        topic: 'roof covering',
        question: 'What is the roof covered with?',
        options: ['Concrete tiles', 'Clay tiles', 'Slate'],
      },
      {
        topic: 'water coming in',
        question: 'Is water getting in?',
        options: ['Yes, leaking inside', 'No leak yet'],
      },
    ],
    variants: [
      {
        when: 'Concrete tiled roof',
        materials: ['Concrete interlocking roof tile', 'Tile clips'],
      },
      {
        when: 'Clay plain tiled roof',
        materials: ['Clay plain roof tile', 'Aluminium roofing nails 38mm'],
      },
      {
        when: 'Slate roof',
        materials: [
          'Natural slate 500mm x 250mm',
          'Slate hooks',
          'Copper disc rivets',
        ],
      },
      {
        when: 'Rotten battens under the missing tiles',
        materials: [
          'Treated roofing batten 25mm x 50mm',
          'Breathable roofing membrane',
        ],
      },
    ],
    assumptions: [
      'Matching tiles or slates can be sourced',
      'The battens and felt under the damaged area are sound',
    ],
    exclusions: [
      'Repairs to internal ceilings or decoration damaged by leaks',
      'Wider repairs if the rest of the roof is found to be failing',
    ],
    pitfalls: [
      'Old or discontinued tiles can be hard to match, and reclaimed ones may be needed',
      'Widespread slipping usually means the nails have failed across the roof, which points to re-roofing',
      'Walking on an old roof can break more tiles than are being replaced',
      'A leak inside may be some distance down the slope from the missing tile',
    ],
  },
  {
    id: 'flat-roof',
    title: 'Replace a flat roof',
    matches:
      'replace a flat roof, garage roof leaking, new flat roof, extension roof, felt roof, rubber roof',
    reviewed: true,
    questions: [
      {
        topic: 'new covering',
        question: 'What is the new roof covering?',
        options: ['EPDM rubber', 'GRP fibreglass', 'Torch-on felt'],
      },
      {
        topic: 'what the roof covers',
        question: 'What is the flat roof over?',
        options: ['Garage', 'Extension', 'Dormer'],
      },
      {
        topic: 'deck condition',
        question: 'How does the roof feel underfoot?',
        options: ['Solid', 'Soft or sagging in places'],
      },
    ],
    variants: [
      {
        when: 'EPDM rubber roof',
        materials: [
          'EPDM rubber membrane 1.2mm',
          'EPDM deck adhesive',
          'EPDM trim adhesive',
          'Flat roof drip trim',
        ],
      },
      {
        when: 'GRP fibreglass roof',
        materials: [
          'GRP roofing resin',
          'Chopped strand mat 450g',
          'GRP topcoat',
          'GRP drip trim',
        ],
      },
      {
        when: 'Torch-on felt roof',
        materials: ['Torch-on felt underlay', 'Torch-on felt cap sheet'],
      },
      {
        when: 'Deck replaced',
        materials: ['OSB3 board 18mm 2440mm x 1220mm'],
      },
      {
        when: 'Warm roof with insulation',
        materials: ['PIR insulation board 100mm', 'Vapour control layer'],
      },
    ],
    assumptions: [
      'The joists under the deck are sound',
      'The existing roof has enough fall for water to drain',
    ],
    exclusions: [
      'Replacing rotten joists',
      'Internal ceiling repairs and decoration',
    ],
    pitfalls: [
      'A soft deck usually means rotten boards, and sometimes rotten joists underneath',
      'Adding insulation raises the roof edge, which can affect door heads, windows and flashings',
      'Poor fall leaves ponding water that shortens the life of any covering',
      'Torch-on felt needs care near timber and other flammable materials',
    ],
  },
  {
    id: 'gutters',
    title: 'Clear, repair or replace gutters',
    matches:
      'gutter needs clearing, guttering, leaking gutter, blocked gutter, new guttering, downpipe',
    reviewed: true,
    questions: [
      {
        topic: 'gutter work',
        question: 'What do the gutters need?',
        options: [
          'Clearing only',
          'Repairing leaking joints',
          'Replacing gutter runs',
        ],
      },
      {
        topic: 'gutter material',
        question: 'What are the gutters made of?',
        options: ['Plastic', 'Cast iron', 'Aluminium'],
      },
      {
        topic: 'gutter profile',
        question: 'What shape are the gutters?',
        options: ['Half round', 'Square', 'Ogee'],
        askWhen: 'joints are being repaired or runs replaced',
      },
    ],
    variants: [
      {
        when: 'Clearing only',
        materials: [],
      },
      {
        when: 'Leaking plastic joints',
        materials: [
          'Half round gutter union bracket 112mm',
          'Gutter joint sealant',
        ],
      },
      {
        when: 'Plastic gutter runs replaced',
        materials: [
          'Half round gutter 112mm 4m',
          'Fascia bracket 112mm',
          'Gutter running outlet 112mm',
          'Round downpipe 68mm 2.5m',
        ],
      },
    ],
    assumptions: [
      'The fascia boards are sound enough to fix gutter brackets to',
      'The gutters can be reached safely without scaffolding',
    ],
    exclusions: [
      'Clearing blocked drains at the foot of downpipes',
      'Replacing fascias or soffits',
    ],
    pitfalls: [
      'Rotten fascia boards often show up once old gutters come off',
      'Different makes of gutter do not join cleanly, so matching the existing profile and brand matters',
      'Cast iron gutters are heavy and may need replacing in sections',
      'Gutters that overflow may have too little fall rather than a blockage',
    ],
  },
  {
    id: 'ridge',
    title: 'Ridge tile repairs',
    matches:
      'loose ridge tiles, ridge repointing, dry ridge, rebed ridge tiles, cracked ridge mortar',
    reviewed: true,
    questions: [
      {
        topic: 'ridge problem',
        question: 'What is wrong with the ridge?',
        options: [
          'Loose ridge tiles',
          'Cracked or missing mortar',
          'Ridge tiles missing',
        ],
      },
      {
        topic: 'ridge fixing',
        question: 'How are the ridge tiles fixed now?',
        options: ['Bedded in mortar', 'Dry ridge system'],
      },
    ],
    variants: [
      {
        when: 'Ridge rebedded in mortar',
        materials: ['Building sand 25kg', 'Cement 25kg'],
      },
      {
        when: 'Converted to a dry ridge',
        materials: ['Dry ridge kit 6m'],
      },
      {
        when: 'Missing ridge tiles',
        materials: ['Half round ridge tile'],
      },
    ],
    assumptions: [
      'The ridge tiles come off without breaking',
      'The ridge board and battens are sound',
    ],
    exclusions: ['Hip tiles unless listed', 'Repairs to the roof timbers'],
    pitfalls: [
      'Old ridge tiles often break when lifted, and matching profiles can be hard to find',
      'Mortar-bedded ridges crack again if the mix is too strong or the tiles move',
      'Dry ridge systems suit most tiles but need the right kit for the tile profile',
    ],
  },
  {
    id: 'chimney-flashing',
    title: 'Chimney flashing or leak repair',
    matches:
      'leak round the chimney, chimney flashing, damp on the chimney breast, lead flashing, chimney repointing',
    reviewed: true,
    questions: [
      {
        topic: 'leak source',
        question: 'Where does the leak seem to come from?',
        options: [
          'Where the chimney meets the roof',
          'The chimney stack itself',
          'Leak location unknown',
        ],
      },
      {
        topic: 'flashing material',
        question: 'What is round the base of the chimney now?',
        options: ['Lead flashing', 'Mortar fillet', 'Flashing tape'],
      },
      {
        topic: 'chimney in use',
        question: 'Is the chimney still in use?',
        options: ['In use', 'Not in use'],
      },
    ],
    variants: [
      {
        when: 'Lead flashing renewed',
        materials: [
          'Code 4 lead flashing 150mm x 3m',
          'Lead sealant',
          'Lead wedges',
        ],
      },
      {
        when: 'Chimney stack repointed',
        materials: ['Building sand 25kg', 'Cement 25kg'],
      },
      {
        when: 'Chimney not in use',
        materials: ['Ventilated chimney cowl'],
      },
    ],
    assumptions: [
      'The leak is from the flashing or stack, not the tiles round it',
      'The chimney stack is structurally sound',
    ],
    exclusions: [
      'Rebuilding the chimney stack',
      'Internal damp treatment or redecoration',
    ],
    pitfalls: [
      'Damp on a chimney breast can come from porous brickwork or an uncapped pot, not only the flashing',
      'Mortar fillets crack as the roof moves and are best replaced with lead',
      'A chimney no longer used needs capping with ventilation, or it causes damp',
      'Most chimney work needs scaffolding round the stack',
    ],
  },
  {
    id: 'fascias-soffits',
    title: 'Replace fascias and soffits',
    matches:
      'new fascias, replace soffits, rotten fascia boards, roofline replacement, uPVC fascias',
    reviewed: true,
    questions: [
      {
        topic: 'roofline parts',
        question: 'What is being replaced?',
        options: ['Fascias and soffits', 'Fascias only', 'Soffits only'],
      },
      {
        topic: 'existing roofline',
        question: 'What are they made of now?',
        options: ['Timber', 'Plastic'],
      },
      {
        topic: 'gutters with the roofline',
        question: 'Are the gutters being replaced at the same time?',
        options: ['New gutters too', 'Refit the existing gutters'],
      },
    ],
    variants: [
      {
        when: 'uPVC fascias',
        materials: [
          'uPVC fascia board 225mm x 5m',
          'Stainless steel fascia nails 65mm',
        ],
      },
      {
        when: 'uPVC soffits',
        materials: ['uPVC soffit board 300mm x 5m', 'Soffit vent strip'],
      },
      {
        when: 'Felt at the eaves has rotted',
        materials: ['Eaves protection tray'],
      },
    ],
    assumptions: [
      'The rafter ends are sound enough to fix new boards to',
      'There are no nesting birds or bats in the roofline',
    ],
    exclusions: [
      'Repairs to rotten rafter ends',
      'Removal of any asbestos soffits, which need a specialist',
    ],
    pitfalls: [
      'Old soffits on houses built before 2000 may contain asbestos and must be checked first',
      'Nesting birds or bats in the roofline can delay work for months',
      'Rotten rafter ends are often found once the old fascia is off',
      'Roof ventilation must be kept when the soffits are closed in',
    ],
  },
  {
    id: 'roof-window',
    title: 'Fit or replace a roof window',
    matches:
      'roof window, skylight, Velux window, loft window, replace a leaking roof window',
    reviewed: true,
    questions: [
      {
        topic: 'new or replacement window',
        question: 'Is it a new window or a replacement?',
        options: ['New opening', 'Replacing an existing roof window'],
      },
      {
        topic: 'roof covering',
        question: 'What is the roof covered with?',
        options: ['Tiles', 'Slate'],
      },
    ],
    variants: [
      {
        when: 'Roof window in a tiled roof',
        materials: [
          'Centre pivot roof window 780mm x 980mm',
          'Roof window flashing kit for tiles',
        ],
      },
      {
        when: 'Roof window in a slate roof',
        materials: [
          'Centre pivot roof window 780mm x 980mm',
          'Roof window flashing kit for slate',
        ],
      },
      {
        when: 'New opening',
        materials: [
          'Sawn timber 47mm x 150mm C24',
          'Breathable roofing membrane',
        ],
      },
    ],
    assumptions: [
      'The window fits between the existing rafters without cutting them',
      'Internal plastering round the window is by others',
    ],
    exclusions: ['Internal plastering, lining and decoration', 'Blinds'],
    pitfalls: [
      'A window wider than the rafter spacing means cutting and trimming rafters',
      'A replacement may not match the old opening size exactly',
      'Tiles round a new window usually need cutting and some break',
    ],
  },
];
