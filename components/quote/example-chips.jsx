import { examplesFor } from '@/lib/example-jobs';

// The selected trade's examples as one-tap chips. The parent hides this once there's text.
export default function ExampleChips({ trade, onPick }) {
  const examples = examplesFor(trade);
  if (!examples.length) return null;

  return (
    <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
      <span id="example-chips-label" className="shrink-0 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        Try an example
      </span>
      {/* Mobile: one row that scrolls sideways; -mx/px lets chips scroll to the screen edge. */}
      <ul
        aria-labelledby="example-chips-label"
        className="-mx-5 my-0 flex list-none gap-2 overflow-x-auto px-5 py-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      >
        {examples.map((example) => (
          <li key={example.label} className="shrink-0">
            <button
              type="button"
              data-slot="example-chip"
              onClick={() => onPick(example)}
              className="inline-flex h-11 items-center rounded-full border border-border bg-card px-4 text-[13px] font-medium whitespace-nowrap text-foreground transition-all hover:border-brand hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98]"
            >
              {example.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
