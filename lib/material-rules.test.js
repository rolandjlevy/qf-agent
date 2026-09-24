import { describe, it, expect } from 'vitest';
import { isRejectedLabel, answerSignalsInspectionNeeded } from './material-rules.js';

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

  it('rejects non-physical inspection/assessment "materials" (e.g. a job that needs diagnosis first)', () => {
    expect(isRejectedLabel('Wardrobe inspection and diagnostic service')).toBe(true);
    expect(isRejectedLabel('Professional assessment visit')).toBe(true);
    expect(isRejectedLabel('Site survey')).toBe(true);
    expect(isRejectedLabel('Call-out fee')).toBe(true);
  });

  it('does not reject a legitimate label that merely contains a skip-keyword substring', () => {
    expect(isRejectedLabel('Yorkshire stone paving slab')).toBe(false);
  });

  it('accepts a specific, single, non-vague label', () => {
    expect(isRejectedLabel('Consumer unit 10-way RCBO')).toBe(false);
    expect(isRejectedLabel('Wood screws 4x40mm')).toBe(false);
  });
});

describe('answerSignalsInspectionNeeded', () => {
  it('detects "needs inspection" phrasing', () => {
    expect(answerSignalsInspectionNeeded('Unsure — needs inspection first')).toBe(true);
    expect(answerSignalsInspectionNeeded('Visible but undiagnosed — needs inspection to confirm')).toBe(true);
    expect(answerSignalsInspectionNeeded('This requires inspection before we can say')).toBe(true);
    expect(answerSignalsInspectionNeeded('Unable to diagnose without seeing it')).toBe(true);
    expect(answerSignalsInspectionNeeded('Needs diagnosis on site')).toBe(true);
  });

  it('does not trigger on ordinary uncertainty unrelated to inspection/diagnosis', () => {
    expect(answerSignalsInspectionNeeded('Not sure of the exact colour')).toBe(false);
    expect(answerSignalsInspectionNeeded('House')).toBe(false);
  });

  it('handles non-string input', () => {
    expect(answerSignalsInspectionNeeded(undefined)).toBe(false);
    expect(answerSignalsInspectionNeeded(null)).toBe(false);
  });
});
