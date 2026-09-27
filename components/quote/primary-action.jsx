import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// No time estimate yet: add "Takes about a minute" only once p75 submit-to-materials is measured.
const ENABLED_HINT = "You'll check the materials before anything is drafted";

// A submit button for the step-1 form. On mobile it sits in a bar fixed to the bottom of the screen.
export default function PrimaryAction({ enabled, reason, submitting }) {
  const hint = submitting ? null : enabled ? ENABLED_HINT : reason;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-5 pt-3.5 pb-[calc(28px+env(safe-area-inset-bottom))] md:static md:z-auto md:border-0 md:bg-transparent md:p-0">
      <div className="flex flex-col items-stretch gap-2.5 md:flex-row md:items-center md:gap-4">
        <button
          type="submit"
          data-slot="primary-action"
          disabled={!enabled || submitting}
          aria-describedby={hint ? 'primary-action-hint' : undefined}
          className={cn(
            'inline-flex h-[52px] items-center justify-center gap-2.5 rounded-button px-6 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            enabled && !submitting
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'cursor-not-allowed bg-muted text-muted-foreground',
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Working on it…
            </>
          ) : (
            <>
              Get materials list
              <ArrowRight className="size-5" aria-hidden="true" />
            </>
          )}
        </button>
        {hint && (
          <p id="primary-action-hint" className="m-0 text-center text-sm text-muted-foreground md:text-left">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
