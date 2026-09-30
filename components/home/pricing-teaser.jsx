import { Wrench } from 'lucide-react';
import CtaLink, { SecondaryLink, SectionHeading } from './cta-link';

// No plans exist yet (no sign-in until Phase 4), so this names no price or plan.
export default function PricingTeaser() {
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="px-4 py-14 md:px-6 md:py-20">
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-5">
        <SectionHeading
          id="pricing-heading"
          eyebrow="Simple pricing"
          title="Pricing that pays for itself in one job."
          lead="Full plan details are on their way. In the meantime, you can start putting quotes together."
        />
        <p className="m-0 inline-flex items-center gap-2 rounded-full border border-dashed border-input bg-muted/60 px-3.5 py-1 text-xs tracking-[0.03em] text-muted-foreground">
          <Wrench className="size-3.5" aria-hidden="true" />
          Plan details to be confirmed. Pricing page coming soon
        </p>
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <CtaLink href="/pricing">See pricing</CtaLink>
          <SecondaryLink href="/quote/new">Start a quote</SecondaryLink>
        </div>
      </div>
    </section>
  );
}
