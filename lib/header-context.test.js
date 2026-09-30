import { describe, expect, it } from 'vitest';
import { headerContext, isQuotesPath } from './header-context.js';

describe('headerContext', () => {
  it('uses the marketing header on the homepage and pricing page only', () => {
    expect(headerContext('/')).toBe('marketing');
    expect(headerContext('/pricing')).toBe('marketing');
    expect(headerContext('/quotes')).toBe('app');
  });

  it('treats making a quote as the focused flow', () => {
    expect(headerContext('/quote/new')).toBe('flow');
    expect(headerContext('/quote/example/plumber')).toBe('flow');
    expect(headerContext('/quote/newest')).toBe('app');
  });

  it('uses the app header for saved quotes and the profile', () => {
    expect(headerContext('/quote/42')).toBe('app');
    expect(headerContext('/profile')).toBe('app');
  });
});

describe('isQuotesPath', () => {
  it('covers the list and saved quotes, not new or example quotes', () => {
    expect(isQuotesPath('/quotes')).toBe(true);
    expect(isQuotesPath('/quote/42')).toBe(true);
    expect(isQuotesPath('/quote/new')).toBe(false);
    expect(isQuotesPath('/quote/example/plumber')).toBe(false);
    expect(isQuotesPath('/profile')).toBe(false);
  });
});
