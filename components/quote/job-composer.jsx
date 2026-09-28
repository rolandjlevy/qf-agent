'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { acceptPhotoFiles } from '@/lib/new-quote';
import PhotoPicker from './photo-picker';
import PhotoThumbnails from './photo-thumbnails';
import PhotoGuidanceCard from './photo-guidance-card';

const MAX_TEXTAREA_PX = 480;
const PLACEHOLDER =
  'e.g. Rip out and refit a 2m × 2.5m bathroom. New shower over the bath, tile the floor and two walls to half height. Customer supplying the suite.';
const PLACEHOLDER_SHORT =
  'e.g. Refit a 2m × 2.5m bathroom. Shower over the bath, tile the floor and two walls to half height.';

// Starts on the desktop text so server and client render the same, then switches after mount.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return isDesktop;
}

export default function JobComposer({ value, onChange, trade, photos, onAddPhotos, onRemovePhoto, textareaRef }) {
  const ownRef = useRef(null);
  const ref = textareaRef ?? ownRef;
  const galleryRef = useRef(null);
  const isDesktop = useIsDesktop();
  const [photoMessage, setPhotoMessage] = useState(null);

  // Auto-grow: measure from auto height each time, up to the cap, then scroll.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_PX ? 'auto' : 'hidden';
  }, [value, isDesktop, photos.length, ref]);

  function addFiles(files) {
    const { accepted, message } = acceptPhotoFiles(files, photos.length);
    setPhotoMessage(message);
    if (accepted.length) onAddPhotos(accepted);
  }

  function removePhoto(id) {
    setPhotoMessage(null);
    onRemovePhoto(id);
  }

  // The whole card is the drop target; clicks and keys are left to the textarea and buttons.
  const { getRootProps, isDragActive } = useDropzone({
    onDrop: (accepted, rejected) => addFiles([...accepted, ...rejected.map((r) => r.file)]),
    noClick: true,
    noKeyboard: true,
    accept: { 'image/*': [] },
  });

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="job-description" className="text-sm font-semibold md:text-[15px]">
        Paste the customer&apos;s message, or describe the job
      </label>

      <div
        {...getRootProps({
          className: cn(
            'overflow-hidden rounded-card border border-border bg-card shadow-card focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20',
            isDragActive && 'bg-brand-tint outline-2 outline-offset-4 outline-brand outline-dashed',
          ),
        })}
      >
        <textarea
          ref={ref}
          id="job-description"
          name="jobDescription"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isDesktop ? PLACEHOLDER : PLACEHOLDER_SHORT}
          aria-describedby="job-description-help"
          data-slot="composer-textarea"
          className={cn(
            'block w-full resize-none border-0 bg-transparent px-5 py-4 text-base leading-[1.55] text-foreground outline-none placeholder:text-foreground-subtle md:text-[15px]',
            // Once photos are in, the text box hugs its content so the thumbnails sit right under it.
            photos.length === 0 && 'min-h-[140px] md:min-h-[180px]',
          )}
        />
        {photos.length > 0 && (
          <PhotoThumbnails photos={photos} onRemove={removePhoto} onAdd={() => galleryRef.current?.click()} />
        )}
        <PhotoPicker count={photos.length} onFiles={addFiles} galleryRef={galleryRef} />
      </div>

      {/* Always in the accessibility tree (sr-only while empty) so the message is announced. */}
      <p role="status" className={cn('m-0 text-sm text-destructive', !photoMessage && 'sr-only')}>
        {photoMessage}
      </p>

      <PhotoGuidanceCard trade={trade} showAskCustomer={photos.length === 0} />
    </div>
  );
}
