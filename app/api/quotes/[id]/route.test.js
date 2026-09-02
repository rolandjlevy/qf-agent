import { describe, it, expect, beforeEach, vi } from 'vitest';
import { writeFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

vi.resetModules();

const { GET } = await import('./route.js');
const { getDb, insertGeneratedQuote } = await import('../../../../lib/db.js');

beforeEach(async () => {
  const db = await getDb();
  await db.query('DELETE FROM generated_quotes');
});

function paramsFor(id) {
  return { params: Promise.resolve({ id }) };
}

describe('/api/quotes/[id]', () => {
  it('returns 404 for a missing id', async () => {
    const res = await GET(null, paramsFor('999'));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({ error: true, message: 'Quote not found' });
  });

  it('returns the row plus file content for an existing quote', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'qf-test-'));
    const filePath = join(dir, 'quote.md');
    writeFileSync(filePath, 'QUOTE CONTENT');

    const id = await insertGeneratedQuote({ job_description: 'job', output_path: filePath, tool_call_log: [] });

    const res = await GET(null, paramsFor(String(id)));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.quote.job_description).toBe('job');
    expect(json.quote.content).toBe('QUOTE CONTENT');
  });

  it('returns content: null (not an error) when the file is missing on disk', async () => {
    const id = await insertGeneratedQuote({ job_description: 'job', output_path: '/nonexistent/path.md', tool_call_log: [] });

    const res = await GET(null, paramsFor(String(id)));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.quote.content).toBeNull();
  });
});
