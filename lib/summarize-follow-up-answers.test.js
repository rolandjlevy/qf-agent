import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./anthropic-client.js', () => ({
  createClient: vi.fn(() => ({})),
  createMessage: vi.fn(),
  getPhaseAModel: vi.fn(() => 'test-phase-a-model'),
}));

const { createMessage } = await import('./anthropic-client.js');
const { summarizeFollowUpAnswers } = await import('./summarize-follow-up-answers.js');

function textResponse(text) {
  return { content: [{ type: 'text', text }] };
}

beforeEach(() => {
  createMessage.mockReset();
});

describe('summarizeFollowUpAnswers', () => {
  it('returns an empty array for no follow-up answers', async () => {
    expect(await summarizeFollowUpAnswers([])).toEqual([]);
    expect(await summarizeFollowUpAnswers(undefined)).toEqual([]);
    expect(createMessage).not.toHaveBeenCalled();
  });

  it('returns the model-rewritten bullets when the response is well-formed', async () => {
    createMessage.mockResolvedValueOnce(textResponse(JSON.stringify(['The gutter system is Plastic (uPVC)'])));

    const result = await summarizeFollowUpAnswers([
      { question: 'What type of gutter system is installed?', answer: 'Plastic (uPVC)' },
    ]);

    expect(result).toEqual(['The gutter system is Plastic (uPVC)']);
  });

  it('accepts fewer bullets than pairs (merged near-duplicate answers)', async () => {
    createMessage.mockResolvedValueOnce(textResponse(JSON.stringify(['The exact repair needed is unconfirmed, pending inspection'])));

    const result = await summarizeFollowUpAnswers([
      { question: 'What type of structural repair is needed?', answer: 'Unsure — needs inspection first' },
      { question: 'What issue has been identified?', answer: 'Visible but undiagnosed — needs inspection to confirm' },
    ]);

    expect(result).toEqual(['The exact repair needed is unconfirmed, pending inspection']);
  });

  it('drops exact-duplicate bullets the model still repeats, keeping the first', async () => {
    createMessage.mockResolvedValueOnce(
      textResponse(
        JSON.stringify([
          'Guttering type to be confirmed following site inspection',
          'New guttering system installation',
          'Guttering type to be confirmed',
          'Guttering type to be confirmed following site inspection',
        ]),
      ),
    );

    const result = await summarizeFollowUpAnswers([
      { question: 'q1', answer: 'a1' },
      { question: 'q2', answer: 'a2' },
      { question: 'q3', answer: 'a3' },
      { question: 'q4', answer: 'a4' },
    ]);

    expect(result).toEqual([
      'Guttering type to be confirmed following site inspection',
      'New guttering system installation',
      'Guttering type to be confirmed',
    ]);
  });

  it('falls back to plain "question — answer" pairs when the response has no JSON array', async () => {
    createMessage.mockResolvedValueOnce(textResponse('Sorry, I cannot help with that.'));

    const result = await summarizeFollowUpAnswers([{ question: 'Property type?', answer: 'Flat' }]);

    expect(result).toEqual(['Property type? — Flat']);
  });

  it('falls back when the model returns more bullets than pairs', async () => {
    createMessage.mockResolvedValueOnce(textResponse(JSON.stringify(['One', 'Two', 'Three'])));

    const result = await summarizeFollowUpAnswers([{ question: 'Property type?', answer: 'Flat' }]);

    expect(result).toEqual(['Property type? — Flat']);
  });

  it('falls back when any element is not a non-empty string', async () => {
    createMessage.mockResolvedValueOnce(textResponse(JSON.stringify(['Fine bullet', '', 42])));

    const result = await summarizeFollowUpAnswers([
      { question: 'q1', answer: 'a1' },
      { question: 'q2', answer: 'a2' },
      { question: 'q3', answer: 'a3' },
    ]);

    expect(result).toEqual(['q1 — a1', 'q2 — a2', 'q3 — a3']);
  });

  it('falls back on a network/API error without throwing', async () => {
    createMessage.mockRejectedValueOnce(new Error('network down'));

    const result = await summarizeFollowUpAnswers([{ question: 'Property type?', answer: 'Flat' }]);

    expect(result).toEqual(['Property type? — Flat']);
  });
});
