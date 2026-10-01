import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/anthropic-client.js', () => ({
  createClient: vi.fn(() => ({})),
  createMessage: vi.fn(),
  getModel: vi.fn(() => 'test-model'),
}));

const { createMessage } = await import('../lib/anthropic-client.js');
const { draftSection, buildPriorSectionsContext, isOverBudget, formatFollowUpAnswers } = await import('./draft-section.js');

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

  it('asks once for a rewrite when a draft makes a compliance claim', async () => {
    createMessage
      .mockResolvedValueOnce(textResponse('• Remedial work to wiring found to be non-compliant\n• Decorating'))
      .mockResolvedValueOnce(textResponse('• Remedial work to damaged existing wiring\n• Decorating'));
    const toolContext = { trade: 'electrician', tone: 'professional', jobDescription: 'Add sockets.', sectionStore: {} };
    await draftSection({ section: 'exclusions' }, toolContext);
    expect(createMessage).toHaveBeenCalledTimes(2);
    expect(toolContext.sectionStore.exclusions).toBe('• Remedial work to damaged existing wiring\n• Decorating');
  });

  it('cuts the offending bullet in code if the rewrite still makes the claim', async () => {
    createMessage
      .mockResolvedValueOnce(textResponse('• Work to Part P\n• Decorating'))
      .mockResolvedValueOnce(textResponse('• Work certified to Part P\n• Decorating'));
    const toolContext = { trade: 'electrician', tone: 'professional', jobDescription: 'Add sockets.', sectionStore: {} };
    await draftSection({ section: 'exclusions' }, toolContext);
    expect(createMessage).toHaveBeenCalledTimes(2);
    expect(toolContext.sectionStore.exclusions).toBe('• Decorating');
  });

  it("lets the trader's own certifications through without a rewrite", async () => {
    createMessage.mockResolvedValueOnce(textResponse('We are Gas Safe registered and look forward to helping.'));
    const toolContext = {
      trade: 'gas-engineer',
      tone: 'friendly',
      jobDescription: 'Service the boiler.',
      sectionStore: {},
      traderProfile: { certifications: 'Gas Safe registered' },
    };
    await draftSection({ section: 'introduction' }, toolContext);
    expect(createMessage).toHaveBeenCalledTimes(1);
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

  it.each(['scope', 'assumptions', 'exclusions'])('adds job knowledge to the %s prompt when set', async (section) => {
    createMessage.mockResolvedValueOnce(textResponse('• One point.'));
    await draftSection({ section }, { ...baseToolContext(), jobKnowledge: 'PACK GUIDANCE: isolation valves' });
    expect(createMessage.mock.calls[0][1].messages[0].content).toContain('PACK GUIDANCE: isolation valves');
  });

  it('leaves job knowledge out of other sections, and ignores any the model passes itself', async () => {
    createMessage.mockResolvedValue(textResponse('• One point.'));
    await draftSection({ section: 'next_steps' }, { ...baseToolContext(), jobKnowledge: 'PACK GUIDANCE' });
    await draftSection({ section: 'assumptions', context: { jobKnowledge: 'INJECTED' } }, baseToolContext());
    const prompts = createMessage.mock.calls.map((c) => c[1].messages[0].content);
    expect(prompts[0]).not.toContain('PACK GUIDANCE');
    expect(prompts[1]).not.toContain('INJECTED');
  });
  const answers = [{ question: 'Who is arranging scaffolding?', answer: 'Included in this quote' }];

  it.each(['scope', 'assumptions', 'exclusions'])("adds the run's follow-up answers to the %s prompt", async (section) => {
    createMessage.mockResolvedValueOnce(textResponse('• One point.'));
    await draftSection({ section }, { ...baseToolContext(), followUpAnswers: answers });
    const prompt = createMessage.mock.calls[0][1].messages[0].content;
    expect(prompt).toContain('Q: Who is arranging scaffolding?\nA: Included in this quote');
  });

  it.each(['assumptions', 'exclusions'])('tells the %s prompt never to contradict the answers', async (section) => {
    createMessage.mockResolvedValueOnce(textResponse('• One point.'));
    await draftSection({ section }, { ...baseToolContext(), followUpAnswers: answers });
    expect(createMessage.mock.calls[0][1].messages[0].content).toContain("Never contradict the trader's answers");
  });

  it("prefers the run's answers over any the model passes, and falls back to the model's", async () => {
    createMessage.mockResolvedValue(textResponse('• One point.'));
    await draftSection({ section: 'exclusions', context: { follow_up_answers: { 'Waste?': 'Customer arranges it' } } }, { ...baseToolContext(), followUpAnswers: answers });
    await draftSection({ section: 'exclusions', context: { follow_up_answers: { 'Waste?': 'Customer arranges it' } } }, baseToolContext());
    const prompts = createMessage.mock.calls.map((c) => c[1].messages[0].content);
    expect(prompts[0]).toContain('Included in this quote');
    expect(prompts[0]).not.toContain('Customer arranges it');
    expect(prompts[1]).toContain('Q: Waste?\nA: Customer arranges it');
  });

  it('leaves the answers block out when there are none', async () => {
    createMessage.mockResolvedValueOnce(textResponse('• One point.'));
    await draftSection({ section: 'assumptions' }, baseToolContext());
    expect(createMessage.mock.calls[0][1].messages[0].content).not.toContain("THE TRADER'S ANSWERS");
  });

  const findings = { observations: ['Clay plain tiles on the rear slope'], resolved: [], unclear: ['who supplies materials'] };

  it.each(['assumptions', 'exclusions'])('adds photo observations and unconfirmed points to the %s prompt', async (section) => {
    createMessage.mockResolvedValueOnce(textResponse('• One point.'));
    await draftSection({ section }, { ...baseToolContext(), photoFindings: findings });
    const prompt = createMessage.mock.calls[0][1].messages[0].content;
    expect(prompt).toContain('Clay plain tiles on the rear slope');
    expect(prompt).toContain('UNCONFIRMED POINTS');
    expect(prompt).toContain('who supplies materials');
  });

  it('gives the scope prompt the observations but not the unconfirmed points', async () => {
    createMessage.mockResolvedValueOnce(textResponse('• One point.'));
    await draftSection({ section: 'scope' }, { ...baseToolContext(), photoFindings: findings });
    const prompt = createMessage.mock.calls[0][1].messages[0].content;
    expect(prompt).toContain('Clay plain tiles on the rear slope');
    expect(prompt).not.toContain('UNCONFIRMED POINTS');
  });

  it('ignores photo findings the model passes itself', async () => {
    createMessage.mockResolvedValueOnce(textResponse('• One point.'));
    await draftSection({ section: 'assumptions', context: { photoFindings: { unclear: ['INJECTED'] } } }, baseToolContext());
    expect(createMessage.mock.calls[0][1].messages[0].content).not.toContain('INJECTED');
  });
});

describe('formatFollowUpAnswers', () => {
  it('formats Q/A pairs and skips incomplete ones', () => {
    expect(formatFollowUpAnswers([{ question: 'Q1', answer: 'A1' }, { question: 'Q2' }])).toBe('Q: Q1\nA: A1');
  });

  it('formats a plain object, and returns an empty string for nothing', () => {
    expect(formatFollowUpAnswers({ Q1: 'A1' })).toBe('Q: Q1\nA: A1');
    expect(formatFollowUpAnswers(undefined)).toBe('');
  });
});
