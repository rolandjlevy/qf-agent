import { describe, it, expect, afterEach, vi } from 'vitest';
import { jobsFor, jobEntry, formatJobsForPhaseA, formatJobForPhaseB, matchJobByDescription, keyQuestionsForJob } from './index.js';
import { keyQuestionsFor } from '../key-questions.js';
import { PLUMBER_JOBS } from './plumber.js';

afterEach(() => vi.unstubAllEnvs());

describe('jobsFor', () => {
  it('returns only reviewed entries by default', () => {
    expect(jobsFor('plumber')).toEqual(PLUMBER_JOBS.filter((j) => j.reviewed));
  });

  it('returns every entry with TRADE_KNOWLEDGE=all, and none with TRADE_KNOWLEDGE=off', () => {
    vi.stubEnv('TRADE_KNOWLEDGE', 'all');
    expect(jobsFor('plumber')).toEqual(PLUMBER_JOBS);
    vi.stubEnv('TRADE_KNOWLEDGE', 'off');
    expect(jobsFor('plumber')).toEqual([]);
  });

  it('returns nothing for a trade without a pack, including prototype keys', () => {
    vi.stubEnv('TRADE_KNOWLEDGE', 'all');
    for (const trade of ['gas-engineer', 'bricklayer', 'fencer', 'tree-surgeon']) expect(jobsFor(trade)).toEqual([]);
    expect(jobsFor('__proto__')).toEqual([]);
  });
});

describe('jobEntry', () => {
  it('finds an enabled entry by id, and returns null otherwise', () => {
    vi.stubEnv('TRADE_KNOWLEDGE', 'all');
    expect(jobEntry('plumber', 'leaking-tap').title).toBe('Leaking or dripping tap');
    expect(jobEntry('plumber', 'made-up')).toBeNull();
    expect(jobEntry('plumber', undefined)).toBeNull();
    vi.stubEnv('TRADE_KNOWLEDGE', 'off');
    expect(jobEntry('plumber', 'leaking-tap')).toBeNull();
  });
});

describe('formatters', () => {
  it('lists every job with its questions and variants for Phase A', () => {
    vi.stubEnv('TRADE_KNOWLEDGE', 'all');
    const block = formatJobsForPhaseA('plumber');
    expect(block).toContain('<trade_knowledge>');
    for (const job of PLUMBER_JOBS) expect(block).toContain(`<job id="${job.id}">`);
    expect(block).toContain('Ceramic disc tap cartridge 1/2"');
  });

  it('shows when a question applies, if the entry says', () => {
    vi.stubEnv('TRADE_KNOWLEDGE', 'all');
    expect(formatJobsForPhaseA('plumber')).toContain('How is the toilet flushed? (Lever handle / Push button / Concealed cistern) (only if');
  });

  it('returns empty strings when there is nothing to add', () => {
    expect(formatJobsForPhaseA('gas-engineer')).toBe('');
    expect(formatJobForPhaseB(null)).toBe('');
  });

  it('gives Phase B only the matched job assumptions, exclusions and pitfalls', () => {
    const job = PLUMBER_JOBS[0];
    const block = formatJobForPhaseB(job);
    expect(block).toContain(job.assumptions[0]);
    expect(block).toContain(job.exclusions[0]);
    expect(block).toContain(job.pitfalls[0]);
    expect(block).not.toContain(job.questions[0].question);
  });
});

describe('matching a description to a pack job', () => {
  it.each([
    ['roofer', 'Gutter needs clearing front and back', 'gutters'],
    ['bathroom-fitter', 'Replace the cracked toilet with a new close coupled one.', 'replace-toilet'],
    ['carpenter', 'Door lock needs fitting on the timber back door.', 'door-lock'],
    ['plasterer', 'Fill a hole in the hallway wall where an old light switch was moved.', 'patch-repair'],
  ])('%s: "%s" matches %s', (trade, description, id) => {
    expect(matchJobByDescription(trade, description)?.id).toBe(id);
  });

  it('matches nothing when no phrase fits, and never on part of a word', () => {
    expect(matchJobByDescription('roofer', 'Replace the whole roof')).toBeNull();
    // "bath" must not match "bathroom".
    expect(matchJobByDescription('bathroom-fitter', 'Replace 3 vanity units in the family bathroom')).toBeNull();
    expect(matchJobByDescription('electrician', 'anything at all')).toBeNull();
    expect(matchJobByDescription('gas-engineer', 'Replace the boiler')).toBeNull();
  });

  it("drops only the matched job's skipped key questions", () => {
    const all = keyQuestionsFor('roofer').map((q) => q.topic);
    const gutter = keyQuestionsForJob('roofer', 'Gutter needs clearing front and back').map((q) => q.topic);
    expect(gutter).toEqual(all.filter((t) => t !== 'extent of roof work'));
    expect(keyQuestionsForJob('roofer', 'Replace the whole roof')).toEqual(keyQuestionsFor('roofer'));
  });
});

