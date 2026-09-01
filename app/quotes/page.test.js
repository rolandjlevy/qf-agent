// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw-server.js';
import QuotesPage from './page.js';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('/quotes page', () => {
  it('shows a loading state before the fetch resolves', () => {
    server.use(http.get('/api/quotes', () => new Promise(() => {})));
    render(<QuotesPage />);
    expect(screen.getByText('Loading quotes…')).toBeInTheDocument();
  });

  it('renders the empty state when there are no quotes', async () => {
    server.use(http.get('/api/quotes', () => HttpResponse.json({ quotes: [] })));
    render(<QuotesPage />);
    expect(await screen.findByText(/No quotes generated yet/)).toBeInTheDocument();
  });

  it('renders the list of quotes', async () => {
    server.use(
      http.get('/api/quotes', () =>
        HttpResponse.json({
          quotes: [
            { id: 1, job_description: 'Fix a tap', generated_at: '2026-09-01T12:00:00.000Z' },
            { id: 2, job_description: 'Paint a room', generated_at: '2026-09-02T12:00:00.000Z' },
          ],
        }),
      ),
    );
    render(<QuotesPage />);

    expect(await screen.findByText('Fix a tap')).toBeInTheDocument();
    expect(screen.getByText('Paint a room')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fix a tap' })).toHaveAttribute('href', '/quote/1');
  });

  it('renders the error state', async () => {
    server.use(http.get('/api/quotes', () => HttpResponse.json({ error: true, message: 'db down' })));
    render(<QuotesPage />);
    expect(await screen.findByText('Error: db down')).toBeInTheDocument();
  });
});
