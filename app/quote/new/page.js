import { getTraderProfile } from '../../../lib/db.js';
import { VALID_TRADES } from '../../../lib/constants.js';
import NewQuoteFlow from './new-quote-flow.js';

// Read live: the trade default comes from the profile, which can change at any time.
export const dynamic = 'force-dynamic';

export default async function NewQuotePage() {
  const profile = await getTraderProfile();
  const trade = VALID_TRADES.includes(profile?.trade) ? profile.trade : null;

  return <NewQuoteFlow initialTrade={trade} />;
}
