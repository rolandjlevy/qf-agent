import { describe, expect, it } from 'vitest';
import { EXAMPLE_JOBS, exampleJobBySlug, exampleSlug, examplesFor, PHOTO_PROMPTS, photoPromptFor, showsExampleChips } from './example-jobs.js';
import { VALID_TRADES } from './constants.js';
import { examplePhoto } from './example-photos.js';
import { hasComplianceWording } from './compliance-wording.js';

describe('example jobs', () => {
  it.each(VALID_TRADES)('%s has three examples with distinct labels', (trade) => {
    const labels = examplesFor(trade).map((e) => e.label);
    expect(labels).toHaveLength(3);
    expect(new Set(labels).size).toBe(3);
  });

  it('has a photo on file for every example', () => {
    for (const e of EXAMPLE_JOBS) expect(examplePhoto(exampleSlug(e)), e.label).not.toBeNull();
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

  it('shows the chips while the description is empty or an untouched example of the trade', () => {
    const [example] = examplesFor('bathroom-fitter');
    expect(showsExampleChips('bathroom-fitter', '  ')).toBe(true);
    expect(showsExampleChips('bathroom-fitter', example.jobDescription)).toBe(true);
    expect(showsExampleChips('bathroom-fitter', `${example.jobDescription} Extra detail.`)).toBe(false);
    expect(showsExampleChips('plumber', example.jobDescription)).toBe(false);
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
