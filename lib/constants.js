// Slugs are permanent identifiers (stored in saved quotes and runs): never rename one.
// Display text comes from TRADE_LABELS via tradeLabel().
export const VALID_TRADES = [
  'bathroom-fitter',
  'bricklayer',
  'builder',
  'carpenter',
  'driveway-specialist',
  'electrician',
  'fencer',
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
  'tree-surgeon',
];

export const TRADE_LABELS = {
  // eslint-disable-next-line quote-props
  'bathroom-fitter': 'Bathroom fitter',
  bricklayer: 'Bricklayer',
  builder: 'Builder',
  carpenter: 'Carpenter / joiner',
  decorator: 'Painter & decorator',
  'driveway-specialist': 'Driveway specialist',
  electrician: 'Electrician',
  fencer: 'Fencing contractor',
  'flooring-fitter': 'Flooring fitter',
  'gardener-landscaper': 'Gardener / landscaper',
  'gas-engineer': 'Heating & gas engineer',
  glazier: 'Windows & doors',
  groundworker: 'Groundworker',
  handyman: 'Handyman',
  'kitchen-fitter': 'Kitchen fitter',
  plasterer: 'Plasterer',
  plumber: 'Plumber',
  roofer: 'Roofer',
  tiler: 'Tiler',
  'tree-surgeon': 'Tree surgeon',
};

// Falls back to the slug so a missing label never breaks the UI.
export function tradeLabel(slug) {
  return Object.hasOwn(TRADE_LABELS, slug) ? TRADE_LABELS[slug] : slug;
}

// Job-photo limits, shared by the /quote/new picker and the server routes.
export const MAX_JOB_PHOTOS = 8;
export const ALLOWED_PHOTO_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
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
    example:
      "Thanks so much for reaching out — we'd love to help get this sorted for you.",
  },
  formal: {
    description:
      'Traditional business register. Full sentences, no contractions, measured and correct.',
    example:
      'Thank you for your enquiry. Please find below our proposal for the work described.',
  },
  direct: {
    description:
      'Short sentences, no small talk, no filler adjectives. State facts and next actions plainly.',
    example: 'Job: replace consumer unit. Scope and materials below.',
  },
  persuasive: {
    description:
      'Emphasise the value of proceeding without over-claiming or guaranteeing outcomes. Confident, encouraging language geared toward acceptance.',
    example:
      "This is a great opportunity to bring your electrics fully up to date — here's what's involved.",
  },
  professional: {
    description:
      'Competent, businesslike, courteous — the default trade-quote register, neither stiff nor casual.',
    example:
      'We have reviewed the job description and set out our proposed scope of work below.',
  },
};
