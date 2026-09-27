import { getTraderProfile } from '../../../lib/db.js';
import { VALID_TONES, VALID_TRADES } from '../../../lib/constants.js';
import NewQuoteFlow from './new-quote-flow.js';

// Read live: the trade and tone defaults come from the profile, which can change at any time.
export const dynamic = 'force-dynamic';

export default async function NewQuotePage() {
  const profile = await getTraderProfile();
  const trade = VALID_TRADES.includes(profile?.trade) ? profile.trade : null;
  const tone = VALID_TONES.includes(profile?.default_tone) ? profile.default_tone : 'friendly';

  return <NewQuoteFlow initialTrade={trade} initialTone={tone} />;
}
