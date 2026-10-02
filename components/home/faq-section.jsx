import { ChevronDown } from 'lucide-react';
import { SectionHeading } from './cta-link';

// Answers must stay true to what the app does (CLAUDE.md's never-do rules in particular).
// Ordered by what a trader most needs to know first: time and how it works, then control and disputes, then fit and data.
export const FAQS = [
  // Time
  [
    'Will this actually save me time, or is it just another app to learn?',
    "There's nothing to set up and nothing to learn. You type a few rough sentences about the job, answer some quick follow-up questions, and the quote is written. It's not a system to manage — it's a write-up that happens for you.",
  ],

  // AI
  [
    'Is it AI? How does it write the quote?',
    "Yes, Claude by Anthropic. It asks about the job, lets you check the materials, then writes the quote. The rules aren't left to the AI: the app checks every quote, keeping prices at \"Price TBC\" and removing any compliance claims.",
  ],

  // Accuracy
  [
    'What if the quote misses something important?',
    'The follow-up questions are designed to catch the things that are easy to miss — the ones that cause problems on site. But you always review the full quote before it goes anywhere. The scope, materials and exclusions are all visible and editable. Think of it as a thorough first draft from someone who knows your trade — you still read it, adjust it, and put your name on it.',
  ],

  // Control
  [
    "I can't send a customer something I haven't checked. What if it's wrong?",
    'You check everything before it goes anywhere. You choose the materials before a word is written. The finished quote is plain text you can read, edit and change. Nothing is sent without you. QuoteFetch writes a draft — you decide what goes out with your name on it.',
  ],

  // Disputes
  [
    'What if the customer says "I thought that was included"?',
    "That's exactly what the assumptions and exclusions sections prevent. Every quote spells out what you've based the quote on and what's not covered — in writing, before the job starts. If they agreed to a quote that says \"excludes decoration after pipework alterations,\" that argument doesn't happen on site.",
  ],

  // Haggling
  [
    'Customers always try to haggle. Does a better quote help?',
    'A quote that clearly itemises scope, materials, assumptions and exclusions is much harder to push back on than a number in a text message. When the customer can see exactly what\'s included and what isn\'t, the conversation shifts from "can you do it cheaper" to "okay, that\'s what it covers."',
  ],

  // Price credibility
  [
    'My customers always check the prices. Will they catch it out?',
    'Every material is left as "Price TBC" until you look it up yourself. You search current prices from Screwfix, Toolstation, B&Q or Amazon right from the quote and pick the one you\'d actually buy. So every price on the quote is real, and one you chose.',
  ],

  // Trade specificity
  [
    'Does it actually know my trade, or is it generic?',
    "Every trade gets its own questions — the ones you'd ask on a site visit. For plumbers, electricians, bathroom fitters, carpenters, roofers, decorators, builders, landscapers and plasterers it also follows a guide for each common job: what to ask, what's usually needed and what's easy to miss. A consumer unit swap gets different questions from a bathroom refit.",
  ],

  // Safety guardrails
  [
    'Does it make up prices or claim my work meets regulations?',
    'No to both. It never invents a price — every material stays at "Price TBC" until you look it up. And it never writes compliance claims like Part P or Gas Safe on your behalf. If you add your certifications to your profile, it states those exactly as you wrote them. Nothing more.',
  ],

  // Why change
  [
    'I just text my quotes or use Word. Why would I change?',
    "Because a text message with a number on it invites pushback and gives you nothing to fall back on when there's a dispute. A clear quote with scope, materials and exclusions looks more professional, protects you, and takes less time than opening Word. You can still send it over WhatsApp — just copy and paste.",
  ],

  // Legal
  [
    'Does a proper quote protect me if something goes wrong?',
    "A clear written quote with assumptions and exclusions gives you something to point to if there's a disagreement. It's not a guarantee against every dispute, but when the scope says what's included, what's not, and what you've assumed, both sides know where they stand before the job starts. That's a much stronger position than a verbal agreement or a number on a text.",
  ],

  // Value
  [
    'Is it really worth using for every quote?',
    "A thorough, clear quote is more likely to win the job than a rushed one — and less likely to cause problems on site. If it helps you win even one job you'd have lost by being slow or looking less professional, it was worth using.",
  ],

  // Mobile
  [
    'Can I do the whole thing from my phone?',
    "Yes, it's built for it. Describe the job, take photos with your camera, answer the follow-up questions, check the materials, and copy the finished quote — all from your phone, on site or in the van.",
  ],

  // Privacy
  [
    "Where does my data go? Is my customer's information safe?",
    "Your job descriptions, photos and quotes are stored so you can come back to them. To write the quote, your description and photos are sent to Anthropic's AI (Claude), which doesn't train its models on them. QuoteFetch doesn't sell your data or use it for advertising.",
  ],
];

// schema.org FAQPage built from the same list, so the structured data can't drift from the page.
export const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(([name, text]) => ({
    '@type': 'Question',
    name,
    acceptedAnswer: { '@type': 'Answer', text },
  })),
};

export default function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="px-4 py-14 md:px-6 md:py-20"
    >
      <div className="mx-auto flex max-w-[760px] flex-col gap-8">
        <SectionHeading
          id="faq-heading"
          eyebrow="FAQ"
          title="Questions tradespeople ask."
        />
        {/* Native <details>: keyboard and screen-reader support with no script. */}
        <div className="flex flex-col gap-3">
          {FAQS.map(([question, answer]) => (
            <details
              key={question}
              className="group rounded-card border border-border bg-card shadow-xs open:shadow-card"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-5 py-3 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                {question}
                <ChevronDown
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>
              <p className="m-0 px-5 pb-5 text-[15px] leading-relaxed text-muted-foreground">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
