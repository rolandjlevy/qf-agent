import { describe, it, expect, beforeEach, vi } from 'vitest';

process.env.QF_DB_PATH = ':memory:';
vi.resetModules();

const { GET } = await import('./route.js');
const { getDb, insertGeneratedQuote } = await import('../../../lib/db.js');

beforeEach(() => {
  getDb().prepare('DELETE FROM generated_quotes').run();
});

describe('/api/quotes', () => {
  it('returns an empty list when there are no quotes', async () => {
    const res = await GET();
    const json = await res.json();
    expect(json.quotes).toEqual([]);
  });

  it('returns all rows ordered by generated_at DESC', async () => {
    insertGeneratedQuote({ job_description: 'first', output_path: '/a.md', tool_call_log: [] });
    await new Promise((r) => setTimeout(r, 5));
    insertGeneratedQuote({ job_description: 'second', output_path: '/b.md', tool_call_log: [] });

    const res = await GET();
    const json = await res.json();
    expect(json.quotes.map((q) => q.job_description)).toEqual(['second', 'first']);
  });
});
