import { cn } from '@/lib/utils';

// Shared layout for the app pages (/quotes, /profile), matching /quote/new's column and heading.

export function PageShell({ className, children }) {
  return (
    <div
      data-page-shell
      className={cn('mx-auto flex w-full max-w-[720px] flex-col gap-6 px-5 pt-6 pb-12 md:gap-8 md:px-0 md:py-12', className)}
    >
      {children}
    </div>
  );
}

// The page's h1 (same size as /quote/new's "What's the job?"), an optional line under it, and an action on the right.
export function PageHeader({ title, description, action }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[32px] leading-tight font-bold tracking-[-0.02em] md:text-[44px] md:leading-[1.15] md:tracking-[-0.025em]">
          {title}
        </h1>
        {description && <p className="m-0 text-[15px] text-muted-foreground md:text-base">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// A white outlined button for secondary actions, like StepActions' Back. `tone="danger"` turns red on hover.
export function secondaryButtonClass({ size = 'md', tone } = {}) {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-control border border-border bg-card font-semibold text-foreground no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60',
    size === 'sm' ? 'min-h-10 px-3 text-sm' : 'h-[52px] rounded-button px-6 text-base',
    tone === 'danger'
      ? 'hover:border-destructive hover:bg-red-50 hover:text-destructive'
      : 'hover:border-brand hover:bg-brand-tint hover:text-brand',
  );
}
