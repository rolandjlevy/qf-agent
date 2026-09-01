export const metadata = {
  title: 'QuoteFetch',
  description: 'Agentic quote drafting for UK trades',
};

const navStyle = {
  display: 'flex',
  gap: '1.5rem',
  padding: '1rem 1.5rem',
  borderBottom: '1px solid #ddd',
  fontFamily: 'system-ui, sans-serif',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', color: '#111' }}>
        <nav style={navStyle}>
          <strong>QuoteFetch</strong>
          <a href="/quote/new">New quote</a>
          <a href="/quotes">Past quotes</a>
          <a href="/profile">Profile</a>
        </nav>
        <main style={{ padding: '1.5rem', maxWidth: '760px', margin: '0 auto' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
