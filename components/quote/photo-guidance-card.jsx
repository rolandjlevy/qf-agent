import { Lightbulb } from 'lucide-react';
import { photoPromptFor } from '@/lib/example-jobs';
import AskCustomerLink, { ASK_CUSTOMER_LINK_ENABLED } from './ask-customer-link';

// What to write and which photos help, for the selected trade. Its id describes the composer's textarea.
export default function PhotoGuidanceCard({ trade, showAskCustomer }) {
  const { heading, full, short } = photoPromptFor(trade);
  return (
    <div id="job-description-help" className="flex gap-3 rounded-xl border border-brand-subtle-border bg-brand-tint p-4">
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-1 text-sm">
        <p className="m-0 font-semibold text-foreground">{heading}</p>
        <p className="m-0 text-muted-foreground">
          Include sizes, what&apos;s there now and what the customer wants.{' '}
          <span className="font-semibold text-foreground">Best photos:</span>{' '}
          <span className="hidden md:inline">{full}</span>
          <span className="md:hidden">{short}</span>
        </p>
        {showAskCustomer && ASK_CUSTOMER_LINK_ENABLED && (
          <div className="mt-2.5 border-t border-brand-subtle-border/50 pt-1">
            <AskCustomerLink href="#" />
          </div>
        )}
      </div>
    </div>
  );
}
