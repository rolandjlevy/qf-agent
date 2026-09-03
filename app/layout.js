export const metadata = {
  title: 'QuoteFetch',
  description: 'Agentic UK trade quote generator',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <nav
          style={{
            display: 'flex',
            gap: '1.5rem',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #ddd',
          }}
        >
          <a href="/profile">Profile</a>
          <a href="/quote/new">New quote</a>
          <a href="/quotes">Quotes</a>
        </nav>
        <main style={{ padding: '1.5rem' }}>{children}</main>
      </body>
    </html>
  )
}
