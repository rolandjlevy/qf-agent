import { describe, it, expect } from 'vitest';
import { isRejectedMaterial } from './identify-materials.js';

describe('isRejectedMaterial', () => {
  it('rejects a missing or non-string name', () => {
    expect(isRejectedMaterial(null)).toBe(true);
    expect(isRejectedMaterial({})).toBe(true);
    expect(isRejectedMaterial({ name: 123 })).toBe(true);
  });

  it('rejects names shorter than 4 characters', () => {
    expect(isRejectedMaterial({ name: 'nut' })).toBe(true);
  });

  it('rejects "or" alternatives', () => {
    expect(isRejectedMaterial({ name: 'copper pipe or plastic pipe' })).toBe(true);
  });

  it('rejects a bundled name with a single comma (regression: previously required >=2 commas)', () => {
    expect(isRejectedMaterial({ name: 'screws, wall plugs' })).toBe(true);
  });

  it('rejects a name with multiple commas', () => {
    expect(isRejectedMaterial({ name: 'screws, wall plugs, washers' })).toBe(true);
  });

  it('rejects skip-keyword items on a whole-word basis', () => {
    expect(isRejectedMaterial({ name: 'Skip hire 8 yard' })).toBe(true);
    expect(isRejectedMaterial({ name: 'Disposal fee' })).toBe(true);
  });

  it('rejects a non-physical inspection/diagnostic "material" (job needs diagnosis before materials can be specified)', () => {
    expect(isRejectedMaterial({ name: 'Wardrobe inspection and diagnostic service' })).toBe(true);
  });

  it('does not reject a legitimate product name that merely contains a skip-keyword substring', () => {
    // "hire" is a skip keyword; "Yorkshire" contains it as a substring
    // ("...ks-HIRE...") but is not the whole word "hire".
    expect(isRejectedMaterial({ name: 'Yorkshire stone paving slab' })).toBe(false);
  });

  it('accepts a specific, single, non-vague product name', () => {
    expect(isRejectedMaterial({ name: 'Consumer unit 10-way RCBO' })).toBe(false);
    expect(isRejectedMaterial({ name: 'Wood screws 4x40mm' })).toBe(false);
  });
});
