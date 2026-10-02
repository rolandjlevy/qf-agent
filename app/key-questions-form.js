'use client';

import { CARD_CLASS, ChoiceChip, StepActions, StepHeader, TextField, stepClass } from '@/components/quote/step-layout';

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
      aria-labelledby="key-questions-heading"
      className={stepClass()}
      onSubmit={(e) => {
        e.preventDefault();
        onContinue();
      }}
    >
      <StepHeader id="key-questions-heading" title={title}>
        Answer what you can. Anything you skip or aren&apos;t sure about is written into the quote as an assumption.
      </StepHeader>

      <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
        {questions.map((q, i) => {
          const entry = answers[q.topic] ?? {};
          return (
            <li key={q.topic}>
              <fieldset className={`${CARD_CLASS} m-0 flex min-w-0 flex-col gap-3 p-4 md:p-5`}>
                <legend className="float-left mb-0.5 flex w-full items-baseline gap-2.5 p-0 text-[15px] leading-snug font-semibold">
                  <span className="text-[13px] font-semibold text-brand tabular-nums" aria-hidden="true">
                    {i + 1}.
                  </span>
                  {q.question}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {[...q.options, OTHER_OPTION, NOT_SURE_OPTION].map((option) => (
                    <ChoiceChip
                      key={option}
                      name={`key-question-${i}`}
                      value={option}
                      checked={entry.choice === option}
                      onChange={() => setEntry(q.topic, { choice: option })}
                      dashed={option === NOT_SURE_OPTION}
                    >
                      {option}
                    </ChoiceChip>
                  ))}
                </div>
                {entry.choice === OTHER_OPTION && (
                  <TextField
                    aria-label={`${q.question} (other)`}
                    placeholder="Please specify"
                    value={entry.otherText ?? ''}
                    onChange={(e) => setEntry(q.topic, { otherText: e.target.value })}
                    autoFocus
                  />
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>

      <StepActions onBack={onBack} continueType="submit" />
    </form>
  );
}
