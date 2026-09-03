import { listGeneratedQuotes } from '../../lib/db.js'
import DeleteQuoteButton from './delete-quote-button.js'

// Always read live from Neon — a build-time static snapshot would never
// see quotes added later (via the web UI or the CLI, which shares this
// same database but has no way to trigger Next's cache revalidation).
export const dynamic = 'force-dynamic'

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function QuotesPage() {
  const quotes = await listGeneratedQuotes()

  return (
    <div>
      <h1>Quotes</h1>
      {quotes.length === 0 ? (
        <p>No quotes generated yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {quotes.map((quote) => (
            <li
              key={quote.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
                border: '1px solid #ddd',
                borderRadius: 6,
                padding: '0.75rem 1rem',
              }}
            >
              <div>
                <a href={`/quote/${quote.id}`} style={{ fontWeight: 'bold' }}>
                  {quote.job_description.slice(0, 80)}
                  {quote.job_description.length > 80 ? '…' : ''}
                </a>
                <div style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {formatDate(quote.generated_at)}
                </div>
              </div>
              <DeleteQuoteButton id={quote.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
