import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

process.env.QF_OUTPUT_DIR = mkdtempSync(join(tmpdir(), 'qf-output-'));

vi.mock('../../../lib/anthropic-client.js', () => ({
  createClient: vi.fn(() => ({})),
  createMessage: vi.fn(),
  getModel: vi.fn(() => 'test-model'),
}));

vi.resetModules();

const { createMessage } = await import('../../../lib/anthropic-client.js');
const { POST } = await import('./route.js');
const { POST: answerPOST } = await import('./[runId]/answer/route.js');
const { getDb } = await import('../../../lib/db.js');

beforeEach(async () => {
  const db = await getDb();
  await db.query('DELETE FROM generated_quotes');
  createMessage.mockReset();
});

function toolUseResponse(name, input) {
  return { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: `id-${name}`, name, input }] };
}
function finalResponse(text) {
  return { stop_reason: 'end_turn', content: [{ type: 'text', text }] };
}

function postQuoteRequest(body) {
  return new Request('http://localhost/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function readSSE(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events = [];
  let buffer = '';
  let runId = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event = 'message';
      let dataStr = '';
      for (const line of raw.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7);
        if (line.startsWith('data: ')) dataStr += line.slice(6);
      }
      const data = dataStr ? JSON.parse(dataStr) : null;
      events.push({ event, data });

      if (event === 'run_id') runId = data.runId;

      // Answer the question as soon as it appears, exercising the real
      // cross-route globalThis-shared pending-answer map — this is the
      // exact seam that broke (silently, as a 404) during manual testing.
      if (event === 'question') {
        await answerPOST(
          new Request(`http://localhost/api/quote/${runId}/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer: 'test answer' }),
          }),
          { params: Promise.resolve({ runId }) },
        );
      }
    }
  }

  return events;
}

describe('POST /api/quote', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await POST(postQuoteRequest({ trade: 'plumber' }));
    expect(res.status).toBe(400);
  });

  it('streams SSE events and saves the quote on a plain run with no questions', async () => {
    createMessage
      .mockResolvedValueOnce(
        toolUseResponse('save_quote', {
          sections: { introduction: 'Hi there.' },
          metadata: { trade: 'plumber', job_description: 'Fix a tap' },
        }),
      )
      .mockResolvedValueOnce(finalResponse('All done.'));

    const res = await POST(postQuoteRequest({ trade: 'plumber', tone: 'friendly', jobDescription: 'Fix a tap' }));
    const events = await readSSE(res);

    const eventTypes = events.map((e) => e.event);
    expect(eventTypes).toContain('tool_call');
    expect(eventTypes).toContain('tool_result');
    expect(eventTypes[eventTypes.length - 1]).toBe('done');

    const doneEvent = events.find((e) => e.event === 'done');
    expect(doneEvent.data.quoteId).not.toBeNull();
    expect(readdirSync(process.env.QF_OUTPUT_DIR).length).toBeGreaterThan(0);

    const db = await getDb();
    const rows = await db.query('SELECT * FROM generated_quotes');
    expect(rows).toHaveLength(1);
  });

  it('regression: the ask_user question/answer round trip resolves across route modules via globalThis', async () => {
    createMessage
      .mockResolvedValueOnce(toolUseResponse('ask_user', { question: 'What size?' }))
      .mockResolvedValueOnce(
        toolUseResponse('save_quote', {
          sections: { introduction: 'Hi.' },
          metadata: { trade: 'plumber', job_description: 'job' },
        }),
      )
      .mockResolvedValueOnce(finalResponse('done'));

    const res = await POST(postQuoteRequest({ trade: 'plumber', tone: 'friendly', jobDescription: 'job' }));
    const events = await readSSE(res);

    const questionEvent = events.find((e) => e.event === 'question');
    expect(questionEvent.data.question).toBe('What size?');

    // The tool_result for the ask_user call must carry the REAL answer we
    // posted, not the 5-minute timeout's synthetic fallback message — that
    // would only happen if resolveAnswer() failed to find the pending entry.
    const askUserResult = events.find((e) => e.event === 'tool_result' && e.data.tool === 'ask_user');
    expect(askUserResult.data.result.answer).toBe('test answer');

    expect(events[events.length - 1].event).toBe('done');
  });

  it('answer route returns 404 for an unknown or already-resolved runId', async () => {
    const res = await answerPOST(
      new Request('http://localhost/api/quote/does-not-exist/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: 'x' }),
      }),
      { params: Promise.resolve({ runId: 'does-not-exist' }) },
    );
    expect(res.status).toBe(404);
  });
});
