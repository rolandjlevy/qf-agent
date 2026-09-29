import { describe, expect, it } from 'vitest';
import { EXAMPLE_JOBS, exampleJobBySlug, exampleSlug, examplesFor, PHOTO_PROMPTS, photoPromptFor } from './example-jobs.js';
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

  it('gives every example a unique slug that finds it again', () => {
    const slugs = EXAMPLE_JOBS.map(exampleSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(exampleSlug({ label: 'Old boiler swap to a combi' })).toBe('old-boiler-swap-to-a-combi');
    for (const e of EXAMPLE_JOBS) expect(exampleJobBySlug(exampleSlug(e))).toBe(e);
    expect(exampleJobBySlug('no-such-job')).toBeNull();
  });
});

describe('photo prompts', () => {
  it.each(VALID_TRADES)('%s has a desktop and a shorter mobile prompt', (trade) => {
    const { activity, full, short } = PHOTO_PROMPTS[trade];
    expect(activity).toBeTruthy();
    expect(full).toMatch(/\.$/);
    expect(short).toMatch(/\.$/);
    expect(short.length).toBeLessThan(full.length);
  });

  it('never uses compliance wording', () => {
    for (const { full, short } of Object.values(PHOTO_PROMPTS)) {
      expect(hasComplianceWording(`${full} ${short}`), full).toBe(false);
    }
  });

  it('heads the card with the trade activity', () => {
    expect(photoPromptFor('bathroom-fitter')).toMatchObject({ heading: 'Key details for bathroom fitting' });
  });

  it('falls back to the general prompt without a known trade', () => {
    const general = 'the area you\'ll be working on, plus any labels or model plates.';
    for (const trade of [null, 'unknown-trade']) {
      expect(photoPromptFor(trade)).toEqual({ heading: 'Key details to include', full: general, short: general });
    }
  });
});
