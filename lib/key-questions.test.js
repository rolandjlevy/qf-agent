import { describe, it, expect } from 'vitest';
import { KEY_QUESTIONS_BY_TRADE, keyQuestionsFor } from './key-questions.js';
import { VALID_TRADES } from './constants.js';

describe('KEY_QUESTIONS_BY_TRADE', () => {
  it.each(VALID_TRADES)('%s has 3-4 well-formed questions with unique topics', (trade) => {
    const questions = keyQuestionsFor(trade);
    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.length).toBeLessThanOrEqual(4);
    expect(new Set(questions.map((q) => q.topic)).size).toBe(questions.length);
    for (const q of questions) {
      expect(q.question).toMatch(/\?$/);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options.length).toBeLessThanOrEqual(5);
      // The form adds these itself.
      expect(q.options.some((o) => /^(other|not sure)/i.test(o))).toBe(false);
    }
  });

  it('asks area-priced trades for an approximate area', () => {
    for (const trade of ['plasterer', 'decorator', 'tiler', 'flooring-fitter', 'driveway-specialist']) {
      expect(keyQuestionsFor(trade).map((q) => q.topic)).toContain('approximate area');
    }
  });

  it('covers only known trades, and returns nothing for an unknown one', () => {
    expect(Object.keys(KEY_QUESTIONS_BY_TRADE).sort()).toEqual([...VALID_TRADES].sort());
    expect(keyQuestionsFor('astronaut')).toEqual([]);
  });
});
