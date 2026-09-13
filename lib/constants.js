export const VALID_TRADES = [
  'bathroom-fitter',
  'builder',
  'carpenter',
  'driveway-specialist',
  'electrician',
  'flooring-fitter',
  'gas-engineer',
  'glazier',
  'groundworker',
  'handyman',
  'kitchen-fitter',
  'gardener-landscaper',
  'decorator',
  'plasterer',
  'plumber',
  'roofer',
  'tiler',
];

export const VALID_TONES = [
  'friendly',
  'formal',
  'direct',
  'persuasive',
  'professional',
];

// One rubric + example per VALID_TONES entry, so every draft_section prompt
// can anchor "use ${tone} language" to something concrete instead of leaving
// the sub-LLM to interpret a bare adjective on its own.
export const TONE_GUIDES = {
  friendly: {
    description:
      'Warm and approachable, like talking to a neighbour. Use contractions and light warmth; avoid stiff corporate phrasing.',
    example: "Thanks so much for reaching out — we'd love to help get this sorted for you.",
  },
  formal: {
    description: 'Traditional business register. Full sentences, no contractions, measured and correct.',
    example: 'Thank you for your enquiry. Please find below our proposal for the work described.',
  },
  direct: {
    description: 'Short sentences, no small talk, no filler adjectives. State facts and next actions plainly.',
    example: 'Job: replace consumer unit. Scope and materials below.',
  },
  persuasive: {
    description:
      'Emphasise the value of proceeding without over-claiming or guaranteeing outcomes. Confident, encouraging language geared toward acceptance.',
    example: "This is a great opportunity to bring your electrics fully up to date — here's what's involved.",
  },
  professional: {
    description: 'Competent, businesslike, courteous — the default trade-quote register, neither stiff nor casual.',
    example: 'We have reviewed the job description and set out our proposed scope of work below.',
  },
};
