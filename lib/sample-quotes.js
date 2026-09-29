import samples from './sample-quotes.json' with { type: 'json' };

// Read-only example quotes for first-time traders, drafted by scripts/generate-sample-quotes.mjs.
// A trade without its own sample (or none chosen) gets the general one.
export function sampleQuoteFor(trade) {
  return Object.hasOwn(samples, trade ?? '') && trade !== 'general' ? samples[trade] : samples.general;
}

export const SAMPLE_QUOTE_KEYS = Object.keys(samples);

// Splits a quote's plain text into its header line, intro and sections ({ heading, lines }),
// using the all-caps section headings save_quote writes. Blank lines are dropped.
export function quoteSections(content) {
  const [header = '', ...rest] = content.split('\n');
  const intro = [];
  const sections = [];
  for (const raw of rest) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[A-Z][A-Z &]+$/.test(line)) sections.push({ heading: line, lines: [] });
    else (sections.at(-1)?.lines ?? intro).push(line);
  }
  return { header: header.trim(), intro, sections };
}
