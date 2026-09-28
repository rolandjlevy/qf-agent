import { Send } from 'lucide-react';

// The customer photo-request page doesn't exist yet, so this stays off unless the flag is set.
export const ASK_CUSTOMER_LINK_ENABLED = process.env.NEXT_PUBLIC_ASK_CUSTOMER_LINK === 'true';

// Mobile: a full-width outlined button. Desktop: an inline text link.
export default function AskCustomerLink({ href }) {
  if (!ASK_CUSTOMER_LINK_ENABLED) return null;
  return (
    <a
      href={href}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-subtle-border bg-card px-3 text-[13px] font-semibold text-brand no-underline shadow-sm transition-all active:scale-[0.98] md:w-auto md:justify-start md:gap-1.5 md:self-start md:rounded-none md:border-0 md:bg-transparent md:px-0 md:shadow-none md:hover:text-brand-hover md:hover:underline"
    >
      <Send className="size-[18px] md:size-4" strokeWidth={1.75} aria-hidden="true" />
      <span className="md:hidden">No photos yet? Ask customer for photos</span>
      <span className="hidden md:inline">Send customer photo request link</span>
    </a>
  );
}
