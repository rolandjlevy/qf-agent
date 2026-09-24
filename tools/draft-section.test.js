import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/anthropic-client.js', () => ({
  createClient: vi.fn(() => ({})),
  createMessage: vi.fn(),
  getModel: vi.fn(() => 'test-model'),
}));

const { createMessage } = await import('../lib/anthropic-client.js');
const { draftSection, buildPriorSectionsContext, isOverBudget } = await import('./draft-section.js');

function textResponse(text) {
  return { content: [{ type: 'text', text }] };
}

beforeEach(() => {
  createMessage.mockReset();
});

describe('buildPriorSectionsContext', () => {
  it('returns an empty string when nothing has been drafted yet', () => {
    expect(buildPriorSectionsContext({}, 'scope')).toBe('');
    expect(buildPriorSectionsContext(undefined, 'scope')).toBe('');
  });

  it('excludes the current section but includes other drafted sections', () => {
    const store = { introduction: 'Hello there.', scope: 'Should not appear.' };
    const result = buildPriorSectionsContext(store, 'scope');
    expect(result).toContain('[introduction]');
    expect(result).toContain('Hello there.');
    expect(result).not.toContain('[scope]');
  });
});

describe('isOverBudget', () => {
  it('is false for a section with no configured budget', () => {
    expect(isOverBudget('unknown_section', 'a'.repeat(10000))).toBe(false);
  });

  it('is false for content within budget', () => {
    expect(isOverBudget('introduction', 'A short intro of a few words.')).toBe(false);
  });

  it('is true when word count is well past the budget', () => {
    const longText = new Array(200).fill('word').join(' ');
    expect(isOverBudget('introduction', longText)).toBe(true);
  });

  it('is true when bullet count exceeds the max', () => {
    const manyBullets = new Array(10).fill('• item').join('\n');
    expect(isOverBudget('next_steps', manyBullets)).toBe(true);
  });
});

describe('draftSection', () => {
  const baseToolContext = () => ({
    trade: 'electrician',
    tone: 'professional',
    jobDescription: 'Replace consumer unit.',
    sectionStore: {},
  });

  it('drafts a section in a single call when within budget', async () => {
    createMessage.mockResolvedValueOnce(textResponse('A short, on-budget introduction.'));

    const toolContext = baseToolContext();
    const result = await draftSection({ section: 'introduction' }, toolContext);

    expect(createMessage).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('drafted');
    expect(toolContext.sectionStore.introduction).toBe('A short, on-budget introduction.');
  });

  it('retries exactly once when the draft is far over budget', async () => {
    const overBudget = new Array(200).fill('word').join(' ');
    createMessage
      .mockResolvedValueOnce(textResponse(overBudget))
      .mockResolvedValueOnce(textResponse('A tightened introduction.'));

    const toolContext = baseToolContext();
    const result = await draftSection({ section: 'introduction' }, toolContext);

    expect(createMessage).toHaveBeenCalledTimes(2);
    expect(toolContext.sectionStore.introduction).toBe('A tightened introduction.');
    expect(result.words).toBe(3);
  });

  it('throws when required context is missing', async () => {
    await expect(draftSection({ section: 'introduction' }, {})).rejects.toThrow(/missing required context/);
    expect(createMessage).not.toHaveBeenCalled();
  });

  it('asks for a "no materials needed" message instead of a bullet list when materials is empty', async () => {
    createMessage.mockResolvedValueOnce(
      textResponse('No materials needed at this stage\n• Professional assessment required before materials can be specified.'),
    );

    const toolContext = { ...baseToolContext(), materials: [] };
    await draftSection({ section: 'materials' }, toolContext);

    const prompt = createMessage.mock.calls[0][1].messages[0].content;
    expect(prompt).toContain('No materials needed at this stage');
    expect(prompt).not.toContain('List each material on its own line');
    expect(toolContext.sectionStore.materials).toBe(
      'No materials needed at this stage\n• Professional assessment required before materials can be specified.',
    );
  });

  it('drafts a normal bullet list when materials are present', async () => {
    createMessage.mockResolvedValueOnce(textResponse('• Consumer unit 10-way RCBO [Price TBC]'));

    const toolContext = { ...baseToolContext(), materials: [{ name: 'Consumer unit 10-way RCBO' }] };
    await draftSection({ section: 'materials' }, toolContext);

    const prompt = createMessage.mock.calls[0][1].messages[0].content;
    expect(prompt).toContain('List each material on its own line');
    expect(prompt).not.toContain('No materials needed at this stage');
  });
});
