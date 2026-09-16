'use client';

import { useState, useEffect } from 'react';

// Every choice group always gets this trailing option (a UI guarantee, not
// something the model is asked to add) so a set of options never traps the
// user into picking the closest-but-wrong answer.
const OTHER_OPTION = 'Other';

// Renders one clarifying question — choice groups (radio/checkbox, each with
// an auto-appended "Other" + free-text follow-up) plus a free-text notes
// field — and reduces the trader's input to the single answer string the
// backend expects, the same shape qf.js's promptForAnswer (CLI) builds.
//
// Shared by two callers: the in-flight ask_user dialog Phase B can still
// show (app/quote/new/page.js) and the clarifying-question step Phase A can
// show before materials are proposed (see lib/propose-materials.js) — the
// question/choices/answer shape is identical in both places, so this is the
// one place that shape gets rendered and reduced to an answer string.
export default function AskQuestionForm({ question, onSubmit, submitting, submitLabel = 'Answer', actions }) {
  const [choiceSelections, setChoiceSelections] = useState({});
  const [otherText, setOtherText] = useState({});
  const [notes, setNotes] = useState('');

  // Reset fields only when the question text itself changes, not on every
  // re-render with the same question (a parent that re-fetches/polls could
  // otherwise hand back an equivalent-but-new question object each time).
  useEffect(() => {
    setChoiceSelections({});
    setOtherText({});
    setNotes('');
  }, [question?.question]);

  if (!question) return null;

  const hasChoices = Array.isArray(question.choices) && question.choices.length > 0;

  // Resolves a group's selection, substituting the custom text wherever
  // "Other" was picked (falling back to the literal label if left blank).
  function resolveGroupValue(i) {
    const value = choiceSelections[i];
    const custom = (otherText[i] || '').trim() || OTHER_OPTION;
    if (Array.isArray(value)) return value.map((v) => (v === OTHER_OPTION ? custom : v));
    return value === OTHER_OPTION ? custom : value;
  }

  function buildAnswer() {
    if (!hasChoices) return notes;
    const parts = question.choices.map((group, i) => {
      const value = resolveGroupValue(i);
      const prefix = group.label ? `${group.label}: ` : '';
      const valueText = Array.isArray(value) ? value.join(', ') : value || '(no selection)';
      return prefix + valueText;
    });
    if (notes.trim()) parts.push(`Notes: ${notes.trim()}`);
    return parts.join('. ');
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(buildAnswer());
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <p>
        <strong>{question.question}</strong>
        {question.context && (
          <>
            <br />
            <span style={{ color: '#666' }}>{question.context}</span>
          </>
        )}
      </p>

      {hasChoices &&
        question.choices.map((group, i) => (
          <fieldset
            key={i}
            style={{ border: '1px solid #ddd', borderRadius: 4, padding: '0.5rem 0.75rem' }}
          >
            {group.label && <legend>{group.label}</legend>}
            {[...group.options, OTHER_OPTION].map((option) => {
              const isCheckbox = group.type === 'checkbox';
              const checked = isCheckbox
                ? (choiceSelections[i] || []).includes(option)
                : choiceSelections[i] === option;
              return (
                <label key={option} style={{ display: 'block' }}>
                  <input
                    type={isCheckbox ? 'checkbox' : 'radio'}
                    name={`ask-question-choice-${i}`}
                    value={option}
                    checked={checked}
                    required={!isCheckbox}
                    onChange={(e) => {
                      setChoiceSelections((prev) => {
                        if (isCheckbox) {
                          const current = prev[i] || [];
                          const next = e.target.checked
                            ? [...current, option]
                            : current.filter((o) => o !== option);
                          return { ...prev, [i]: next };
                        }
                        return { ...prev, [i]: option };
                      });
                    }}
                  />{' '}
                  {option}
                </label>
              );
            })}
            {(group.type === 'checkbox'
              ? (choiceSelections[i] || []).includes(OTHER_OPTION)
              : choiceSelections[i] === OTHER_OPTION) && (
              <input
                type="text"
                placeholder="Please specify"
                value={otherText[i] || ''}
                onChange={(e) => setOtherText((prev) => ({ ...prev, [i]: e.target.value }))}
                style={{
                  marginTop: '0.25rem',
                  marginLeft: '1.4rem',
                  display: 'block',
                  padding: '0.5rem',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                }}
                autoFocus
              />
            )}
          </fieldset>
        ))}

      <input
        type="text"
        style={{ padding: '0.5rem', fontFamily: 'inherit', fontSize: 'inherit' }}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={hasChoices ? 'Additional notes or comments (optional)' : undefined}
        autoFocus={!hasChoices}
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {actions}
        <button style={{ width: 'fit-content', padding: '0.5rem 1rem' }} type="submit" disabled={submitting}>
          {submitting ? 'Answering…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
