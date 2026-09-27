import { describe, expect, it } from 'vitest';
import samples from './sample-quotes.json' with { type: 'json' };
import { sampleQuoteFor } from './sample-quotes.js';
import { hasComplianceWording } from './compliance-wording.js';
import { VALID_TRADES } from './constants.js';

// The never-do rules apply to samples too: they're shown to traders as what a quote looks like.
describe.each(Object.entries(samples))('sample quote %s', (key, sample) => {
  const lines = sample.content.split('\n');

  it('is for a real trade and has a title', () => {
    expect(VALID_TRADES).toContain(sample.trade);
    expect(sample.title).toBeTruthy();
  });

  it('prices every material as [Price TBC]', () => {
    const start = lines.indexOf('MATERIALS & EQUIPMENT');
    const end = lines.indexOf('SCOPE OF WORK');
    const bullets = lines.slice(start, end).filter((l) => l.trim().startsWith('•'));
    expect(bullets.length).toBeGreaterThan(0);
    for (const line of bullets) expect(line).toContain('[Price TBC]');
  });

  it('has no compliance claims, no tables and no real date', () => {
    expect(hasComplianceWording(sample.content)).toBe(false);
    expect(lines.slice(1).some((l) => l.includes('|'))).toBe(false);
    expect(lines[0]).toContain('Date: [DATE]');
  });
});

describe('sampleQuoteFor', () => {
  it('falls back to the general sample', () => {
    expect(sampleQuoteFor('tiler')).toBe(samples.general);
    expect(sampleQuoteFor(null)).toBe(samples.general);
    expect(sampleQuoteFor('plumber')).toBe(samples.plumber);
  });
});
