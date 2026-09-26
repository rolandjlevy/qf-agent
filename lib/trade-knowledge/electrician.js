// Common electrical jobs, drafted by Claude for Phase 3c stage 2 and revised after a UK
// electrical review pass. No entry may mention regulations or paperwork (see packs.test.js).
// Each stays out of production until reviewed.
export const ELECTRICIAN_JOBS = [
  {
    id: 'replace-consumer-unit',
    title: 'Replace a consumer unit (fuse board)',
    matches:
      'replace consumer unit, new fuse board, replace fuse box, upgrade the fuse board, rewireable fuses, add RCD protection',
    reviewed: true,
    questions: [
      {
        topic: 'existing board',
        question: 'What is there now?',
        options: [
          'Old fuse box with rewireable fuses',
          'Older board with switches (MCBs)',
          'Board with RCDs already',
        ],
      },
      {
        topic: 'number of circuits',
        question: 'Roughly how many circuits are there?',
        options: ['Up to 6', '7 to 10', 'More than 10'],
      },
      {
        topic: 'earthing arrangement',
        question: 'Where does the property get its earth from?',
        options: ['From the supply cable', 'From an earth rod'],
      },
      {
        topic: 'board location',
        question: 'Where is the board?',
        options: [
          'Hallway or cupboard',
          'Under the stairs',
          'Garage or outbuilding',
        ],
      },
    ],
    variants: [
      {
        when: 'Board with individual circuit protection, up to 10 circuits',
        materials: [
          'Consumer unit 10-way metal',
          'RCBO 32A Type A',
          'RCBO 6A Type A',
          'Surge protection device',
        ],
      },
      {
        when: 'Board with individual circuit protection, more than 10 circuits',
        materials: [
          'Consumer unit 16-way metal',
          'RCBO 32A Type A',
          'RCBO 6A Type A',
          'Surge protection device',
        ],
      },
      {
        when: 'Dual RCD board',
        materials: [
          'Dual RCD consumer unit 10-way metal',
          'MCB Type B 32A',
          'MCB Type B 6A',
          'Surge protection device',
        ],
      },
      {
        when: 'Earth rod installation',
        materials: [
          'Earth rod 1.2m',
          'Earth rod pit',
          'Earth cable 16mm green yellow',
          'Time delayed RCD 100mA',
        ],
      },
      {
        when: 'Main earth missing or undersized',
        materials: [
          'Earth cable 16mm green yellow',
          'Earth clamp with warning label',
        ],
      },
      {
        when: 'Main bonding to gas or water pipes missing or undersized',
        materials: [
          'Earth cable 10mm green yellow',
          'Earth clamp with warning label',
        ],
      },
      {
        when: 'Meter tails too small or damaged',
        materials: ['Meter tails 25mm'],
      },
      {
        when: 'No main isolator switch between the meter and the board',
        materials: ['Double pole isolator switch 100A'],
      },
    ],
    assumptions: [
      'The existing circuits are in serviceable condition and test satisfactorily once connected',
      'The supply can be isolated by the electricity network operator if needed',
      'The existing board position is kept',
      'The property can be without power for most of a working day',
    ],
    exclusions: [
      'Repairing faults found on existing circuits during testing',
      'Work on the supply fuse, meter or anything on the supply side of the meter',
      'Rewiring any circuits',
    ],
    pitfalls: [
      'Adding RCD protection often reveals hidden faults, such as borrowed neutrals, that must be fixed before the board can be switched on',
      'Missing or undersized main earthing and bonding may need adding at the same time',
      'Old rubber, lead-sheathed or cloth-covered cable may not be fit to connect to a new board',
      'The supply fuse may need pulling by the network operator, which needs booking in advance',
      'An earth rod property needs its earth tested, and a poor reading may need a second rod',
      'Moving the board position adds cable runs and usually needs the meter tails extended',
    ],
  },
  {
    id: 'replace-accessories',
    title: 'Replace light switches or sockets',
    matches:
      'faulty light switch, broken light switch, replace sockets, change switches, cracked socket, new switch plates, USB sockets',
    reviewed: true,
    questions: [
      {
        topic: 'what is being replaced',
        question: 'What is being replaced?',
        options: ['Light switches', 'Sockets', 'Switches and sockets'],
      },
      {
        topic: 'number of accessories',
        question: 'Roughly how many need replacing?',
        options: ['1 to 3', '4 to 10', 'Most of the house'],
      },
      {
        topic: 'accessory finish',
        question: 'What finish do the new ones have?',
        options: [
          'Standard white',
          'White with USB charging',
          'Metal or screwless',
        ],
      },
      {
        topic: 'working now',
        question: 'Does it still work?',
        options: [
          'Works but is damaged or dated',
          'Stopped working',
          'Scorch marks or burning smell',
        ],
      },
    ],
    variants: [
      {
        when: 'White light switch',
        materials: ['Light switch 1 gang 2 way white'],
      },
      {
        when: 'White socket',
        materials: ['Double switched socket 13A white'],
      },
      {
        when: 'Socket with USB charging',
        materials: ['Double switched socket 13A with USB white'],
      },
      {
        when: 'Metal or screwless finish',
        materials: [
          'Screwless flat plate light switch 1 gang',
          'Screwless flat plate double socket 13A',
        ],
      },
      {
        when: 'Existing back box too shallow for the new accessory',
        materials: ['Flush metal back box 47mm'],
      },
      {
        when: 'Scorched cable ends at a socket or switch',
        materials: [
          'Maintenance free junction box 32A',
          'Twin and earth cable 2.5mm 6242Y',
        ],
      },
    ],
    assumptions: [
      'The existing wiring at each point is sound',
      'The existing back boxes are reused unless deeper ones are needed',
    ],
    exclusions: [
      'Tracing faults elsewhere on the circuit',
      'Redecorating round new plates that are a different size',
    ],
    pitfalls: [
      'Metal plates need an earth at the switch, which older lighting circuits often lack',
      'Flat plates and USB sockets often need deeper back boxes than the existing ones',
      'Older switches may be wired in red and black, which needs care when reconnecting',
      'A switch that stopped working may be a fault on the circuit rather than the switch itself',
      'Scorch marks behind a socket point to a loose connection that may have damaged the cable as well',
    ],
  },
  {
    id: 'add-sockets',
    title: 'Add sockets or extend a circuit',
    matches:
      'extra sockets, add a socket, move a socket, more plug points, double socket in the kitchen, cooker circuit, induction hob',
    reviewed: true,
    questions: [
      {
        topic: 'socket location',
        question: 'Where do the new sockets go?',
        options: [
          'Same room as an existing socket',
          'A room with no nearby socket',
          'Kitchen worktop',
        ],
      },
      {
        topic: 'new circuit needed',
        question: 'What will the new socket or point be used for?',
        options: [
          'General use',
          'Cooker or oven',
          'Another heavy appliance such as a heater',
        ],
      },
      {
        topic: 'number of new sockets',
        question: 'How many new sockets are needed?',
        options: ['1', '2 or 3', '4 or more'],
      },
    ],
    variants: [
      {
        when: 'Extending an existing socket circuit',
        materials: [
          'Double switched socket 13A white',
          'Twin and earth cable 2.5mm 6242Y',
          'Flush metal back box 35mm',
        ],
      },
      {
        when: 'Socket on a plasterboard wall',
        materials: ['Dry lining back box 35mm'],
      },
      {
        when: 'Cable run on the surface',
        materials: ['Mini trunking 25mm x 16mm', 'Surface pattress box 35mm'],
      },
      {
        when: 'New dedicated circuit for a cooker or oven',
        materials: [
          'Twin and earth cable 6mm 6242Y',
          'Cooker switch 45A',
          'Cooker connection unit',
          'RCBO 32A Type A',
        ],
      },
      {
        when: 'Induction hob and oven sharing one cooker circuit',
        materials: [
          'Twin and earth cable 10mm 6242Y',
          'Cooker switch 45A',
          'Cooker connection unit',
          'RCBO 40A Type A',
        ],
      },
      {
        when: 'New dedicated radial circuit for another heavy appliance',
        materials: [
          'Twin and earth cable 2.5mm 6242Y',
          'RCBO 20A Type A',
          'Switched fused connection unit 13A',
        ],
      },
    ],
    assumptions: [
      'The existing circuit has capacity for the extra sockets',
      'There is a spare way in the consumer unit if a new circuit is needed',
    ],
    exclusions: [
      'Upgrading the consumer unit',
      'Lifting fitted flooring or moving kitchen units',
    ],
    pitfalls: [
      'Extending an old circuit can show it needs upgrading first',
      'A full consumer unit leaves no room for a new circuit',
      'A spur off a ring should only feed one single or double socket, so several new sockets usually means extending the ring',
      'Cable buried in loft or wall insulation runs hotter and may need a larger size',
      'Kitchen sockets near the sink have to be kept a sensible distance from water',
      'Induction hobs draw far more than older cookers, so an existing 6mm cooker circuit may be too small for a hob and oven together',
    ],
  },
  {
    id: 'light-fittings',
    title: 'Replace or add light fittings and downlights',
    matches:
      'new ceiling light, fit downlights, replace strip lights, broken light in the ceiling, spotlights, LED lights in the kitchen, bathroom downlights',
    reviewed: true,
    questions: [
      {
        topic: 'light type',
        question: 'What kind of light is being fitted?',
        options: [
          'Ceiling light or pendant',
          'Recessed downlights',
          'LED batten or strip light',
        ],
      },
      {
        topic: 'number of lights',
        question: 'How many lights are being fitted?',
        options: ['1 or 2', '3 to 6', '7 or more'],
      },
      {
        topic: 'above the ceiling',
        question: 'What is above the ceiling?',
        options: ['Loft space', 'Another room', 'Flat roof'],
      },
      {
        topic: 'new or replacement',
        question: 'Is there a light there now?',
        options: ['Replacing an existing light', 'New light position'],
      },
    ],
    variants: [
      {
        when: 'Replacement ceiling light',
        materials: ['LED ceiling light fitting'],
      },
      {
        when: 'Recessed downlights',
        materials: [
          'Fire rated LED downlight',
          'Twin and earth cable 1.5mm 6242Y',
          'Lever connector 3-way',
        ],
      },
      {
        when: 'Downlights in a bathroom or over a shower',
        materials: ['Fire rated LED downlight IP65'],
      },
      {
        when: 'Downlights in a loft ceiling with insulation over them',
        materials: ['Downlight insulation cover'],
      },
      {
        when: 'Strip light replaced with LED',
        materials: ['LED batten light 1500mm'],
      },
      {
        when: 'New light position',
        materials: [
          'Twin and earth cable 1.5mm 6242Y',
          'Ceiling rose',
          'Light switch 1 gang 2 way white',
        ],
      },
      {
        when: 'Lights on a dimmer',
        materials: ['LED compatible dimmer switch'],
      },
    ],
    assumptions: [
      'The existing lighting circuit can take the new fittings',
      'Cables can be run through the ceiling void without lifting floors',
    ],
    exclusions: [
      'Patching and redecorating ceilings after cutting in',
      'Moving loft insulation beyond what the fittings need',
    ],
    pitfalls: [
      'Downlights under a room or loft need fire rated fittings, and insulation kept clear of any that are not rated for it',
      'Joists often sit where a downlight should go, so the layout may shift',
      'Old lath and plaster ceilings can crack or come down in sections when cut',
      'Running cable under a flat roof is slow and may need surface wiring or cutting in',
      'Old strip lights may be on a circuit with no earth',
      'Some LED lights flicker on old dimmers unless the dimmer is changed too',
    ],
  },
  {
    id: 'electrical-fault',
    title: 'Lighting or power fault',
    matches:
      'lights not working, faulty lighting, trip switch keeps going, power keeps tripping, sort out the electrics, no power to sockets, burning smell from a socket',
    reviewed: true,
    questions: [
      {
        topic: 'what stopped working',
        question: 'What has stopped working?',
        options: [
          'One light or socket',
          'A whole circuit',
          'Everything in the property',
        ],
      },
      {
        topic: 'tripping',
        question: 'Does a switch in the fuse board trip?',
        options: ['Trips straight away', 'Trips now and then', 'Nothing trips'],
      },
      {
        topic: 'recent change',
        question: 'Did anything happen just before it started?',
        options: [
          'New appliance or recent work',
          'Water leak nearby',
          'Nothing obvious',
        ],
      },
      {
        topic: 'signs of burning',
        question: 'Is there any burning smell, scorch marks or buzzing?',
        options: ['Yes', 'No'],
      },
    ],
    variants: [
      {
        when: 'Fault not yet found',
        materials: [],
      },
      {
        when: 'Fault traced to a single switch or socket',
        materials: ['Double switched socket 13A white'],
      },
      {
        when: 'Fault traced to a damaged cable, such as one hit by a nail or screw',
        materials: [
          'Maintenance free junction box 32A',
          'Twin and earth cable 2.5mm 6242Y',
        ],
      },
    ],
    assumptions: [
      'The quote covers finding the fault; the repair is quoted once the cause is known',
      'Access to the consumer unit and affected points is available',
    ],
    exclusions: [
      'Repairs beyond the fault-finding visit',
      'Faults on appliances rather than the fixed wiring',
      'Faults on the incoming supply, which the network operator deals with',
    ],
    pitfalls: [
      'Tripping that comes and goes is often an appliance, so unplugging everything first narrows it down',
      'Nuisance tripping on a shared RCD can be the combined leakage of many appliances rather than one fault',
      'If everything is off and nothing has tripped, it may be a supply fault; the customer can call 105 for the network operator',
      'Any burning smell or scorch marks mean the circuit should stay off until it is looked at',
      'Water from a leak can cause faults that return until the area dries out',
      'Old wiring may fail testing in several places once a fault is looked into',
    ],
  },
  {
    id: 'electric-shower',
    title: 'Electric shower circuit',
    matches:
      'install electric shower, replace electric shower, new shower circuit, shower keeps tripping, more powerful shower',
    reviewed: true,
    questions: [
      {
        topic: 'existing shower circuit',
        question: 'Is there an electric shower there now?',
        options: ['Replacing an electric shower', 'New shower, no circuit'],
      },
      {
        topic: 'existing cable size',
        question: 'What size is the existing shower cable?',
        options: ['6mm', '10mm', 'No existing cable'],
      },
      {
        topic: 'shower rating',
        question: 'What power is the new shower?',
        options: ['Up to 8.5kW', '9.5kW', '10.5kW and above'],
      },
      {
        topic: 'distance to the board',
        question: 'How far is the shower from the fuse board?',
        options: ['Under 10m', '10–20m', 'Over 20m'],
      },
    ],
    variants: [
      {
        when: 'New or upgraded circuit for a shower up to 9.5kW',
        materials: [
          'Twin and earth cable 10mm 6242Y',
          'Pull cord isolator switch 45A',
          'RCBO 45A Type A',
        ],
      },
      {
        when: 'New or upgraded circuit for a shower of 10.5kW and above',
        materials: [
          'Twin and earth cable 10mm 6242Y',
          'Pull cord isolator switch 50A',
          'RCBO 50A Type A',
        ],
      },
      {
        when: 'Long cable run over 20m or cable buried in insulation',
        materials: ['Twin and earth cable 16mm 6242Y'],
      },
      {
        when: 'Same-power shower swap on a sound circuit',
        materials: ['Electric shower 9.5kW'],
      },
    ],
    assumptions: [
      'The supply and main fuse can take the shower load',
      'There is a spare way in the consumer unit for a new circuit',
    ],
    exclusions: [
      'Plumbing the shower into the water supply',
      'Upgrading the consumer unit or supply',
    ],
    pitfalls: [
      'A more powerful shower often needs thicker cable than the existing circuit has, and 6mm cable rarely suits anything above 8.5kW',
      'Long cable runs, or cable buried in loft insulation, may need a larger cable size',
      'Older properties may have a small main fuse that limits the shower rating',
      'Scorched terminals in an old shower or pull cord often mean the connections need remaking, not just the unit swapping',
    ],
  },
  {
    id: 'outside-power',
    title: 'Outside socket or light',
    matches:
      'outside socket, garden socket, outdoor light, security light, power to a shed, external socket, garage power',
    reviewed: true,
    questions: [
      {
        topic: 'outdoor item',
        question: 'What is being fitted outside?',
        options: [
          'Socket',
          'Light',
          'Socket and light',
          'Power to a shed or garage',
        ],
      },
      {
        topic: 'outdoor location',
        question: 'Where is it going?',
        options: ['On the house wall', 'In the garden or on a shed'],
      },
      {
        topic: 'garden cable run',
        question: 'If power runs down the garden, how far is it?',
        options: ['Under 10m', '10–25m', 'Over 25m', 'No garden run'],
      },
    ],
    variants: [
      {
        when: 'Outside socket on the house wall',
        materials: [
          'Outdoor double socket IP66',
          'Twin and earth cable 2.5mm 6242Y',
        ],
      },
      {
        when: 'Outside light on the house wall',
        materials: [
          'Outdoor wall light with PIR sensor',
          'Twin and earth cable 1.5mm 6242Y',
        ],
      },
      {
        when: 'Power run out to the garden or a shed',
        materials: [
          'Armoured cable SWA 2.5mm 3 core',
          'SWA gland kit 20mm',
          'Outdoor double socket IP66',
          'Outdoor junction box IP66',
        ],
      },
      {
        when: 'Garden run over 25m',
        materials: ['Armoured cable SWA 4mm 3 core'],
      },
      {
        when: 'Shed or garage with its own lights and sockets',
        materials: [
          'RCBO 32A Type A',
          'Garage consumer unit with RCBOs',
          'LED batten light 1500mm',
          'Double switched socket 13A white',
        ],
      },
      {
        when: 'Cable buried in a trench',
        materials: ['Cable warning tape'],
      },
    ],
    assumptions: [
      'There is a nearby circuit to take the new outside point',
      'The wall can be drilled at the chosen position',
    ],
    exclusions: [
      'Digging and backfilling trenches for garden cable runs',
      'Garden lighting beyond the fittings quoted',
      'Electric vehicle chargers',
    ],
    pitfalls: [
      'Cable to a garden or shed has to be armoured, either buried deep enough or clipped along walls and fences; burying means trenching',
      'Outside sockets need RCD protection, so an older board may need changes',
      'Long garden runs lose voltage and may need a larger armoured cable',
      'A shed or garage with its own board needs a dedicated circuit from a spare way in the house consumer unit',
      'PIR lights mounted too low get tampered with or triggered by passers-by',
    ],
  },
];
