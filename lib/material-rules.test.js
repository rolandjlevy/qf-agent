import { describe, it, expect } from 'vitest';
import { isRejectedLabel } from './material-rules.js';

describe('isRejectedLabel', () => {
  it('rejects a non-string label', () => {
    expect(isRejectedLabel(undefined)).toBe(true);
    expect(isRejectedLabel(123)).toBe(true);
  });

  it('rejects labels shorter than 4 characters', () => {
    expect(isRejectedLabel('nut')).toBe(true);
  });

  it('rejects "or" alternatives', () => {
    expect(isRejectedLabel('copper pipe or plastic pipe')).toBe(true);
  });

  it('rejects a bundled label with a comma', () => {
    expect(isRejectedLabel('screws, wall plugs')).toBe(true);
  });

  it('rejects skip-keyword items on a whole-word basis', () => {
    expect(isRejectedLabel('Skip hire 8 yard')).toBe(true);
    expect(isRejectedLabel('Disposal fee')).toBe(true);
  });

  it('does not reject a legitimate label that merely contains a skip-keyword substring', () => {
    expect(isRejectedLabel('Yorkshire stone paving slab')).toBe(false);
  });

  it('accepts a specific, single, non-vague label', () => {
    expect(isRejectedLabel('Consumer unit 10-way RCBO')).toBe(false);
    expect(isRejectedLabel('Wood screws 4x40mm')).toBe(false);
  });
});
