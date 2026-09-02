import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

process.env.QF_UPLOADS_DIR = mkdtempSync(join(tmpdir(), 'qf-uploads-'));

vi.mock('../../../lib/anthropic-client.js', () => ({
  createClient: vi.fn(() => ({})),
  createMessage: vi.fn(),
  getModel: vi.fn(() => 'test-model'),
}));

vi.resetModules();

const { createMessage } = await import('../../../lib/anthropic-client.js');
const { POST } = await import('./route.js');
const { getDb } = await import('../../../lib/db.js');

beforeEach(async () => {
  const db = await getDb();
  await db.query('DELETE FROM historical_quotes');
  await db.query('DELETE FROM trader_prices');
  createMessage.mockReset();
});

function extractionResponse(items) {
  return { content: [{ type: 'text', text: JSON.stringify({ items }) }] };
}

function requestWithFile(filename, content) {
  const file = new File([content], filename, { type: 'text/plain' });
  const formData = new FormData();
  formData.append('file', file);
  return new Request('http://localhost/api/import', { method: 'POST', body: formData });
}

describe('/api/import', () => {
  it('returns 400 when no file is uploaded', async () => {
    const res = await POST(new Request('http://localhost/api/import', { method: 'POST', body: new FormData() }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe(true);
  });

  it('returns 400 for an unsupported extension', async () => {
    const res = await POST(requestWithFile('quote.exe', 'binary junk'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toMatch(/Unsupported file type/);
  });

  it('imports priced items and stores them in trader_prices', async () => {
    createMessage.mockResolvedValueOnce(
      extractionResponse([{ material_name: 'Copper pipe 15mm', unit: 'm', unit_price: 3.5 }]),
    );

    const res = await POST(requestWithFile('quote.md', 'Copper pipe 15mm - £3.50/m'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.imported).toHaveLength(1);
    expect(json.imported[0].material_name).toBe('Copper pipe 15mm');

    const db = await getDb();
    const rows = await db.query('SELECT * FROM trader_prices');
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe('historical_quote');

    // uploaded file actually landed in the isolated QF_UPLOADS_DIR, not the real one
    expect(readdirSync(process.env.QF_UPLOADS_DIR).length).toBeGreaterThan(0);
  });

  it('returns imported: [] without erroring when no items are extracted', async () => {
    createMessage.mockResolvedValueOnce(extractionResponse([]));

    const res = await POST(requestWithFile('quote.md', 'no prices here'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.imported).toEqual([]);

    const db = await getDb();
    const historical = await db.query('SELECT extraction_status FROM historical_quotes');
    expect(historical[0].extraction_status).toBe('failed');
  });

  it('returns a structured error and marks the row failed when extraction throws', async () => {
    createMessage.mockRejectedValueOnce(new Error('rate limited'));

    const res = await POST(requestWithFile('quote.md', 'content'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ error: true, message: 'rate limited' });

    const db = await getDb();
    const historical = await db.query('SELECT extraction_status FROM historical_quotes');
    expect(historical[0].extraction_status).toBe('failed');
  });
});
