import { describe, it, expect } from 'vitest';
import { JOBS_BY_TRADE } from './index.js';
import { isRejectedLabel } from '../material-rules.js';
import { keyQuestionsFor } from '../key-questions.js';
import { isNearDuplicateQuestion } from '../propose-materials.js';

// Pack text reaches quote prompts, so it must never carry the claims CLAUDE.md's never-do rules forbid.
const COMPLIANCE_WORDING = /part p|gas safe|bs ?7671|water regulations|complian|certif|building regs|wras|approved/i;

describe.each(Object.entries(JOBS_BY_TRADE))('%s pack', (trade, jobs) => {
  it('has unique ids and the full set of fields', () => {
    expect(new Set(jobs.map((j) => j.id)).size).toBe(jobs.length);
    for (const job of jobs) {
      expect(typeof job.reviewed).toBe('boolean');
      for (const field of ['questions', 'variants', 'assumptions', 'exclusions', 'pitfalls']) {
        expect(job[field].length, `${job.id}.${field}`).toBeGreaterThan(0);
      }
    }
  });

  it.each(jobs.map((j) => [j.id, j]))('%s questions follow the key-question rules', (_, job) => {
    for (const q of job.questions) {
      expect(q.question).toMatch(/\?$/);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options.length).toBeLessThanOrEqual(5);
      expect(q.options.some((o) => /^(other|not sure)/i.test(o))).toBe(false);
      if ('askWhen' in q) expect(q.askWhen.trim()).not.toBe('');
    }
  });

  // Key questions are asked on every job already, so a pack repeat would be asked twice.
  it.each(jobs.map((j) => [j.id, j]))('%s never repeats a key question', (_, job) => {
    const keyQuestions = keyQuestionsFor(trade);
    const keyTopics = new Set(keyQuestions.map((q) => q.topic));
    for (const q of job.questions) {
      expect(keyTopics.has(q.topic), q.topic).toBe(false);
      expect(isNearDuplicateQuestion(q.question, keyQuestions), q.question).toBe(false);
      // Reworded repeats still share their answers, e.g. "What is the leaking pipe made of?".
      for (const key of keyQuestions) {
        const shared = q.options.filter((o) => key.options.some((k) => k.toLowerCase() === o.toLowerCase()));
        expect(shared.length, `${q.question} vs ${key.question}`).toBeLessThan(2);
      }
    }
  });

  it.each(jobs.map((j) => [j.id, j]))('%s materials pass the materials never-do rules', (_, job) => {
    for (const label of job.variants.flatMap((v) => v.materials)) {
      expect(isRejectedLabel(label), label).toBe(false);
    }
  });

  it('never uses compliance wording anywhere', () => {
    expect(JSON.stringify(jobs)).not.toMatch(COMPLIANCE_WORDING);
  });
});
