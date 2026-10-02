'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { CARD_CLASS, CheckRow, StepActions, StepHeader, Tag, TextField, stepClass } from '@/components/quote/step-layout';

// The loading state before this step is MaterialsLoading (components/quote/loading-states.jsx).
const REFINEMENT_HEADING = 'Review before we draft your quote';

// The pause point in the agentic flow (CLAUDE.md's Phase 3a addendum): shows
// Phase A's proposed materials for the trader to check/uncheck and add to,
// before Phase B drafts the quote from exactly this list. `materials` is
// `{ id, label, description, source: 'llm_proposed' | 'trader_added', checked }[]`,
// owned by the parent (app/quote/new/page.js) so it can also compute the
// analytics events on Continue.
export default function MaterialsRefinement({ materials, onToggle, onAdd, onBack, onContinue }) {
  const [addValue, setAddValue] = useState('');
  const [adding, setAdding] = useState(false);
  const checkedCount = materials.filter((m) => m.checked).length;

  function commitAdd() {
    const label = addValue.trim();
    if (label) onAdd(label);
    setAddValue('');
    setAdding(false);
  }

  function cancelAdd() {
    setAddValue('');
    setAdding(false);
  }

  return (
    <section aria-labelledby="refinement-heading" className={stepClass()}>
      <StepHeader id="refinement-heading" title={REFINEMENT_HEADING}>
        Untick anything you don&apos;t need and add anything that&apos;s missing. The quote lists exactly these.
      </StepHeader>

      <div className={`${CARD_CLASS} overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle bg-surface-muted px-4 py-3 md:px-5">
          <h3 className="m-0 text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">Materials</h3>
          <span className="text-[13px] font-medium text-muted-foreground tabular-nums" aria-live="polite">
            {checkedCount} of {materials.length} included
          </span>
        </div>

        {materials.length === 0 ? (
          <p className="m-0 px-4 py-5 text-[15px] text-muted-foreground md:px-5">
            No materials were proposed for this job. Add any below, or continue without any for a labour-only quote.
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-border-subtle p-0">
            {materials.map((m) => {
              // Quantity and description are separate fields (lib/propose-materials.js) but share one caption line;
              // quantity is display only here, editable later on the quote-view page (app/materials-pricing.js).
              const caption = [m.quantity && `Qty: ${m.quantity}`, m.description].filter(Boolean).join(' · ');
              return (
                <li key={m.id}>
                  <CheckRow
                    checked={m.checked}
                    onChange={() => onToggle(m.id)}
                    label={m.label}
                    caption={caption}
                    badge={m.source === 'trader_added' && <Tag>Added by you</Tag>}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-border-subtle px-4 py-3 md:px-5">
          {adding ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="add-material" className="sr-only">
                Material name
              </label>
              <TextField
                id="add-material"
                autoFocus
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitAdd();
                  } else if (e.key === 'Escape') {
                    cancelAdd();
                  }
                }}
                placeholder="e.g. 15mm compression elbow"
                className="sm:flex-1"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  data-slot="add-material-confirm"
                  onClick={commitAdd}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-control bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:flex-none"
                >
                  Add
                </button>
                <button
                  type="button"
                  data-slot="add-material-cancel"
                  onClick={cancelAdd}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-control border border-border bg-card px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:flex-none"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              data-slot="add-material"
              onClick={() => setAdding(true)}
              className="-mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-[15px] font-semibold text-brand transition-colors hover:bg-brand-tint hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Plus className="size-[18px]" strokeWidth={2} aria-hidden="true" />
              Add material
            </button>
          )}
        </div>
      </div>

      <StepActions
        onBack={onBack}
        continueLabel="Continue to quote"
        onContinue={onContinue}
        hint="Prices show as [Price TBC]. Look them up once the quote is saved."
      />
    </section>
  );
}
