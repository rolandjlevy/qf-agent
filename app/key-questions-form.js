'use client';

import { buttonStyle } from './button-style.js';

const OTHER_OPTION = 'Other';
const NOT_SURE_OPTION = 'Not sure – assume for now';

// The trader's answer to one question, or null when they skipped it or weren't sure.
export function keyQuestionAnswer(entry) {
  if (!entry?.choice || entry.choice === NOT_SURE_OPTION) return null;
  if (entry.choice === OTHER_OPTION) return entry.otherText?.trim() || null;
  return entry.choice;
}

// All of the job's key questions on one page rather than one AI round-trip each. Anything left
// unanswered becomes a stated assumption in the quote (see lib/photo-findings.js).
export function KeyQuestions({ title, questions, answers, onChange, onBack, onContinue }) {
  const setEntry = (topic, patch) => onChange({ ...answers, [topic]: { ...answers[topic], ...patch } });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onContinue();
      }}
    >
      <h2>{title}</h2>
      <p style={{ color: '#666' }}>
        Answer what you can. Anything you skip or aren't sure about is written into the quote as an assumption.
      </p>

      {questions.map((q, i) => {
        const entry = answers[q.topic] ?? {};
        return (
          <fieldset
            key={q.topic}
            style={{ border: '1px solid #ddd', borderRadius: 4, padding: '0.5rem 0.75rem', marginBottom: '0.75rem' }}
          >
            <legend>
              <strong>{q.question}</strong>
            </legend>
            {[...q.options, OTHER_OPTION, NOT_SURE_OPTION].map((option) => (
              <label key={option} style={{ display: 'block' }}>
                <input
                  type="radio"
                  name={`key-question-${i}`}
                  value={option}
                  checked={entry.choice === option}
                  onChange={() => setEntry(q.topic, { choice: option })}
                />{' '}
                {option}
              </label>
            ))}
            {entry.choice === OTHER_OPTION && (
              <input
                type="text"
                placeholder="Please specify"
                value={entry.otherText ?? ''}
                onChange={(e) => setEntry(q.topic, { otherText: e.target.value })}
                style={{ marginTop: '0.25rem', marginLeft: '1.4rem', padding: '0.5rem', fontFamily: 'inherit', fontSize: 'inherit' }}
                autoFocus
              />
            )}
          </fieldset>
        );
      })}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" style={buttonStyle} onClick={onBack}>
          ⬅️ Back
        </button>
        <button type="submit" style={buttonStyle}>
          ➡️ Continue
        </button>
      </div>
    </form>
  );
}
