import { Wrench } from 'lucide-react';
import CtaLink, { SecondaryLink, SectionHeading } from '@/components/home/cta-link';
import HomeFooter from '@/components/home/home-footer';

export const metadata = {
  title: 'Pricing — QuoteFetch',
  description: 'QuoteFetch plan details are on their way. In the meantime, you can start putting quotes together.',
};

// A holding page for the homepage's Pricing links: no plans exist yet, so it names no price or plan.
export default function PricingPage() {
  return (
    <div data-page-shell className="flex min-h-[calc(100dvh-56px)] flex-col md:min-h-[calc(100dvh-72px)]">
      <section aria-labelledby="pricing-heading" className="flex-1 px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto flex max-w-[640px] flex-col items-center gap-5">
          <SectionHeading
            id="pricing-heading"
            eyebrow="Pricing"
            title="Plan details are on their way."
            lead="We're still settling on plans. In the meantime, you can start putting quotes together."
          />
          <p className="m-0 inline-flex items-center gap-2 rounded-full border border-dashed border-input bg-muted/60 px-3.5 py-1 text-xs tracking-[0.03em] text-muted-foreground">
            <Wrench className="size-3.5" aria-hidden="true" />
            Pricing page coming soon
          </p>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <CtaLink />
            <SecondaryLink href="/#how">How it works</SecondaryLink>
          </div>
        </div>
      </section>
      <HomeFooter />
    </div>
  );
}
