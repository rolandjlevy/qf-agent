import { notFound } from 'next/navigation';
import { getGeneratedQuoteById } from '../../../lib/db.js';
import QuoteActions from '../../quote-actions.js';

// Belt-and-braces alongside app/quotes/page.js's force-dynamic — this route
// is already dynamic due to its [id] param, but explicit costs nothing.
export const dynamic = 'force-dynamic';

// Matches the fixed all-caps headings tools/save-quote.js's assembleQuote()
// writes into quote.content — used to split the plain-text quote into
// collapsible sections without needing a structured representation in the DB.
const SECTION_HEADINGS = [
  'SCOPE OF WORK',
  'MATERIALS & EQUIPMENT',
  'ASSUMPTIONS',
  'EXCLUSIONS',
  'NEXT STEPS',
  'DISCLAIMERS',
];

function parseQuoteSections(content) {
  const lines = content.split('\n');
  const headingSet = new Set(SECTION_HEADINGS);
  const firstHeadingIndex = lines.findIndex((line) => headingSet.has(line.trim()));

  // No recognized headings (e.g. an older or hand-edited quote) — fall back
  // to rendering the whole thing as one block, same as before this feature.
  if (firstHeadingIndex === -1) {
    return { preamble: content, sections: [] };
  }

  const preamble = lines.slice(0, firstHeadingIndex).join('\n').trimEnd();

  const sections = [];
  let i = firstHeadingIndex;
  while (i < lines.length) {
    const heading = lines[i].trim();
    let next = i + 1;
    while (next < lines.length && !headingSet.has(lines[next].trim())) next++;
    sections.push({ heading, body: lines.slice(i + 1, next).join('\n').trim() });
    i = next;
  }

  return { preamble, sections };
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const preStyle = {
  whiteSpace: 'pre-wrap',
  fontFamily: 'inherit',
  border: '1px solid #ddd',
  borderRadius: 6,
  padding: '1rem 1.25rem',
  lineHeight: 1.75,
  marginBottom: '0.5rem',
};

const detailsStyle = {
  border: '1px solid #ddd',
  borderRadius: 6,
  marginBottom: '0.5rem',
};

const summaryStyle = {
  cursor: 'pointer',
  fontWeight: 'bold',
  padding: '0.75rem 1.25rem',
};

const sectionBodyStyle = {
  whiteSpace: 'pre-wrap',
  fontFamily: 'inherit',
  margin: 0,
  padding: '0 1.25rem 1rem',
  lineHeight: 1.75,
};

export default async function QuotePage({ params }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) notFound();

  const quote = await getGeneratedQuoteById(idNum);
  if (!quote) notFound();

  const { preamble, sections } = quote.content ? parseQuoteSections(quote.content) : {};

  return (
    <div>
      <h1>{quote.job_description}</h1>
      <p style={{ color: '#666' }}>
        Generated {formatDate(quote.generated_at)}
      </p>
      {quote.content ? (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <QuoteActions
              content={quote.content}
              jobDescription={quote.job_description}
              generatedAt={quote.generated_at}
            />
          </div>
          {preamble && <pre style={preStyle}>{preamble}</pre>}
          {sections.map((section) => (
            <details key={section.heading} style={detailsStyle}>
              <summary style={summaryStyle}>{section.heading}</summary>
              <pre style={sectionBodyStyle}>{section.body}</pre>
            </details>
          ))}
        </>
      ) : (
        <p>No content was saved for this quote.</p>
      )}
    </div>
  );
}
