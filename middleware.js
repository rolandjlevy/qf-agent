import { NextResponse } from 'next/server';
import { SESSION_COOKIE, isPublicPath, isValidSession } from './lib/auth.js';

// The password gate (lib/auth.js): pages without a session go to /login, the API answers 401.
export async function middleware(request) {
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();
  if (await isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Sign in to QuoteFetch first.' }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

// Everything except Next's own assets and files with an extension (icons, manifest, share image).
export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.[a-z0-9]+$).*)'],
};
