import { ChevronDown } from 'lucide-react';
import { SectionHeading } from './cta-link';

// Answers must stay true to what the app does (CLAUDE.md's never-do rules in particular).
const FAQS = [
  [
    'Does QuoteFetch make up prices?',
    "No. Every material is left as \"Price TBC\" until you look it up. From the saved quote you can search current prices from Screwfix, Toolstation, B&Q and Amazon and pick the one you want, so every price is one you chose.",
  ],
  [
    'Will it say my work meets regulations?',
    "No. It never writes compliance claims like Part P or Gas Safe on your behalf. If you add your own certifications to your profile, it can state those as you wrote them.",
  ],
  [
    'Which trades does it work for?',
    'Twenty UK trades, from plumbers, electricians and gas engineers to roofers, landscapers and tree surgeons. Each one gets its own questions about the job.',
  ],
  [
    'Can I use it on my phone?',
    'Yes. It is built for the phone first: describe the job, take photos with your camera and copy the finished quote, all from the van.',
  ],
  [
    'Can I change the quote?',
    'You choose the materials before anything is written. The finished quote is plain text, so you can change any wording after you paste it into your email or message.',
  ],
];

export default function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="px-4 py-14 md:px-6 md:py-20">
      <div className="mx-auto flex max-w-[760px] flex-col gap-8">
        <SectionHeading id="faq-heading" eyebrow="FAQ" title="Questions tradespeople ask." />
        {/* Native <details>: keyboard and screen-reader support with no script. */}
        <div className="flex flex-col gap-3">
          {FAQS.map(([question, answer]) => (
            <details key={question} className="group rounded-card border border-border bg-card shadow-xs open:shadow-card">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-5 py-3 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                {question}
                <ChevronDown
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>
              <p className="m-0 px-5 pb-5 text-[15px] leading-relaxed text-muted-foreground">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
