// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw-server.js';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
}));

const { default: QuotePage } = await import('./page.js');

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('/quote/[id] page', () => {
  it('renders the quote content', async () => {
    server.use(
      http.get('/api/quotes/1', () =>
        HttpResponse.json({
          quote: {
            job_description: 'Fix a tap',
            generated_at: '2026-09-01T12:00:00.000Z',
            output_path: '/output/quote.md',
            content: 'FULL QUOTE TEXT HERE',
          },
        }),
      ),
    );

    render(<QuotePage />);

    expect(await screen.findByText('FULL QUOTE TEXT HERE')).toBeInTheDocument();
    expect(screen.getByText(/Fix a tap/)).toBeInTheDocument();
  });

  it('renders the missing-file message when content is null', async () => {
    server.use(
      http.get('/api/quotes/1', () =>
        HttpResponse.json({
          quote: {
            job_description: 'Fix a tap',
            generated_at: '2026-09-01T12:00:00.000Z',
            output_path: '/output/missing.md',
            content: null,
          },
        }),
      ),
    );

    render(<QuotePage />);
    expect(await screen.findByText(/could not be found on disk/)).toBeInTheDocument();
  });

  it('renders the error state on a 404', async () => {
    server.use(
      http.get('/api/quotes/1', () => HttpResponse.json({ error: true, message: 'Quote not found' }, { status: 404 })),
    );

    render(<QuotePage />);
    expect(await screen.findByText('Error: Quote not found')).toBeInTheDocument();
  });
});
