import { Star, TriangleAlert } from 'lucide-react';
import { SectionHeading } from './cta-link';

// PLACEHOLDER COPY: these people don't exist. Replace each with a real, consented quote and drop
// its `placeholder` flag; the banner shows while any entry still has one.
export const TESTIMONIALS = [
  {
    quote:
      "I used to write quotes at 9pm with my tea going cold. Now I do it in the van before I've pulled off the drive. Won two jobs last week just by being first.",
    name: 'Dave M.',
    role: 'Electrician · Leicester',
    placeholder: true,
  },
  {
    quote:
      'The quotes look properly professional now: scope, assumptions, the lot. A customer told me mine was the clearest of the three she got.',
    name: 'Priya S.',
    role: 'Bathroom fitter · Reading',
    placeholder: true,
  },
  {
    quote:
      "Best bit is it doesn't try to be clever with prices. It leaves them for me to fill in from my own supplier, so nothing on the quote is ever wrong.",
    name: 'Tom H.',
    role: 'Plumber · Newcastle',
    placeholder: true,
  },
];

const initials = (name) => name.replace(/[^A-Z]/g, '').slice(0, 2);

export default function TestimonialsSection() {
  const hasPlaceholders = TESTIMONIALS.some((t) => t.placeholder);
  return (
    <section aria-labelledby="testimonials-heading" className="px-4 py-14 md:px-6 md:py-20">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-10">
        {hasPlaceholders && (
          <p
            role="note"
            className="m-0 inline-flex items-center gap-2 self-center rounded-[10px] border border-dashed border-amber-400 bg-amber-50 px-3.5 py-2 text-[13px] font-medium text-amber-800"
          >
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            Sample testimonials: placeholder copy. Replace with real customer quotes (and remove this banner) before
            launch.
          </p>
        )}
        <SectionHeading
          id="testimonials-heading"
          eyebrow="What tradespeople say"
          title="Made to make you look good."
          lead="Quotes from the people who use it, added as your customers share them."
        />
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-5">
          {TESTIMONIALS.map(({ quote, name, role }) => (
            <li key={name} className="flex flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-card">
              <figure className="m-0 flex flex-1 flex-col gap-4">
                <span className="flex gap-0.5 text-amber-500" role="img" aria-label="5 out of 5 stars">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="size-4 fill-current" aria-hidden="true" />
                  ))}
                </span>
                <blockquote className="m-0 text-[15px] leading-relaxed">&ldquo;{quote}&rdquo;</blockquote>
                <figcaption className="mt-auto flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-brand-subtle-border bg-brand-tint text-[13px] font-semibold text-brand"
                  >
                    {initials(name)}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{name}</span>
                    <span className="text-[13px] text-muted-foreground">{role}</span>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
