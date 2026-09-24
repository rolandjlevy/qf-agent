import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./anthropic-client.js', () => ({
  createClient: vi.fn(() => ({})),
  createMessage: vi.fn(),
  getPhaseAModel: vi.fn(() => 'test-phase-a-model'),
}));

const { createMessage, getPhaseAModel } = await import('./anthropic-client.js');
const { proposeMaterials, MAX_CLARIFYING_QUESTIONS } = await import('./propose-materials.js');

function textResponse(text) {
  return { content: [{ type: 'text', text }] };
}

beforeEach(() => {
  createMessage.mockReset();
});

describe('proposeMaterials', () => {
  it('requires trade and jobDescription', async () => {
    await expect(proposeMaterials({ jobDescription: 'x' })).rejects.toThrow(/requires trade/);
    await expect(proposeMaterials({ trade: 'electrician' })).rejects.toThrow(/requires trade/);
  });

  it('short-circuits to empty materials, without calling the model, once a prior answer signals inspection is needed', async () => {
    const result = await proposeMaterials({
      trade: 'carpenter',
      jobDescription: 'Repair or replace a built-in wardrobe.',
      priorQuestions: [
        { question: 'What type of wardrobe work is needed?', answer: 'Repair or replace existing wardrobe' },
        { question: 'What type of structural repair is needed?', answer: 'Unsure — needs inspection first' },
      ],
    });

    expect(result).toEqual({ materials: [] });
    expect(createMessage).not.toHaveBeenCalled();
  });

  it('calls the model with PHASE_A_MODEL and returns parsed materials', async () => {
    createMessage.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          materials: [
            { label: 'Consumer unit 10-way RCBO' },
            { label: 'MCB Type B 32A', description: '2 required' },
          ],
        }),
      ),
    );

    const result = await proposeMaterials({ trade: 'electrician', jobDescription: 'Replace consumer unit.' });

    expect(result.materials).toEqual([
      { label: 'Consumer unit 10-way RCBO' },
      { label: 'MCB Type B 32A', description: '2 required' },
    ]);
    const [, params] = createMessage.mock.calls[0];
    expect(params.model).toBe('test-phase-a-model');
    expect(getPhaseAModel).toHaveBeenCalled();
  });

  it('strips markdown fences and parses the JSON object within', async () => {
    createMessage.mockResolvedValueOnce(
      textResponse('```json\n' + JSON.stringify({ materials: [{ label: 'Wood screws 4x40mm' }] }) + '\n```'),
    );

    const result = await proposeMaterials({ trade: 'builder', jobDescription: 'Fit new door.' });
    expect(result.materials).toEqual([{ label: 'Wood screws 4x40mm' }]);
  });

  it('filters out rejected labels (code-level backstop for the never-do rules)', async () => {
    createMessage.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          materials: [
            { label: 'Consumer unit 10-way RCBO' },
            { label: 'copper pipe or plastic pipe' },
            { label: 'screws, wall plugs' },
            { label: 'Skip hire 8 yard' },
            { label: 'nut' },
          ],
        }),
      ),
    );

    const result = await proposeMaterials({ trade: 'plumber', jobDescription: 'Replace bathroom suite.' });
    expect(result.materials).toEqual([{ label: 'Consumer unit 10-way RCBO' }]);
  });

  it('drops a generic/empty description rather than forcing one through', async () => {
    createMessage.mockResolvedValueOnce(
      textResponse(JSON.stringify({ materials: [{ label: 'Wood screws 4x40mm', description: '   ' }] })),
    );

    const result = await proposeMaterials({ trade: 'builder', jobDescription: 'Fit new door.' });
    expect(result.materials).toEqual([{ label: 'Wood screws 4x40mm' }]);
  });

  it('throws when the model response has no JSON object', async () => {
    createMessage.mockResolvedValueOnce(textResponse('Sorry, I cannot help with that.'));
    await expect(proposeMaterials({ trade: 'builder', jobDescription: 'Fit new door.' })).rejects.toThrow(
      /did not contain a JSON object/,
    );
  });

  it('throws when the JSON has no materials array', async () => {
    createMessage.mockResolvedValueOnce(textResponse(JSON.stringify({ foo: 'bar' })));
    await expect(proposeMaterials({ trade: 'builder', jobDescription: 'Fit new door.' })).rejects.toThrow(
      /missing a "materials" array/,
    );
  });

  it('returns a normalized clarifying question when the model asks one', async () => {
    createMessage.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          clarifying_question: {
            question: 'What type of property is this?',
            context: 'This changes which consumer unit fits.',
            choices: [{ label: 'Property type', type: 'radio', options: ['House', 'Flat'] }],
          },
        }),
      ),
    );

    const result = await proposeMaterials({ trade: 'electrician', jobDescription: 'Replace consumer unit.' });
    expect(result.clarifyingQuestion).toEqual({
      question: 'What type of property is this?',
      context: 'This changes which consumer unit fits.',
      choices: [{ label: 'Property type', type: 'radio', options: ['House', 'Flat'] }],
    });
    expect(result.materials).toBeUndefined();
  });

  it('keeps two labeled choice groups for a paired width/height dimension question', async () => {
    createMessage.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          clarifying_question: {
            question: 'What is the width and height of the wall-mounted unit being replaced?',
            context: 'Determines which standard cabinet size to specify, or whether a custom/made-to-measure unit is needed.',
            choices: [
              { label: 'Width', type: 'radio', options: ['Under 600mm', '600-900mm', '900-1200mm', 'Over 1200mm'] },
              { label: 'Height', type: 'radio', options: ['Under 600mm', '600-900mm', '900-1200mm', 'Over 1200mm'] },
            ],
          },
        }),
      ),
    );

    const result = await proposeMaterials({ trade: 'carpenter', jobDescription: 'Replace a wall-mounted wardrobe unit.' });
    expect(result.clarifyingQuestion.choices).toEqual([
      { label: 'Width', type: 'radio', options: ['Under 600mm', '600-900mm', '900-1200mm', 'Over 1200mm'] },
      { label: 'Height', type: 'radio', options: ['Under 600mm', '600-900mm', '900-1200mm', 'Over 1200mm'] },
    ]);
    expect(result.clarifyingQuestion.context).toBe(
      'Determines which standard cabinet size to specify, or whether a custom/made-to-measure unit is needed.',
    );
  });

  it('falls back to the first entry when the model drifts to a plural "clarifying_questions" array', async () => {
    createMessage.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          clarifying_questions: [{ question: 'Boiler fuel type?' }, { question: 'Flue type?' }],
        }),
      ),
    );

    const result = await proposeMaterials({ trade: 'plumber', jobDescription: 'Replace the boiler.' });
    expect(result.clarifyingQuestion).toEqual({ question: 'Boiler fuel type?' });
  });

  it('drops a malformed choices group from a clarifying question but keeps the question', async () => {
    createMessage.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          clarifying_question: {
            question: 'What type of property is this?',
            choices: [{ type: 'radio', options: ['House'] }], // only 1 option — invalid
          },
        }),
      ),
    );

    const result = await proposeMaterials({ trade: 'electrician', jobDescription: 'Replace consumer unit.' });
    expect(result.clarifyingQuestion).toEqual({ question: 'What type of property is this?' });
  });

  it('drops context that substantially repeats the choice options (code-level backstop)', async () => {
    createMessage.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          clarifying_question: {
            question: 'What type of tap is leaking?',
            context: 'Different tap types (kitchen sink, bathroom basin, bath/shower mixer, etc.) require different replacement parts.',
            choices: [
              {
                type: 'radio',
                options: ['Kitchen sink tap', 'Bathroom basin tap', 'Bath or shower mixer tap', 'Outdoor garden tap'],
              },
            ],
          },
        }),
      ),
    );

    const result = await proposeMaterials({ trade: 'plumber', jobDescription: 'Fix a leaky tap.' });
    expect(result.clarifyingQuestion.context).toBeUndefined();
    expect(result.clarifyingQuestion.question).toBe('What type of tap is leaking?');
  });

  it('keeps context that shares only incidental domain vocabulary with the choice options, not the options themselves', async () => {
    createMessage.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          clarifying_question: {
            question: 'What type of light switch is being replaced?',
            context: 'This affects which replacement switch mechanism is compatible.',
            choices: [{ type: 'radio', options: ['Dimmer switch', 'Smart switch'] }],
          },
        }),
      ),
    );

    const result = await proposeMaterials({ trade: 'electrician', jobDescription: 'Replace a light switch.' });
    expect(result.clarifyingQuestion.context).toBe('This affects which replacement switch mechanism is compatible.');
  });

  it('keeps context whose words overlap an option only non-adjacently — real rationale, not the option restated', async () => {
    createMessage.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          clarifying_question: {
            question: 'Is this lock being fitted to an existing door that already has a hole prepared for a cylinder lock, or does the door need to be drilled/prepared first?',
            context: 'Affects whether drilling and hole-preparation materials are needed, or just the lock mechanism itself.',
            choices: [{ type: 'radio', options: ['Hole already prepared', 'Needs drilling/preparation'] }],
          },
        }),
      ),
    );

    const result = await proposeMaterials({ trade: 'carpenter', jobDescription: 'Fit a new door lock.' });
    expect(result.clarifyingQuestion.context).toBe(
      'Affects whether drilling and hole-preparation materials are needed, or just the lock mechanism itself.',
    );
    expect(result.clarifyingQuestion.choices).toEqual([
      { type: 'radio', options: ['Hole already prepared', 'Needs drilling/preparation'] },
    ]);
  });

  it('throws if a clarifying question has no usable question text', async () => {
    createMessage.mockResolvedValueOnce(textResponse(JSON.stringify({ clarifying_question: { question: '   ' } })));
    await expect(proposeMaterials({ trade: 'electrician', jobDescription: 'Replace consumer unit.' })).rejects.toThrow(
      /no usable question text/,
    );
  });

  it('includes prior Q&A in the prompt and still allows asking another question under the cap', async () => {
    createMessage.mockResolvedValueOnce(
      textResponse(JSON.stringify({ clarifying_question: { question: 'Boiler type?' } })),
    );

    const priorQuestions = [{ question: 'What type of property is this?', answer: 'House' }];
    const result = await proposeMaterials({ trade: 'plumber', jobDescription: 'Replace boiler.', priorQuestions });

    expect(result.clarifyingQuestion.question).toBe('Boiler type?');
    const [, params] = createMessage.mock.calls[0];
    expect(params.messages[0].content).toContain('What type of property is this?');
    expect(params.messages[0].content).toContain('House');
  });

  it('forces a final materials list once the question cap is reached, ignoring any further question', async () => {
    const priorQuestions = Array.from({ length: MAX_CLARIFYING_QUESTIONS }, (_, i) => ({
      question: `Q${i}`,
      answer: `A${i}`,
    }));

    createMessage.mockResolvedValueOnce(
      textResponse(JSON.stringify({ clarifying_question: { question: 'One more?' } })),
    );
    await expect(
      proposeMaterials({ trade: 'plumber', jobDescription: 'Replace boiler.', priorQuestions }),
    ).rejects.toThrow(/reaching the limit/);

    createMessage.mockResolvedValueOnce(
      textResponse(JSON.stringify({ materials: [{ label: 'Combi boiler 30kW' }] })),
    );
    const result = await proposeMaterials({ trade: 'plumber', jobDescription: 'Replace boiler.', priorQuestions });
    expect(result.materials).toEqual([{ label: 'Combi boiler 30kW' }]);

    const [, params] = createMessage.mock.calls[1];
    expect(params.messages[0].content).toContain('already asked the maximum number');
  });
});
