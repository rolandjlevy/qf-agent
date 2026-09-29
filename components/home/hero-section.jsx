import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { exampleJobBySlug } from '@/lib/example-jobs';
import CtaLink from './cta-link';
import ConversionPreview from './conversion-preview';

// One-tap jobs that open /quote/new already filled in (lib/example-jobs.js). A renamed example drops out.
const HERO_EXAMPLES = [
  ['Bathroom refit', 'full-bathroom-refit'],
  ['Boiler swap', 'old-boiler-swap-to-a-combi'],
  ['Consumer unit', 'old-fuse-box-needs-replacing'],
  ['Retile a shower', 'retile-shower-enclosure'],
].filter(([, slug]) => exampleJobBySlug(slug));

export default function HeroSection() {
  return (
    <section aria-labelledby="hero-heading" className="flex flex-col gap-10 px-4 pt-10 pb-14 md:gap-14 md:px-6 md:pt-20 md:pb-20">
      <div className="mx-auto flex max-w-[760px] flex-col items-center gap-5 text-center md:gap-6">
        <p className="m-0 inline-flex items-center gap-2 rounded-full border border-brand-subtle-border bg-brand-tint px-3.5 py-1.5 text-[13px] font-semibold text-brand">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-brand" />
          </span>
          For UK sole traders
        </p>
        <h1 id="hero-heading" className="m-0 text-[34px] leading-[1.1] font-bold tracking-[-0.025em] md:text-[52px]">
          Reply to every quote request <span className="text-brand">before your competitors do.</span>
        </h1>
        <p className="m-0 max-w-[620px] text-base leading-relaxed text-muted-foreground md:text-lg">
          Paste the customer&apos;s message, add a photo, and QuoteFetch drafts a clear quote: materials, scope of
          work, assumptions and exclusions, ready to paste into an email.
        </p>
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <CtaLink />
          <a
            href="#quote-proof"
            className="inline-flex h-[52px] items-center justify-center gap-1.5 rounded-button border border-border bg-card px-6 text-base font-semibold text-foreground no-underline transition-colors hover:border-brand hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            See an example quote
            <ChevronDown className="size-4" aria-hidden="true" />
          </a>
        </div>

        <div className="flex w-full flex-col items-center gap-2">
          <span id="hero-examples-label" className="text-[13px] font-medium text-muted-foreground">
            Or try a common job:
          </span>
          {/* Mobile: one row that scrolls sideways, as on /quote/new's example chips. */}
          <ul
            aria-labelledby="hero-examples-label"
            className="-mx-4 my-0 flex max-w-[100vw] list-none gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
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
    </section>
  );
}
