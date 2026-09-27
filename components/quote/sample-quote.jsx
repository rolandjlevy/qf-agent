import Link from 'next/link';

// First-visit stand-in for RecentQuotes. `sample` is `{ key, title }`; the full text stays server-side.
export default function SampleQuote({ sample }) {
  return (
    <section aria-labelledby="sample-quote-heading" className="flex flex-col gap-3">
      <h2 id="sample-quote-heading" className="m-0 text-[15px] font-semibold">
        See what you&apos;ll get
      </h2>
      <div className="flex items-center gap-6 rounded-card border border-border bg-card p-5">
        {/* A drawn page, not a screenshot, so it stays sharp and needs no image. */}
        <div
          aria-hidden="true"
          className="flex h-[144px] w-[112px] shrink-0 flex-col gap-2 rounded-lg border border-border bg-surface-muted p-3"
        >
          <span className="h-2 w-3/5 rounded-full bg-brand" />
          <span className="h-1.5 w-full rounded-full bg-muted" />
          <span className="h-1.5 w-5/6 rounded-full bg-muted" />
          <span className="h-1.5 w-full rounded-full bg-muted" />
          <span className="h-1.5 w-2/3 rounded-full bg-muted" />
          <span className="mt-auto h-2 w-2/5 self-end rounded-full bg-brand-mid" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="m-0 text-xs font-semibold tracking-[0.08em] text-brand uppercase">Example quote</p>
          <p className="m-0 text-lg font-semibold">{sample.title}</p>
          <p className="m-0 text-sm text-muted-foreground">
            Materials, labour and terms, laid out the way your customer will see it.
          </p>
          <Link
            href={`/quote/example/${sample.key}`}
            className="mt-1 inline-flex min-h-11 items-center self-start text-sm font-semibold text-foreground underline decoration-brand decoration-2 underline-offset-4 hover:text-brand"
          >
            Open the example
          </Link>
        </div>
      </div>
    </section>
  );
}
