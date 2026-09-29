'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, User, X } from 'lucide-react';
import Logo from '@/components/logo';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

// `isActive` decides which link gets aria-current; /quote/[id] belongs under Quotes, /quote/example under New quote.
const NAV_LINKS = [
  { href: '/quote/new', label: 'New quote', isActive: (p) => /^\/quote\/(new|example)\b/.test(p) },
  {
    href: '/quotes',
    label: 'Quotes',
    isActive: (p) => p.startsWith('/quotes') || /^\/quote\/(?!new\b|example\b)/.test(p),
  },
  { href: '/profile', label: 'Profile', isActive: (p) => p.startsWith('/profile') },
];

const iconButton =
  'inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export default function AppHeader() {
  const pathname = usePathname() ?? '';

  return (
    // Sticky, not fixed: it stays in the page flow (no spacer). z-40 keeps popovers and the menu (z-50) above it.
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-card/95 backdrop-blur-md md:h-[72px]">
      <div className="mx-auto flex h-full max-w-[1280px] items-center gap-10 px-4 md:px-6">
        <Link
          href="/"
          className="flex min-h-11 shrink-0 items-center no-underline"
        >
          {/* The logo's own aria-label ("QuoteFetch") names the link. */}
          <Logo className="h-6 w-auto md:h-8" />
        </Link>

        <nav aria-label="Main" className="hidden h-full md:block">
          <ul className="m-0 flex h-full list-none gap-7 p-0">
            {NAV_LINKS.map((link) => {
              const active = link.isActive(pathname);
              return (
                <li key={link.href} className="h-full">
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-full items-center border-b-[3px] px-1 pt-[3px] text-[15px] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      active
                        ? 'border-brand font-semibold text-brand'
                        : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Link
          href="/profile"
          aria-label="Account"
          className={cn(iconButton, 'ml-auto hidden border border-border bg-card hover:border-brand hover:bg-brand-tint hover:text-brand md:inline-flex')}
        >
          <User className="size-5" aria-hidden="true" />
        </Link>

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Menu"
              className={cn(iconButton, 'ml-auto md:hidden')}
            >
              <Menu className="size-6" aria-hidden="true" />
            </button>
          </SheetTrigger>
          {/* Own close button: shadcn's default is a 16px target, under the 44px minimum. */}
          <SheetContent side="right" showCloseButton={false} className="bg-card px-5 pt-3">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold">Menu</SheetTitle>
              <SheetClose className={iconButton} aria-label="Close menu">
                <X className="size-5" aria-hidden="true" />
              </SheetClose>
            </div>
            <nav aria-label="Main">
              <ul className="m-0 flex list-none flex-col p-0">
                {NAV_LINKS.map((link) => {
                  const active = link.isActive(pathname);
                  return (
                    <li key={link.href}>
                      <SheetClose asChild>
                        <Link
                          href={link.href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex min-h-11 items-center border-l-[3px] pl-3 text-base no-underline',
                            active
                              ? 'border-brand font-semibold text-foreground'
                              : 'border-transparent font-medium text-muted-foreground',
                          )}
                        >
                          {link.label}
                        </Link>
                      </SheetClose>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
