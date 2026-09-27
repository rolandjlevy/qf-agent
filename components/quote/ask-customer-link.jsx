import { Send } from 'lucide-react';

// The customer photo-request page doesn't exist yet, so this stays off unless the flag is set.
export const ASK_CUSTOMER_LINK_ENABLED = process.env.NEXT_PUBLIC_ASK_CUSTOMER_LINK === 'true';

export default function AskCustomerLink({ href }) {
  if (!ASK_CUSTOMER_LINK_ENABLED) return null;
  return (
    <a
      href={href}
      className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-foreground underline decoration-brand decoration-2 underline-offset-4 hover:text-brand"
    >
      <Send className="size-4" aria-hidden="true" />
      No photos yet? Ask the customer for them
    </a>
  );
}
