// Common bathroom-fitting jobs, drafted by Claude for Phase 3c stage 2 and revised after a
// UK bathroom-fitting review pass. Each entry stays out of production until a person checks
// it and sets reviewed: true (see ./index.js).
export const BATHROOM_FITTER_JOBS = [
  {
    id: 'full-refit',
    title: 'Full bathroom refit',
    matches:
      'new bathroom, upgrade a dated bathroom, rip out and refit the bathroom, modernise the bathroom, complete bathroom renovation',
    reviewed: true,
    questions: [
      {
        topic: 'bath or shower',
        question: 'What is going where the bath is now?',
        options: [
          'A new bath',
          'Bath with a shower over',
          'Walk-in shower instead',
        ],
      },
      {
        topic: 'shower type',
        question: 'What kind of shower will it have?',
        options: [
          'Mixer shower from the hot water system',
          'Electric shower',
          'No shower',
        ],
      },
      {
        topic: 'hot water system',
        question: 'How is the hot water supplied?',
        options: [
          'Combi boiler',
          'Unvented cylinder (mains pressure)',
          'Cylinder with a tank in the loft',
        ],
      },
      {
        topic: 'floor finish',
        question: 'What is going on the floor?',
        options: ['Floor tiles', 'Vinyl or LVT', 'Keep the existing floor'],
      },
    ],
    variants: [
      {
        when: 'New bath fitted',
        materials: [
          'Acrylic bath 1700mm x 700mm',
          'Bath panel front 1700mm',
          'Bath waste and overflow',
        ],
      },
      {
        when: 'Concealed thermostatic shower valve',
        materials: [
          'Concealed thermostatic shower valve',
          'Fixed shower head with wall arm',
          'Shower handset with slide rail',
        ],
      },
      {
        when: 'Mixer shower over the bath',
        materials: [
          'Thermostatic bar mixer shower',
          'Hinged bath screen',
          'Tanking kit',
        ],
      },
      {
        when: 'Walk-in shower replacing the bath',
        materials: [
          'Low profile shower tray 1700mm x 700mm',
          'Walk-in shower screen 8mm glass',
          'Shower waste trap 90mm',
          'Tanking kit',
        ],
      },
      {
        when: 'Electric shower fitted',
        materials: ['Electric shower 9.5kW'],
      },
      {
        when: 'Mixer shower on a cylinder fed from a loft tank',
        materials: ['Shower pump 1.5 bar twin impeller'],
      },
      {
        when: 'New toilet and basin',
        materials: [
          'Close coupled toilet',
          'Basin with full pedestal',
          'Basin mixer tap',
          'Basin bottle trap 32mm',
          'Pan connector 110mm',
        ],
      },
      {
        when: 'Heated towel rail replacing the radiator',
        materials: [
          'Chrome heated towel rail 800mm x 500mm',
          'Angled radiator valves 15mm (pair)',
        ],
      },
      {
        when: 'Walls tiled',
        materials: [
          'Tile backer board 1200mm x 600mm',
          'Tile adhesive 20kg',
          'Tile grout 5kg',
          'Tile trim 2.5m',
        ],
      },
      {
        when: 'Floor tiled over timber floorboards',
        materials: [
          'Plywood overlay board 12mm',
          'Flexible floor tile adhesive 20kg',
          'Tile grout 5kg',
        ],
      },
      {
        when: 'Floor tiled over concrete',
        materials: ['Flexible floor tile adhesive 20kg', 'Tile grout 5kg'],
      },
      {
        when: 'Vinyl or LVT floor',
        materials: ['Plywood underlay board 6mm'],
      },
    ],
    assumptions: [
      'The existing water supplies and soil pipe stay in roughly the same positions',
      'The floor structure under the bathroom is sound once the old suite is removed',
      'The existing hot water system can supply the new shower',
      'The customer has another toilet or washing facilities while the bathroom is out of use',
    ],
    exclusions: [
      'Electrical work such as new lighting, extractor fans or shower circuits',
      'Replacing floor joists or boards found to be rotten',
      'Plastering ceilings or walls beyond boarding for tiles',
      'Decorating outside the bathroom',
    ],
    pitfalls: [
      'Rotten floorboards or joists are often found under an old bath or toilet',
      'Walls may be uneven once old tiles come off and need boarding or skimming before tiling',
      'Moving the toilet is limited by where the soil pipe can run',
      'A concealed shower valve is set into the wall, so it needs chasing in or a false wall, and must be set to the right depth before tiling',
      'A combi boiler or gravity-fed system may not give the flow a large shower head expects, and gravity systems need a pump',
      'An electric shower needs its own circuit, and bathroom electrical work needs a qualified electrician',
      'A bathroom needs an extractor fan, so budget for one via the electrician',
      'Textured ceilings in pre-2000 homes may contain asbestos and must not be sanded or scraped',
      'Allow for disposing of the old suite and tiles, which often means a skip or several van runs',
    ],
  },
  {
    id: 'replace-bath',
    title: 'Replace a bath',
    matches:
      'new bath, replace old bath, swap the bath, cracked bath, chipped bath',
    reviewed: true,
    questions: [
      {
        topic: 'bath size',
        question: 'What size is the bath?',
        options: [
          'Standard 1700mm x 700mm',
          'Larger 1800mm x 800mm',
          'Shaped or corner bath',
        ],
      },
      {
        topic: 'tiles on the bath edge',
        question: 'Do the wall tiles sit on the edge of the bath?',
        options: ['Tiles sit on the bath edge', 'No tiles or panels only'],
      },
      {
        topic: 'bath taps',
        question: 'What is happening to the taps?',
        options: [
          'Reuse the existing taps',
          'New deck-mounted taps',
          'Wall-mounted taps or bath shower mixer',
        ],
      },
      {
        topic: 'shower over the bath',
        question: 'Is there a shower over the bath?',
        options: ['Yes, with a screen', 'No shower'],
      },
    ],
    variants: [
      {
        when: 'Standard size bath',
        materials: [
          'Acrylic bath 1700mm x 700mm',
          'Bath panel front 1700mm',
          'Bath waste and overflow',
        ],
      },
      {
        when: 'Larger bath',
        materials: [
          'Acrylic bath 1800mm x 800mm',
          'Bath panel front 1800mm',
          'Bath waste and overflow',
        ],
      },
      {
        when: 'Bath with an open end that needs an end panel',
        materials: ['Bath panel end 700mm'],
      },
      {
        when: 'New deck-mounted bath taps fitted',
        materials: [
          'Bath pillar taps 3/4" (pair)',
          'Flexible tap connector 22mm x 3/4"',
        ],
      },
      {
        when: 'Tiles removed along the bath edge',
        materials: [
          'Tile adhesive 20kg',
          'Tile grout 5kg',
          'Sanitary silicone sealant white',
        ],
      },
      {
        when: 'Shower screen refitted or replaced',
        materials: ['Hinged bath screen', 'Sanitary silicone sealant white'],
      },
    ],
    assumptions: [
      'The new bath fits the same space and tap position as the old one',
      'The floor under the bath is sound',
      'The existing shower screen can be removed and refitted without damage',
    ],
    exclusions: [
      'Replacing wall tiles beyond the row along the bath edge',
      'Repairs to the floor under the bath',
      'Moving or chasing in wall-mounted tap or shower valves',
    ],
    pitfalls: [
      'Tiles that sit on the bath edge usually break when the old bath comes out, and spare tiles may no longer match',
      'Cast iron baths are very heavy and often need breaking up to remove',
      'Acrylic baths need a solid cradle or they flex and break the seal',
      'Old bath taps are often seized to the supply pipes',
      'Old metal baths may have an earth bonding cable that needs reconnecting or checking by an electrician',
      "Wall-mounted taps or mixers must line up with the new bath's depth and tap position",
    ],
  },
  {
    id: 'walk-in-shower',
    title: 'Walk-in shower or shower enclosure',
    matches:
      'walk-in shower, new shower enclosure, shower cubicle, replace bath with a shower, wet room',
    reviewed: true,
    questions: [
      {
        topic: 'shower style',
        question: 'What style of shower is it?',
        options: [
          'Walk-in with a glass panel',
          'Enclosure with a door',
          'Level-access wet room',
        ],
      },
      {
        topic: 'shower type',
        question: 'What kind of shower will it have?',
        options: [
          'Mixer shower from the hot water system',
          'Electric shower',
          'Keep the existing shower',
        ],
      },
      {
        topic: 'hot water system',
        question: 'How is the hot water supplied?',
        options: [
          'Combi boiler',
          'Unvented cylinder (mains pressure)',
          'Cylinder with a tank in the loft',
        ],
      },
      {
        topic: 'floor construction',
        question: 'What is the bathroom floor made of?',
        options: ['Timber floorboards', 'Concrete'],
      },
    ],
    variants: [
      {
        when: 'Walk-in shower with a glass panel',
        materials: [
          'Low profile shower tray 1400mm x 900mm',
          'Walk-in shower screen 8mm glass',
          'Shower waste trap 90mm',
        ],
      },
      {
        when: 'Shower enclosure with a door',
        materials: [
          'Stone resin shower tray 900mm x 900mm',
          'Shower enclosure 900mm x 900mm',
          'Shower waste trap 90mm',
        ],
      },
      {
        when: 'Level-access wet room',
        materials: [
          'Wet room former tray 1200mm x 900mm',
          'Wet room tanking kit',
          'Wet room glass panel 8mm',
        ],
      },
      {
        when: 'Tray raised on a timber floor to get the waste fall',
        materials: ['Shower tray riser kit'],
      },
      {
        when: 'Concealed thermostatic shower valve',
        materials: [
          'Concealed thermostatic shower valve',
          'Fixed shower head with wall arm',
          'Shower handset with slide rail',
        ],
      },
      {
        when: 'New mixer shower',
        materials: ['Thermostatic bar mixer shower'],
      },
      {
        when: 'New electric shower',
        materials: ['Electric shower 9.5kW'],
      },
      {
        when: 'Mixer shower on a cylinder fed from a loft tank',
        materials: ['Shower pump 1.5 bar twin impeller'],
      },
      {
        when: 'Shower walls tiled',
        materials: [
          'Tile backer board 1200mm x 600mm',
          'Tanking kit',
          'Tile adhesive 20kg',
          'Tile grout 5kg',
        ],
      },
    ],
    assumptions: [
      'A waste pipe can run from the shower to the soil stack with enough fall',
      'The hot water system gives enough flow and pressure for the chosen shower',
    ],
    exclusions: [
      'Electrical work for an electric shower, shower pump or extractor fan',
      'Raising the floor or cutting joists beyond what the waste run needs',
    ],
    pitfalls: [
      'A shower waste needs a steady fall, which may mean raising the tray on a timber floor',
      'Wet rooms on timber floors need the joists stiffened, boarded and fully tanked',
      'Gravity-fed hot water gives a weak mixer shower without a pump, and a pump needs enough head from the cold tank',
      "A combi boiler's flow rate limits how well a large rainfall head performs",
      'Walls behind a shower must be tanked before tiling or leaks show up later',
      'A concealed shower valve is set into the wall, so it needs chasing in or a false wall, and must be set to the right depth before tiling',
      'Walk-in glass panels need a solid fixing and a support arm to the wall or ceiling',
    ],
  },
  {
    id: 'replace-shower-tray',
    title: 'Replace a shower tray',
    matches:
      'cracked shower tray, leaking shower tray, new shower tray, shower tray moves',
    reviewed: true,
    questions: [
      {
        topic: 'reason for replacing',
        question: 'Why is the tray being replaced?',
        options: ['Cracked', 'Leaking round the edge', 'Upgrading the shower'],
      },
      {
        topic: 'tray size',
        question: 'Is the new tray the same size as the old one?',
        options: ['Same size', 'Different size'],
      },
      {
        topic: 'enclosure reused',
        question: 'What happens to the shower enclosure?',
        options: ['Reuse the existing enclosure', 'Fit a new enclosure'],
      },
    ],
    variants: [
      {
        when: 'Same-size tray swap',
        materials: [
          'Stone resin shower tray 900mm x 900mm',
          'Shower waste trap 90mm',
          'Sanitary silicone sealant white',
        ],
      },
      {
        when: 'New enclosure fitted',
        materials: ['Shower enclosure 900mm x 900mm'],
      },
      {
        when: 'Bottom row of tiles removed to get the tray out',
        materials: ['Tile adhesive 20kg', 'Tile grout 5kg'],
      },
    ],
    assumptions: [
      'A standard-size tray fits the existing space',
      'The existing enclosure comes off and refits without damage',
      'Matching tiles are available if the bottom row breaks',
    ],
    exclusions: [
      'Repairs to water damage under the tray or in the room below',
      'Replacing wall tiles beyond the bottom row',
    ],
    pitfalls: [
      'A leaking tray has often soaked the floor underneath, which may need drying or replacing',
      'The bottom row of tiles usually has to come off to get the tray out',
      'Trays that flexed on an uneven base crack again unless fully bedded on mortar or a solid base',
      'Older trays often have a smaller waste than modern 90mm trays, so the waste may need changing',
      'A different size tray usually means a new enclosure as well',
    ],
  },
  {
    id: 'replace-basin',
    title: 'Replace a basin or vanity unit',
    matches:
      'new vanity unit, fit vanity units, replace basin, broken sink in the bathroom, wash basin, fix a vanity unit',
    reviewed: true,
    questions: [
      {
        topic: 'basin type',
        question: 'What is being fitted?',
        options: [
          'Floor-standing vanity unit',
          'Wall-hung vanity unit',
          'Pedestal basin',
          'Wall-hung basin',
        ],
      },
      {
        topic: 'pipe position',
        question: 'Do the pipes stay in the same place?',
        options: ['Same position', 'Pipes need moving'],
      },
      {
        topic: 'wall construction',
        question: 'What is the wall behind the basin made of?',
        options: ['Brick or block', 'Stud and plasterboard'],
      },
    ],
    variants: [
      {
        when: 'Floor-standing vanity unit',
        materials: [
          'Vanity unit with basin 600mm',
          'Basin mixer tap',
          'Basin click-clack waste',
          'Basin bottle trap 32mm',
        ],
      },
      {
        when: 'Wall-hung vanity unit',
        materials: [
          'Wall-hung vanity unit with basin 600mm',
          'Basin mixer tap',
          'Basin click-clack waste',
          'Basin bottle trap 32mm',
        ],
      },
      {
        when: 'Pedestal basin',
        materials: [
          'Basin with full pedestal',
          'Basin mixer tap',
          'Basin click-clack waste',
          'Basin bottle trap 32mm',
        ],
      },
      {
        when: 'Wall-hung basin',
        materials: [
          'Wall-hung basin 500mm',
          'Basin bracket set',
          'Basin bottle trap 32mm',
        ],
      },
      {
        when: 'Wall-hung unit or basin on a stud wall',
        materials: ['Timber noggin 2.4m'],
      },
      {
        when: 'Any basin swap',
        materials: ['Isolating valve 15mm'],
      },
    ],
    assumptions: [
      'The wall behind can take the fixings for the new unit or basin',
      'The new unit covers the marks left by the old one',
    ],
    exclusions: [
      'Retiling or making good the wall where the old basin was fixed',
      'Moving the waste pipe through the wall',
    ],
    pitfalls: [
      'A wall-hung unit or basin on a stud wall needs timber noggins behind the plasterboard',
      'A smaller unit leaves old tile or paint marks showing',
      'Vanity units often need the waste moved to clear the cupboard shelf',
      'Monobloc mixer tails are fragile and kink if twisted',
    ],
  },
  {
    id: 'replace-toilet',
    title: 'Replace a toilet',
    matches:
      'new toilet, replace the toilet, cracked toilet, fit a toilet, toilet seat, back to wall toilet',
    reviewed: true,
    questions: [
      {
        topic: 'toilet type',
        question: 'What type of toilet is going in?',
        options: [
          'Close coupled',
          'Back to wall with a hidden cistern',
          'Wall-hung',
        ],
      },
      {
        topic: 'soil pipe position',
        question: 'Where does the toilet waste go now?',
        options: ['Straight back through the wall', 'Down into the floor'],
      },
      {
        topic: 'floor round the toilet',
        question: 'What is the floor like round the old toilet?',
        options: ['Solid and dry', 'Soft or water damaged'],
      },
    ],
    variants: [
      {
        when: 'Close coupled toilet',
        materials: [
          'Close coupled toilet',
          'Toilet seat soft close',
          'Toilet pan fixing kit',
        ],
      },
      {
        when: 'Back to wall toilet',
        materials: [
          'Back to wall toilet pan',
          'Concealed cistern',
          'Back to wall furniture unit',
          'Toilet seat soft close',
        ],
      },
      {
        when: 'Wall-hung toilet',
        materials: [
          'Wall-hung toilet frame',
          'Wall-hung toilet pan',
          'Flush plate',
          'Toilet seat soft close',
        ],
      },
      {
        when: 'New pan lines up with the soil pipe',
        materials: ['Straight pan connector 110mm'],
      },
      {
        when: 'New pan outlet does not line up with the soil pipe',
        materials: ['Offset pan connector 110mm'],
      },
      {
        when: 'Soil pipe goes down into the floor',
        materials: ['Flexible pan connector 110mm'],
      },
      {
        when: 'Any toilet swap',
        materials: ['Isolating valve 15mm', 'Flexible cistern connector 15mm'],
      },
    ],
    assumptions: [
      'The new toilet lines up with the existing soil pipe',
      'The floor round the toilet is sound',
    ],
    exclusions: [
      'Moving the soil pipe or stack',
      'Replacing flooring round the base of the toilet',
      'Boxing in or tiling round a concealed cistern or frame',
    ],
    pitfalls: [
      'A new pan may not line up with the old soil pipe and need an offset or flexible connector',
      'A new toilet often has a smaller footprint, leaving old flooring or tile marks showing',
      'Wall-hung toilets need a frame fixed to solid wall or strong timbers',
      'Concealed cisterns need an access panel or removable flush plate for future repairs',
      'Old floor rot is often found round the base of a leaking toilet',
    ],
  },
  {
    id: 'reseal',
    title: 'Reseal a bath, shower or basin',
    matches:
      'shower sealant renewal, reseal the bath, mouldy silicone, sealant peeling, leaking round the bath',
    reviewed: true,
    questions: [
      {
        topic: 'what needs resealing',
        question: 'What needs resealing?',
        options: ['Bath', 'Shower tray', 'Basin', 'Several of these'],
      },
      {
        topic: 'movement',
        question: 'Does the bath or tray move when someone stands in it?',
        options: ['Solid', 'Moves slightly'],
      },
      {
        topic: 'gap size',
        question: 'How wide is the gap between the bath or tray and the wall?',
        options: ['Narrow, under 5mm', 'Wide, 5mm or more'],
      },
    ],
    variants: [
      {
        when: 'Any reseal',
        materials: [
          'Sanitary silicone sealant white',
          'Silicone sealant remover',
          'Mould remover spray',
        ],
      },
      {
        when: 'Bath or tray moves',
        materials: ['Bath leg support kit'],
      },
      {
        when: 'Gap of 5mm or more',
        materials: ['Foam backer rod 6mm'],
      },
    ],
    assumptions: [
      'No water has got behind the tiles or under the bath',
      'The bath or tray is firmly supported',
      'The sealant is left to cure for at least 24 hours before use',
    ],
    exclusions: [
      'Regrouting or replacing tiles',
      'Repairs to water damage under the bath or tray',
    ],
    pitfalls: [
      'A bath that moves will split new sealant within weeks unless it is supported first',
      'Filling a bath with water before sealing stops the seal pulling apart later',
      "New silicone won't bond to traces of old silicone, so every bit must be removed",
      'Black mould often returns if it has grown into the grout as well',
    ],
  },
];
