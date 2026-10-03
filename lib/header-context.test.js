import { describe, expect, it } from 'vitest';
import { headerContext, isNewQuotePath, isQuotesPath } from './header-context.js';

describe('headerContext', () => {
  it('uses the marketing header on the homepage, pricing page and new quote page', () => {
    expect(headerContext('/')).toBe('marketing');
    expect(headerContext('/pricing')).toBe('marketing');
    expect(headerContext('/login')).toBe('marketing');
    expect(headerContext('/quote/new')).toBe('marketing');
    expect(headerContext('/quotes')).toBe('app');
  });

  it('treats the example quotes as the focused flow', () => {
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

describe('isNewQuotePath', () => {
  it('matches only the new quote page', () => {
    expect(isNewQuotePath('/quote/new')).toBe(true);
    expect(isNewQuotePath('/quote/newest')).toBe(false);
    expect(isNewQuotePath('/quote/42')).toBe(false);
    expect(isNewQuotePath('/')).toBe(false);
  });
});
