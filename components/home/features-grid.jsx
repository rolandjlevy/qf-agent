import { Camera, MessageCircleQuestion, MessageSquareText, Search, SlidersHorizontal, Smartphone } from 'lucide-react';
import { SectionHeading } from './cta-link';

const FEATURES = [
  {
    title: "Starts from the customer's message",
    body: 'Paste what they sent you. No forms to fill in or job codes to learn.',
    Icon: MessageSquareText,
    badge: 'bg-blue-100 text-brand',
  },
  {
    title: 'Works from photos',
    body: 'Add site photos and it picks up the details, so there are fewer questions to answer.',
    Icon: Camera,
    badge: 'bg-cyan-100 text-cyan-700',
  },
  {
    title: "Asks what you'd ask",
    body: 'A few questions about the job, like the age of the installation or the access, before anything is drafted.',
    Icon: MessageCircleQuestion,
    badge: 'bg-violet-100 text-violet-700',
  },
  {
    title: 'Real supplier prices, when you want them',
    body: 'Look up current prices for each material and pick the one you want. It never guesses a price.',
    Icon: Search,
    badge: 'bg-emerald-100 text-emerald-700',
  },
  {
    title: "You're always in charge",
    body: 'You choose the materials before the quote is written, and nothing is sent without you.',
    Icon: SlidersHorizontal,
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    title: 'Made for your phone',
    body: 'Take photos straight from the camera and have a quote ready before you leave the van.',
    Icon: Smartphone,
    badge: 'bg-sky-100 text-sky-700',
  },
];

export default function FeaturesGrid() {
  return (
    <section aria-labelledby="features-heading" className="px-4 py-14 md:px-6 md:py-20">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-10">
        <SectionHeading id="features-heading" title="Built for the way you actually work." />
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 md:gap-5">
          {FEATURES.map(({ title, body, Icon, badge }) => (
            <li key={title} className="flex flex-col gap-3 rounded-card border border-border bg-card p-6 shadow-card">
              <span className={`inline-flex size-11 items-center justify-center rounded-xl ${badge}`} aria-hidden="true">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <h3 className="m-0 text-lg font-semibold">{title}</h3>
              <p className="m-0 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
