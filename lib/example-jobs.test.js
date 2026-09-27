import { describe, expect, it } from 'vitest';
import { EXAMPLE_JOBS, examplesFor } from './example-jobs.js';
import { VALID_TRADES } from './constants.js';
import { examplePhoto } from './example-photos.js';
import { hasComplianceWording } from './compliance-wording.js';

describe('example jobs', () => {
  it.each(VALID_TRADES)('%s has three examples with distinct labels', (trade) => {
    const labels = examplesFor(trade).map((e) => e.label);
    expect(labels).toHaveLength(3);
    expect(new Set(labels).size).toBe(3);
  });

  it.each(VALID_TRADES)('%s has exactly one photo example, listed first, with a photo on file', (trade) => {
    const examples = examplesFor(trade);
    expect(examples.filter((e) => e.withPhoto)).toHaveLength(1);
    expect(examples[0].withPhoto).toBe(true);
    expect(examplePhoto(trade)).not.toBeNull();
  });

  it('never uses compliance wording', () => {
    for (const e of EXAMPLE_JOBS) {
      expect(hasComplianceWording(`${e.label}. ${e.jobDescription}`), e.label).toBe(false);
    }
  });

  it('returns nothing without a trade', () => {
    expect(examplesFor(null)).toEqual([]);
  });
});
