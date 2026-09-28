import { Lightbulb } from 'lucide-react';
import { photoPromptFor } from '@/lib/example-jobs';
import AskCustomerLink, { ASK_CUSTOMER_LINK_ENABLED } from './ask-customer-link';

// What to write and which photos help, for the selected trade. Its id describes the composer's textarea.
// Mobile drops the trade heading and the icon tile to keep the card short.
export default function PhotoGuidanceCard({ trade, showAskCustomer }) {
  const { heading, full, short } = photoPromptFor(trade);
  return (
    <div
      id="job-description-help"
      className="flex flex-col gap-3 rounded-2xl border border-brand-subtle-border bg-linear-to-br from-brand-tint via-brand-tint/50 to-card p-4 shadow-sm md:rounded-xl md:bg-none md:bg-brand-tint md:shadow-xs"
    >
      <div className="flex items-start gap-2.5 md:gap-3">
        <span className="mt-0.5 flex shrink-0 items-center justify-center text-brand md:size-7 md:rounded-lg md:border md:border-brand-subtle-border md:bg-card/60">
          <Lightbulb className="size-5 md:size-[18px]" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-1 text-[13px] leading-snug md:text-[13.5px] md:leading-relaxed">
          <p className="m-0 font-medium text-foreground">
            <strong className="hidden font-semibold text-brand md:inline">{heading}: </strong>
            Include sizes, what&apos;s there now and what the customer wants.
          </p>
          <p className="m-0 text-muted-foreground md:text-[13px]">
            <strong className="font-semibold text-foreground md:hidden">Helpful photos:</strong>
            <span className="hidden md:inline">Best photos:</span> <span className="hidden md:inline">{full}</span>
            <span className="md:hidden">{short}</span>
          </p>
        </div>
      </div>
      {showAskCustomer && ASK_CUSTOMER_LINK_ENABLED && (
        <div className="flex flex-col justify-between gap-1 border-t border-brand-subtle-border/60 pt-2 md:flex-row md:items-center md:gap-2">
          <span className="hidden text-[12.5px] text-muted-foreground md:inline">Missing photos from the customer?</span>
          <AskCustomerLink href="#" />
        </div>
      )}
    </div>
  );
}
