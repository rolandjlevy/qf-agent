// Quick-start examples for step 1: the chips under the composer show the selected trade's three.
// The first of each trade is the one its Unsplash photo (lib/example-photos.json) was chosen for.
export const EXAMPLE_JOBS = [
  {
    label: 'Dripping kitchen tap',
    trade: 'plumber',
    withPhoto: true,
    jobDescription:
      "Kitchen mixer tap dripping from the spout and won't turn off fully. Customer would rather repair it than replace it.",
  },
  {
    label: 'Toilet keeps running',
    trade: 'plumber',
    jobDescription:
      'Toilet in the family bathroom keeps running after flushing and the cistern never stops filling. Close-coupled toilet, about 15 years old.',
  },
  {
    label: 'Cold radiator',
    trade: 'plumber',
    jobDescription:
      'Living room radiator stays cold at the top while the others heat up fine. Customer would also like a thermostatic valve fitted to it.',
  },
  {
    label: 'Old fuse box needs replacing',
    trade: 'electrician',
    withPhoto: true,
    jobDescription:
      'Old fuse box with rewireable fuses in the under-stairs cupboard of a three-bed semi. Replace with a modern consumer unit with RCD protection, about 8 circuits.',
  },
  {
    label: 'Extra double sockets',
    trade: 'electrician',
    jobDescription:
      'Add three double sockets in a home office in a 1970s bungalow, run from the nearest circuit. Walls are plasterboard on timber studs.',
  },
  {
    label: 'Outdoor lights by the garage',
    trade: 'electrician',
    jobDescription:
      'Fit two outdoor wall lights with dusk-to-dawn sensors either side of the garage door on a detached house.',
  },
  {
    label: 'TV needs mounting',
    trade: 'handyman',
    withPhoto: true,
    jobDescription:
      'Mount a 55-inch TV on the living room wall with a tilting bracket and hide the cables. Customer has already bought the bracket.',
  },
  {
    label: 'Flat-pack wardrobes',
    trade: 'handyman',
    jobDescription:
      'Build two flat-pack double wardrobes in the main bedroom and fix them to the wall. Customer has already bought the wardrobes.',
  },
  {
    label: 'Shelves and curtain poles',
    trade: 'handyman',
    jobDescription:
      'Put up three floating shelves in the living room and two curtain poles in the bedrooms. Walls are solid brick.',
  },
  {
    label: 'Two bedrooms need decorating',
    trade: 'decorator',
    withPhoto: true,
    jobDescription:
      'Repaint walls, ceilings and woodwork in two double bedrooms. A few cracks to fill, and colours are similar to what is there now.',
  },
  {
    label: 'Hallway, stairs and landing',
    trade: 'decorator',
    jobDescription:
      'Paint the hallway, stairs and landing walls and ceilings, plus the spindles and handrail. Three-storey townhouse with a high ceiling over the stairs.',
  },
  {
    label: 'Front of the house',
    trade: 'decorator',
    jobDescription:
      'Repaint the rendered front of a two-storey semi, plus the fascias and front door frame. Some of the paint on the render is flaking.',
  },
  {
    label: 'Internal doors need replacing',
    trade: 'carpenter',
    withPhoto: true,
    jobDescription:
      'Replace 5 internal doors with white primed shaker doors in a 1990s house, reusing the existing frames. New hinges and handles on each.',
  },
  {
    label: 'Alcove cupboards',
    trade: 'carpenter',
    jobDescription:
      'Build fitted cupboards with shelves above in both alcoves either side of a living room chimney breast, each about 90cm wide.',
  },
  {
    label: 'New skirting boards',
    trade: 'carpenter',
    jobDescription:
      'Replace the skirting boards throughout a two-bed flat with 145mm MDF torus skirting, ready for painting.',
  },
  {
    label: 'Cracked ceiling needs skimming',
    trade: 'plasterer',
    withPhoto: true,
    jobDescription:
      'Living room ceiling about 4m x 4m with several long cracks. Board over where needed and skim, ready to paint. Room will be cleared.',
  },
  {
    label: 'Reskim a bedroom',
    trade: 'plasterer',
    jobDescription:
      'Skim all four walls of a double bedroom, about 3.5m x 3.5m, after the old wallpaper was stripped. A few blown patches to hack off first.',
  },
  {
    label: 'Patching after a rewire',
    trade: 'plasterer',
    jobDescription:
      'Make good the chases and holes left in the plaster after a rewire of a three-bed semi, across about eight rooms.',
  },
  {
    label: 'Slipped roof tiles',
    trade: 'roofer',
    withPhoto: true,
    jobDescription:
      'Several slipped and broken concrete tiles on the back slope of a two-storey house, causing a small leak into a bedroom ceiling.',
  },
  {
    label: 'Leaking flat roof',
    trade: 'roofer',
    jobDescription:
      'Garage flat roof about 3m x 5m is leaking at one corner. Felt roof, probably 20 years old, and the customer is open to a new covering.',
  },
  {
    label: 'New fascias and guttering',
    trade: 'roofer',
    jobDescription:
      'Replace the timber fascias, soffits and guttering on the front and back of a three-bed semi with white uPVC.',
  },
  {
    label: 'Full bathroom refit',
    trade: 'bathroom-fitter',
    withPhoto: true,
    jobDescription:
      'Strip out a dated bathroom, about 2.5m x 2m, and fit a new bath with a shower over, close coupled toilet and vanity basin. Same layout.',
  },
  {
    label: 'Replace basin and taps',
    trade: 'bathroom-fitter',
    jobDescription:
      'Swap the old pedestal basin for a wall-hung vanity unit with a new mixer tap, in the same position. Customer has chosen the unit.',
  },
  {
    label: 'Retile shower enclosure',
    trade: 'bathroom-fitter',
    jobDescription:
      'Strip and retile the three walls of a shower enclosure about 900mm square. The grout is failing and a few tiles are loose.',
  },
  {
    label: 'New kitchen fitting',
    trade: 'kitchen-fitter',
    withPhoto: true,
    jobDescription:
      'Remove the old kitchen and fit a new one supplied by the customer: 10 units, laminate worktops, sink and built-in oven and hob. Same layout.',
  },
  {
    label: 'Replace worktops',
    trade: 'kitchen-fitter',
    jobDescription:
      'Replace the laminate worktops in an L-shaped kitchen, about 5m in total, with new laminate, cut out for the existing sink and hob.',
  },
  {
    label: 'New cupboard doors',
    trade: 'kitchen-fitter',
    jobDescription:
      'Fit new doors and drawer fronts to the existing kitchen units, 14 in total and supplied by the customer, plus new handles.',
  },
  {
    label: 'Bathroom walls need retiling',
    trade: 'tiler',
    withPhoto: true,
    jobDescription:
      'Remove old tiles and retile the bathroom walls around the bath and shower area with large porcelain tiles.',
  },
  {
    label: 'Kitchen floor tiling',
    trade: 'tiler',
    jobDescription:
      'Tile a kitchen floor about 3m x 4m with large porcelain tiles. The old vinyl will need lifting first.',
  },
  {
    label: 'Kitchen splashback',
    trade: 'tiler',
    jobDescription:
      'Tile the splashback between the worktops and wall units in a kitchen, about 4m long, with white metro tiles.',
  },
  {
    label: 'Laminate floor in the lounge',
    trade: 'flooring-fitter',
    withPhoto: true,
    jobDescription:
      'Lift the old carpet and fit laminate flooring with underlay in a living room, finished with new beading.',
  },
  {
    label: 'Carpet on stairs and landing',
    trade: 'flooring-fitter',
    jobDescription:
      'Fit new carpet and underlay on a straight staircase with 13 steps and the landing. Customer has chosen the carpet.',
  },
  {
    label: 'Engineered wood in the hall',
    trade: 'flooring-fitter',
    jobDescription:
      'Lay engineered oak flooring in a hallway about 1.2m x 6m, with a threshold strip into the kitchen. Concrete subfloor.',
  },
  {
    label: 'Old boiler swap to a combi',
    trade: 'gas-engineer',
    withPhoto: true,
    jobDescription:
      'Replace a 20-year-old regular boiler and hot water cylinder with a combi boiler in a three-bed semi, and remove the tanks from the loft.',
  },
  {
    label: 'Boiler losing pressure',
    trade: 'gas-engineer',
    jobDescription:
      'Seven-year-old combi boiler in a two-bed flat keeps losing pressure and needs topping up every few days. Customer also wants it serviced.',
  },
  {
    label: 'Move a gas hob',
    trade: 'gas-engineer',
    jobDescription:
      'Customer is moving their gas hob about 2m along the same wall as part of a new kitchen. Extend the gas supply to the new position.',
  },
  {
    label: 'Misted double glazing',
    trade: 'glazier',
    withPhoto: true,
    jobDescription:
      'Three double-glazed units have misted between the panes in white uPVC frames. Replace the sealed units only, frames are fine.',
  },
  {
    label: 'Cracked sash window pane',
    trade: 'glazier',
    jobDescription:
      'One cracked pane in a timber sash window at the front of a Victorian terrace. The frame is sound, just the glass needs replacing.',
  },
  {
    label: 'New back door',
    trade: 'glazier',
    jobDescription:
      'Replace a wooden back door and frame with a half-glazed uPVC one in the same opening, about 2m x 0.9m.',
  },
  {
    label: 'New patio',
    trade: 'gardener-landscaper',
    withPhoto: true,
    jobDescription:
      'Lay an Indian sandstone patio at the back of the house, replacing part of the lawn. Customer wants a slight fall away from the house.',
  },
  {
    label: 'Overgrown garden tidy-up',
    trade: 'gardener-landscaper',
    jobDescription:
      'Back garden about 10m x 8m is overgrown. Cut back the hedges, clear two borders, and cut and edge the lawn.',
  },
  {
    label: 'New lawn',
    trade: 'gardener-landscaper',
    jobDescription:
      'Remove a patchy old lawn about 6m x 5m, level the ground and lay new turf.',
  },
  {
    label: 'Storm-damaged fence',
    trade: 'fencer',
    withPhoto: true,
    jobDescription:
      'Replace 8 storm-damaged fence panels along the back garden boundary with new panels on concrete posts and gravel boards.',
  },
  {
    label: 'Picket fence and gate',
    trade: 'fencer',
    jobDescription:
      'Put up a timber picket fence about 8m long along the front of the house, with a matching gate.',
  },
  {
    label: 'Snapped fence post',
    trade: 'fencer',
    jobDescription:
      'One concrete fence post snapped in the wind and the two panels either side are leaning. Replace the post and refix the panels.',
  },
  {
    label: 'Overgrown tree needs cutting back',
    trade: 'tree-surgeon',
    withPhoto: true,
    jobDescription:
      "Crown reduction on a large sycamore in the back garden that overhangs the neighbour's garden and blocks light.",
  },
  {
    label: 'Fell a conifer',
    trade: 'tree-surgeon',
    jobDescription:
      'Fell a 10m leylandii at the side of the house, close to the fence, and grind out the stump.',
  },
  {
    label: 'Cut back a tall hedge',
    trade: 'tree-surgeon',
    jobDescription:
      'Reduce a 30m long laurel hedge from about 4m high to 2m, and trim both sides.',
  },
  {
    label: 'Garden wall needs rebuilding',
    trade: 'bricklayer',
    withPhoto: true,
    jobDescription:
      'Front garden wall is leaning and cracked. Take it down and rebuild in matching brick with a coping on top.',
  },
  {
    label: 'Repoint the front of a house',
    trade: 'bricklayer',
    jobDescription:
      'Repoint the front of a Victorian terrace, about 30 square metres. The mortar is crumbling in places.',
  },
  {
    label: 'Raised brick planter',
    trade: 'bricklayer',
    jobDescription:
      'Build a raised brick planter about 3m x 1m and 60cm high in the back garden, in brick to match the house.',
  },
  {
    label: 'Knock through kitchen and dining room',
    trade: 'builder',
    withPhoto: true,
    jobDescription:
      'Remove the wall between the kitchen and dining room in a 1930s semi to make one open-plan room. The wall is likely load-bearing and will need a steel beam.',
  },
  {
    label: 'Single-storey extension',
    trade: 'builder',
    jobDescription:
      'Build a single-storey rear extension about 4m x 3m on a semi-detached house, with a flat roof and bifold doors. Plans are already drawn.',
  },
  {
    label: 'Garage conversion',
    trade: 'builder',
    jobDescription:
      'Convert an attached single garage into a home office: brick up the garage door, add a window, insulate and plasterboard it.',
  },
  {
    label: 'New block paved driveway',
    trade: 'driveway-specialist',
    withPhoto: true,
    jobDescription:
      'Break out an old cracked concrete driveway at the front of a semi-detached house and replace it with block paving.',
  },
  {
    label: 'Resin driveway',
    trade: 'driveway-specialist',
    jobDescription:
      'Lay a resin-bound driveway over the existing tarmac at the front of a detached house, about 60 square metres.',
  },
  {
    label: 'Widen the driveway',
    trade: 'driveway-specialist',
    jobDescription:
      'Extend a block-paved driveway into the front lawn to fit a second car, about 3m x 5m, matching the existing blocks.',
  },
  {
    label: 'Extension foundations',
    trade: 'groundworker',
    withPhoto: true,
    jobDescription:
      'Dig and pour strip foundations for a single-storey rear extension about 4m x 3m. Access is down the side of the house.',
  },
  {
    label: 'New drain run',
    trade: 'groundworker',
    jobDescription:
      'Dig and lay a new 110mm drain about 12m long from a new downstairs toilet to the existing inspection chamber.',
  },
  {
    label: 'Level a sloping garden',
    trade: 'groundworker',
    jobDescription:
      'Dig out and level part of a sloping back garden, about 8m x 5m, ready for a patio. Access is through the side gate.',
  },
];

