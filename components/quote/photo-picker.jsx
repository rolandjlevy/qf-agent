'use client';

import { useRef } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { MAX_JOB_PHOTOS } from '@/lib/constants';

const pickerButton =
  'h-11 items-center gap-2 rounded-lg border border-input bg-card px-3.5 text-sm font-medium text-foreground shadow-xs transition-all hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:border-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const pickerIcon = 'size-[18px] text-brand';

const countBadge =
  'items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[13px] font-medium text-muted-foreground tabular-nums';
const countDot = <span className="size-1.5 rounded-full bg-success ring-2 ring-success/15" aria-hidden="true" />;

// The composer's bottom bar; camera, gallery and JobComposer's drop all end at `onFiles`.
// `galleryRef` is the parent's, so the thumbnails' "Add photo" tile can open the same picker.
// Display classes are set per button: `hidden` + `inline-flex` together resolve by CSS order.
export default function PhotoPicker({ count, onFiles, galleryRef }) {
  const cameraRef = useRef(null);
  const full = count >= MAX_JOB_PHOTOS;

  function handleChange(e) {
    onFiles(Array.from(e.target.files ?? []));
    // Reset so choosing the same file again (e.g. after removing it) still fires onChange.
    e.target.value = '';
  }

  return (
    <div className="flex items-center gap-2 border-t border-border bg-surface-muted px-4 py-3 md:gap-3 md:px-5">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleChange} />
      <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={handleChange} />

      {/* Mobile: separate Camera (opens the rear camera) and Photos (library) buttons. */}
      <button
        type="button"
        data-slot="picker-button"
        className={`${pickerButton} inline-flex md:hidden`}
        disabled={full}
        onClick={() => cameraRef.current?.click()}
      >
        <Camera className={pickerIcon} strokeWidth={1.75} aria-hidden="true" />
        Camera
      </button>
      <button
        type="button"
        data-slot="picker-button"
        className={`${pickerButton} inline-flex md:hidden`}
        disabled={full}
        onClick={() => galleryRef.current?.click()}
      >
        <ImageIcon className={pickerIcon} strokeWidth={1.75} aria-hidden="true" />
        Photos
      </button>
      <span className={`${countBadge} ml-auto inline-flex md:hidden`}>
        {count > 0 && countDot}
        {count} / {MAX_JOB_PHOTOS}
      </span>

      {/* Desktop: one button, plus a drag hint. */}
      <button
        type="button"
        data-slot="picker-button"
        className={`${pickerButton} hidden md:inline-flex`}
        disabled={full}
        onClick={() => galleryRef.current?.click()}
      >
        <Camera className={pickerIcon} strokeWidth={1.75} aria-hidden="true" />
        Upload photos
      </button>
      <span className="hidden text-[13px] text-muted-foreground md:inline">
        or drop images here · up to {MAX_JOB_PHOTOS} photos
      </span>
      {count > 0 && (
        <span className={`${countBadge} ml-auto hidden md:inline-flex`}>
          {countDot}
          {count} / {MAX_JOB_PHOTOS} attached
        </span>
      )}
    </div>
  );
}
