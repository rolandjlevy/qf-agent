import { cn } from '@/lib/utils';

const STEPS = ['Describe job', 'Check materials', 'Send quote'];
// Shorter names for the mobile "Next: …" hint.
const NEXT_LABELS = ['', 'materials', 'send quote'];

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
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-semibold text-foreground">
            Step {current} of {STEPS.length} · {STEPS[current - 1]}
          </span>
          {next && <span className="text-muted-foreground">Next: {next}</span>}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
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
              {i > 0 && <span className="mx-3 h-px w-12 bg-input" aria-hidden="true" />}
              <span
                className={cn(
                  'flex size-[26px] items-center justify-center rounded-full text-[13px] font-semibold',
                  isCurrent
                    ? 'bg-brand text-primary-foreground'
                    : 'border border-muted-foreground text-muted-foreground',
                )}
                aria-hidden="true"
              >
                {step}
              </span>
              <span
                className={cn(
                  'ml-2 text-sm',
                  isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
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
