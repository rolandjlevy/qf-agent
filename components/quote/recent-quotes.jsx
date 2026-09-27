import Link from 'next/link';

// `quotes` is `{ id, title, date }[]`, formatted on the server. Each card restarts /quote/new pre-filled.
export default function RecentQuotes({ quotes }) {
  return (
    <section aria-labelledby="recent-quotes-heading" className="flex flex-col gap-3">
      <h2 id="recent-quotes-heading" className="m-0 text-[15px] font-semibold">
        Start from a recent quote
      </h2>
      <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0">
        {quotes.map((q) => (
          <li key={q.id}>
            <Link
              href={`/quote/new?from=${q.id}`}
              className="flex h-full flex-col gap-1 rounded-xl border border-border bg-card p-4 text-foreground no-underline hover:border-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="text-[15px] leading-snug font-semibold">{q.title}</span>
              <span className="text-[13px] text-muted-foreground">{q.date}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
