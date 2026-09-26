import { describe, it, expect } from 'vitest';
import { certificationPhrases, hasComplianceWording, stripComplianceWording } from './compliance-wording.js';

describe('hasComplianceWording', () => {
  it.each([
    'Remedial work to wiring found to be non-compliant.',
    'All work will comply with Part P.',
    'An Electrical Installation Certificate will be issued.',
    'Installed to BS 7671.',
    'Meets building regulations.',
  ])('flags %s', (text) => {
    expect(hasComplianceWording(text)).toBe(true);
  });

  it.each(['Complete removal of the old bath.', 'Test the circuit before handover.', 'Replace the existing consumer unit.'])(
    'leaves ordinary wording alone: %s',
    (text) => {
      expect(hasComplianceWording(text)).toBe(false);
    },
  );

  it("allows the trader's own certifications stated verbatim, but not other claims", () => {
    const allowed = certificationPhrases('Gas Safe registered, NICEIC Approved Contractor');
    expect(hasComplianceWording('We are Gas Safe registered.', allowed)).toBe(false);
    expect(hasComplianceWording('We are an NICEIC Approved Contractor.', allowed)).toBe(false);
    expect(hasComplianceWording('We are Gas Safe registered and the work is compliant.', allowed)).toBe(true);
  });
});

describe('stripComplianceWording', () => {
  it('drops offending bullets and sentences, keeping everything else', () => {
    const text = [
      '• Decorating after the work',
      '• Remedial work to wiring found to be non-compliant',
      'This quote covers the work listed. All work will comply with Part P. Payment is due on completion.',
    ].join('\n');
    expect(stripComplianceWording(text)).toBe(
      ['• Decorating after the work', 'This quote covers the work listed. Payment is due on completion.'].join('\n'),
    );
  });
});
