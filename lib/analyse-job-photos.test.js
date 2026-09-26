import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./anthropic-client.js', () => ({
  createClient: vi.fn(() => ({})),
  createMessage: vi.fn(),
  getPhotoAnalysisModel: vi.fn(() => 'test-photo-model'),
}));

const { createMessage } = await import('./anthropic-client.js');
const { analyseJobPhotos, isJudgementClaim, MAX_JOB_PHOTOS } = await import('./analyse-job-photos.js');

function textResponse(text) {
  return { content: [{ type: 'text', text }] };
}

function jsonResponse(obj) {
  return textResponse(JSON.stringify(obj));
}

const image = { data: 'aGVsbG8=', mediaType: 'image/jpeg' };
const sitePhoto = [{ imageIndex: 1, kind: 'site' }];
const base = { trade: 'electrician', jobDescription: 'Old fusebox needs swapping for a new consumer unit.' };
// No key questions for this trade, so "unclear" holds only what the model returned.
const noKeys = { trade: 'unknown-trade', jobDescription: 'Old fusebox needs swapping for a new consumer unit.' };

beforeEach(() => {
  createMessage.mockReset();
});

describe('analyseJobPhotos input validation', () => {
  it('requires trade and jobDescription', async () => {
    await expect(analyseJobPhotos({ jobDescription: 'x', images: [image] })).rejects.toThrow(/requires trade/);
    await expect(analyseJobPhotos({ trade: 'electrician', images: [image] })).rejects.toThrow(/requires trade/);
  });

  it('requires 1 to MAX_JOB_PHOTOS images', async () => {
    await expect(analyseJobPhotos({ ...base, images: [] })).rejects.toThrow(/at least one image/);
    const tooMany = Array.from({ length: MAX_JOB_PHOTOS + 1 }, () => image);
    await expect(analyseJobPhotos({ ...base, images: tooMany })).rejects.toThrow(/at most/);
  });

  it('rejects unsupported media types and empty data', async () => {
    await expect(analyseJobPhotos({ ...base, images: [{ data: 'x', mediaType: 'image/heic' }] })).rejects.toThrow(/unsupported media type/);
    await expect(analyseJobPhotos({ ...base, images: [{ data: '', mediaType: 'image/jpeg' }] })).rejects.toThrow(/no data/);
    expect(createMessage).not.toHaveBeenCalled();
  });
});

describe('analyseJobPhotos request', () => {
  it('labels each image, puts instructions after the images, and wraps the job description', async () => {
    createMessage.mockResolvedValueOnce(jsonResponse({ observations: [], resolved: [], unclear: [] }));

    await analyseJobPhotos({ ...base, images: [image, { data: 'd29ybGQ=', mediaType: 'image/png' }] });

    const [, params] = createMessage.mock.calls[0];
    expect(params.model).toBe('test-photo-model');
    const content = params.messages[0].content;
    expect(content.map((b) => b.type)).toEqual(['text', 'image', 'text', 'image', 'text']);
    expect(content[0].text).toBe('Image 1:');
    expect(content[3].source).toEqual({ type: 'base64', media_type: 'image/png', data: 'd29ybGQ=' });
    expect(content[4].text).toContain('<job_description>\nOld fusebox');
    expect(content[4].text).toContain('consumer unit/fuse box type');
    expect(params.system).toMatch(/Claim regulatory compliance/);
  });

  it('falls back to generic guidance for a trade without its own focus list', async () => {
    createMessage.mockResolvedValueOnce(jsonResponse({ observations: [] }));
    await analyseJobPhotos({ trade: 'unknown-trade', jobDescription: 'x', images: [image] });
    expect(createMessage.mock.calls[0][1].messages[0].content.at(-1).text).toContain('the existing installation or area');
  });

  it('passes the abort signal through to createMessage', async () => {
    createMessage.mockResolvedValueOnce(jsonResponse({ observations: [] }));
    const signal = new AbortController().signal;
    await analyseJobPhotos({ ...base, images: [image], signal });
    expect(createMessage.mock.calls[0][2]).toEqual({ signal });
  });
});

