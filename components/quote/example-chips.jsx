import { examplesFor } from '@/lib/example-jobs';

// The selected trade's examples as one-tap chips. The parent hides this once there's text.
export default function ExampleChips({ trade, onPick }) {
  const examples = examplesFor(trade);
  if (!examples.length) return null;

  return (
    <div className="flex flex-col gap-1.5 pt-1">
      <span id="example-chips-label" className="text-[13px] font-medium text-muted-foreground">
        Try an example template:
      </span>
      {/* Mobile: one row that scrolls sideways; -mx/px lets chips scroll to the screen edge. */}
      <ul
        aria-labelledby="example-chips-label"
        className="-mx-5 my-0 flex list-none gap-2 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      >
        {examples.map((example) => (
          <li key={example.label} className="shrink-0">
            <button
              type="button"
              data-slot="example-chip"
              onClick={() => onPick(example)}
              className="group inline-flex h-11 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {/* A 36px pill inside the 44px button, as on the trade chip. */}
              <span className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3.5 text-[13px] font-medium whitespace-nowrap text-foreground shadow-xs transition-all group-hover:border-brand group-hover:bg-brand-tint group-hover:text-brand group-active:scale-[0.98]">
                {example.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
