import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import AppHeader from '@/components/app-header';
import { authEnabled } from '@/lib/auth';

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex',
});

// Absolute URLs for the share image need a base: the production domain on Vercel, localhost otherwise.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000';

// Tab icons, the home-screen icon and the manifest come from app/ by file name (see docs/brand/README.md).
export const metadata = {
  metadataBase: new URL(siteUrl),
  title: 'QuoteFetch',
  description: 'Agentic UK trade quote generator',
  openGraph: { title: 'QuoteFetch', images: ['/og-image.png'] },
};

// No maximum-scale or user-scalable: traders must be able to pinch-zoom.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // Android Chrome shrinks the page for the keyboard, keeping fixed bottom bars above it.
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }) {
  return (
    // Browser extensions (e.g. Grammarly) add attributes to html/body before React hydrates.
    // data-scroll-behavior: tells Next to switch off the homepage's smooth scrolling during page changes.
    <html lang="en" className={plex.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="m-0 bg-background font-sans text-foreground" suppressHydrationWarning>
        <AppHeader signOut={authEnabled()} />
        {/* Legacy pages rely on this padding; redesigned pages mark themselves data-page-shell and set their own. */}
        <main className="px-6 py-4 has-[>[data-page-shell]]:p-0">{children}</main>
      </body>
    </html>
  );
}
