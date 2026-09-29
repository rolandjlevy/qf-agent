import Link from 'next/link';
import Logo from '@/components/logo';

const LINKS = [
  ['/quote/new', 'New quote'],
  ['/quotes', 'Quotes'],
  ['/profile', 'Profile'],
  ['/quote/example/electrician', 'Example quote'],
];

export default function HomeFooter() {
  return (
    <footer className="border-t border-border bg-card px-4 py-8 md:px-6">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Logo className="h-6 w-auto" />
          <p className="m-0 text-sm text-muted-foreground">© {new Date().getFullYear()} QuoteFetch</p>
        </div>
        <nav aria-label="Footer">
          <ul className="m-0 flex list-none flex-wrap gap-x-5 p-0">
            {LINKS.map(([href, label]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-flex min-h-11 items-center text-sm text-muted-foreground no-underline hover:text-foreground hover:underline"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
