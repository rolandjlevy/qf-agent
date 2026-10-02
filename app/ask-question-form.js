'use client';

import { useState, useEffect } from 'react';
import { CARD_CLASS, ChoiceChip, StepActions, TextField, stepClass } from '@/components/quote/step-layout';

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
// `children` render above the question (the step's heading); `sticky` pins the buttons on mobile.
export default function AskQuestionForm({
  question,
  onSubmit,
  submitting,
  submitLabel = 'Answer',
  onBack,
  backLabel,
  sticky = false,
  initialAnswer,
  children,
}) {
  const [choiceSelections, setChoiceSelections] = useState(initialAnswer?.choiceSelections ?? {});
  const [otherText, setOtherText] = useState(initialAnswer?.otherText ?? {});
  const [notes, setNotes] = useState(initialAnswer?.notes ?? '');

  // Reset fields (from initialAnswer, if given) only when the question
  // text changes, not on every re-render with the same question.
  useEffect(() => {
    setChoiceSelections(initialAnswer?.choiceSelections ?? {});
    setOtherText(initialAnswer?.otherText ?? {});
    setNotes(initialAnswer?.notes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    onSubmit(buildAnswer(), { choiceSelections, otherText, notes });
  }

  return (
    <form onSubmit={handleSubmit} className={stepClass(sticky)}>
      {children}

      <div className={`${CARD_CLASS} flex flex-col gap-4 p-4 md:p-5`}>
        <div className="flex flex-col gap-1">
          <p className="m-0 text-[17px] leading-snug font-semibold">{question.question}</p>
          {question.context && <p className="m-0 text-[14px] leading-snug text-muted-foreground">{question.context}</p>}
        </div>

        {hasChoices &&
          question.choices.map((group, i) => {
            const isCheckbox = group.type === 'checkbox';
            const otherPicked = isCheckbox
              ? (choiceSelections[i] || []).includes(OTHER_OPTION)
              : choiceSelections[i] === OTHER_OPTION;
            return (
              // eslint-disable-next-line react/no-array-index-key
              <fieldset key={i} className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
                {group.label && (
                  <legend className="float-left mb-0.5 w-full p-0 text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {group.label}
                    {isCheckbox && <span className="font-medium tracking-normal normal-case"> (pick any)</span>}
                  </legend>
                )}
                <div className="flex flex-wrap gap-2">
                  {[
                    // Drop any "Other" the model included on its own despite the
                    // prompt saying not to — the interface always adds exactly one.
                    ...group.options.filter((o) => o.toLowerCase() !== OTHER_OPTION.toLowerCase()),
                    OTHER_OPTION,
                  ].map((option) => {
                    const checked = isCheckbox
                      ? (choiceSelections[i] || []).includes(option)
                      : choiceSelections[i] === option;
                    return (
                      <ChoiceChip
                        key={option}
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
                      >
                        {option}
                      </ChoiceChip>
                    );
                  })}
                </div>
                {otherPicked && (
                  <TextField
                    aria-label={`${group.label || question.question} (other)`}
                    placeholder="Please specify"
                    value={otherText[i] || ''}
                    onChange={(e) => setOtherText((prev) => ({ ...prev, [i]: e.target.value }))}
                    autoFocus
                  />
                )}
              </fieldset>
            );
          })}

        <TextField
          aria-label={hasChoices ? 'Additional notes' : 'Your answer'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={hasChoices ? 'Anything else? (optional)' : 'Type your answer'}
          autoFocus={!hasChoices}
        />
      </div>

      <StepActions
        onBack={onBack}
        backLabel={backLabel}
        continueLabel={submitLabel}
        continueType="submit"
        submitting={submitting}
        submittingLabel="Answering…"
        sticky={sticky}
      />
    </form>
  );
}
