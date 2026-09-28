import { ArrowRight, CircleCheck, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// No time estimate yet: add "Takes about a minute" only once p75 submit-to-materials is measured.
const ENABLED_HINT = "You'll check the materials before anything is drafted";

// A submit button for the step-1 form. On mobile it sits in a bar fixed to the bottom of the screen.
export default function PrimaryAction({ enabled, reason, submitting }) {
  const hint = submitting ? null : enabled ? ENABLED_HINT : reason;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-5 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] backdrop-blur-md md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
      <div className="flex flex-col items-stretch gap-2.5 md:flex-row md:items-center md:gap-4">
        <button
          type="submit"
          data-slot="primary-action"
          disabled={!enabled || submitting}
          aria-describedby={hint ? 'primary-action-hint' : undefined}
          className={cn(
            'inline-flex h-[50px] shrink-0 items-center justify-center gap-2 rounded-button px-7 text-base font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            enabled && !submitting
              ? 'bg-brand text-white shadow-cta hover:bg-brand-hover active:translate-y-px'
              : 'cursor-not-allowed bg-muted text-muted-foreground shadow-none',
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
              <ArrowRight className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </>
          )}
        </button>
        {hint && (
          <p
            id="primary-action-hint"
            className="m-0 flex items-center justify-center gap-1.5 text-center text-[13px] text-muted-foreground md:justify-start md:text-left"
          >
            {enabled && (
              <>
                <ShieldCheck className="hidden size-4 shrink-0 text-brand md:block" strokeWidth={1.75} aria-hidden="true" />
                <CircleCheck className="size-4 shrink-0 text-success md:hidden" strokeWidth={1.75} aria-hidden="true" />
              </>
            )}
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
