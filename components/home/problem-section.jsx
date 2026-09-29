import { Clock, ListChecks, Moon } from 'lucide-react';
import { SectionHeading } from './cta-link';

const PROBLEMS = [
  {
    title: 'Leads go cold',
    body: 'Customers often ask more than one trade. A quote that turns up next week can turn up too late.',
    Icon: Clock,
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    title: 'Evenings disappear',
    body: 'Typing up quotes after a day on the tools eats into the time you have left.',
    Icon: Moon,
    badge: 'bg-rose-100 text-rose-700',
  },
  {
    title: 'Things get missed',
    body: 'Leave out an exclusion or an assumption and it comes back as an argument on site.',
    Icon: ListChecks,
    badge: 'bg-blue-100 text-brand',
  },
];

export default function ProblemSection() {
  return (
    <section aria-labelledby="problem-heading" className="px-4 py-14 md:px-6 md:py-20">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-10">
        <SectionHeading
          id="problem-heading"
          eyebrow="The quoting bottleneck"
          title="The job often goes to whoever quotes first."
          lead="A clear quote on the customer's phone the same day says you're organised before you've even started."
        />
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-5">
          {PROBLEMS.map(({ title, body, Icon, badge }) => (
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
