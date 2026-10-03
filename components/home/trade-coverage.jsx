import Link from 'next/link';
import { TRADES_BY_LABEL, tradeLabel } from '@/lib/constants';
import TradeIcon from '@/components/trade-icon';
import { SectionHeading } from './cta-link';

// Every trade the app supports (lib/constants.js), so the list can't claim one that isn't there.
// Each chip opens /quote/new with that trade already chosen.
export default function TradeCoverage() {
  return (
    <section aria-labelledby="trades-heading" className="px-4 py-14 md:px-6 md:py-20">
      <div className="mx-auto flex max-w-[960px] flex-col gap-8">
        <SectionHeading
          id="trades-heading"
          eyebrow="Made for your trade"
          title={`Quoting software for ${TRADES_BY_LABEL.length} UK trades.`}
          lead="Each trade gets its own questions, so the quote covers what matters for that kind of job."
        />
        <ul className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
          {TRADES_BY_LABEL.map((trade) => (
            <li key={trade}>
              <Link
                href={`/quote/new?trade=${trade}`}
                className="inline-flex h-11 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground no-underline transition-colors hover:border-brand hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <TradeIcon trade={trade} className="text-brand" />
                {tradeLabel(trade)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
