import { describe, it, expect, beforeEach, vi } from 'vitest';

process.env.QF_DB_PATH = ':memory:';
vi.resetModules();

const { GET, POST } = await import('./route.js');
const { getDb } = await import('../../../lib/db.js');

beforeEach(() => {
  getDb().prepare('DELETE FROM trader_profile').run();
});

function postRequest(body) {
  return new Request('http://localhost/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/profile', () => {
  it('GET returns { profile: null } when empty', async () => {
    const res = await GET();
    const json = await res.json();
    expect(json).toEqual({ profile: null });
  });

  it('GET returns the saved row after a POST', async () => {
    await POST(postRequest({ business_name: 'Acme Ltd', hourly_rate: 45 }));

    const res = await GET();
    const json = await res.json();
    expect(json.profile.business_name).toBe('Acme Ltd');
    expect(json.profile.hourly_rate).toBe(45);
  });

  it('POST rejects a non-numeric hourly_rate with 400', async () => {
    const res = await POST(postRequest({ business_name: 'Acme', hourly_rate: 'lots' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ error: true, message: 'hourly_rate must be a number' });
  });

  it('GET returns 500 with a structured error if the DB throws', async () => {
    vi.spyOn(getDb(), 'prepare').mockImplementation(() => {
      throw new Error('disk is full');
    });

    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: true, message: 'disk is full' });

    vi.restoreAllMocks();
  });
});
