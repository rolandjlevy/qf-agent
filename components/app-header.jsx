'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Building2, ChevronRight, CircleHelp, LogOut, Menu, Plus, User, X } from 'lucide-react';
import Logo from '@/components/logo';
import { cn } from '@/lib/utils';
import { headerContext, isNewQuotePath, isQuotesPath } from '@/lib/header-context';
import { logout } from '@/lib/actions/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

// Homepage sections, plus the pricing page.
const MARKETING_LINKS = [
  { href: '/#how', label: 'How it works' },
  { href: '/#trust', label: 'Why trust it' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
];
// The account menu. Sign out appears below these when the app has a password (lib/auth.js); no Billing until Phase 4.
const ACCOUNT_LINKS = [
  { href: '/profile', label: 'Your business', Icon: Building2 },
  { href: '/#faq', label: 'Help and FAQ', Icon: CircleHelp },
];

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const iconButton = cn(
  'inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-accent',
  focusRing,
);
const blueButton = cn(
  'inline-flex h-11 items-center justify-center gap-1.5 rounded-button bg-brand px-4 text-sm font-semibold whitespace-nowrap text-white no-underline transition-colors hover:bg-brand-hover',
  focusRing,
);

// Desktop nav link: `active` gets the brand underline and aria-current.
function NavLink({ href, active, children }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-full items-center border-b-[3px] px-1 pt-[3px] text-[15px] whitespace-nowrap no-underline',
        focusRing,
        active
          ? 'border-brand font-semibold text-brand'
          : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </Link>
  );
}

// Mobile menu row: 48px tall, with a chevron.
function MenuRow({ href, active, onClick, children }) {
  return (
    <li className="border-b border-border-subtle last:border-b-0">
      <SheetClose asChild>
        <Link
          href={href}
          onClick={onClick}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex min-h-12 items-center justify-between gap-3 px-1 text-[15px] no-underline',
            focusRing,
            active ? 'font-semibold text-brand' : 'font-medium text-foreground',
          )}
        >
          {children}
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        </Link>
      </SheetClose>
    </li>
  );
}

// One header per route (lib/header-context.js): marketing pages get the section links and "Start a quote" (the account menu
// instead on /quote/new); app pages get Quotes, "+ New quote" and the account menu; example quotes drop "+ New quote".
// `signOut`: the app has a password (set by app/layout.js), so the account menus offer Sign out.
export default function AppHeader({ signOut = false }) {
  const pathname = usePathname() ?? '';
  const [menuOpen, setMenuOpen] = useState(false);
  const context = headerContext(pathname);
  const marketing = context === 'marketing';
  const onQuotes = isQuotesPath(pathname);
  const onProfile = pathname.startsWith('/profile');
  const onNewQuote = isNewQuotePath(pathname);
  const onLogin = pathname === '/login';
  const accountMenu = !marketing || onNewQuote;

  // On the homepage, a section link in the menu scrolls once the menu has closed: the sheet's
  // scroll lock would otherwise restore the old position and undo the jump.
  function scrollAfterClose(e, href) {
    if (pathname !== '/' || !href.startsWith('/#')) return;
    e.preventDefault();
    setMenuOpen(false);
    setTimeout(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById(href.slice(2))?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      window.history.replaceState(null, '', href);
    }, 350);
  }

  const mobileRows = marketing
    ? [
        ...MARKETING_LINKS.map((l) => ({ ...l, active: l.href === pathname })),
        ...(onLogin ? [] : [{ href: '/quotes', label: 'Your quotes' }]),
        // The menu already has FAQ, so only the account menu's business link is added.
        ...(onNewQuote ? [ACCOUNT_LINKS[0]] : []),
      ]
    : [{ href: '/quotes', label: 'Quotes', active: onQuotes }, ...ACCOUNT_LINKS.map((l) => ({ ...l, active: l.href === '/profile' && onProfile }))];

  return (
    // Sticky, not fixed: it stays in the page flow (no spacer). z-40 keeps popovers and the menu (z-50) above it.
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-card/95 backdrop-blur-md md:h-[72px]">
      <div className="mx-auto flex h-full max-w-[1280px] items-center gap-6 px-4 md:px-6 lg:gap-10">
        <Link href="/" className="flex min-h-11 shrink-0 items-center no-underline">
          {/* The logo's own aria-label ("QuoteFetch") names the link. */}
          <Logo className="h-6 w-auto md:h-8" />
        </Link>

        <nav aria-label="Main" className="hidden h-full md:block">
          <ul className="m-0 flex h-full list-none gap-5 p-0 lg:gap-7">
            {marketing ? (
              MARKETING_LINKS.map((link) => (
                <li key={link.href} className="h-full">
                  <NavLink href={link.href} active={link.href === pathname}>
                    {link.label}
                  </NavLink>
                </li>
              ))
            ) : (
              <li className="h-full">
                <NavLink href="/quotes" active={onQuotes}>
                  Quotes
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          {marketing ? (
            <>
              {!onLogin && (
                <Link
                  href="/quotes"
                  className={cn(
                    'hidden min-h-11 items-center px-2 text-[15px] font-medium text-foreground no-underline hover:text-brand lg:inline-flex',
                    focusRing,
                  )}
                >
                  Your quotes
                </Link>
              )}
              {!onNewQuote && !onLogin && (
                <Link href="/quote/new" className={blueButton}>
                  Start a quote
                  <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
                </Link>
              )}
            </>
          ) : (
            context === 'app' && (
              <Link href="/quote/new" className={blueButton}>
                <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
                <span className="md:hidden">New</span>
                <span className="hidden md:inline">New quote</span>
              </Link>
            )
          )}

          {accountMenu && (
            // Non-modal: the rest of the page stays readable and scrollable while it is open.
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                aria-label="Account"
                className={cn(
                  iconButton,
                  'hidden border border-border bg-card hover:border-brand hover:bg-brand-tint hover:text-brand data-[state=open]:border-brand data-[state=open]:text-brand md:inline-flex',
                )}
              >
                <User className="size-5" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {ACCOUNT_LINKS.map(({ href, label, Icon }) => (
                  <DropdownMenuItem key={label} asChild>
                    <Link href={href}>
                      <Icon aria-hidden="true" />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                {signOut && (
                  <DropdownMenuItem onSelect={() => logout()}>
                    <LogOut aria-hidden="true" />
                    Sign out
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button type="button" aria-label="Menu" className={cn(iconButton, 'md:hidden')}>
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
                  {mobileRows.map((row) => (
                    <MenuRow
                      key={row.label}
                      href={row.href}
                      active={row.active}
                      onClick={(e) => scrollAfterClose(e, row.href)}
                    >
                      {row.label}
                    </MenuRow>
                  ))}
                  {signOut && accountMenu && (
                    <li className="border-b border-border-subtle last:border-b-0">
                      <SheetClose asChild>
                        <button
                          type="button"
                          data-slot="menu-row"
                          onClick={() => logout()}
                          className={cn(
                            'flex min-h-12 w-full items-center justify-between gap-3 px-1 text-left text-[15px] font-medium text-foreground',
                            focusRing,
                          )}
                        >
                          Sign out
                          <LogOut className="size-4 text-muted-foreground" aria-hidden="true" />
                        </button>
                      </SheetClose>
                    </li>
                  )}
                </ul>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
