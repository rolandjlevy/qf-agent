import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CTA_LABEL = 'Start a quote';

// The homepage's primary button: a brand-blue link (to /quote/new by default), styled like step 1's PrimaryAction.
export default function CtaLink({ href = '/quote/new', className, children = CTA_LABEL }) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex h-[52px] items-center justify-center gap-2 rounded-button border border-brand-hover/40 bg-linear-to-r from-brand to-brand-hover px-8 text-base font-semibold text-white no-underline shadow-cta transition-all hover:from-brand-hover hover:to-brand-hover active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      {children}
      <ArrowRight
        className="size-5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </Link>
  );
}

// Section heading block: optional eyebrow, h2 and lead, centred on every width.
export function SectionHeading({ id, eyebrow, title, lead }) {
  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center gap-3 text-center">
      {eyebrow && (
        <p className="m-0 text-xs font-semibold tracking-[0.08em] text-brand uppercase">{eyebrow}</p>
      )}
      <h2 id={id} className="m-0 text-[28px] leading-tight font-bold tracking-[-0.02em] md:text-[36px]">
        {title}
      </h2>
      {lead && <p className="m-0 text-base text-muted-foreground md:text-lg">{lead}</p>}
    </div>
  );
}

// The quieter button beside CtaLink: white, bordered, brand-blue on hover.
export function SecondaryLink({ href, className, children }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-[52px] items-center justify-center gap-1.5 rounded-button border border-border bg-card px-6 text-base font-semibold text-foreground no-underline transition-colors hover:border-brand hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
    >
      {children}
    </Link>
  );
}

// A white card with an icon badge, title and body: the problem and trust sections' three-up grids.
export function IconCard({ Icon, badge, title, children }) {
  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-card p-6 shadow-card">
      <span className={cn('inline-flex size-11 items-center justify-center rounded-xl', badge)} aria-hidden="true">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <h3 className="m-0 text-lg font-semibold">{title}</h3>
      <p className="m-0 text-[15px] leading-relaxed text-muted-foreground">{children}</p>
    </li>
  );
}
