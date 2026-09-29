import { TRADES_BY_LABEL, tradeLabel } from '@/lib/constants';
import { SectionHeading } from './cta-link';

// Every trade the app supports (lib/constants.js), so the list can't claim one that isn't there.
export default function TradeCoverage() {
  return (
    <section aria-labelledby="trades-heading" className="px-4 py-14 md:px-6 md:py-20">
      <div className="mx-auto flex max-w-[960px] flex-col gap-8">
        <SectionHeading
          id="trades-heading"
          title="Made for your trade."
          lead="Each trade gets its own questions, so the quote covers what matters for that kind of job."
        />
        <ul className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
          {TRADES_BY_LABEL.map((trade) => (
            <li
              key={trade}
              className="inline-flex h-10 items-center rounded-full border border-border bg-card px-4 text-sm font-medium"
            >
              {tradeLabel(trade)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
