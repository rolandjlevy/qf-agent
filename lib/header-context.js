// Which header the page gets: 'marketing' on the homepage, /pricing and /quote/new (where homepage links land),
// 'flow' on the example quotes (no "+ New quote", which would only distract), 'app' elsewhere.
export function headerContext(pathname = '') {
  if (pathname === '/' || pathname === '/pricing' || /^\/quote\/new\b/.test(pathname)) return 'marketing';
  if (/^\/quote\/example\b/.test(pathname)) return 'flow';
  return 'app';
}

// The Quotes tab is current on the list and on a saved quote, not while making one.
export function isQuotesPath(pathname = '') {
  return pathname.startsWith('/quotes') || /^\/quote\/(?!new\b|example\b)/.test(pathname);
}
