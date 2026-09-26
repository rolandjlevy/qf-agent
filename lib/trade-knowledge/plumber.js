// Common plumbing jobs, drafted by Claude for the Phase 3c pilot and revised after a
// UK-plumbing review pass. Each entry stays out of production until a person checks it
// and sets reviewed: true (see ./index.js).
export const PLUMBER_JOBS = [
  {
    id: 'leaking-tap',
    title: 'Leaking or dripping tap',
    matches:
      "dripping tap, leaking tap, tap won't turn off fully, water round the base of a tap, stiff or loose tap handle, leaking mixer tap",
    reviewed: true,
    questions: [
      {
        topic: 'tap location',
        question: 'Which tap is it?',
        options: ['Kitchen sink', 'Bathroom basin', 'Bath'],
      },
      {
        topic: 'tap mechanism',
        question: 'How does the tap turn off?',
        options: [
          'Quarter or half turn',
          'Several full turns',
          'Single lever mixer',
        ],
      },
      {
        topic: 'where it leaks',
        question: 'Where is the water coming from?',
        options: [
          'Drips from the spout',
          'Round the handle',
          'Round the base',
          'Under the sink',
        ],
      },
      {
        topic: 'isolation valves',
        question: 'Are there isolation valves on the pipes under the tap?',
        options: ['Yes, both pipes', 'No valves'],
      },
    ],
    variants: [
      {
        when: 'Quarter or half turn basin or kitchen tap dripping from the spout',
        materials: ['Ceramic disc tap cartridge 1/2"'],
      },
      {
        when: 'Quarter or half turn bath tap dripping from the spout',
        materials: ['Ceramic disc tap cartridge 3/4"'],
      },
      {
        when: 'Several full turns basin or kitchen tap dripping from the spout',
        materials: ['Tap washer 1/2"'],
      },
      {
        when: 'Several full turns bath tap dripping from the spout',
        materials: ['Tap washer 3/4"'],
      },
      {
        when: 'Traditional tap leaking round the handle or spindle',
        materials: ['Tap spindle O-ring set'],
      },
      {
        when: 'Single lever mixer dripping or leaking at the lever',
        materials: ['Single lever mixer cartridge 35mm or 40mm'],
      },
      {
        when: 'Mixer tap leaking round the base',
        materials: ['Mixer tap base seal'],
      },
      {
        when: 'Leaking under the sink at a tap connector',
        materials: ['Flexible tap connector 15mm x 1/2"'],
      },
      {
        when: 'No isolation valves under the tap',
        materials: ['Isolating valve 15mm'],
      },
    ],
    assumptions: [
      'The water supply to the tap can be isolated locally or at the stopcock',
      'Replacement parts for the existing tap are still available',
      'The tap body and valve seat are in sound condition',
    ],
    exclusions: [
      'Replacement of the whole tap if parts are unavailable or the body is damaged',
      'Repairs to water-damaged units, worktops or flooring',
    ],
    pitfalls: [
      'Ceramic cartridges come in different spline counts (commonly 20 or 24), so the old one may need taking out and matching before a new one is bought',
      'Mixer cartridges are often brand-specific, so the make and model may need confirming before parts are ordered',
      'Old taps can be seized or corroded and may break when dismantled',
      'A worn valve seat on an old tap will keep dripping with a new washer unless it is reseated',
      'Hard-water scale can damage new washers and cartridges quickly',
    ],
  },
  {
    id: 'replace-tap',
    title: 'Replace a tap or mixer',
    matches:
      'new kitchen tap, new basin mixer, swap taps, replace bath taps, fit a mixer tap, pillar taps',
    reviewed: true,
    questions: [
      {
        topic: 'tap location',
        question: 'Which tap is being replaced?',
        options: ['Kitchen sink', 'Bathroom basin', 'Bath'],
      },
      {
        topic: 'tap holes',
        question: 'How many tap holes does the sink, basin or bath have?',
        options: ['One hole', 'Two holes', 'Three or more holes'],
      },
      {
        topic: 'hot water system',
        question: 'How is the hot water supplied?',
        options: [
          'Combi boiler or mains pressure',
          'Hot water cylinder with a tank in the loft',
        ],
      },
      {
        topic: 'who supplies the tap',
        question: 'Who is supplying the new tap?',
        options: ['You supply it', 'Customer supplies it'],
      },
    ],
    variants: [
      {
        when: 'Monobloc kitchen mixer supplied by the plumber',
        materials: ['Monobloc kitchen mixer tap'],
      },
      {
        when: 'Monobloc basin mixer supplied by the plumber',
        materials: ['Monobloc basin mixer tap'],
      },
      {
        when: 'Pair of basin pillar taps supplied by the plumber',
        materials: [
          'Basin pillar taps 1/2" (pair)',
          'Flexible tap connector 15mm x 1/2"',
        ],
      },
      {
        when: 'Pair of bath taps supplied by the plumber',
        materials: [
          'Bath pillar taps 3/4" (pair)',
          'Flexible tap connector 22mm x 3/4"',
        ],
      },
      {
        when: 'Mixer supplied by the plumber on a gravity-fed hot water system',
        materials: ['Low-pressure rated mixer tap'],
      },
      {
        when: 'Any tap replacement without isolation valves',
        materials: ['Isolating valve 15mm'],
      },
    ],
    assumptions: [
      'The new tap fits the existing tap holes without cutting or enlarging them',
      'The existing supply pipes are in sound condition and in the right position',
      'Water pressure suits the new tap (gravity-fed systems need low-pressure taps)',
    ],
    exclusions: [
      'Replacing the sink, basin, bath or worktop',
      'Alterations to the waste pipework',
      'Guaranteeing customer-supplied taps',
    ],
    pitfalls: [
      'Many modern mixers need higher water pressure than older gravity-fed systems provide, giving a weak flow',
      'Seized back nuts on old taps may need cutting off, and bath taps are often hard to reach behind the bath panel',
      'Monobloc flexible tails kink or split if twisted during fitting',
      'Cheap customer-supplied taps may not be WRAS approved or suitable for UK water pressures',
    ],
  },
  {
    id: 'toilet-cistern',
    title: 'Running or leaking toilet cistern',
    matches:
      "toilet keeps running, cistern overflowing, overflow pipe dripping outside, toilet won't flush, water trickling into the pan, cistern slow to fill, toilet leaking on the floor",
    reviewed: true,
    questions: [
      {
        topic: 'cistern fault',
        question: 'What is the toilet doing?',
        options: [
          'Water keeps running into the pan',
          'Overflow pipe dripping outside',
          "Won't flush properly",
          'Slow to refill',
          'Leaking onto the floor',
        ],
      },
      {
        topic: 'flush type',
        question: 'How is the toilet flushed?',
        options: ['Lever handle', 'Push button', 'Concealed cistern'],
      },
      {
        topic: 'fill valve position',
        question: 'Where does the water pipe join the cistern?',
        options: ['Underneath', 'At the side'],
      },
    ],
    variants: [
      {
        when: 'Push-button toilet with water running into the pan from the flush valve',
        materials: ['Push button flush valve'],
      },
      {
        when: 'Cistern overfilling, overflowing or slow to refill, with a bottom-entry pipe',
        materials: ['Bottom entry fill valve 1/2"'],
      },
      {
        when: 'Cistern overfilling, overflowing or slow to refill, with a side-entry pipe',
        materials: ['Side entry fill valve 1/2"'],
      },
      {
        when: 'Lever toilet that needs several pulls to flush',
        materials: ['Siphon diaphragm washer'],
      },
      {
        when: 'Leaking between a close-coupled cistern and the pan',
        materials: ['Close coupling kit with doughnut washer'],
      },
      {
        when: 'Cistern without an isolation valve',
        materials: ['Isolating valve 15mm'],
      },
    ],
    assumptions: [
      'The cistern and pan are not cracked',
      'A concealed cistern can be reached through the flush plate or a removable access panel',
    ],
    exclusions: [
      'Replacing the toilet pan or cistern',
      'Removing and refitting boxing-in, panels or tiling around a concealed cistern',
      'Leaks from the pan outlet or soil pipe connector',
    ],
    pitfalls: [
      'Water running into the pan is often the fill valve overfilling into an internal overflow, not the flush valve, so check the water level first',
      'Flush valves and siphons vary by make, so a close-coupled cistern may need a specific part',
      'Changing a siphon or flush valve on a close-coupled toilet usually means taking the cistern off, and the doughnut washer then needs replacing',
      'Old cistern bolts are often corroded and may snap',
    ],
  },
  {
    id: 'blocked-waste',
    title: 'Blocked sink, basin or bath waste',
    matches:
      "blocked sink, slow draining basin, sink won't drain, bath won't drain, bad smell from the plughole, gurgling waste",
    reviewed: true,
    questions: [
      {
        topic: 'blocked fitting',
        question: 'Which fitting is blocked?',
        options: ['Kitchen sink', 'Bathroom basin', 'Bath', 'Shower tray'],
      },
      {
        topic: 'other fittings affected',
        question: 'Are any other sinks, baths or toilets draining slowly too?',
        options: ['Only this one', 'Several are slow'],
      },
      {
        topic: 'chemicals used',
        question: 'Has any drain unblocker chemical been poured in?',
        options: ['Yes', 'No'],
      },
    ],
    variants: [
      {
        when: "Basin trap old, cracked or won't reseal after clearing",
        materials: ['Bottle trap 32mm'],
      },
      {
        when: "Kitchen sink trap old, cracked or won't reseal after clearing",
        materials: ['Tubular sink trap 40mm'],
      },
      {
        when: "Bath trap old, cracked or won't reseal after clearing",
        materials: ['Low-profile bath trap 40mm'],
      },
      {
        when: 'Basin waste pipe damaged or badly furred',
        materials: ['Waste pipe 32mm'],
      },
      {
        when: 'Kitchen or bath waste pipe damaged or badly furred',
        materials: ['Waste pipe 40mm'],
      },
    ],
    assumptions: [
      'The blockage is in the trap or the pipework under the fitting, not in the main drain',
      'The trap and waste can be reached without removing units, bath panels or tiling',
    ],
    exclusions: [
      'Clearing blockages in underground drains or the main sewer',
      'CCTV drain surveys',
      'Lifting a shower tray to reach its waste',
    ],
    pitfalls: [
      'Several fittings draining slowly points to the main drain, which is a different job',
      'Drain chemicals left in the pipe can burn skin and eyes when the trap is opened',
      'Kitchen blockages are often grease that returns unless the customer changes habits',
      "Shower tray wastes are often only reachable from above, and some can't be cleared without lifting the tray",
    ],
  },
  {
    id: 'replace-radiator',
    title: 'Replace a radiator',
    matches:
      'new radiator, swap radiator, radiator leaking, radiator cold at the bottom, bigger radiator, move radiator',
    reviewed: true,
    questions: [
      {
        topic: 'radiator size',
        question: 'Is the new radiator the same size as the old one?',
        options: ['Same size', 'Different size', 'Moving position'],
      },
      {
        topic: 'radiator valves',
        question: 'What is happening to the radiator valves?',
        options: ['Reuse the existing valves', 'Fit new thermostatic valves'],
      },
      {
        topic: 'heating system type',
        question: 'What type of heating system is it?',
        options: [
          'Combi boiler',
          'System boiler with a cylinder',
          'Regular boiler with tanks in the loft',
        ],
      },
      {
        topic: 'radiator pipe size',
        question: 'What size are the pipes feeding the radiator?',
        options: ['Standard 15mm', 'Microbore (8mm or 10mm)'],
      },
    ],
    variants: [
      {
        when: 'Straight swap for a same-size radiator',
        materials: ['Double panel convector radiator 600mm x 1000mm'],
      },
      {
        when: 'New thermostatic valves fitted',
        materials: ['Thermostatic radiator valve and lockshield 15mm (pair)'],
      },
      {
        when: 'Different size radiator or new position needing pipework altered',
        materials: ['Copper pipe 15mm', 'Pipe clips 15mm'],
      },
      {
        when: 'Radiator fed by microbore pipework',
        materials: ['Microbore adaptor 10mm'],
      },
      {
        when: 'System drained down and refilled',
        materials: ['Central heating inhibitor 1L'],
      },
    ],
    assumptions: [
      'The heating system can be drained down and refilled without problems',
      'The wall is suitable for fixing the new radiator brackets',
      'The existing pipework reaches the new radiator without rerouting',
    ],
    exclusions: [
      'Making good or decorating the wall behind the radiator',
      'Power flushing the heating system',
      'Moving pipework under floors or behind walls',
      'Balancing the rest of the heating system',
    ],
    pitfalls: [
      'A different size radiator usually means the pipe centres change',
      'Combi and system boilers are sealed systems that need repressurising after refilling',
      'Old systems may have sludge that shows up once the system is drained',
      'Old radiator valves can fail to seal once disturbed, forcing a full drain down',
      'Microbore pipe kinks easily and may limit the output of a bigger radiator',
      'Thermostatic valves are not usually fitted in the room with the main room thermostat',
    ],
  },
  {
    id: 'leaking-pipe',
    title: 'Leaking pipe or fitting',
    matches:
      "leaking pipe, burst pipe, drip from a joint, water stain on the ceiling, leak under the floor, stopcock won't turn off",
    reviewed: true,
    questions: [
      {
        topic: 'leak location',
        question: 'Can you see where the leak is?',
        options: [
          'Visible and easy to reach',
          'Under the floor',
          'Behind a wall or boxing',
          'Not found yet',
        ],
      },
      {
        topic: 'pipe material',
        question: 'What is the leaking pipe made of?',
        options: ['Copper', 'Plastic', 'Lead'],
      },
      {
        topic: 'pipe size',
        question: 'What size is the pipe?',
        options: ['15mm', '22mm', '28mm'],
      },
      {
        topic: 'stopcock condition',
        question: 'Does the stopcock turn the water off fully?',
        options: [
          'Yes, it works',
          "Stiff or won't fully shut off",
          "Can't find it",
        ],
      },
    ],
    variants: [
      {
        when: 'Leaking compression joint on copper pipe',
        materials: ['Compression olive 15mm'],
      },
      {
        when: 'Short section of damaged 15mm copper pipe',
        materials: ['Copper pipe 15mm', 'Push-fit straight coupler 15mm'],
      },
      {
        when: 'Short section of damaged 22mm copper pipe',
        materials: ['Copper pipe 22mm', 'Push-fit straight coupler 22mm'],
      },
      {
        when: 'Leak on plastic pipe',
        materials: ['Push-fit straight coupler 15mm', 'Pipe insert 15mm'],
      },
      {
        when: 'Leak on lead pipe',
        materials: ['Lead to copper connector 15mm'],
      },
      {
        when: 'Stopcock seized or not shutting off',
        materials: ['Stopcock 15mm'],
      },
    ],
    assumptions: [
      'The leak is at the location identified before the work starts',
      'Floorboards or panels can be lifted to reach the pipe',
    ],
    exclusions: [
      'Tracing leaks that cannot be seen or reached',
      'Replacing floorboards, plaster or decoration disturbed to reach the pipe',
      'Repairs to water damage caused by the leak',
      'Work on the supply pipe outside the property',
    ],
    pitfalls: [
      'A stain on a ceiling can be some distance from the actual leak',
      'A leak on a heating pipe means draining down and refilling the heating system',
      'A seized stopcock can stop the job until it is replaced, which may need the water company to turn off the outside valve',
      'Lead pipe needs a specialist connector, and the customer should be advised to replace lead pipework',
    ],
  },
  {
    id: 'outside-tap',
    title: 'Fit an outside tap',
    matches: 'outside tap, garden tap, external tap, hose tap, outdoor tap',
    reviewed: true,
    questions: [
      {
        topic: 'supply position',
        question:
          'Is there a cold water pipe on the other side of the wall where the tap is going?',
        options: [
          'Yes, directly behind',
          'A short run away',
          'Not near the wall',
        ],
      },
      {
        topic: 'cold supply source',
        question: 'Is that cold pipe fed straight from the mains?',
        options: ['Mains cold (rising main)', 'Fed from a tank in the loft'],
      },
      {
        topic: 'wall construction',
        question: 'What is the outside wall made of?',
        options: ['Solid brick', 'Cavity wall', 'Timber cladding'],
      },
    ],
    variants: [
      {
        when: 'Tap fitted with a supply pipe directly behind the wall',
        materials: ['Outside tap kit 15mm with double check valve'],
      },
      {
        when: 'Supply pipe is a short run away',
        materials: [
          'Outside tap kit 15mm with double check valve',
          'Copper pipe 15mm',
          'Pipe clips 15mm',
        ],
      },
      {
        when: 'Pipework running outside or through an unheated space',
        materials: ['Pipe insulation 15mm'],
      },
    ],
    assumptions: [
      'A mains cold water pipe is available close to where the tap is going',
      'The wall can be drilled at the chosen position without hitting services',
    ],
    exclusions: [
      'Garden hoses, reels or fittings',
      'Frost protection beyond fitting an internal isolation valve and lagging exposed pipe',
    ],
    pitfalls: [
      'Outside taps need backflow protection (a double check valve), which most kits include',
      'An outside tap should come off the mains cold, not a loft tank, or pressure will be poor',
      'Cavity walls need the pipe sleeved through the cavity and falling slightly to the outside',
      'The tap needs an internal isolation valve so it can be drained down for winter',
    ],
  },
  {
    id: 'appliance-plumbing',
    title: 'Plumb in a washing machine or dishwasher',
    matches:
      'plumb in washing machine, connect dishwasher, new appliance plumbing, washing machine valve, washing machine waste',
    reviewed: true,
    questions: [
      {
        topic: 'which appliance',
        question: 'Which appliance is being plumbed in?',
        options: ['Washing machine', 'Dishwasher', 'Both'],
      },
      {
        topic: 'existing connections',
        question:
          'Are there water and waste connections for the appliance already?',
        options: ['Yes, ready to connect', 'Water only', 'Waste only', 'None'],
      },
      {
        topic: 'appliance position',
        question: 'How far is the appliance from the sink?',
        options: ['Next to the sink', 'Across the room'],
      },
    ],
    variants: [
      {
        when: 'Existing connections ready to use',
        materials: ['Washing machine hose 1.5m'],
      },
      {
        when: 'New water supply needed',
        materials: [
          'Equal tee 15mm',
          'Appliance valve 15mm',
          'Copper pipe 15mm',
        ],
      },
      {
        when: 'New waste connection into the sink trap',
        materials: ['Sink trap with appliance spigot 40mm'],
      },
      {
        when: 'New waste connection on a standpipe',
        materials: ['Washing machine standpipe with trap 40mm'],
      },
      {
        when: 'Appliance across the room from the sink',
        materials: ['Copper pipe 15mm', 'Waste pipe 40mm', 'Pipe clips 15mm'],
      },
    ],
    assumptions: [
      'The appliance is delivered, unpacked and ready to connect',
      'An electrical socket is already in place for the appliance',
    ],
    exclusions: [
      'Electrical work, including new sockets',
      'Removing and disposing of the old appliance',
      'Cutting or altering kitchen units to fit the appliance',
      'Fitting door panels to integrated appliances',
    ],
    pitfalls: [
      'Sink traps without an appliance spigot need replacing to take the waste hose',
      'The waste hose needs a high loop or a standpipe of the right height, or the machine can siphon and drain while filling',
      'Self-cutting appliance valves are quick to fit but more prone to leaks than a tee and valve',
      'A waste pipe run across the room needs a steady fall back to the drain',
    ],
  },
];
