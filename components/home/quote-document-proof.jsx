import Link from 'next/link';
import { quoteSections, sampleQuoteFor } from '@/lib/sample-quotes';

// Real pipeline output (lib/sample-quotes.json), trimmed to fit, with an example business in the header.
const SAMPLE_KEY = 'electrician';
const EXAMPLE_HEADER = 'Miller Electrical | 07700 900461 | Leicester';
// How many lines of each section to show; the rest is left for the full example page.
const SHOW_LINES = { 'MATERIALS & EQUIPMENT': 4, 'SCOPE OF WORK': 4, ASSUMPTIONS: 2, EXCLUSIONS: 2 };
// Which callout (1-4) marks each part of the document.
const MARKERS = { header: 1, 'MATERIALS & EQUIPMENT': 2, 'SCOPE OF WORK': 3, EXCLUSIONS: 4 };

const CALLOUTS = [
  ['Your business name and contact details', 'Filled in from your profile on every quote.'],
  [
    'One specific product per line',
    'Never a made-up price: look up current prices from Screwfix, Toolstation, B&Q or Amazon and pick the one you want.',
  ],
  ['The scope of work in plain English', 'So the customer knows exactly what they are paying for.'],
  ['Assumptions and exclusions in writing', 'The things that cause arguments on site, agreed before you start.'],
];

function Marker({ n }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white"
    >
      {n}
    </span>
  );
}

// "• Item (qty: 1) — [Price TBC]": the placeholder gets its own muted pill.
function QuoteLine({ line }) {
  const [text, price] = line.split(' — [Price TBC]');
  return (
    <li className="leading-relaxed">
      {text}
      {price !== undefined && (
        <span className="ml-1.5 inline-block rounded bg-muted px-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground">
          Price TBC
        </span>
      )}
    </li>
  );
}

export default function QuoteDocumentProof() {
  const sample = sampleQuoteFor(SAMPLE_KEY);
  const { intro, sections } = quoteSections(sample.content);
  const shown = sections.filter((s) => SHOW_LINES[s.heading]);

  return (
    <section id="quote-proof" aria-labelledby="proof-heading" className="px-4 py-14 md:px-6 md:py-20">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-10">
        <div className="mx-auto flex max-w-[640px] flex-col items-center gap-3 text-center">
          <p className="m-0 text-xs font-semibold tracking-[0.08em] text-brand uppercase">Example quote</p>
          <h2 id="proof-heading" className="m-0 text-[28px] leading-tight font-bold tracking-[-0.02em] md:text-[36px]">
            Looks like it came from a firm ten times your size.
          </h2>
          <p className="m-0 text-base text-muted-foreground md:text-lg">
            Clear, thorough quotes build trust, and trust wins jobs.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
          <article
            aria-label={`Example quote: ${sample.title}`}
            className="relative rounded-card border border-border bg-card p-5 text-[15px] shadow-card md:p-8"
          >
            <div className="flex items-start gap-3 border-b border-border-subtle pb-4">
              <p className="m-0 min-w-0 flex-1 font-semibold [overflow-wrap:anywhere]">{EXAMPLE_HEADER}</p>
              <Marker n={MARKERS.header} />
            </div>
            {intro.map((line) => (
              <p key={line} className="m-0 mt-4 leading-relaxed">
                {line}
              </p>
            ))}
            {shown.map(({ heading, lines }) => {
              const bullets = lines.filter((l) => l.startsWith('•'));
              return (
                <div key={heading} className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="m-0 text-sm font-bold tracking-[0.04em]">{heading}</h3>
                    {MARKERS[heading] && <Marker n={MARKERS[heading]} />}
                  </div>
                  <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
                    {bullets.slice(0, SHOW_LINES[heading]).map((line) => (
                      <QuoteLine key={line} line={line} />
                    ))}
                  </ul>
                </div>
              );
            })}
            {/* The document fades out; the full text is one click away. */}
            <div className="mt-6 border-t border-border-subtle pt-4 text-sm text-muted-foreground">
              Next steps and terms (valid for 30 days) follow.{' '}
              <Link
                href={`/quote/example/${SAMPLE_KEY}`}
                className="font-semibold text-foreground underline decoration-brand decoration-2 underline-offset-4 hover:text-brand"
              >
                Read the full quote
              </Link>
            </div>
          </article>

          <ol className="m-0 flex list-none flex-col gap-5 p-0 lg:sticky lg:top-28">
            {CALLOUTS.map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <Marker n={i + 1} />
                <div className="flex flex-col gap-1">
                  <p className="m-0 font-semibold">{title}</p>
                  <p className="m-0 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
