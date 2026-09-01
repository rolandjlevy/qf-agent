'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function QuotePage() {
  const { id } = useParams();
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/quotes/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.message);
        else setQuote(data.quote);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p style={{ color: 'crimson' }}>Error: {error}</p>;
  if (!quote) return <p>Loading quote…</p>;

  return (
    <div>
      <h1>Quote</h1>
      <p style={{ color: '#666' }}>
        {quote.job_description} — {new Date(quote.generated_at).toLocaleString('en-GB')}
      </p>
      {quote.content === null ? (
        <p style={{ color: 'crimson' }}>The saved file could not be found on disk ({quote.output_path}).</p>
      ) : (
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', border: '1px solid #ddd', borderRadius: '6px', padding: '1rem' }}>
          {quote.content}
        </pre>
      )}
    </div>
  );
}