describe('analyseJobPhotos response handling', () => {
  it('returns normalized observations, resolved topics and unclear questions', async () => {
    createMessage.mockResolvedValueOnce(
      jsonResponse({
        photos: sitePhoto,
        observations: [{ imageIndex: 1, observation: '  Wylex fuse box with 6 rewireable fuses  ', confidence: 'high' }],
        resolved: ['existing consumer unit type', ''],
        unclear: [
          { topic: ' earthing arrangement ', question: 'How is the supply earthed?', options: ['TN-C-S', ' TT ', 'Other', 'not sure', 7] },
          42,
          { question: 'No topic, so dropped' },
        ],
      }),
    );

    const result = await analyseJobPhotos({ ...noKeys, images: [image] });
    expect(result).toEqual({
      photos: sitePhoto,
      observations: [{ imageIndex: 1, observation: 'Wylex fuse box with 6 rewireable fuses', confidence: 'high' }],
      resolved: ['existing consumer unit type'],
      unclear: [{ topic: 'earthing arrangement', question: 'How is the supply earthed?', options: ['TN-C-S', 'TT'] }],
    });
  });

  it('parses JSON wrapped in fences or preceded by a preamble', async () => {
    const body = JSON.stringify({ observations: [{ imageIndex: 1, observation: 'Combi boiler on kitchen wall', confidence: 'medium' }] });
    createMessage.mockResolvedValueOnce(textResponse('Here is the analysis:\n```json\n' + body + '\n```'));
    const result = await analyseJobPhotos({ ...base, images: [image] });
    expect(result.observations).toHaveLength(1);
  });

  it('drops observations citing an image that does not exist, and defaults bad confidence to low', async () => {
    createMessage.mockResolvedValueOnce(
      jsonResponse({
        observations: [
          { imageIndex: 3, observation: 'Out of range' },
          { imageIndex: 0, observation: 'Zero index' },
          { imageIndex: 'two', observation: 'Not a number' },
          { imageIndex: 2, observation: 'Slate roof', confidence: 'certain' },
        ],
      }),
    );
    const result = await analyseJobPhotos({ ...base, images: [image, image] });
    expect(result.observations).toEqual([{ imageIndex: 2, observation: 'Slate roof', confidence: 'low' }]);
  });

  it('filters compliance, safety and asbestos judgements from observations and resolved topics', async () => {
    createMessage.mockResolvedValueOnce(
      jsonResponse({
        photos: sitePhoto,
        observations: [
          { imageIndex: 1, observation: 'Board is not BS 7671 compliant', confidence: 'high' },
          { imageIndex: 1, observation: 'Installation looks unsafe', confidence: 'high' },
          { imageIndex: 1, observation: 'Artex ceiling likely contains asbestos', confidence: 'medium' },
          { imageIndex: 1, observation: 'Textured artex-style coating on the ceiling', confidence: 'high' },
        ],
        resolved: ['ceiling finish', 'Part P status'],
        unclear: [{ topic: 'asbestos testing', question: 'Has the textured coating been tested for asbestos?', options: ['Tested, clear', 'Not tested'] }],
      }),
    );
    const result = await analyseJobPhotos({ trade: 'plasterer', jobDescription: 'Skim artexed ceilings', images: [image] });
    expect(result.observations.map((o) => o.observation)).toEqual(['Textured artex-style coating on the ceiling']);
    expect(result.resolved).toEqual(['ceiling finish']);
    // "unclear" topics are questions to ask, not claims, so asbestos testing can be raised there.
    expect(result.unclear.at(-1).question).toBe('Has the textured coating been tested for asbestos?');
  });

  it('returns no resolved topics when no observation survives', async () => {
    createMessage.mockResolvedValueOnce(
      jsonResponse({ photos: sitePhoto, observations: [{ imageIndex: 1, observation: 'Gas Safe registered install' }], resolved: ['boiler type'], unclear: [] }),
    );
    const result = await analyseJobPhotos({ ...noKeys, images: [image] });
    expect(result).toEqual({ photos: sitePhoto, observations: [], resolved: [], unclear: [] });
  });

  it('never resolves topics from reference photos, and drops observations from irrelevant ones', async () => {
    createMessage.mockResolvedValueOnce(
      jsonResponse({
        photos: [{ imageIndex: 1, kind: 'reference' }, { imageIndex: 2, kind: 'irrelevant' }],
        observations: [
          { imageIndex: 1, observation: 'Cream porcelain slabs in brick bond', confidence: 'high' },
          { imageIndex: 2, observation: 'A dog on a sofa', confidence: 'high' },
        ],
        resolved: ['desired patio finish'],
      }),
    );
    const result = await analyseJobPhotos({ ...base, images: [image, image] });
    expect(result.observations.map((o) => o.observation)).toEqual(['Cream porcelain slabs in brick bond']);
    expect(result.resolved).toEqual([]);
  });

  it('treats an unclassified or wrongly classified photo as reference', async () => {
    createMessage.mockResolvedValueOnce(
      jsonResponse({
        photos: [{ imageIndex: 2, kind: 'site' }, { imageIndex: 1, kind: 'before' }],
        observations: [{ imageIndex: 1, observation: 'Slate roof', confidence: 'high' }],
        resolved: ['roof covering'],
      }),
    );
    const result = await analyseJobPhotos({ ...base, images: [image, image] });
    expect(result.photos).toEqual([{ imageIndex: 1, kind: 'reference' }, { imageIndex: 2, kind: 'site' }]);
    expect(result.resolved).toEqual([]);
  });

  it('caps observations, resolved topics and extra questions even when the model returns more', async () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ imageIndex: 1, observation: `Fact ${i}`, confidence: 'high' }));
    const topics = Array.from({ length: 10 }, (_, i) => `topic ${i}`);
    createMessage.mockResolvedValueOnce(jsonResponse({ photos: sitePhoto, observations: many, resolved: topics, unclear: topics }));
    const result = await analyseJobPhotos({ ...noKeys, images: [image] });
    expect(result.observations).toHaveLength(10);
    expect(result.observations[0].observation).toBe('Fact 0');
    expect(result.resolved).toHaveLength(6);
    expect(result.unclear).toEqual(topics.slice(0, 3).map((t) => ({ topic: t, question: t, options: [] })));
  });

  it('caps each question to 5 options', async () => {
    const options = Array.from({ length: 8 }, (_, i) => `Option ${i}`);
    createMessage.mockResolvedValueOnce(jsonResponse({ photos: sitePhoto, observations: [], unclear: [{ topic: 't', question: 'q?', options }] }));
    const result = await analyseJobPhotos({ ...noKeys, images: [image] });
    expect(result.unclear[0].options).toEqual(options.slice(0, 5));
  });

  it('returns the trade key questions first, flagging those site photos answer and dropping those that do not apply', async () => {
    createMessage.mockResolvedValueOnce(
      jsonResponse({
        photos: sitePhoto,
        observations: [{ imageIndex: 1, observation: 'Bare blockwork walls', confidence: 'high' }],
        resolved: ['wall type'],
        keyAnswered: ['existing surface', 'not a key topic'],
        keyNotApplicable: ['who supplies materials'],
        unclear: [
          { topic: 'finish required', question: 'Duplicate of a key question?', options: ['a', 'b'] },
          { topic: 'rooflight reveals', question: 'Are the rooflight reveals being boarded?', options: ['Yes', 'No'] },
        ],
      }),
    );
    const result = await analyseJobPhotos({ trade: 'plasterer', jobDescription: 'Board a loft', images: [image] });
    expect(result.unclear.map((q) => [q.topic, q.answeredByPhotos])).toEqual([
      ['approximate area', false],
      ['finish required', false],
      ['existing surface', true],
      ['rooflight reveals', undefined],
    ]);
    expect(result.resolved).toEqual(['wall type', 'existing surface']);
    const prompt = createMessage.mock.calls[0][1].messages[0].content.at(-1).text;
    expect(prompt).toContain('<key_questions>');
    expect(prompt).toContain('- finish required: What finish is needed?');
  });

  it('never marks a key question answered without a surviving site observation', async () => {
    createMessage.mockResolvedValueOnce(
      jsonResponse({
        photos: [{ imageIndex: 1, kind: 'reference' }],
        observations: [{ imageIndex: 1, observation: 'Smooth skimmed wall', confidence: 'high' }],
        keyAnswered: ['finish required'],
      }),
    );
    const result = await analyseJobPhotos({ trade: 'plasterer', jobDescription: 'Skim a wall', images: [image] });
    expect(result.unclear.every((q) => !q.answeredByPhotos)).toBe(true);
    expect(result.resolved).toEqual([]);
  });

  it('throws on a response with no JSON object, or unparseable JSON', async () => {
    createMessage.mockResolvedValueOnce(textResponse('I cannot see any photos.'));
    await expect(analyseJobPhotos({ ...base, images: [image] })).rejects.toThrow(/did not contain a JSON object/);
    createMessage.mockResolvedValueOnce(textResponse('{ observations: nope }'));
    await expect(analyseJobPhotos({ ...base, images: [image] })).rejects.toThrow(/could not parse/);
  });
});

describe('isJudgementClaim', () => {
  it('flags compliance and safety wording but not plain descriptions', () => {
    expect(isJudgementClaim('Not Part P notified')).toBe(true);
    expect(isJudgementClaim('Flue does not meet building regs')).toBe(true);
    expect(isJudgementClaim('Non-compliant earthing')).toBe(true);
    expect(isJudgementClaim('Rewireable fuses visible, no RCD')).toBe(false);
    expect(isJudgementClaim('Worcester Greenstar 30i combi boiler')).toBe(false);
  });
});
