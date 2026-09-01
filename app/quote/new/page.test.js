// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw-server.js';
import NewQuotePage from './page.js';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function sseEvent(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// Builds a ReadableStream from raw text chunks — callers pass pre-split
// strings so a test can deliberately break one SSE event across two chunks,
// exercising the page's buffering/reassembly logic rather than only ever
// handing it whole events.
function streamOf(chunks) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function sseResponse(chunks) {
  return new Response(streamOf(chunks), { headers: { 'Content-Type': 'text/event-stream' } });
}

async function fillAndSubmit(user) {
  await user.type(screen.getByLabelText('Job description'), 'Fix a tap');
  await user.click(screen.getByRole('button', { name: 'Generate quote' }));
}

describe('/quote/new page', () => {
  it('streams progress lines and shows the saved-quote link on completion, even with an event split across chunks', async () => {
    const runIdEvent = sseEvent('run_id', { runId: 'run-1' });
    server.use(
      http.post('/api/quote', () =>
        sseResponse([
          // Deliberately split the run_id event across two chunks.
          runIdEvent.slice(0, 15),
          runIdEvent.slice(15),
          sseEvent('tool_call', { tool: 'lookup_price', input: { material_name: 'Copper pipe 15mm' } }),
          sseEvent('tool_result', { tool: 'lookup_price', result: { found: true } }),
          sseEvent('done', { turns: 3, quoteId: 42 }),
        ]),
      ),
    );

    const user = userEvent.setup();
    render(<NewQuotePage />);
    await fillAndSubmit(user);

    expect(await screen.findByText('Calling lookup_price for Copper pipe 15mm…')).toBeInTheDocument();
    expect(screen.getByText('lookup_price done')).toBeInTheDocument();

    const link = await screen.findByRole('link', { name: 'Your quote has been saved' });
    expect(link).toHaveAttribute('href', '/quote/42');
  });

  it('renders the inline question form on a question event, and answering it posts to the run-specific answer endpoint', async () => {
    server.use(
      http.post('/api/quote', () =>
        sseResponse([
          sseEvent('run_id', { runId: 'run-2' }),
          sseEvent('question', { question: 'What size pipe?', context: 'Need to know the diameter.' }),
        ]),
      ),
    );

    let answeredRunId = null;
    let answeredBody = null;
    server.use(
      http.post('/api/quote/:runId/answer', async ({ params, request }) => {
        answeredRunId = params.runId;
        answeredBody = await request.json();
        return HttpResponse.json({ success: true });
      }),
    );

    const user = userEvent.setup();
    render(<NewQuotePage />);
    await fillAndSubmit(user);

    expect(await screen.findByText('What size pipe?')).toBeInTheDocument();
    expect(screen.getByText('Need to know the diameter.')).toBeInTheDocument();

    const answerInputs = screen.getAllByRole('textbox');
    const answerInput = answerInputs[answerInputs.length - 1];
    await user.type(answerInput, '15mm');
    await user.click(screen.getByRole('button', { name: 'Answer' }));

    await waitFor(() => expect(answeredRunId).toBe('run-2'));
    expect(answeredBody).toEqual({ answer: '15mm' });
    expect(await screen.findByText('You answered: "15mm"')).toBeInTheDocument();
  });

  it('renders the error state on an error event', async () => {
    server.use(
      http.post('/api/quote', () =>
        sseResponse([sseEvent('run_id', { runId: 'run-3' }), sseEvent('error', { message: 'Agent exceeded max turns (20)' })]),
      ),
    );

    const user = userEvent.setup();
    render(<NewQuotePage />);
    await fillAndSubmit(user);

    expect(await screen.findByText('Error: Agent exceeded max turns (20)')).toBeInTheDocument();
  });
});
