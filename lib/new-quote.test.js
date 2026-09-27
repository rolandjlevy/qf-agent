import { describe, expect, it } from 'vitest';
import { acceptPhotoFiles, continueState, quoteTitle } from './new-quote.js';

const img = (name) => ({ name, type: 'image/jpeg' });

describe('acceptPhotoFiles', () => {
  it('accepts everything under the limit', () => {
    const files = [img('a'), img('b')];
    expect(acceptPhotoFiles(files, 3, 8)).toEqual({ accepted: files, message: null });
  });

  it('refuses files past the limit with a count', () => {
    const { accepted, message } = acceptPhotoFiles([img('a'), img('b'), img('c')], 7, 8);
    expect(accepted.map((f) => f.name)).toEqual(['a']);
    expect(message).toBe("You can add up to 8 photos, so 2 weren't added.");
  });

  it('refuses a 9th photo', () => {
    const { accepted, message } = acceptPhotoFiles([img('ninth')], 8, 8);
    expect(accepted).toEqual([]);
    expect(message).toBe("You can add up to 8 photos, so 1 wasn't added.");
  });

  it('skips files that are not images', () => {
    const { accepted, message } = acceptPhotoFiles([img('a'), { name: 'b.pdf', type: 'application/pdf' }], 0, 8);
    expect(accepted.map((f) => f.name)).toEqual(['a']);
    expect(message).toBe('Only photos can be added here.');
  });
});

describe('continueState', () => {
  const ready = { status: 'ready' };
  const base = { description: '', photos: [], trade: 'plumber' };

  it('needs a description or a photo', () => {
    expect(continueState(base)).toEqual({ enabled: false, reason: 'Add a description or photo to continue' });
    expect(continueState({ ...base, description: '   ' }).enabled).toBe(false);
    expect(continueState({ ...base, description: 'Fix tap' }).enabled).toBe(true);
    expect(continueState({ ...base, photos: [ready] }).enabled).toBe(true);
  });

  it('does not count a failed photo', () => {
    expect(continueState({ ...base, photos: [{ status: 'failed' }] }).enabled).toBe(false);
  });

  it('waits for photos still uploading', () => {
    const state = continueState({ ...base, description: 'Fix tap', photos: [ready, { status: 'uploading' }] });
    expect(state).toEqual({ enabled: false, reason: 'Uploading photos…' });
  });

  it('needs a trade', () => {
    expect(continueState({ ...base, description: 'Fix tap', trade: null })).toEqual({
      enabled: false,
      reason: 'Choose a trade to continue',
    });
  });
});

describe('quoteTitle', () => {
  it('uses the first sentence without its full stop', () => {
    expect(quoteTitle('Replace 8 fence panels. Concrete posts are fine.')).toBe('Replace 8 fence panels');
  });

  it('cuts a long sentence at a word, with an ellipsis', () => {
    const title = quoteTitle(
      'Remove the old kitchen and fit a new one supplied by the customer: 10 units, laminate worktops, sink and oven.',
    );
    expect(title).toBe('Remove the old kitchen and fit a new one supplied by the…');
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it('collapses whitespace and copes with nothing', () => {
    expect(quoteTitle('  Fix\n the   tap  ')).toBe('Fix the tap');
    expect(quoteTitle('')).toBe('');
    expect(quoteTitle(null)).toBe('');
  });
});
