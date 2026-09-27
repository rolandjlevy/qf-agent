'use client';

import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { draftingProgress } from '@/lib/new-quote';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingPanel from './loading-panel';

// Each wait's placeholder mirrors the layout that replaces it, so nothing jumps when it lands.
// Widths vary per row (fixed, not random) so the list reads as text, not a grid of bars.
const LABEL_WIDTHS = ['62%', '48%', '71%', '55%', '66%', '44%'];
const CAPTION_WIDTHS = ['38%', '30%', '44%', '26%', '35%', '32%'];

// Phase A: proposing materials (POST /api/quote/propose-materials).
export function MaterialsLoading() {
  return (
    <LoadingPanel
      title="Working out what's needed"
      message="Reading the job and your answers to list the materials."
      slowMessage="Still working. Bigger jobs take a little longer."
      slowAfterMs={12000}
    >
      <ul className="m-0 flex list-none flex-col gap-4 rounded-card border border-border bg-card p-5">
        {LABEL_WIDTHS.map((width, i) => (
          <li key={width} className="flex items-start gap-3">
            <Skeleton index={i} className="mt-0.5 size-4 shrink-0 rounded-[4px]" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton index={i} className="h-4" style={{ width }} />
              <Skeleton index={i} className="h-3" style={{ width: CAPTION_WIDTHS[i] }} />
            </div>
          </li>
        ))}
      </ul>
    </LoadingPanel>
  );
}

const SHOWN_PHOTOS = 4;

// Photo analysis (POST /api/quote/analyse-photos): the trader's own photos, each with a scan
// line passing over it, beside placeholder observations.
export function PhotoAnalysisLoading({ photos }) {
  const shown = photos.slice(0, SHOWN_PHOTOS);
  const more = photos.length - shown.length;
  return (
    <LoadingPanel
      title="Looking at your photos"
      message={`Checking ${photos.length} photo${photos.length === 1 ? '' : 's'} for details that affect the quote. This usually takes 10 to 30 seconds.`}
      slowMessage="Still looking. A few more seconds."
      slowAfterMs={25000}
    >
      <ul className="m-0 flex list-none flex-col gap-4 rounded-card border border-border bg-card p-5">
        {shown.map((photo, i) => (
          <li key={photo.id} className="flex items-start gap-4">
            <div className="photo-scan relative size-[72px] shrink-0 overflow-hidden rounded-control" style={{ '--i': i }}>
              <img src={photo.previewUrl} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            </div>
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <Skeleton index={i} className="h-4" style={{ width: LABEL_WIDTHS[i] }} />
              <Skeleton index={i} className="h-4" style={{ width: CAPTION_WIDTHS[i + 1] }} />
            </div>
          </li>
        ))}
        {more > 0 && (
          <li className="text-sm text-muted-foreground">
            and {more} more photo{more === 1 ? '' : 's'}
          </li>
        )}
      </ul>
    </LoadingPanel>
  );
}

// Phase B: drafting the quote. Progress comes from the run's real steps, not a timer.
export function QuoteDraftingProgress({ steps, materialsCount }) {
  const { sections, doneCount, saving, saved, fraction } = draftingProgress(steps);
  const percent = Math.round(fraction * 100);
  const status = saved
    ? 'Quote saved. Opening it now.'
    : saving
      ? 'All sections drafted. Saving your quote.'
      : `${doneCount} of ${sections.length} sections drafted.`;

  return (
    <LoadingPanel
      title="Drafting your quote"
      message={`Writing each section from the ${materialsCount} material${materialsCount === 1 ? '' : 's'} you checked.`}
      slowMessage="Still drafting. Longer jobs can take a couple of minutes."
      slowAfterMs={60000}
    >
      <div className="flex flex-col gap-2">
        <div
          role="progressbar"
          aria-label="Quote progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.max(percent, 4)}%` }}
          />
        </div>
        {/* Polite, so each finished section is announced without interrupting. */}
        <p aria-live="polite" className="m-0 text-sm text-muted-foreground">
          {status}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        <ol className="m-0 flex list-none flex-col gap-1 p-0">
          {sections.map((s) => (
            <li
              key={s.key}
              className={cn(
                'flex min-h-8 items-center gap-2.5 text-[15px]',
                s.state === 'pending' ? 'text-muted-foreground' : 'text-foreground',
                s.state === 'active' && 'font-semibold',
              )}
            >
              <StepIcon state={s.state} />
              {s.label}
              <span className="sr-only">
                {s.state === 'done' ? ', done' : s.state === 'active' ? ', drafting' : ''}
              </span>
            </li>
          ))}
          <li
            className={cn(
              'flex min-h-8 items-center gap-2.5 text-[15px]',
              saving || saved ? 'text-foreground' : 'text-muted-foreground',
              saving && 'font-semibold',
            )}
          >
            <StepIcon state={saved ? 'done' : saving ? 'active' : 'pending'} />
            Saving the quote
          </li>
        </ol>

        {/* A document outline behind the checklist, desktop only: on a phone the list is enough. */}
        <div aria-hidden="true" className="hidden flex-col gap-3 rounded-card border border-border bg-card p-6 md:flex">
          <Skeleton className="h-3 w-2/5" />
          <Skeleton index={1} className="h-3 w-full" />
          <Skeleton index={2} className="h-3 w-5/6" />
          {[0, 1, 2].map((block) => (
            <div key={block} className="mt-3 flex flex-col gap-2">
              <Skeleton index={block + 3} className="h-3.5 w-1/4 bg-input" />
              <Skeleton index={block + 3} className="h-3 w-11/12" />
              <Skeleton index={block + 4} className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </LoadingPanel>
  );
}

function StepIcon({ state }) {
  if (state === 'done') {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-white" aria-hidden="true">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'active') {
    return <Loader2 className="size-5 shrink-0 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />;
  }
  return <span className="size-5 shrink-0 rounded-full border-[1.5px] border-input" aria-hidden="true" />;
}
