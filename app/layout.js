import './globals.css';

export const metadata = {
  title: 'QuoteFetch',
  description: 'Agentic UK trade quote generator',
};

export default function RootLayout({ children }) {
  return (
    // Browser extensions (e.g. Grammarly) add attributes to html/body before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }} suppressHydrationWarning>
        <nav
          style={{
            display: 'flex',
            gap: '1.5rem',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #ddd',
          }}
        >
          <h3 style={{ margin: 0 }}>📝 QuoteFetch</h3>
          <a href="/quote/new">New quote</a>
          <a href="/quotes">Quotes</a>
          <a href="/profile">Profile</a>
        </nav>
        <main style={{ padding: '1rem 1.5rem' }}>{children}</main>
      </body>
    </html>
  );
}
