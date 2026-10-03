// /quotes shows the newest quotes a page at a time; "Show more" links to ?show=<next count>.
export const QUOTES_PAGE_SIZE = 30;
const MAX_QUOTES_SHOWN = 1000;

// How many quotes ?show= asks for: a whole number of pages, at least one, at most MAX_QUOTES_SHOWN.
export function quotesToShow(raw) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= QUOTES_PAGE_SIZE) return QUOTES_PAGE_SIZE;
  return Math.min(Math.ceil(n / QUOTES_PAGE_SIZE) * QUOTES_PAGE_SIZE, MAX_QUOTES_SHOWN);
}
