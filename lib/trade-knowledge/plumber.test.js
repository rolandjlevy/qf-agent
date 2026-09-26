import { describe, it, expect } from 'vitest';
import { PLUMBER_JOBS } from './plumber.js';
import { isRejectedLabel } from '../material-rules.js';

// Pack text reaches quote prompts, so it must never carry the claims CLAUDE.md's never-do rules forbid.
const COMPLIANCE_WORDING = /part p|gas safe|bs ?7671|water regulations|complian|certif|building regs|wras|approved/i;

describe('PLUMBER_JOBS', () => {
  it('has unique ids and the full set of fields', () => {
    expect(new Set(PLUMBER_JOBS.map((j) => j.id)).size).toBe(PLUMBER_JOBS.length);
    for (const job of PLUMBER_JOBS) {
      expect(typeof job.reviewed).toBe('boolean');
      for (const field of ['questions', 'variants', 'assumptions', 'exclusions', 'pitfalls']) {
        expect(job[field].length, `${job.id}.${field}`).toBeGreaterThan(0);
      }
    }
  });

  it.each(PLUMBER_JOBS.map((j) => [j.id, j]))('%s questions follow the key-question rules', (_, job) => {
    for (const q of job.questions) {
      expect(q.question).toMatch(/\?$/);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options.length).toBeLessThanOrEqual(5);
      expect(q.options.some((o) => /^(other|not sure)/i.test(o))).toBe(false);
      if ('askWhen' in q) expect(q.askWhen.trim()).not.toBe('');
    }
  });

  it.each(PLUMBER_JOBS.map((j) => [j.id, j]))('%s materials pass the materials never-do rules', (_, job) => {
    for (const label of job.variants.flatMap((v) => v.materials)) {
      expect(isRejectedLabel(label), label).toBe(false);
    }
  });

  it('never uses compliance wording anywhere', () => {
    expect(JSON.stringify(PLUMBER_JOBS)).not.toMatch(COMPLIANCE_WORDING);
  });
});
