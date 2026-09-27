import samples from './sample-quotes.json' with { type: 'json' };

// Read-only example quotes for first-time traders, drafted by scripts/generate-sample-quotes.mjs.
// A trade without its own sample (or none chosen) gets the general one.
export function sampleQuoteFor(trade) {
  return Object.hasOwn(samples, trade ?? '') && trade !== 'general' ? samples[trade] : samples.general;
}

export const SAMPLE_QUOTE_KEYS = Object.keys(samples);
