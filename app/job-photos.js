'use client';

import { useRef } from 'react';
import { buttonStyle } from './button-style.js';
import { MAX_JOB_PHOTOS } from '../lib/constants.js';

const thumbStyle = {
  width: 96,
  height: 96,
  objectFit: 'cover',
  borderRadius: 6,
  border: '1px solid #ddd',
  display: 'block',
};

const STATUS_LABELS = {
  compressing: 'Preparing…',
  uploading: 'Uploading…',
  failed: 'Failed',
};

const KIND_NOTES = {
  reference: 'Looks like a product, inspiration or in-progress photo, not this property as it is now',
  irrelevant: "Doesn't seem to show this job, so it wasn't used",
};

// `photos` is `{ id, previewUrl, status: 'compressing'|'uploading'|'ready'|'failed', error? }[]`,
// owned by app/quote/new/page.js, which does the compress-and-upload work.
export function PhotoPicker({ photos, onAdd, onRemove }) {
  const inputRef = useRef(null);
  const remaining = MAX_JOB_PHOTOS - photos.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <span>
        Photos <small style={{ color: '#666' }}>(optional, up to {MAX_JOB_PHOTOS})</small>
      </span>
      <small style={{ color: '#666' }}>
        Add photos of what you'll be working on, plus any labels or model plates. The more we can see, the
        fewer questions we'll ask and the more accurate your quote will be.
      </small>

      {photos.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {photos.map((p) => (
            <li key={p.id} style={{ position: 'relative' }}>
              <img
                src={p.previewUrl}
                alt=""
                style={{ ...thumbStyle, opacity: p.status === 'ready' ? 1 : 0.5 }}
              />
              {p.status !== 'ready' && (
                <small
                  title={p.error || undefined}
                  style={{
                    position: 'absolute',
                    left: 4,
                    bottom: 4,
                    background: p.status === 'failed' ? 'crimson' : 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    borderRadius: 4,
                    padding: '0 4px',
                  }}
                >
                  {STATUS_LABELS[p.status]}
                </small>
              )}
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => onRemove(p.id)}
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  cursor: 'pointer',
                  lineHeight: '22px',
                  padding: 0,
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              onAdd(Array.from(e.target.files ?? []).slice(0, remaining));
              // Reset so choosing the same file again (e.g. after removing it) still fires onChange.
              e.target.value = '';
            }}
          />
          <button
            type="button"
            style={{ ...buttonStyle, width: 'fit-content' }}
            onClick={() => inputRef.current?.click()}
          >
            📷 Add photos
          </button>
        </>
      )}
    </div>
  );
}

export function PhotoAnalysisSkeleton({ count }) {
  return (
    <div>
      <h2>Looking at your photos</h2>
      <p style={{ color: '#666' }}>
        Checking {count} photo{count === 1 ? '' : 's'} for details that affect the quote. This usually takes 10–30
        seconds…
      </p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={i} style={{ marginBottom: '0.5rem' }}>
            <div
              className="skeleton-bar"
              style={{ height: '1rem', background: '#eee', borderRadius: 4, width: `${60 + ((i * 13) % 30)}%` }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// The trader confirms each observation before any of it reaches Phase A or Phase B:
// a misread label should never end up in a quote unchecked.
export function PhotoFindingsReview({ photos, analysis, onToggle, onBack, onContinue }) {
  const byPhoto = analysis.photos.map((p) => ({
    ...p,
    preview: photos[p.imageIndex - 1]?.previewUrl,
    observations: analysis.observations.filter((o) => o.imageIndex === p.imageIndex),
  }));

  return (
    <div>
      <h2>What we spotted in your photos</h2>
      <p style={{ color: '#666' }}>
        Untick anything that's wrong. Only ticked items are used for your questions and quote.
      </p>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {byPhoto.map((p) => (
          <li key={p.imageIndex} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            {p.preview && <img src={p.preview} alt={`Photo ${p.imageIndex}`} style={thumbStyle} />}
            <div style={{ flex: 1 }}>
              {KIND_NOTES[p.kind] && (
                <small style={{ color: '#92400e', display: 'block', marginBottom: '0.25rem' }}>
                  {KIND_NOTES[p.kind]}
                </small>
              )}
              {p.observations.length === 0 ? (
                <small style={{ color: '#666' }}>Nothing that affects the quote was spotted in this photo.</small>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {p.observations.map((o) => (
                    <li key={o.id} style={{ marginBottom: '0.35rem' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={o.checked}
                          onChange={() => onToggle(o.id)}
                          style={{ marginTop: '0.2rem' }}
                        />
                        <span>
                          {o.observation}
                          {o.confidence === 'low' && (
                            <small style={{ color: '#92400e' }}> (unsure, please check)</small>
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>

      {analysis.unclear.length > 0 && (
        <details style={{ marginBottom: '1rem', color: '#444' }}>
          <summary>Things the photos can't show ({analysis.unclear.length})</summary>
          <ul>
            {analysis.unclear.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" style={buttonStyle} onClick={onBack}>
          ⬅️ Back
        </button>
        <button type="button" style={buttonStyle} onClick={onContinue}>
          ➡️ Continue
        </button>
      </div>
    </div>
  );
}
