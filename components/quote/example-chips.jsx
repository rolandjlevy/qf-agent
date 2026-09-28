import { examplesFor } from '@/lib/example-jobs';

// The selected trade's examples as one-tap chips. The parent hides this once there's text.
export default function ExampleChips({ trade, onPick }) {
  const examples = examplesFor(trade);
  if (!examples.length) return null;

  return (
    <div className="flex flex-col gap-2.5 md:gap-1.5 md:pt-1">
      {/* Mobile only: a rule between the tip card and the examples. */}
      <hr className="m-0 mb-1 border-0 border-t border-border md:hidden" />
      <span id="example-chips-label" className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase md:font-medium md:tracking-normal md:normal-case">
        <span className="md:hidden">Try an example</span>
        <span className="hidden md:inline">Try an example template:</span>
      </span>
      {/* Mobile: one row that scrolls sideways (scrollbar hidden); -mx/px lets chips scroll to the screen edge. */}
      <ul
        aria-labelledby="example-chips-label"
        className="-mx-5 my-0 flex list-none gap-2.5 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:gap-2 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {examples.map((example) => (
          <li key={example.label} className="shrink-0">
            <button
              type="button"
              data-slot="example-chip"
              onClick={() => onPick(example)}
              className="group inline-flex h-11 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {/* The pill (42px mobile, 36px desktop) sits inside the 44px button, as on the trade chip. */}
              <span className="inline-flex h-[42px] items-center rounded-full border border-border bg-card px-4 text-sm font-medium whitespace-nowrap text-foreground shadow-sm transition-all group-hover:border-brand group-hover:bg-brand-tint group-hover:text-brand group-active:scale-95 md:h-9 md:px-3.5 md:text-[13px] md:shadow-xs md:group-active:scale-[0.98]">
                {example.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
