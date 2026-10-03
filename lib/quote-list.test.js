import { describe, expect, it } from 'vitest';
import { QUOTES_PAGE_SIZE, quotesToShow } from './quote-list.js';

describe('quotesToShow', () => {
  it('defaults to one page and ignores junk', () => {
    for (const raw of [undefined, '', 'abc', '-5', '0', '12']) expect(quotesToShow(raw)).toBe(QUOTES_PAGE_SIZE);
  });

  it('rounds up to whole pages and caps the total', () => {
    expect(quotesToShow('60')).toBe(60);
    expect(quotesToShow('61')).toBe(90);
    expect(quotesToShow('999999')).toBe(1000);
  });
});
