// The few questions that always shape a quote for each trade, asked on one page before
// Phase A. With photos, analyseJobPhotos skips any the photos answer or that don't apply.
// Options never include "Other" or "Not sure": app/key-questions-form.js's KeyQuestions adds both.

const whoSupplies = {
  topic: 'who supplies materials',
  question: 'Who is supplying the materials?',
  options: ['You supply everything', 'Customer supplies some', 'Customer supplies everything'],
}

const makingGood = {
  topic: 'making good afterwards',
  question: 'Who makes good walls, ceilings and floors after the work?',
  options: ['Included in this quote', 'Customer or another trade'],
}

const wasteRemoval = {
  topic: 'waste removal',
  question: 'Who is taking away the waste?',
  options: ['Included in this quote', 'Customer arranges it'],
}

const roomCleared = {
  topic: 'furniture in the work area',
  question: 'Will the work area be cleared before you start?',
  options: ['Customer clears it', 'You move and cover things'],
}

const wallType = {
  topic: 'wall type for fixings',
  question: 'What are the walls made of where things are being fixed?',
  options: ['Brick or block', 'Stud and plasterboard', 'A mix of both'],
}

// Area-priced trades: the scale drives labour time and quantities, so it's asked as ranges.
const area = (question, options) => ({ topic: 'approximate area', question, options })

