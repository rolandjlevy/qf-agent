import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex',
});

export const metadata = {
  title: 'QuoteFetch',
  description: 'Agentic UK trade quote generator',
};

// No maximum-scale or user-scalable: traders must be able to pinch-zoom.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    // Browser extensions (e.g. Grammarly) add attributes to html/body before React hydrates.
    <html lang="en" className={plex.variable} suppressHydrationWarning>
      <body className="m-0 bg-background font-sans text-foreground" suppressHydrationWarning>
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
