import { afterEach, describe, expect, it, vi } from 'vitest';

const limit = vi.fn();
vi.mock('@upstash/ratelimit', () => {
  class Ratelimit {
    static slidingWindow = vi.fn(() => 'sliding');
    limit = limit;
  }
  return { Ratelimit };
});
vi.mock('@upstash/redis', () => ({ Redis: class {} }));

// A fresh module per test, since the Redis client is created once from the env vars.
async function load(env) {
  vi.resetModules();
  vi.stubEnv('KV_REST_API_URL', env ? 'https://example.upstash.io' : '');
  vi.stubEnv('KV_REST_API_TOKEN', env ? 'token' : '');
  return import('./rate-limit.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
  limit.mockReset();
});

describe('createMemoryRateLimiter', () => {
  it('limits each IP separately within the window', async () => {
    const { createMemoryRateLimiter } = await load(false);
    const limited = createMemoryRateLimiter({ windowMs: 1000, max: 2 });
    expect(limited('a', 0)).toBe(false);
    expect(limited('a', 10)).toBe(false);
    expect(limited('a', 20)).toBe(true);
    expect(limited('b', 20)).toBe(false);
    expect(limited('a', 1500)).toBe(false);
  });
});

describe('createRateLimiter', () => {
  it('uses Redis when configured', async () => {
    const { createRateLimiter } = await load(true);
    const isLimited = createRateLimiter({ prefix: 't', max: 1, windowSeconds: 60 });
    limit.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false });
    expect(await isLimited('1.2.3.4')).toBe(false);
    expect(await isLimited('1.2.3.4')).toBe(true);
    expect(limit).toHaveBeenCalledWith('1.2.3.4');
  });

  it('lets the request through when Redis fails', async () => {
    const { createRateLimiter } = await load(true);
    const isLimited = createRateLimiter({ prefix: 't', max: 1, windowSeconds: 60 });
    limit.mockRejectedValue(new Error('quota exceeded'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await isLimited('1.2.3.4')).toBe(false);
  });

  it('falls back to memory without Redis credentials', async () => {
    const { createRateLimiter } = await load(false);
    const isLimited = createRateLimiter({ prefix: 't', max: 1, windowSeconds: 60 });
    expect(await isLimited('ip')).toBe(false);
    expect(await isLimited('ip')).toBe(true);
    expect(limit).not.toHaveBeenCalled();
  });
});
