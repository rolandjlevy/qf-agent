import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

// `quotes` is `{ id, title, trade, age }[]`, formatted on the server (`trade` is null on quotes saved
// before it was stored). Each card restarts /quote/new pre-filled; `total` counts every saved quote.
export default function RecentQuotes({ quotes, total }) {
  return (
    <section aria-labelledby="recent-quotes-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="recent-quotes-heading" className="m-0 text-lg font-bold text-foreground">
          Start from a recent quote
        </h2>
        <Link
          href="/quotes"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand no-underline hover:underline"
        >
          View all quotes ({total})
          <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>
      <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0">
        {quotes.map((q) => (
          <li key={q.id}>
            <Link
              href={`/quote/new?from=${q.id}`}
              className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-4 text-foreground no-underline transition-all hover:border-brand/50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex items-center justify-between gap-2">
                {q.trade ? (
                  <span className="truncate rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold tracking-wider text-brand uppercase">
                    {q.trade}
                  </span>
                ) : (
                  <span />
                )}
                <ArrowUpRight
                  className="size-4 shrink-0 text-muted-foreground group-hover:text-brand"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </span>
              <span className="text-[15px] leading-snug font-semibold">{q.title}</span>
              <span className="mt-auto text-[13px] text-muted-foreground">{q.age}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
