import { notFound } from 'next/navigation';
import { getGeneratedQuoteById } from '../../../lib/db.js';

// Belt-and-braces alongside app/quotes/page.js's force-dynamic — this route
// is already dynamic due to its [id] param, but explicit costs nothing.
export const dynamic = 'force-dynamic';

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function QuotePage({ params }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) notFound();

  const quote = await getGeneratedQuoteById(idNum);
  if (!quote) notFound();

  return (
    <div>
      <h1>{quote.job_description}</h1>
      <p style={{ color: '#666' }}>
        Generated {formatDate(quote.generated_at)}
      </p>
      {quote.content ? (
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: '1rem 1.25rem',
            lineHeight: 1.75,
          }}
        >
          {quote.content}
        </pre>
      ) : (
        <p>No content was saved for this quote.</p>
      )}
    </div>
  );
}
