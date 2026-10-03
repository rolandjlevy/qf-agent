import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPublicPath, isValidSession, passwordMatches, safeNextPath, sessionToken } from './auth.js';

afterEach(() => vi.unstubAllEnvs());

describe('with a password set', () => {
  it('accepts only the right password', async () => {
    vi.stubEnv('APP_PASSWORD', 'correct horse');
    expect(await passwordMatches('correct horse')).toBe(true);
    expect(await passwordMatches('correct hors')).toBe(false);
    expect(await passwordMatches('')).toBe(false);
    expect(await passwordMatches(null)).toBe(false);
  });

  it('accepts only the current session token', async () => {
    vi.stubEnv('APP_PASSWORD', 'correct horse');
    const token = await sessionToken();
    expect(await isValidSession(token)).toBe(true);
    expect(await isValidSession(undefined)).toBe(false);
    expect(await isValidSession(token.slice(0, -1) + (token.endsWith('0') ? '1' : '0'))).toBe(false);
    vi.stubEnv('APP_PASSWORD', 'new password');
    expect(await isValidSession(token)).toBe(false);
  });
});

describe('with no password set', () => {
  it('lets every session through and no password in', async () => {
    vi.stubEnv('APP_PASSWORD', '');
    expect(await isValidSession(undefined)).toBe(true);
    expect(await passwordMatches('anything')).toBe(false);
  });
});

describe('isPublicPath', () => {
  it('keeps the marketing pages and example quotes public', () => {
    for (const path of ['/', '/pricing', '/login', '/quote/example/plumber']) expect(isPublicPath(path)).toBe(true);
    for (const path of ['/quote/new', '/quotes', '/quote/42', '/profile', '/api/quote', '/internal/example-photos', '/quote/examples'])
      expect(isPublicPath(path)).toBe(false);
  });
});

describe('safeNextPath', () => {
  it('allows paths on this site only', () => {
    expect(safeNextPath('/quotes?x=1')).toBe('/quotes?x=1');
    expect(safeNextPath('//evil.com')).toBe('/quote/new');
    expect(safeNextPath('/\\evil.com')).toBe('/quote/new');
    expect(safeNextPath('https://evil.com')).toBe('/quote/new');
    expect(safeNextPath(undefined)).toBe('/quote/new');
  });
});
