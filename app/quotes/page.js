'use client';

import { useEffect, useState } from 'react';

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-GB');
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/quotes')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.message);
        else setQuotes(data.quotes);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p style={{ color: 'crimson' }}>Error: {error}</p>;
  if (!quotes) return <p>Loading quotes…</p>;

  return (
    <div>
      <h1>Past quotes</h1>
      {quotes.length === 0 ? (
        <p>No quotes generated yet. <a href="/quote/new">Create one</a>.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {quotes.map((q) => (
            <li key={q.id} style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '0.75rem 1rem' }}>
              <a href={`/quote/${q.id}`} style={{ fontWeight: 'bold' }}>
                {q.job_description.slice(0, 80)}
                {q.job_description.length > 80 ? '…' : ''}
              </a>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>{formatDate(q.generated_at)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
