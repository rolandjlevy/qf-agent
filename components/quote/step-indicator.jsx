import { cn } from '@/lib/utils';

const STEPS = ['Describe job', 'Check materials', 'Send quote'];
// Shorter names for the mobile "Next: …" hint.
const NEXT_LABELS = ['', 'Materials', 'Send quote'];

// Where a /quote/new phase sits among the three steps.
export function stepForPhase(phase) {
  if (phase === 'form') return 1;
  if (phase === 'generating' || phase === 'running') return 3;
  return 2;
}

export default function StepIndicator({ current }) {
  const next = NEXT_LABELS[current];

  return (
    <>
      {/* Mobile: one text row and a progress bar. Hidden from screen readers, which get the list. */}
      <div className="md:hidden" aria-hidden="true">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold tracking-wider text-white uppercase">
            Step {current}
          </span>
          <span className="text-sm font-semibold text-foreground">{STEPS[current - 1]}</span>
          {next && <span className="ml-auto text-xs text-muted-foreground">Next: {next}</span>}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${(current / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* The list is the accessible version at every width; on mobile only screen readers get it. */}
      <ol aria-label="Progress" className="sr-only m-0 list-none items-center p-0 md:not-sr-only md:flex">
        {STEPS.map((label, i) => {
          const step = i + 1;
          const isCurrent = step === current;
          return (
            <li
              key={label}
              aria-current={isCurrent ? 'step' : undefined}
              className="flex items-center"
            >
              {i > 0 && <span className="mx-4 h-[2px] w-14 bg-border" aria-hidden="true" />}
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs',
                  isCurrent
                    ? 'bg-brand font-semibold text-primary-foreground ring-2 ring-brand/20 ring-offset-2 ring-offset-background'
                    : 'border border-input bg-card font-medium text-muted-foreground',
                )}
                aria-hidden="true"
              >
                {step}
              </span>
              <span
                className={cn(
                  'ml-2.5 text-sm whitespace-nowrap',
                  isCurrent ? 'font-semibold text-brand' : 'font-medium text-muted-foreground',
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}
