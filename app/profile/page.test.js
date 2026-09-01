// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw-server.js';
import ProfilePage from './page.js';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('/profile page', () => {
  it('renders existing profile values from the API', async () => {
    server.use(
      http.get('/api/profile', () =>
        HttpResponse.json({ profile: { business_name: 'Acme Ltd', hourly_rate: 45, contact_details: '', standard_terms: '', voice_sample: '' } }),
      ),
    );

    render(<ProfilePage />);

    expect(await screen.findByDisplayValue('Acme Ltd')).toBeInTheDocument();
    expect(screen.getByDisplayValue('45')).toBeInTheDocument();
  });

  it('submits the edited form and shows a saved confirmation', async () => {
    server.use(
      http.get('/api/profile', () => HttpResponse.json({ profile: null })),
      http.post('/api/profile', async ({ request }) => {
        const body = await request.json();
        expect(body.business_name).toBe('New Business');
        return HttpResponse.json({ profile: body });
      }),
    );

    const user = userEvent.setup();
    render(<ProfilePage />);

    const nameInput = await screen.findByLabelText('Business name');
    await user.type(nameInput, 'New Business');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('Saved.')).toBeInTheDocument();
  });

  it('shows the imported materials list after a successful upload', async () => {
    server.use(
      http.get('/api/profile', () => HttpResponse.json({ profile: null })),
      http.post('/api/import', () =>
        HttpResponse.json({ imported: [{ material_name: 'Copper pipe 15mm', unit_price: 3.5, unit: 'm' }] }),
      ),
    );

    const { container } = render(<ProfilePage />);
    await screen.findByText('Trader profile');

    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(['content'], 'quote.md', { type: 'text/markdown' });
    const user = userEvent.setup();
    await user.upload(fileInput, file);

    expect(await screen.findByText(/Imported 1 priced material/)).toBeInTheDocument();
    expect(screen.getByText(/Copper pipe 15mm/)).toBeInTheDocument();
  });

  it('shows the "nothing imported" message when no items are extracted', async () => {
    server.use(
      http.get('/api/profile', () => HttpResponse.json({ profile: null })),
      http.post('/api/import', () => HttpResponse.json({ imported: [] })),
    );

    const { container } = render(<ProfilePage />);
    await screen.findByText('Trader profile');

    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(['content'], 'quote.md', { type: 'text/markdown' });
    const user = userEvent.setup();
    await user.upload(fileInput, file);

    expect(await screen.findByText(/nothing imported/)).toBeInTheDocument();
  });

  it('shows an error message when the import fails', async () => {
    server.use(
      http.get('/api/profile', () => HttpResponse.json({ profile: null })),
      http.post('/api/import', () =>
        HttpResponse.json({ error: true, message: 'Unsupported file type' }, { status: 400 }),
      ),
    );

    const { container } = render(<ProfilePage />);
    await screen.findByText('Trader profile');

    // Extension checking is a server-side concern (already covered in the
    // /api/import route tests) — this test only checks that the page
    // renders whatever error the API returns, so an allowed extension is
    // used here to avoid any accept-attribute interference from user-event.
    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(['content'], 'quote.md', { type: 'text/markdown' });
    const user = userEvent.setup();
    await user.upload(fileInput, file);

    expect(await screen.findByText(/Error: Unsupported file type/)).toBeInTheDocument();
  });
});
