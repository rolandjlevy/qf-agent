import { PoundSterling, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { IconCard, SectionHeading } from './cta-link';

// Each card restates one of CLAUDE.md's never-do rules; keep them true to what the app does.
const PROMISES = [
  {
    title: 'It never invents a price',
    body: 'Every material comes through as "Price TBC". You look up the real price and pick the one you\'d actually buy, so every figure is one you chose.',
    Icon: PoundSterling,
  },
  {
    title: 'It never fakes a compliance claim',
    body: "It won't put Part P, Gas Safe or any certification against your name. It states only the certifications you've added yourself, in your words.",
    Icon: ShieldCheck,
  },
  {
    title: 'Nothing goes out without you',
    body: 'You choose the materials before a word is written, and the finished quote is plain text you can edit. QuoteFetch drafts; you decide.',
    Icon: SlidersHorizontal,
  },
];

export default function TrustSection() {
  return (
    <section id="trust" aria-labelledby="trust-heading" className="px-4 py-14 md:px-6 md:py-20">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-10">
        <SectionHeading
          id="trust-heading"
          eyebrow="Why trust it"
          title="Built to protect your reputation."
          lead="The reason your customers trust your quote is the reason you can trust QuoteFetch: it never pretends to know something it doesn't."
        />
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-5">
          {PROMISES.map(({ title, body, Icon }) => (
            <IconCard
              key={title}
              Icon={Icon}
              badge="border border-brand-subtle-border bg-brand-tint text-brand"
              title={title}
            >
              {body}
            </IconCard>
          ))}
        </ul>
      </div>
    </section>
  );
}
