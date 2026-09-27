import { describe, expect, it } from 'vitest';
import { acceptPhotoFiles } from './new-quote.js';

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
