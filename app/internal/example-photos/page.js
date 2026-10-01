import { EXAMPLE_JOBS, exampleSlug } from '../../../lib/example-jobs.js';
import { examplePhoto, unsplashCredit, unsplashImageUrl } from '../../../lib/example-photos.js';
import { tradeLabel } from '../../../lib/constants.js';

// Internal review page, linked only from the README: kept out of search engines and the site's navigation.
export const metadata = {
  title: 'Example job photos · QuoteFetch',
  robots: { index: false, follow: false },
};

const SWAP_COMMAND = 'node --env-file=.env scripts/unsplash-examples.mjs <example slug> <photo link>';

// Photos picked as the best of a poor search, by photo id: swapping the photo clears its flag.
const WEAK_MATCHES = {
  'extra-double-sockets': { photoId: 'mLDLqGWRX54', note: 'European sockets, not UK' },
  'new-skirting-boards': { photoId: 'Nb4GiyBOETk', note: 'Skirting barely visible' },
  'fell-a-conifer': { photoId: 'rU2XDYaflao', note: 'A row of conifers, not one tall leylandii' },
  'single-storey-extension': { photoId: 'Zs9vage-0AM', note: 'Front of a semi, not the back garden' },
  'front-of-the-house': { photoId: '8Dz7mLqw4io', note: 'Brick, not render' },
  'new-back-door': { photoId: '8A8FMhstpM4', note: 'Looks like a front door' },
  'boiler-losing-pressure': { photoId: 'U0jpGKtMtWE', note: 'Pipework, no boiler in view' },
};

function weakNote(slug, photo) {
  const weak = WEAK_MATCHES[slug];
  return weak && photo?.id === weak.photoId ? weak.note : null;
}

function groupByTrade(jobs) {
  const groups = new Map();
  for (const job of jobs) groups.set(job.trade, [...(groups.get(job.trade) ?? []), job]);
  return [...groups];
}

function PhotoCard({ job }) {
  const slug = exampleSlug(job);
  const photo = examplePhoto(slug);
  const weak = weakNote(slug, photo);
  const credit = photo ? unsplashCredit(photo) : null;

  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-border bg-card">
      {photo ? (
        <img
          src={unsplashImageUrl(photo, { width: 560, height: 380 })}
          alt={photo.alt}
          width={560}
          height={380}
          loading="lazy"
          className="aspect-[56/38] h-auto w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[56/38] items-center justify-center bg-muted text-sm font-medium text-destructive">
          No photo yet
        </div>
      )}
      <div className="flex flex-col gap-1.5 px-4 pt-3 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5">
          <h3 className="m-0 text-base font-semibold">{job.label}</h3>
          {weak && (
            <span className="rounded-full bg-[#FBF0DF] px-2 py-0.5 text-[11.5px] font-semibold text-[#8A4B00]">
              Weak match: {weak}
            </span>
          )}
        </div>
        <p className="m-0 text-[13.5px] leading-normal text-muted-foreground">{job.jobDescription}</p>
        {credit && (
          <p className="m-0 text-[12.5px] text-muted-foreground">
            Photo by{' '}
            <a href={credit.photographerHref} target="_blank" rel="noopener noreferrer" className="text-brand">
              {credit.photographer}
            </a>{' '}
            on{' '}
            <a href={credit.unsplashHref} target="_blank" rel="noopener noreferrer" className="text-brand">
              Unsplash
            </a>
          </p>
        )}
        <p className="m-0">
          <code className="rounded bg-brand-tint px-1.5 py-px font-mono text-[12.5px] text-foreground">{slug}</code>
        </p>
      </div>
    </article>
  );
}

// Every example job on /quote/new with the Unsplash photo it attaches, for reviewing and swapping photos.
export default function ExamplePhotosPage() {
  const weakCount = EXAMPLE_JOBS.filter((job) => {
    const slug = exampleSlug(job);
    return weakNote(slug, examplePhoto(slug));
  }).length;

  return (
    <div data-page-shell className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-4 pt-8 pb-16 md:px-6">
      <header className="flex max-w-[78ch] flex-col gap-2.5">
        <p className="m-0 text-xs font-semibold tracking-[0.08em] text-brand uppercase">Internal</p>
        <h1 className="m-0 text-[30px] leading-tight font-bold tracking-[-0.02em]">Example job photos</h1>
        <p className="m-0 text-muted-foreground">
          Each of the {EXAMPLE_JOBS.length} example jobs on /quote/new with the Unsplash photo it attaches.{' '}
          {weakCount > 0 && `${weakCount} are marked as weak matches worth swapping.`}
        </p>
        <p className="m-0 text-muted-foreground">
          To swap one, find a free (not Unsplash+) photo on unsplash.com and run, from the repo:
        </p>
        <code className="block rounded-lg border border-border bg-card px-3 py-2.5 font-mono text-[13px] break-words whitespace-pre-wrap">
          {SWAP_COMMAND}
        </code>
      </header>

      {groupByTrade(EXAMPLE_JOBS).map(([trade, jobs]) => (
        <section key={trade} aria-labelledby={`trade-${trade}`} className="flex flex-col gap-3.5">
          <h2
            id={`trade-${trade}`}
            className="m-0 border-b border-border pb-2 text-[13px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
          >
            {tradeLabel(trade)}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-4">
            {jobs.map((job) => (
              <PhotoCard key={job.label} job={job} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
