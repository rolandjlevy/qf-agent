'use client';

import { Sparkles } from 'lucide-react';
import { CARD_CLASS, CheckTile, StepActions, StepHeader, Tag, stepClass } from '@/components/quote/step-layout';

const KIND_NOTES = {
  reference: 'A product, inspiration or work-in-progress shot, not the property as it is now',
  irrelevant: "Doesn't seem to show this job, so it wasn't used",
};
const NOTHING_SPOTTED = 'Nothing that affects the quote was spotted';

// Decorative: the "Photo N" label beside it names it, so alt text would only repeat that.
function Thumbnail({ src, className }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      className={`shrink-0 rounded-control border border-border-subtle bg-muted object-cover ${className}`}
    />
  );
}

// What the photo shows, written by the analysis from everything it spotted (lib/analyse-job-photos.js). Clamped to two lines.
function PhotoCaption({ photo }) {
  if (!photo.caption) return null;
  return (
    <p className="m-0 line-clamp-2 text-[13.5px] leading-snug text-muted-foreground" title={photo.caption}>
      {photo.caption}
    </p>
  );
}

// The trader confirms each observation before any of it reaches Phase A or Phase B:
// a misread label should never end up in a quote unchecked.
export function PhotoFindingsReview({ photos, analysis, jobSummary, questionCount, onToggle, onBack, onContinue }) {
  const byPhoto = analysis.photos.map((p) => ({
    ...p,
    preview: photos[p.imageIndex - 1]?.previewUrl,
    observations: analysis.observations.filter((o) => o.imageIndex === p.imageIndex),
  }));
  const withFindings = byPhoto.filter((p) => p.observations.length > 0);
  const withoutFindings = byPhoto.filter((p) => p.observations.length === 0);
  const detailCount = analysis.observations.length;

  return (
    <section aria-labelledby="photo-review-heading" className={stepClass()}>
      <StepHeader id="photo-review-heading" title="What we spotted in your photos">
        Untick anything that&apos;s wrong. Only ticked items are used for your questions and quote.
      </StepHeader>

      {/* Photos-only job: show what we took the job to be, since it becomes the job description. */}
      {jobSummary && (
        <div className="flex items-start gap-2.5 rounded-xl border border-brand-subtle-border bg-brand-tint p-4 text-[14px] leading-snug md:gap-3">
          <Sparkles className="mt-0.5 size-[18px] shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />
          <p className="m-0 flex flex-col gap-1">
            <span>
              <strong className="font-semibold text-brand">From your photos:</strong> {jobSummary}
            </span>
            <span className="text-[13px] text-muted-foreground">
              Go back to add a description if this isn&apos;t right.
            </span>
          </p>
        </div>
      )}

      {byPhoto.length > 1 && (
        <p className="-mb-1 text-[13px] font-medium text-muted-foreground tabular-nums">
          {byPhoto.length} photos · {detailCount} detail{detailCount === 1 ? '' : 's'} spotted
        </p>
      )}

      {withFindings.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
          {withFindings.map((p) => {
            const ticked = p.observations.filter((o) => o.checked).length;
            return (
              <li key={p.imageIndex} className={`${CARD_CLASS} flex flex-col gap-3.5 p-3 md:p-4`}>
                <div className="flex items-start gap-3.5 md:gap-4">
                  <Thumbnail src={p.preview} className="size-16 md:size-[72px]" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
                    <span className="flex items-start justify-between gap-3">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="m-0 text-[15px] font-semibold">Photo {p.imageIndex}</h3>
                        {p.kind === 'reference' && <Tag tone="amber">Reference photo</Tag>}
                        {p.kind === 'irrelevant' && <Tag tone="amber">May not be this job</Tag>}
                      </span>
                      <span className="shrink-0 pt-px text-[13px] font-medium text-muted-foreground tabular-nums">
                        {ticked} of {p.observations.length}
                        <span className="sr-only sm:not-sr-only"> ticked</span>
                      </span>
                    </span>
                    <PhotoCaption photo={p} />
                    {p.kind === 'irrelevant' && (
                      <p className="m-0 text-[13px] leading-snug text-amber-800">
                        It didn&apos;t look like this job, so these start unticked. Tick any that apply.
                      </p>
                    )}
                  </div>
                </div>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {p.observations.map((o) => (
                    <li key={o.id}>
                      <CheckTile
                        checked={o.checked}
                        onChange={() => onToggle(o.id)}
                        badge={o.confidence === 'low' && <Tag tone="amber">Unsure, please check</Tag>}
                      >
                        {o.observation}
                      </CheckTile>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      {/* Photos with nothing to tick share one quiet card (two columns on desktop), so up to 8 photos stay compact. */}
      {withoutFindings.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-card border border-dashed border-input p-3 md:px-4 md:py-3.5">
          <h3 className="m-0 text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">
            Nothing used from {withoutFindings.length === 1 ? 'this photo' : 'these photos'}
          </h3>
          <ul className="m-0 grid list-none grid-cols-1 gap-x-4 gap-y-2.5 p-0 md:grid-cols-2">
            {withoutFindings.map((p) => (
              <li key={p.imageIndex} className="flex min-w-0 items-center gap-3">
                <Thumbnail src={p.preview} className="size-11 opacity-80" />
                <span className="flex min-w-0 flex-col text-[13px] leading-snug">
                  <span className="font-semibold text-foreground">Photo {p.imageIndex}</span>
                  <span className="line-clamp-2 text-muted-foreground">
                    {p.caption ? `${p.caption}. ` : ''}
                    {KIND_NOTES[p.kind] ?? NOTHING_SPOTTED}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <StepActions
        onBack={onBack}
        onContinue={onContinue}
        hint={
          questionCount > 0 &&
          `Next, ${questionCount === 1 ? 'one quick question' : `${questionCount} quick questions`} about things the photos can't show.`
        }
      />
    </section>
  );
}
