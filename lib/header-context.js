// Which header the page gets: 'marketing' on the homepage, 'flow' while making a quote
// (/quote/new and the example quotes, where "+ New quote" would only distract), 'app' elsewhere.
export function headerContext(pathname = '') {
  if (pathname === '/') return 'marketing';
  if (/^\/quote\/(new|example)\b/.test(pathname)) return 'flow';
  return 'app';
}

// The Quotes tab is current on the list and on a saved quote, not while making one.
export function isQuotesPath(pathname = '') {
  return pathname.startsWith('/quotes') || /^\/quote\/(?!new\b|example\b)/.test(pathname);
}
