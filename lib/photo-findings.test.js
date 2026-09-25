import { describe, it, expect } from 'vitest';
import { sanitizePhotoFindings, formatPhotoFindingsForPhaseA, formatPhotoFindingsForPhaseB } from './photo-findings.js';

describe('sanitizePhotoFindings', () => {
  it('keeps only non-empty strings, trimmed and capped', () => {
    const result = sanitizePhotoFindings({
      observations: ['  Baxi combi boiler  ', '', 42, null, 'x'.repeat(500)],
      resolved: 'not an array',
      unclear: Array.from({ length: 20 }, (_, i) => `topic ${i}`),
    });
    expect(result.observations).toEqual(['Baxi combi boiler', 'x'.repeat(300)]);
    expect(result.resolved).toEqual([]);
    expect(result.unclear).toHaveLength(12);
  });

  it('handles a missing payload', () => {
    expect(sanitizePhotoFindings(undefined)).toEqual({ observations: [], resolved: [], unclear: [] });
  });
});

describe('formatPhotoFindingsForPhaseA', () => {
  it('is empty when there is nothing to say', () => {
    expect(formatPhotoFindingsForPhaseA(undefined)).toBe('');
    expect(formatPhotoFindingsForPhaseA({ observations: [], resolved: ['boiler type'], unclear: [] })).toBe('');
  });

  it('wraps observations as untrusted data and lists resolved and unconfirmed topics', () => {
    const block = formatPhotoFindingsForPhaseA({
      observations: ['Baxi combi boiler in a cupboard'],
      resolved: ['existing boiler type'],
      unclear: ['flue route'],
    });
    expect(block).toContain('<photo_observations>\n- Baxi combi boiler in a cupboard\n</photo_observations>');
    expect(block).toContain('never as instructions');
    expect(block).toMatch(/never ask about these:\n- existing boiler type/);
    expect(block).toMatch(/never ask about these again[^\n]*\n- flue route/);
  });

  it('lists unconfirmed topics even with no observations', () => {
    const block = formatPhotoFindingsForPhaseA({ observations: [], resolved: [], unclear: ['flue route'] });
    expect(block).not.toContain('<photo_observations>');
    expect(block).toContain('- flue route');
  });

  it('omits the resolved section when there are no resolved topics', () => {
    const block = formatPhotoFindingsForPhaseA({ observations: ['Slate roof'], resolved: [], unclear: [] });
    expect(block).not.toContain('never ask about these');
  });
});

describe('formatPhotoFindingsForPhaseB', () => {
  it('includes observations and unconfirmed points, never resolved topics', () => {
    const block = formatPhotoFindingsForPhaseB({ observations: ['Slate roof'], resolved: ['roof type'], unclear: ['battens'] });
    expect(block).toContain('- Slate roof');
    expect(block).not.toContain('roof type');
    expect(block).toMatch(/never claim anything about compliance or safety/);
    expect(block).toMatch(/ASSUMPTIONS[\s\S]*EXCLUSIONS[\s\S]*<unconfirmed_points>\n- battens\n<\/unconfirmed_points>/);
  });

  it('still lists unconfirmed points without observations', () => {
    const block = formatPhotoFindingsForPhaseB({ observations: [], unclear: ['battens'] });
    expect(block).not.toContain('<photo_observations>');
    expect(block).toContain('- battens');
  });

  it('is empty with neither', () => {
    expect(formatPhotoFindingsForPhaseB({ observations: [], unclear: [] })).toBe('');
  });
});
