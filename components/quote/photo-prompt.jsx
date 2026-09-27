import { photoPromptFor } from '@/lib/example-jobs';

// The composer's photo hint for the selected trade: the full list on desktop, a shorter one on mobile.
export default function PhotoPrompt({ trade }) {
  const { lead, full, leadShort, short } = photoPromptFor(trade);
  return (
    <p className="m-0">
      <span className="hidden md:inline">
        <span className="font-semibold text-foreground">{lead}</span> {full}
      </span>
      <span className="md:hidden">
        <span className="font-semibold text-foreground">{leadShort}</span> {short}
      </span>
    </p>
  );
}
