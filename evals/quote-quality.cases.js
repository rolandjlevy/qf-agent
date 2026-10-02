// Ten terse, real-world jobs for scripts/eval-quotes.mjs, written the way a trader types them.
// `expectedGaps` are what the questions (key questions plus Phase A's) should have covered.

export const QUOTE_QUALITY_CASES = [
  {
    id: 'consumer-unit',
    title: 'Consumer unit swap',
    trade: 'electrician',
    jobDescription: 'Old fusebox needs swapping for a new consumer unit, house is 1930s, want RCD protection. Rewire not needed just the board.',
    expectedGaps: ['circuit count', 'existing wiring condition/age', 'EICR needed first', 'meter tails/earthing arrangement', 'DNO isolation', 'Part P notification'],
  },
  {
    id: 'combi-boiler',
    title: 'Combi boiler replacement',
    trade: 'gas-engineer',
    jobDescription: 'Replace old combi boiler in kitchen, same spot, customer wants a Worcester. Might move the flue.',
    expectedGaps: ['current boiler make/model & output', 'gas supply pipe size', 'flue routing/regs', 'system flush', 'filter', 'thermostat', 'Gas Safe cert', 'warranty'],
  },
  {
    id: 'bathroom-refit',
    title: 'Full bathroom refit',
    trade: 'bathroom-fitter',
    jobDescription: 'Rip out and refit family bathroom, new bath, toilet, basin, full tiling. Customer supplying tiles.',
    expectedGaps: ['room dimensions', 'floor type/levelling', 'waterproofing/tanking', 'extractor', 'who supplies sanitaryware', 'wall condition', 'waste/soil access', 'making good'],
  },
  {
    id: 'interior-repaint',
    title: 'Interior repaint 3-bed',
    trade: 'decorator',
    jobDescription: 'Paint 3 bed house throughout, walls and ceilings, some woodwork. Occupied so needs doing room by room.',
    expectedGaps: ['current wall condition/prep', 'filling/cracks', 'paint spec & coats', 'who supplies paint', 'furniture moving', 'colour changes (dark to light)', 'timeline around occupants'],
  },
  {
    id: 'storm-roof',
    title: 'Storm roof repair',
    trade: 'roofer',
    jobDescription: 'Few slipped tiles after the storm, possible leak in back bedroom. Terraced, no scaffold access at front.',
    expectedGaps: ['roof type/pitch', 'matching tiles', 'felt/battens condition', 'access & scaffold vs tower', 'extent of water damage', 'chimney/flashing check', 'patch vs section'],
  },
  {
    id: 'kitchen-fit',
    title: 'Kitchen fit',
    trade: 'carpenter',
    jobDescription: 'Fit a new kitchen, units already bought (Howdens). Worktops too. Old one needs taking out.',
    expectedGaps: ['number of units', 'worktop material', 'appliance integration', 'plumbing/electrical disconnection & reconnection (separate trades?)', 'flooring', 'wall condition', 'disposal of old units'],
  },
  {
    id: 'porcelain-patio',
    title: 'New porcelain patio',
    trade: 'gardener-landscaper',
    jobDescription: 'Lay a new patio in the back garden, porcelain, roughly 30 sqm. Old concrete slabs coming up first.',
    expectedGaps: ['exact area & shape', 'ground prep/sub-base', 'drainage/falls', 'edge restraints', 'disposal of old slabs', 'access to rear garden', 'levels vs house DPC'],
  },
  {
    id: 'artex-skim',
    title: 'Ceiling skim + damp patch',
    trade: 'plasterer',
    jobDescription: 'Skim over artexed ceilings in living room and hall, plus patch a damp-damaged wall.',
    expectedGaps: ['artex asbestos risk (pre-2000?)', 'area in sqm', 'bonding vs skim', 'cause of damp (not a plastering job)', 'drying time', 'making good after'],
  },
  {
    id: 'snagging',
    title: 'New-build snagging',
    trade: 'handyman',
    jobDescription: 'Bit of everything — hang 3 doors, fix a dripping tap, put up shelves, fill some holes. New-build snagging.',
    expectedGaps: ['doors supplied/hung/trimmed?', 'tap type (may need plumber)', 'shelf load/wall type', "under builder's warranty?", 'realistic half-day vs full-day scope'],
  },
  {
    id: 'kitchen-tiling',
    title: 'Kitchen floor + splashback tiling',
    trade: 'tiler',
    jobDescription: 'Tile kitchen floor (20 sqm) and a splashback. Customer wants large format tiles on the floor.',
    expectedGaps: ['substrate (timber vs concrete)', 'levelling/decoupling', 'tile supply', 'underfloor heating', 'layout/setting out', 'matching grout', 'movement joints'],
  },
]
