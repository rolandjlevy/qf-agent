'use client';

import { useRef } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { MAX_JOB_PHOTOS } from '@/lib/constants';

const pickerButton =
  'h-11 items-center gap-2 rounded-control border border-border bg-card px-4 text-[15px] font-semibold text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

const countPill = 'rounded-full bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border';

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
    <div className="flex items-center gap-2 border-t border-border-subtle bg-surface-muted px-4 py-2.5 md:gap-3">
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
        <Camera className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
        Camera
      </button>
      <button
        type="button"
        data-slot="picker-button"
        className={`${pickerButton} inline-flex md:hidden`}
        disabled={full}
        onClick={() => galleryRef.current?.click()}
      >
        <ImageIcon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
        Photos
      </button>
      <span className={`${countPill} ml-auto md:hidden`}>
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
        <Camera className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
        Upload photos
      </button>
      <span className="hidden text-[13px] text-muted-foreground md:inline">
        or drop images here · up to {MAX_JOB_PHOTOS} photos
      </span>
      {count > 0 && (
        <span className={`${countPill} ml-auto hidden md:inline`}>
          {count} / {MAX_JOB_PHOTOS} attached
        </span>
      )}
    </div>
  );
}
