import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import AppHeader from '@/components/app-header';

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
        <AppHeader />
        {/* Legacy pages rely on this padding; redesigned pages mark themselves data-page-shell and set their own. */}
        <main className="px-6 py-4 has-[>[data-page-shell]]:p-0">{children}</main>
      </body>
    </html>
  );
}
