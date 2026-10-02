import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTION_BAR_CLASS, primaryButtonClass } from './primary-action';

// Shared parts for step 2's screens (photo review, key questions, clarifying question, materials),
// styled like step 1 and the loading panels between them.

// A step's outer column. With the mobile action bar fixed to the bottom, the padding keeps the last content clear of it.
export function stepClass(sticky = true) {
  return cn('flex flex-col gap-5 md:gap-6', sticky && 'pb-40 md:pb-0');
}

// The same heading block as LoadingPanel, so a step lands where its loading state was.
export function StepHeader({ id, title, children }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="m-0 text-2xl leading-tight font-bold">
        {title}
      </h2>
      {children && <p className="m-0 text-[15px] text-muted-foreground">{children}</p>}
    </div>
  );
}

// A white card, as on step 1's composer and recent quotes.
export const CARD_CLASS = 'rounded-card border border-border bg-card shadow-card';

// Back and Continue. `continueType="submit"` submits the surrounding form instead of calling onContinue.
// `sticky` fixes the bar to the bottom of the screen on mobile, like step 1's PrimaryAction.
export function StepActions({
  onBack,
  backLabel = 'Back',
  continueLabel = 'Continue',
  continueType = 'button',
  onContinue,
  submitting = false,
  submittingLabel = 'Working on it…',
  hint,
  sticky = true,
}) {
  return (
    <div className={sticky ? ACTION_BAR_CLASS : 'pt-1'}>
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-4">
        <div className="flex gap-2.5 md:shrink-0 md:gap-3">
          {onBack && (
            <button
              type="button"
              data-slot="secondary-action"
              onClick={onBack}
              disabled={submitting}
              className="inline-flex h-[52px] shrink-0 items-center justify-center gap-1.5 rounded-button border border-border bg-card px-5 text-base font-semibold text-foreground transition-colors hover:border-brand hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 md:px-6"
            >
              <ArrowLeft className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
              {backLabel}
            </button>
          )}
          <button
            type={continueType}
            data-slot="primary-action"
            onClick={continueType === 'button' ? onContinue : undefined}
            disabled={submitting}
            aria-describedby={hint ? 'step-actions-hint' : undefined}
            className={cn(primaryButtonClass(!submitting), 'flex-1 px-6 md:flex-none md:px-8')}
          >
            {submitting ? (
              <>
                <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                {submittingLabel}
              </>
            ) : (
              <>
                {continueLabel}
                <ArrowRight
                  className="size-5 transition-transform group-enabled:group-hover:translate-x-1 motion-reduce:transition-none"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </>
            )}
          </button>
        </div>
        {hint && (
          <p
            id="step-actions-hint"
            className="m-0 min-w-0 text-center text-xs leading-snug text-muted-foreground md:text-left md:text-[13px]"
          >
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

// One option of a radio or checkbox group, drawn as a pill like the example chips. The input stays in the
// page (sr-only) for keyboard and screen readers; the pill shows its checked and focus states.
export function ChoiceChip({ type = 'radio', name, value, checked, onChange, required, dashed, children }) {
  return (
    <label
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center rounded-full border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-xs transition-all select-none hover:border-brand active:scale-[0.98]',
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
        // Selected is a pale tint, not solid blue, so the answers never compete with the Continue button.
        'has-[:checked]:border-brand has-[:checked]:bg-brand-tint has-[:checked]:text-brand has-[:checked]:shadow-none has-[:checked]:ring-1 has-[:checked]:ring-brand has-[:checked]:ring-inset has-[:checked]:border-solid',
        dashed ? 'border-dashed border-input text-muted-foreground' : 'border-border',
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        required={required}
        className="sr-only"
      />
      {children}
    </label>
  );
}

// The drawn box for CheckRow and CheckTile. The real checkbox beside it is sr-only, for keyboard and screen readers.
function CheckMark({ checked }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'mt-px flex size-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors',
        checked ? 'border-brand bg-brand text-white' : 'border-input bg-card text-transparent group-hover:border-brand',
      )}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}

// A full-width checkbox row: the box, then its label and an optional caption. Unticked labels turn grey
// (colour only: changing the weight would rewrap the text).
export function CheckRow({ checked, onChange, label, caption, badge }) {
  return (
    <label className="group flex min-h-12 cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ring md:px-5">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <CheckMark checked={checked} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn('text-[15px] leading-snug font-semibold transition-colors', !checked && 'text-muted-foreground')}>
            {label}
          </span>
          {badge}
        </span>
        {caption && <span className="text-[13px] leading-snug text-muted-foreground">{caption}</span>}
      </span>
    </label>
  );
}

// A checkbox as its own rounded tile, for short statements like photo findings. Unticked tiles go dashed and grey;
// only colour and border style change, so nothing moves.
export function CheckTile({ checked, onChange, children, badge }) {
  return (
    <label
      className={cn(
        'group flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
        checked
          ? 'border-border bg-card shadow-xs hover:border-brand'
          : 'border-dashed border-input bg-surface-muted hover:border-brand',
      )}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <CheckMark checked={checked} />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <span className={cn('text-[15px] leading-snug font-medium transition-colors', !checked && 'text-muted-foreground')}>
          {children}
        </span>
        {badge}
      </span>
    </label>
  );
}

// A small rounded tag beside a label, e.g. "Added by you". `tone` picks brand blue or amber.
export function Tag({ tone = 'brand', children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-px text-[11px] font-semibold tracking-wide whitespace-nowrap',
        tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-brand-subtle-border bg-brand-tint text-brand',
      )}
    >
      {children}
    </span>
  );
}

// The "Please specify" box under an "Other" choice, and other single-line text fields in step 2.
export function TextField({ className, ...props }) {
  return (
    <input
      type="text"
      data-slot="input"
      className={cn(
        'h-11 w-full rounded-control border border-input bg-card px-3.5 text-base text-foreground shadow-xs outline-none transition-all placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand-subtle-border md:text-[15px]',
        className,
      )}
      {...props}
    />
  );
}
