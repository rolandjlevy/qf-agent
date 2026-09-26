import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./anthropic-client.js', () => ({
  createClient: vi.fn(() => ({})),
  createMessage: vi.fn(),
  getPhaseAModel: vi.fn(() => 'test-phase-a-model'),
}));

const { createMessage, getPhaseAModel } = await import('./anthropic-client.js');
const { proposeMaterials, MAX_CLARIFYING_QUESTIONS, questionListsOptions } = await import('./propose-materials.js');

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

    expect(result).toEqual({ materials: [], jobType: null });
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

  it('shows key answers to the model without counting them toward the question cap', async () => {
    const keyAnswers = Array.from({ length: 4 }, (_, i) => ({ question: `Key ${i}?`, answer: `K${i}` }));
    createMessage.mockResolvedValueOnce(textResponse(JSON.stringify({ clarifying_question: { question: 'Where does it leak?' } })));
    const result = await proposeMaterials({ trade: 'plumber', jobDescription: 'Leaky tap.', keyAnswers });
    expect(result.clarifyingQuestion.question).toBe('Where does it leak?');
    const prompt = createMessage.mock.calls[0][1].messages[0].content;
    expect(prompt).toContain('Key 3?');
    expect(prompt).not.toContain('already asked the maximum number');
  });

  it('flags a question that lists two or more options, not one that only shares their topic', () => {
    const choices = (options) => [{ type: 'radio', options }];
    expect(
      questionListsOptions(
        'Is this a kitchen sink tap, bathroom basin tap, or bath/shower tap?',
        choices(['Kitchen sink tap', 'Bathroom basin tap', 'Bath/shower tap']),
      ),
    ).toBe(true);
    expect(
      questionListsOptions(
        'Does the sink have isolation valves on the water pipes under the existing tap?',
        choices(['Yes, both pipes have isolation valves', 'No isolation valves present']),
      ),
    ).toBe(false);
    expect(
      questionListsOptions(
        'Are you reusing the existing radiator valves, or fitting new thermostatic valves?',
        choices(['Reuse existing valves', 'Fit new thermostatic valves']),
      ),
    ).toBe(false);
  });

  it('cuts options listed after a dash out of the question text', async () => {
    const options = ['Quarter or half turn', 'Several full turns', 'Single lever mixer'];
    createMessage.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          clarifying_question: {
            question: 'How does the tap turn off — is it a quarter or half turn, several full turns, or a single lever mixer?',
            choices: [{ type: 'radio', options }],
          },
        }),
      ),
    );
    const result = await proposeMaterials({ trade: 'plumber', jobDescription: 'Leaky tap.' });
    expect(result.clarifyingQuestion.question).toBe('How does the tap turn off?');
  });

  it('leaves a question alone when options are listed without a clause separator', async () => {
    const question = 'Is this a single-handle tap, a two-handle tap, or a mixer tap?';
    createMessage.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          clarifying_question: { question, choices: [{ type: 'radio', options: ['Single-handle tap', 'Two-handle tap', 'Mixer tap'] }] },
        }),
      ),
    );
    const result = await proposeMaterials({ trade: 'plumber', jobDescription: 'Leaky tap.' });
    expect(result.clarifyingQuestion.question).toBe(question);
  });

  it('finishes with materials instead of re-asking a near-duplicate of an earlier question', async () => {
    const priorQuestions = [
      { question: 'Has the cistern been inspected yet, or is this the first time the fault is being looked at?', answer: 'First time' },
    ];
    createMessage.mockResolvedValueOnce(
      textResponse(
        JSON.stringify({
          clarifying_question: {
            question: 'Has the cistern been opened and inspected yet, or is this the first time the fault is being diagnosed?',
          },
        }),
      ),
    );
    createMessage.mockResolvedValueOnce(textResponse(JSON.stringify({ materials: [{ label: 'Push button flush valve' }] })));

    const result = await proposeMaterials({ trade: 'plumber', jobDescription: 'Toilet keeps running.', priorQuestions });
    expect(result.materials).toEqual([{ label: 'Push button flush valve' }]);
    expect(createMessage.mock.calls[1][1].messages[0].content).toContain('already asked the maximum number');
  });

  it('still asks a distinct follow-up question on the same job', async () => {
    const priorQuestions = [{ question: 'What is the leaking pipe made of?', answer: 'Copper' }];
    createMessage.mockResolvedValueOnce(textResponse(JSON.stringify({ clarifying_question: { question: 'What size is the pipe?' } })));
    const result = await proposeMaterials({ trade: 'plumber', jobDescription: 'Leaking pipe.', priorQuestions });
    expect(result.clarifyingQuestion.question).toBe('What size is the pipe?');
    expect(createMessage).toHaveBeenCalledTimes(1);
  });

  describe('with the trade knowledge pack enabled', () => {
    beforeEach(() => vi.stubEnv('TRADE_KNOWLEDGE', 'all'));
    afterEach(() => vi.unstubAllEnvs());

    it('adds the pack to the prompt and returns a known job_type', async () => {
      createMessage.mockResolvedValueOnce(textResponse(JSON.stringify({ job_type: 'leaking-tap', materials: [{ label: 'Tap washer 1/2"' }] })));
      const result = await proposeMaterials({ trade: 'plumber', jobDescription: 'Kitchen tap dripping.' });
      expect(result.jobType).toBe('leaking-tap');
      const prompt = createMessage.mock.calls[0][1].messages[0].content;
      expect(prompt).toContain('<trade_knowledge>');
      expect(prompt).toContain('"job_type"');
    });

    it('returns a null jobType for an unknown id or "none", including with a question', async () => {
      createMessage.mockResolvedValueOnce(textResponse(JSON.stringify({ job_type: 'made-up', materials: [] })));
      createMessage.mockResolvedValueOnce(textResponse(JSON.stringify({ job_type: 'none', clarifying_question: { question: 'What is it?' } })));
      expect((await proposeMaterials({ trade: 'plumber', jobDescription: 'Odd job.' })).jobType).toBeNull();
      expect((await proposeMaterials({ trade: 'plumber', jobDescription: 'Odd job.' })).jobType).toBeNull();
    });

    it('adds nothing for a trade without a pack', async () => {
      createMessage.mockResolvedValueOnce(textResponse(JSON.stringify({ materials: [{ label: 'MCB Type B 32A' }] })));
      await proposeMaterials({ trade: 'electrician', jobDescription: 'Add a circuit.' });
      const prompt = createMessage.mock.calls[0][1].messages[0].content;
      expect(prompt).not.toContain('<trade_knowledge>');
      expect(prompt).not.toContain('"job_type"');
    });
  });
});
