import { Lightbulb } from 'lucide-react';
import { photoPromptFor } from '@/lib/example-jobs';
import AskCustomerLink, { ASK_CUSTOMER_LINK_ENABLED } from './ask-customer-link';

// What to write and which photos help, for the selected trade. Its id describes the composer's textarea.
export default function PhotoGuidanceCard({ trade, showAskCustomer }) {
  const { heading, full, short } = photoPromptFor(trade);
  return (
    <div
      id="job-description-help"
      className="flex flex-col gap-3 rounded-xl border border-brand-subtle-border bg-brand-tint p-4 shadow-xs"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-brand-subtle-border bg-card/60 text-brand">
          <Lightbulb className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-1 text-[13.5px] leading-relaxed">
          <p className="m-0 font-medium text-foreground">
            <strong className="font-semibold text-brand">{heading}:</strong> Include sizes, what&apos;s there now and
            what the customer wants.
          </p>
          <p className="m-0 text-[13px] text-muted-foreground">
            Best photos: <span className="hidden md:inline">{full}</span>
            <span className="md:hidden">{short}</span>
          </p>
        </div>
      </div>
      {showAskCustomer && ASK_CUSTOMER_LINK_ENABLED && (
        <div className="flex flex-col justify-between gap-1 border-t border-brand-subtle-border/60 pt-2 md:flex-row md:items-center md:gap-2">
          <span className="text-[12.5px] text-muted-foreground">Missing photos from the customer?</span>
          <AskCustomerLink href="#" />
        </div>
      )}
    </div>
  );
}
