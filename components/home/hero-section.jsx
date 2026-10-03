import Link from 'next/link';
import { FileText } from 'lucide-react';
import { exampleJobBySlug } from '@/lib/example-jobs';
import CtaLink, { SecondaryLink } from './cta-link';
import ConversionPreview from './conversion-preview';

// One-tap jobs that open /quote/new already filled in (lib/example-jobs.js). A renamed example drops out.
const HERO_EXAMPLES = [
  ['Retile a shower', 'retile-shower-enclosure'],
  ['Boiler swap', 'old-boiler-swap-to-a-combi'],
  ['Bathroom refit', 'full-bathroom-refit'],
  ['Consumer unit', 'old-fuse-box-needs-replacing'],
].filter(([, slug]) => exampleJobBySlug(slug));

export default function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="px-4 pt-10 pb-14 md:px-6 md:pt-20 md:pb-20"
    >
      <div className="mx-auto grid max-w-[1120px] items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div className="flex flex-col items-start gap-5 md:gap-6">
          <p className="m-0 inline-flex items-center gap-2 rounded-full border border-brand-subtle-border bg-brand-tint px-3.5 py-1.5 text-[13px] font-semibold text-brand">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-brand" />
            </span>
            AI quoting for UK trades
          </p>
          <h1
            id="hero-heading"
            className="m-0 text-[34px] leading-[1.1] font-bold tracking-[-0.025em] md:text-[52px]"
          >
            QuoteFetch turns rough notes into{' '}
            <span className="text-brand">
              a professional quote, ready to send.
            </span>
          </h1>
          <p className="m-0 max-w-[560px] text-base leading-relaxed text-muted-foreground md:text-lg">
            Just add your customer’s message or photo. QuoteFetch asks the right
            questions for your trade, works out the materials, scope,
            assumptions and exclusions. Then you pick your prices for each
            material and send.
          </p>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <CtaLink />
            <SecondaryLink href="#proof" Icon={FileText}>See a real example</SecondaryLink>
          </div>
          <p className="m-0 max-w-[520px] text-sm text-muted-foreground">
            Works on your phone, on site: describe the job, take photos, send
            the quote before you leave the van.
          </p>

          <div className="flex w-full flex-col items-start gap-2">
            <span
              id="hero-examples-label"
              className="text-[13px] font-medium text-muted-foreground"
            >
              Or try a common job:
            </span>
            {/* Mobile: one row that scrolls sideways, as on /quote/new's example chips. */}
            <ul
              aria-labelledby="hero-examples-label"
              className="-mx-4 my-0 flex max-w-[100vw] list-none gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
            >
              {HERO_EXAMPLES.map(([label, slug]) => (
                <li key={slug} className="shrink-0">
                  <Link
                    href={`/quote/new?example=${slug}`}
                    className="inline-flex h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium whitespace-nowrap text-foreground no-underline shadow-xs transition-colors hover:border-brand hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ConversionPreview />
      </div>
    </section>
  );
}
