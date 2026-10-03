import { describe, expect, it } from 'vitest';
import {
  MAX_JOB_DESCRIPTION_LENGTH,
  MAX_MATERIALS,
  cleanJobDescription,
  sanitizeQaPairs,
  validateMaterials,
} from './request-limits.js';

describe('cleanJobDescription', () => {
  it('trims, and rejects blank, non-string and over-long input', () => {
    expect(cleanJobDescription('  Fit a tap  ')).toBe('Fit a tap');
    expect(cleanJobDescription('   ')).toBeNull();
    expect(cleanJobDescription(42)).toBeNull();
    expect(cleanJobDescription('a'.repeat(MAX_JOB_DESCRIPTION_LENGTH))).toHaveLength(MAX_JOB_DESCRIPTION_LENGTH);
    expect(cleanJobDescription('a'.repeat(MAX_JOB_DESCRIPTION_LENGTH + 1))).toBeNull();
  });
});

describe('sanitizeQaPairs', () => {
  it('drops malformed pairs, trims, cuts long text and caps the count', () => {
    expect(sanitizeQaPairs('nope')).toEqual([]);
    expect(sanitizeQaPairs([{ question: ' Q ', answer: ' A ' }, { question: 'Q' }, null])).toEqual([{ question: 'Q', answer: 'A' }]);
    const long = sanitizeQaPairs([{ question: 'q'.repeat(400), answer: 'a'.repeat(2000) }])[0];
    expect(long.question).toHaveLength(300);
    expect(long.answer).toHaveLength(1000);
    expect(sanitizeQaPairs(Array.from({ length: 30 }, () => ({ question: 'Q', answer: 'A' })))).toHaveLength(12);
  });
});

describe('validateMaterials', () => {
  it('accepts an empty list and well-formed materials', () => {
    expect(validateMaterials([])).toEqual([]);
    const ok = [{ label: 'Copper pipe', quantity: '3m', description: '15mm' }];
    expect(validateMaterials(ok)).toBe(ok);
  });

  it('rejects malformed, over-long and too many materials', () => {
    expect(validateMaterials(undefined)).toBeNull();
    expect(validateMaterials([{ label: ' ' }])).toBeNull();
    expect(validateMaterials([{ label: 'Pipe', quantity: 3 }])).toBeNull();
    expect(validateMaterials([{ label: 'x'.repeat(201) }])).toBeNull();
    expect(validateMaterials([{ label: 'Pipe', description: 'x'.repeat(501) }])).toBeNull();
    expect(validateMaterials(Array.from({ length: MAX_MATERIALS + 1 }, () => ({ label: 'Pipe' })))).toBeNull();
  });
});
