import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SAMPLE_QUOTE_KEYS, sampleQuoteFor } from '../../../../lib/sample-quotes.js';

// Static content, so each sample page can be built once.
export function generateStaticParams() {
  return SAMPLE_QUOTE_KEYS.map((trade) => ({ trade }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }) {
  const { trade } = await params;
  return { title: `Example quote: ${sampleQuoteFor(trade).title} · QuoteFetch` };
}

// A read-only sample, shown as the plain text the customer receives (Copy/Download on a real quote).
export default async function ExampleQuotePage({ params }) {
  const { trade } = await params;
  if (!SAMPLE_QUOTE_KEYS.includes(trade)) notFound();
  const sample = sampleQuoteFor(trade);

  return (
    <div data-page-shell className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-5 pt-4 pb-12 md:px-0 md:py-12">
      <Link
        href="/quote/new"
        className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-foreground no-underline hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to new quote
      </Link>
      <div className="flex flex-col gap-1">
        <p className="m-0 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">Example quote</p>
        <h1 className="m-0 text-[28px] leading-tight font-bold md:text-[32px]">{sample.title}</h1>
        <p className="m-0 text-sm text-muted-foreground">
          This is what your customer receives. Yours will have your business details and the prices you choose.
        </p>
      </div>
      <pre className="m-0 rounded-card border border-border bg-card p-5 font-sans text-[15px] leading-[1.6] whitespace-pre-wrap text-foreground md:p-8">
        {sample.content}
      </pre>
    </div>
  );
}
