import { ImagePlus, X } from 'lucide-react';
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
    <div className="px-4 pb-4 md:px-5">
      {/* pt-3/pr-3 leave room for the remove buttons, which sit half outside each tile. */}
      <ul className="m-0 flex list-none flex-wrap gap-3 p-0 pt-3 pr-3">
        {photos.map((p, i) => (
          <li key={p.id} className="relative size-[72px]">
            <img
              src={p.previewUrl}
              alt={`Photo ${i + 1}`}
              className={`size-full rounded-lg object-cover ${p.status === 'ready' ? '' : 'opacity-50'}`}
            />
            {p.status !== 'ready' && (
              <span
                className={`absolute bottom-1 left-1 rounded px-1 text-[11px] font-medium text-white ${
                  p.status === 'failed' ? 'bg-destructive' : 'bg-foreground/70'
                }`}
              >
                {STATUS_LABELS[p.status]}
              </span>
            )}
            {/* A 32px hit area around the 24px circle. */}
            <button
              type="button"
              data-slot="photo-remove"
              aria-label={`Remove photo ${i + 1}`}
              onClick={() => onRemove(p.id)}
              className="group absolute -top-3 -right-3 flex size-8 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring"
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-black/75 text-white group-hover:bg-black">
                <X className="size-3.5" strokeWidth={2} aria-hidden="true" />
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
              className="flex size-[72px] items-center justify-center rounded-lg border-2 border-dashed border-border bg-transparent text-muted-foreground hover:border-brand hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ImagePlus className="size-5" strokeWidth={1.75} aria-hidden="true" />
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
