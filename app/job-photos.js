'use client';

import { buttonStyle } from './button-style.js';

const thumbStyle = {
  width: 96,
  height: 96,
  objectFit: 'cover',
  borderRadius: 6,
  border: '1px solid #ddd',
  display: 'block',
};

const KIND_NOTES = {
  reference: 'Looks like a product, inspiration or in-progress photo, not this property as it is now',
  irrelevant: "Doesn't seem to show this job, so it wasn't used",
};

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
export function PhotoFindingsReview({ photos, analysis, questionCount, onToggle, onBack, onContinue }) {
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

      {questionCount > 0 && (
        <p style={{ color: '#444' }}>
          Next, {questionCount === 1 ? 'one quick question' : `${questionCount} quick questions`} about things the
          photos can't show.
        </p>
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
