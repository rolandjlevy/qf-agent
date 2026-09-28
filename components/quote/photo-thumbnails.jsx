import { Plus, X } from 'lucide-react';
import { MAX_JOB_PHOTOS } from '@/lib/constants';
import { examplePhoto, unsplashCredit } from '@/lib/example-photos';

const STATUS_LABELS = {
  compressing: 'Preparing…',
  uploading: 'Uploading…',
  failed: 'Failed',
};

// `photos` is `{ id, previewUrl, status: 'compressing'|'uploading'|'ready'|'failed', error? }[]`,
// owned by app/quote/new/new-quote-flow.js, which does the compress-and-upload work.
// `onAdd` opens the gallery picker from the desktop "Add photo" tile.
export default function PhotoThumbnails({ photos, onRemove, onAdd }) {
  // One line per distinct error, e.g. "Photos 1, 2, 3: Upload failed…", not one per photo.
  const errors = new Map();
  photos.forEach((p, i) => {
    if (p.status === 'failed') errors.set(p.error, [...(errors.get(p.error) ?? []), i + 1]);
  });

  // An attached example photo keeps the credit Unsplash's guidelines require wherever it's shown.
  const exampleTrade = photos.find((p) => p.fromExample)?.fromExample;
  const exampleSource = exampleTrade ? examplePhoto(exampleTrade) : null;
  const credit = exampleSource ? unsplashCredit(exampleSource) : null;

  return (
    <div className="px-4 pb-3 md:px-5 md:pb-5">
      <ul className="m-0 flex list-none flex-wrap items-center gap-3 p-0">
        {photos.map((p, i) => (
          <li key={p.id} className="relative size-[76px] overflow-hidden rounded-xl border border-border bg-surface-muted shadow-sm md:rounded-[10px] md:shadow-xs">
            <img
              src={p.previewUrl}
              alt={`Photo ${i + 1}`}
              className={`size-full object-cover ${p.status === 'ready' ? '' : 'opacity-50'}`}
            />
            {/* While a photo is on its way, its upload status; once it's in, its number (desktop only). */}
            <span
              className={`absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] leading-tight font-medium text-white ${
                p.status === 'failed' ? 'bg-destructive' : 'bg-black/60'
              } ${p.status === 'ready' ? 'hidden md:inline' : ''}`}
            >
              {p.status === 'ready' ? `#${i + 1}` : STATUS_LABELS[p.status]}
            </span>
            {/* Mobile: a 32px circle for thumbs. Desktop: a 20px circle in a 28px hit area. */}
            <button
              type="button"
              data-slot="photo-remove"
              aria-label={`Remove photo ${i + 1}`}
              onClick={() => onRemove(p.id)}
              className="group absolute top-1 right-1 flex size-8 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:top-0 md:right-0 md:size-7"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-foreground/90 text-white transition-all group-hover:bg-black group-active:scale-95 md:size-5 md:bg-black/80">
                <X className="size-[18px] md:size-3" strokeWidth={2} aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
        {photos.length < MAX_JOB_PHOTOS && (
          <li className="hidden md:block">
            <button
              type="button"
              data-slot="photo-add"
              aria-label="Add another photo"
              onClick={onAdd}
              className="flex size-[76px] flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-input bg-surface-muted text-muted-foreground transition-all hover:border-brand hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Plus className="size-5" strokeWidth={1.75} aria-hidden="true" />
              <span className="text-[10px] font-medium" aria-hidden="true">Add photo</span>
            </button>
          </li>
        )}
      </ul>
      {credit && (
        <p className="m-0 mt-2 text-xs text-muted-foreground">
          Example photo by{' '}
          <a href={credit.photographerHref} target="_blank" rel="noopener noreferrer" className="text-inherit underline">
            {credit.photographer}
          </a>{' '}
          on{' '}
          <a href={credit.unsplashHref} target="_blank" rel="noopener noreferrer" className="text-inherit underline">
            Unsplash
          </a>
        </p>
      )}
      {errors.size > 0 && (
        <ul className="m-0 mt-3 list-none p-0 text-sm text-destructive">
          {[...errors].map(([error, numbers]) => (
            <li key={error}>
              {numbers.length === 1 ? 'Photo' : 'Photos'} {numbers.join(', ')}: {error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