export const KEY_QUESTIONS_BY_TRADE = {
  'bathroom-fitter': [
    { topic: 'extent of refit', question: 'How much of the bathroom is being refitted?', options: ['Full strip-out and refit', 'Suite only', 'One or two items'] },
    { topic: 'layout change', question: 'Is the layout staying the same?', options: ['Same layout', 'Some items move', 'Completely new layout'] },
    { topic: 'wall finish', question: 'What finish is going on the walls?', options: ['Fully tiled', 'Part tiled', 'Wall panels', 'Paint only'] },
    whoSupplies,
  ],
  builder: [
    { topic: 'planning permission', question: 'Where is the planning permission at?', options: ['Already approved', 'Not needed', 'Not yet applied for'] },
    { topic: 'site access', question: 'How easy is access for materials?', options: ['Easy front access', 'Rear or side access only', 'Only through the house'] },
    wasteRemoval,
    whoSupplies,
  ],
  carpenter: [
    wallType,
    { topic: 'finish on joinery', question: 'How should the new joinery be left?', options: ['Ready for painting', 'Painted or finished', 'Pre-finished items'] },
    makingGood,
    whoSupplies,
  ],
  'driveway-specialist': [
    area('Roughly how big is the driveway?', ['Under 30m²', '30–60m²', '60–100m²', 'Over 100m²']),
    { topic: 'existing surface', question: 'What is there now?', options: ['Surface to break out', 'Lay over existing', 'Soil or lawn'] },
    { topic: 'dropped kerb', question: 'Is there a dropped kerb already?', options: ['Already in place', 'Needs one'] },
    wasteRemoval,
  ],
  electrician: [
    { topic: 'property type', question: 'What type of property is it?', options: ['House', 'Flat', 'Commercial premises'] },
    { topic: 'cable routes', question: 'How can new cables be run?', options: ['Surface trunking is fine', 'Chased into walls', 'Under floors or via loft', 'No new cables'] },
    makingGood,
    whoSupplies,
  ],
  'flooring-fitter': [
    area('Roughly how much floor is being laid?', ['Under 10m²', '10–25m²', '25–50m²', 'Over 50m²']),
    { topic: 'existing floor covering', question: 'What happens to the existing floor covering?', options: ['You lift and dispose', 'Customer lifts it', 'Nothing to lift'] },
    roomCleared,
    whoSupplies,
  ],
  'gas-engineer': [
    { topic: 'appliance position', question: 'Is the new appliance going where the old one was?', options: ['Same position', 'New position', 'No existing appliance'] },
    { topic: 'property type', question: 'What type of property is it?', options: ['House', 'Flat', 'Commercial premises'] },
    makingGood,
    whoSupplies,
  ],
  glazier: [
    { topic: 'number of units', question: 'How many windows or doors are involved?', options: ['1', '2–4', '5–10', 'More than 10'] },
    { topic: 'glass or whole frame', question: 'What is being replaced?', options: ['Glass only', 'Whole frames'] },
    { topic: 'working height', question: 'What is the highest one?', options: ['Ground floor', 'First floor', 'Second floor or above'] },
  ],
  groundworker: [
    area('Roughly how big is the area being dug or laid?', ['Under 20m²', '20–50m²', '50–100m²', 'Over 100m²']),
    { topic: 'machine access', question: 'Can a digger get to the work area?', options: ['Mini digger fits', 'Hand dig only'] },
    { topic: 'spoil removal', question: 'What happens to the dug-out soil?', options: ['Removed from site', 'Left on site'] },
  ],
  handyman: [
    { topic: 'number of tasks', question: 'How many separate jobs are there?', options: ['Just one', '2–3', '4 or more'] },
    wallType,
    whoSupplies,
  ],
  'kitchen-fitter': [
    { topic: 'extent of kitchen work', question: 'How much of the kitchen is being done?', options: ['Full replacement', 'Units only', 'Worktops only', 'A few items'] },
    { topic: 'layout change', question: 'Is the layout staying the same?', options: ['Same layout', 'Some items move', 'Completely new layout'] },
    { topic: 'appliance fitting', question: 'Which appliances are you fitting?', options: ['All of them', 'Some of them', 'None'] },
    whoSupplies,
  ],
  'gardener-landscaper': [
    area('Roughly how big is the area being worked on?', ['Under 20m²', '20–50m²', '50–100m²', 'Over 100m²']),
    { topic: 'garden access', question: 'How do you get into the garden?', options: ['Side gate or wide access', 'Rear lane access', 'Only through the house'] },
    wasteRemoval,
    whoSupplies,
  ],
  decorator: [
    area('How much is being decorated?', ['One room', '2–3 rooms', '4 or more rooms', 'Exterior only']),
    { topic: 'surface condition', question: 'What state are the surfaces in?', options: ['Good, just repainting', 'Need filling and sanding', 'Bare or new plaster'] },
    { topic: 'colour change', question: 'How big is the colour change?', options: ['Similar colour', 'Light over dark', 'Dark over light'] },
    whoSupplies,
  ],
  plasterer: [
    area('Roughly how much area is being plastered or boarded?', ['Under 10m²', '10–25m²', '25–50m²', 'Over 50m²']),
    { topic: 'finish required', question: 'What finish is needed?', options: ['Full skim, ready to decorate', 'Tape and joint only', 'Patch repair only'] },
    { topic: 'existing surface', question: 'What is the surface being covered?', options: ['Plasterboard', 'Old plaster', 'Bare brick or block', 'Bare timber or studs'] },
    whoSupplies,
  ],
  plumber: [
    { topic: 'pipework material', question: 'What is the existing pipework made of?', options: ['Copper', 'Plastic', 'A mix'] },
    { topic: 'access to pipework', question: 'How easy is it to get to the pipes?', options: ['Exposed or easy to reach', 'Under floorboards', 'Boxed in or behind tiles'] },
    makingGood,
    whoSupplies,
  ],
  roofer: [
    { topic: 'extent of roof work', question: 'How much of the roof is involved?', options: ['Repair to one area', 'One roof slope', 'Whole roof'] },
    { topic: 'building height', question: 'How tall is the building?', options: ['Bungalow', 'Two storeys', 'Three storeys or more'] },
    { topic: 'scaffolding', question: 'Who is arranging scaffolding?', options: ['Included in this quote', 'Customer arranges it', 'Not needed'] },
    wasteRemoval,
  ],
  tiler: [
    area('Roughly how much area is being tiled?', ['Under 5m²', '5–15m²', '15–30m²', 'Over 30m²']),
    { topic: 'existing tiles', question: 'What happens to any existing tiles?', options: ['Remove old tiles', 'Tile over them', 'No existing tiles'] },
    { topic: 'tile size', question: 'How big are the new tiles?', options: ['Small (under 30cm)', 'Medium (30–60cm)', 'Large format (over 60cm)'] },
    whoSupplies,
  ],
}

export function keyQuestionsFor(trade) {
  return KEY_QUESTIONS_BY_TRADE[trade] ?? []
}
