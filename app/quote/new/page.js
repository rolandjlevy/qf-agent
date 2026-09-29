import { countGeneratedQuotes, getGeneratedQuoteById, getTraderProfile, listRecentQuotes } from '../../../lib/db.js';
import { VALID_TRADES, tradeLabel } from '../../../lib/constants.js';
import { quoteTitle, relativeTime } from '../../../lib/new-quote.js';
import { SAMPLE_QUOTE_KEYS, sampleQuoteFor } from '../../../lib/sample-quotes.js';
import { exampleJobBySlug } from '../../../lib/example-jobs.js';
import NewQuoteFlow from './new-quote-flow.js';

// Read live: the trade default and recent quotes come from the database and change at any time.
export const dynamic = 'force-dynamic';

const validTrade = (trade) => (VALID_TRADES.includes(trade) ? trade : null);

// ?from=<quote id> (a "Start from a recent quote" card) pre-fills that quote's description and trade;
// ?example=<slug> (the homepage's example chips) does the same from lib/example-jobs.js.
export default async function NewQuotePage({ searchParams }) {
  const { from, example: exampleParam } = await searchParams;
  const fromId = /^\d+$/.test(from ?? '') ? Number(from) : null;
  const example = !fromId && typeof exampleParam === 'string' ? exampleJobBySlug(exampleParam) : null;
  const [profile, recent, quoteCount, fromQuote] = await Promise.all([
    getTraderProfile(),
    listRecentQuotes(3),
    countGeneratedQuotes(),
    fromId ? getGeneratedQuoteById(fromId) : null,
  ]);

  const recentQuotes = recent.map((q) => ({
    id: q.id,
    title: quoteTitle(q.job_description),
    trade: validTrade(q.trade) ? tradeLabel(q.trade) : null,
    age: relativeTime(q.generated_at),
  }));
  // Titles only: the samples' full text stays out of the client bundle.
  const sampleTitles = Object.fromEntries(SAMPLE_QUOTE_KEYS.map((key) => [key, sampleQuoteFor(key).title]));

  return (
    <NewQuoteFlow
      // A new key remounts the flow, so following a card (or back to a blank quote) resets its state.
      key={fromQuote ? `from-${fromQuote.id}` : example ? `example-${exampleParam}` : 'new'}
      initialTrade={validTrade(fromQuote?.trade) ?? example?.trade ?? validTrade(profile?.trade)}
      initialDescription={fromQuote?.job_description ?? example?.jobDescription ?? ''}
      recentQuotes={recentQuotes}
      quoteCount={quoteCount}
      sampleTitles={sampleTitles}
    />
  );
}
