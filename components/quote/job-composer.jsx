'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { acceptPhotoFiles } from '@/lib/new-quote';
import { MAX_JOB_DESCRIPTION_LENGTH } from '@/lib/request-limits';
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

// `onUndoClear`, when set, offers to restore a description that was cleared along with the last photo.
export default function JobComposer({ value, onChange, trade, photos, onAddPhotos, onRemovePhoto, textareaRef, onUndoClear }) {
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

  // A fragment: the tip card sits in the form's own column, spaced like the other sections.
  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor="job-description" className="text-[15px] font-bold md:font-semibold">
          <span className="md:hidden">Paste customer&apos;s message, or describe job</span>
          <span className="hidden md:inline">Paste the customer&apos;s message, or describe the job</span>
        </label>

        <div
          {...getRootProps({
            className: cn(
              // Mobile: a heavier 2px dark edge so the box stands out on a small screen.
              'overflow-hidden rounded-card border-2 border-foreground bg-card shadow-card transition-all focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15 md:border md:border-input md:focus-within:ring-2 md:focus-within:ring-brand-subtle-border',
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
            maxLength={MAX_JOB_DESCRIPTION_LENGTH}
            placeholder={isDesktop ? PLACEHOLDER : PLACEHOLDER_SHORT}
            aria-describedby="job-description-help"
            data-slot="composer-textarea"
            className={cn(
              'block w-full resize-none border-0 bg-transparent p-4 text-base leading-[1.55] text-foreground outline-none placeholder:text-muted-foreground md:p-5 md:pb-3 md:leading-[1.6] md:placeholder:text-foreground-subtle',
              // Once photos are in, the text box hugs its content so the thumbnails sit right under it.
              photos.length === 0 && 'min-h-[148px] md:min-h-[185px]',
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
        <div role="status" className={cn('flex items-center gap-1.5 text-sm text-muted-foreground', !onUndoClear && 'sr-only')}>
          {onUndoClear && (
            <>
              Description cleared with the last photo.
              <button
                type="button"
                data-slot="undo-clear"
                onClick={onUndoClear}
                className="inline-flex min-h-11 items-center gap-1 px-1 font-semibold text-brand underline-offset-2 hover:text-brand-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Undo2 className="size-4" strokeWidth={2} aria-hidden="true" />
                Undo
              </button>
            </>
          )}
        </div>
      </div>

      <PhotoGuidanceCard trade={trade} showAskCustomer={photos.length === 0} />
    </>
  );
}
