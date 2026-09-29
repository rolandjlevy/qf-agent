import Logo from '@/components/logo';
import CtaLink from './cta-link';

export default function ClosingCtaBand() {
  return (
    <section aria-labelledby="closing-heading" className="relative overflow-hidden bg-night px-4 py-20 text-white md:px-6 md:py-24">
      {/* The logo mark as a watermark: 15% opacity, turned 20° anticlockwise, bleeding off the right edge. */}
      <Logo
        variant="mark"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -right-24 h-[420px] w-auto -translate-y-1/2 -rotate-20 opacity-15 md:-right-10 md:h-[520px]"
      />
      <div className="relative mx-auto flex max-w-[640px] flex-col items-center gap-5 text-center">
        <p className="m-0 text-xs font-semibold tracking-[0.08em] text-brand-light uppercase">For UK tradespeople</p>
        <h2 id="closing-heading" className="m-0 text-[30px] leading-tight font-bold tracking-[-0.02em] md:text-[40px]">
          Your next customer is waiting for a quote.
        </h2>
        <p className="m-0 text-base text-[#C9C7C1] md:text-lg">Reply first. Reply properly. Get your evenings back.</p>
        <CtaLink className="mt-2 w-full sm:w-auto" />
      </div>
    </section>
  );
}
