'use client';

import { useState } from 'react';

const SKELETON_ROWS = 6;

// Kept as named constants (rather than inline literals in each heading
// below) so the two stages of this step can't silently drift back into
// duplicated/inconsistent copy — see CLAUDE.md's Phase 3a addendum.
const SKELETON_HEADING = 'Getting your quote ready';
const REFINEMENT_HEADING = 'Review before we draft your quote';

const rowStyle = { marginBottom: '0.5rem' };
const labelRowStyle = { display: 'flex', alignItems: 'flex-start', gap: '0.5rem' };
const buttonStyle = { padding: '0.4rem 0.8rem' };

// Shown while Phase A (POST /api/quote/propose-materials) is in flight — see
// CLAUDE.md's Phase 3a addendum. Non-streaming (v1), so this skeleton is what
// covers the perceived wait rather than materials appearing one by one.
export function MaterialsSkeleton() {
  return (
    <div>
      <h2>{SKELETON_HEADING}</h2>
      <p style={{ color: '#666' }}>Looking at the job description…</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={i} style={rowStyle}>
            <div
              className="skeleton-bar"
              style={{
                height: '1rem',
                background: '#eee',
                borderRadius: 4,
                width: `${60 + ((i * 11) % 30)}%`,
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// The pause point in the agentic flow (CLAUDE.md's Phase 3a addendum): shows
// Phase A's proposed materials for the trader to check/uncheck and add to,
// before Phase B drafts the quote from exactly this list. `materials` is
// `{ id, label, description, source: 'llm_proposed' | 'trader_added', checked }[]`,
// owned by the parent (app/quote/new/page.js) so it can also compute the
// analytics events on Continue.
export default function MaterialsRefinement({ materials, onToggle, onAdd, onBack, onContinue }) {
  const [addValue, setAddValue] = useState('');
  const [adding, setAdding] = useState(false);

  function commitAdd() {
    const label = addValue.trim();
    if (label) onAdd(label);
    setAddValue('');
    setAdding(false);
  }

  return (
    <div>
      <h2>{REFINEMENT_HEADING}</h2>
      <p style={{ color: '#666' }}>
        Please review the items below and add or remove as needed.
      </p>

      {materials.length === 0 && (
        <p style={{ color: '#666' }}>
          No materials were proposed for this job — add any below if needed, or continue without any.
        </p>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {materials.map((m) => {
          // Quantity and description are separate fields (lib/propose-materials.js)
          // but share one caption line here — v1 scope is display only, no
          // separate quantity/unit input on this screen (see CLAUDE.md's
          // Phase 3a addendum); it's still editable later via the Qty input
          // on the quote-view page's "Find prices" list (app/materials-pricing.js).
          const caption = [m.quantity && `Qty: ${m.quantity}`, m.description].filter(Boolean).join(' — ');
          return (
            <li key={m.id} style={rowStyle}>
              <label style={labelRowStyle}>
                <input
                  type="checkbox"
                  checked={m.checked}
                  onChange={() => onToggle(m.id)}
                  style={{ marginTop: '0.2rem' }}
                />
                <span>
                  {m.label}
                  {caption && (
                    <>
                      <br />
                      <small style={{ color: '#666' }}>{caption}</small>
                    </>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {adding ? (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            autoFocus
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitAdd();
              } else if (e.key === 'Escape') {
                setAddValue('');
                setAdding(false);
              }
            }}
            placeholder="Material name"
            style={{ flex: 1, padding: '0.4rem' }}
          />
          <button type="button" style={buttonStyle} onClick={commitAdd}>
            Add
          </button>
        </div>
      ) : (
        <button type="button" style={{ ...buttonStyle, marginBottom: '1rem' }} onClick={() => setAdding(true)}>
          + Add material
        </button>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" style={buttonStyle} onClick={onBack}>
          ← Back
        </button>
        <button type="button" style={buttonStyle} onClick={onContinue}>
          Continue to quote →
        </button>
      </div>
    </div>
  );
}
