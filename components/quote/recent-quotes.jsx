import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

// `quotes` is `{ id, title, trade, age }[]`, formatted on the server (`trade` is null on quotes saved
// before it was stored). Each card restarts /quote/new pre-filled; `total` counts every saved quote.
export default function RecentQuotes({ quotes, total }) {
  return (
    <section aria-labelledby="recent-quotes-heading" className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-4">
        <h2 id="recent-quotes-heading" className="m-0 text-[15px] font-semibold text-foreground">
          Start from a recent quote
        </h2>
        <Link
          href="/quotes"
          className="inline-flex min-h-11 items-center text-[13px] font-medium text-brand no-underline hover:text-brand-hover hover:underline"
        >
          View all quotes ({total})
        </Link>
      </div>
      <ul className="m-0 grid list-none grid-cols-3 gap-3.5 p-0">
        {quotes.map((q) => (
          <li key={q.id}>
            <Link
              href={`/quote/new?from=${q.id}`}
              className="group flex h-full flex-col justify-between rounded-xl border border-border bg-card p-4 text-foreground no-underline shadow-card transition-all hover:border-brand hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex flex-col">
                <span className="mb-2.5 flex items-start justify-between gap-2">
                  {q.trade ? (
                    <span className="truncate rounded border border-brand-subtle-border bg-brand-tint px-2 py-0.5 text-[11px] font-semibold tracking-wider text-brand uppercase">
                      {q.trade}
                    </span>
                  ) : (
                    <span />
                  )}
                  <ArrowUpRight
                    className="size-[17px] shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand motion-reduce:transition-none"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </span>
                <span className="line-clamp-1 text-[14.5px] font-semibold transition-colors group-hover:text-brand">
                  {q.title}
                </span>
              </span>
              <span className="mt-4 border-t border-border-subtle pt-3 text-[11px] text-muted-foreground tabular-nums">
                {q.age}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
