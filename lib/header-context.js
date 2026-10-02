// Which header the page gets: 'marketing' on the homepage, /pricing and /quote/new (where homepage links land),
// 'flow' on the example quotes (no "+ New quote", which would only distract), 'app' elsewhere.
export function headerContext(pathname = '') {
  if (pathname === '/' || pathname === '/pricing' || isNewQuotePath(pathname)) return 'marketing';
  if (/^\/quote\/example\b/.test(pathname)) return 'flow';
  return 'app';
}

// The Quotes tab is current on the list and on a saved quote, not while making one.
export function isQuotesPath(pathname = '') {
  return pathname.startsWith('/quotes') || /^\/quote\/(?!new\b|example\b)/.test(pathname);
}

// "Start a quote" is hidden here: it would only link to the page the trader is already on.
export function isNewQuotePath(pathname = '') {
  return /^\/quote\/new\b/.test(pathname);
}
