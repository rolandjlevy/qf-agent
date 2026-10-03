import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { listGeneratedQuotes } from '../../lib/db.js'
import { VALID_TRADES, tradeLabel } from '../../lib/constants.js'
import { quoteTitle, relativeTime } from '../../lib/new-quote.js'
import { PageHeader, PageShell } from '@/components/app-page'
import { primaryButtonClass } from '@/components/quote/primary-action'
import QuoteCardActions from './quote-card-actions.js'

// Always read live from Neon — a build-time static snapshot would never
// see quotes added later (via the web UI or the CLI, which shares this
// same database but has no way to trigger Next's cache revalidation).
export const dynamic = 'force-dynamic'

function NewQuoteLink() {
  return (
    <Link href="/quote/new" className={`${primaryButtonClass(true)} no-underline`}>
      <Plus className="size-5" strokeWidth={2} aria-hidden="true" />
      New quote
    </Link>
  )
}

export default async function QuotesPage() {
  const quotes = await listGeneratedQuotes()

  return (
    <PageShell>
      <PageHeader
        title="Your quotes"
        description={
          quotes.length === 0
            ? 'Quotes you create will be saved here.'
            : `${quotes.length} saved ${quotes.length === 1 ? 'quote' : 'quotes'}, newest first.`
        }
      />

      {quotes.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-input bg-card px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand">
            <FileText className="size-6" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-lg font-bold">No quotes yet</h2>
            <p className="m-0 text-[15px] text-muted-foreground">
              Describe a job and QuoteFetch drafts the quote for you to check.
            </p>
          </div>
          <NewQuoteLink />
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
          {quotes.map((quote) => {
            const title = quoteTitle(quote.job_description)
            const trade = VALID_TRADES.includes(quote.trade) ? tradeLabel(quote.trade) : null
            return (
              <li
                key={quote.id}
                className="relative flex flex-col gap-4 rounded-card border border-border bg-card p-4 shadow-card transition-colors hover:border-brand-subtle-border md:p-5"
              >
                <div className="flex flex-col gap-2 pr-12 md:pr-0">
                  {trade && (
                    <span className="self-start rounded border border-brand-subtle-border bg-brand-tint px-2 py-0.5 text-[11px] font-semibold tracking-wider text-brand uppercase">
                      {trade}
                    </span>
                  )}
                  <h2 className="m-0 text-[17px] leading-snug font-semibold">
                    <Link
                      href={`/quote/${quote.id}`}
                      className="text-foreground no-underline hover:text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {title}
                    </Link>
                  </h2>
                  <p className="m-0 text-[13px] text-muted-foreground tabular-nums">
                    {quote.customer_name ? `${quote.customer_name} · ` : ''}
                    {relativeTime(quote.generated_at)}
                  </p>
                </div>
                <div className="border-t border-border-subtle pt-4">
                  <QuoteCardActions
                    id={quote.id}
                    title={title}
                    hasContent={quote.has_content}
                    jobDescription={quote.job_description}
                    generatedAt={quote.generated_at}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </PageShell>
  )
}
