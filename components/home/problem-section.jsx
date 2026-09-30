import { Clock, ListChecks, Moon } from 'lucide-react';
import { IconCard, SectionHeading } from './cta-link';

const PROBLEMS = [
  {
    title: 'Leads go cold',
    body: 'Customers usually ask more than one trade. A quote that turns up next week turns up too late.',
    Icon: Clock,
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    title: 'Evenings disappear',
    body: 'Typing up quotes after a day on the tools eats the time you have left with your family.',
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
    <section id="why" aria-labelledby="problem-heading" className="px-4 py-14 md:px-6 md:py-20">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-10">
        <SectionHeading
          id="problem-heading"
          eyebrow="The quoting bottleneck"
          title="The job often goes to whoever quotes first."
          lead="A clear quote on the customer's phone the same day says you're organised before you've even started."
        />
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-5">
          {PROBLEMS.map(({ title, body, Icon, badge }) => (
            <IconCard key={title} Icon={Icon} badge={badge} title={title}>
              {body}
            </IconCard>
          ))}
        </ul>
      </div>
    </section>
  );
}