export function examplesFor(trade) {
  return trade ? EXAMPLE_JOBS.filter((e) => e.trade === trade) : [];
}

// Step 1's tip card per trade: "Key details for {activity}", then `full` photos on desktop,
// `short` on mobile. Each asks for what the photo analysis looks for, so good photos mean fewer questions.
export const PHOTO_PROMPTS = {
  'bathroom-fitter': {
    activity: 'bathroom fitting',
    full: 'the room from the doorway, the existing bath or shower, and any boiler or water heater label.',
    short: 'the room from the doorway, the existing bath or shower, any boiler label.',
  },
  bricklayer: {
    activity: 'brickwork',
    full: 'the whole wall or area from a few steps back, a close-up of the bricks and mortar, and any cracks or leaning.',
    short: 'the whole wall, a close-up of the bricks, any cracks.',
  },
  builder: {
    activity: 'building work',
    full: 'the rooms or walls involved, any cracks or existing openings, and the route in for materials.',
    short: 'the rooms or walls involved, any cracks, the access route.',
  },
  carpenter: {
    activity: 'carpentry',
    full: 'the area where the work goes, the existing doors or joinery, and the walls things will be fixed to.',
    short: 'the work area, the existing doors or joinery, the walls.',
  },
  'driveway-specialist': {
    activity: 'driveway work',
    full: 'the whole driveway from the road, the current surface up close, the kerb, and any drains.',
    short: 'the whole drive from the road, the surface, the kerb.',
  },
  electrician: {
    activity: 'electrical work',
    full: 'the fuse box or consumer unit with its cover open, its label, the meter, and where any new points will go.',
    short: 'the fuse box and its label, the meter, where new points go.',
  },
  fencer: {
    activity: 'fencing',
    full: 'the full fence line, the existing posts and panels, and the ground along the boundary.',
    short: 'the full fence line, the posts, the ground.',
  },
  'flooring-fitter': {
    activity: 'flooring',
    full: 'each room from the doorway, the current floor covering, the door thresholds, and any stairs.',
    short: 'each room, the current floor, the thresholds.',
  },
  'gas-engineer': {
    activity: 'gas work',
    full: 'the boiler or appliance with its data plate, the flue, the pipework underneath, and any hot water cylinder.',
    short: 'the boiler and its data plate, the flue, the pipes.',
  },
  glazier: {
    activity: 'glazing',
    full: 'each window or door from inside and out, the frame close up, and any misting between the panes.',
    short: 'each window from inside and out, the frame, any misting.',
  },
  groundworker: {
    activity: 'groundwork',
    full: 'the whole area from a distance, the ground surface, any drains or manholes, and the access route for machinery.',
    short: 'the whole area, any drains or manholes, the access.',
  },
  handyman: {
    activity: 'handyman jobs',
    full: 'each item or wall involved, anything the customer has already bought, and the walls fixings go into.',
    short: 'each item or wall, anything already bought.',
  },
  'kitchen-fitter': {
    activity: 'kitchen fitting',
    full: 'the whole kitchen from the doorway, the sink and appliance positions, and any sockets or pipes near the work.',
    short: 'the whole kitchen, the sink and appliances.',
  },
  'gardener-landscaper': {
    activity: 'garden work',
    full: 'the whole garden from the house, the area being worked on, any slopes, and the access route to the back.',
    short: 'the whole garden, the work area, the access route.',
  },
  decorator: {
    activity: 'decorating',
    full: 'each room from a corner, any cracks, stains or flaking paint, and the woodwork.',
    short: 'each room from a corner, any cracks or stains.',
  },
  plasterer: {
    activity: 'plastering',
    full: 'each wall or ceiling involved, any cracks, textured coating or loose patches, and any damp marks.',
    short: 'each wall or ceiling, any cracks or damp.',
  },
  plumber: {
    activity: 'plumbing',
    full: 'the tap, toilet or appliance involved, the pipework and valves underneath, and any boiler label.',
    short: 'the fitting involved, the pipes underneath, any boiler label.',
  },
  roofer: {
    activity: 'roofing',
    full: 'the roof from the ground, front and back, any slipped tiles or damage, and any stains on the ceilings inside.',
    short: 'the roof from the ground, any damage, ceiling stains.',
  },
  tiler: {
    activity: 'tiling',
    full: 'the area to be tiled, the current tiles or floor, and any sockets, pipes or other obstacles in it.',
    short: 'the area to tile, the current surface, any obstacles.',
  },
  'tree-surgeon': {
    activity: 'tree work',
    full: "each tree from a distance with the house in shot, anything it's close to, and the route in from the road.",
    short: 'each tree with the house in shot, the access.',
  },
};

const FALLBACK_PHOTO_PROMPT = 'the area you\'ll be working on, plus any labels or model plates.';

// Heading and photo text for desktop and mobile; a trade without a prompt (or none chosen) gets the general one.
export function photoPromptFor(trade) {
  const prompt = Object.hasOwn(PHOTO_PROMPTS, trade ?? '') ? PHOTO_PROMPTS[trade] : null;
  if (!prompt) {
    return { heading: 'Key details to include', full: FALLBACK_PHOTO_PROMPT, short: FALLBACK_PHOTO_PROMPT };
  }
  return { heading: `Key details for ${prompt.activity}`, full: prompt.full, short: prompt.short };
}
