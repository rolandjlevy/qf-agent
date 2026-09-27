import { cn } from '@/lib/utils';

// A placeholder block (shimmer defined in app/globals.css). `index` staggers rows into a wave.
// Hidden from assistive tech: the surrounding LoadingPanel announces what's loading.
function Skeleton({ className, index = 0, style, ...props }) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('skeleton rounded-md', className)}
      style={{ '--i': index, ...style }}
      {...props}
    />
  );
}

export { Skeleton };
