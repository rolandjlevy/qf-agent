'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VALID_TRADES, VALID_TONES } from '../../../lib/constants.js';

const POLL_INTERVAL_MS = 2000;
// Slack above the server's 300s maxDuration budget — a purely client-side
// backstop so a genuinely stalled run (e.g. after() never firing, a
// platform-level edge case) doesn't poll forever with no feedback.
const MAX_POLL_MS = 6 * 60 * 1000;
// Every choice group always gets this trailing option (a UI guarantee, not
// something the model is asked to add) so a set of options never traps the
// user into picking the closest-but-wrong answer.
const OTHER_OPTION = 'Other';

function truncate(text, max = 70) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function describeToolCall(tool, input) {
  switch (tool) {
    case 'ask_user':
      return `Calling ask_user: "${truncate(input?.question)}"`;
    case 'identify_materials':
      return 'Calling identify_materials';
    case 'draft_section':
      return `Calling draft_section: ${input?.section ?? ''}`;
    case 'save_quote':
      return 'Calling save_quote';
    default:
      return `Calling ${tool}…`;
  }
}

function describeToolResult(tool, result) {
  if (result?.error) return `${tool} failed: ${result.message}`;
  switch (tool) {
    case 'ask_user': {
      const answer = truncate(result?.answer);
      return `ask_user answered: ${answer ? `"${answer}"` : '(no answer)'}`;
    }
    case 'identify_materials': {
      const count = result?.materials?.length ?? 0;
      return `identify_materials found ${count} material${count === 1 ? '' : 's'}`;
    }
    case 'draft_section':
      return `draft_section drafted "${result?.section}" (${result?.words ?? 0} words)`;
    case 'save_quote':
      return result?.success
        ? `save_quote saved${result.filename ? ` (${result.filename})` : ''}`
        : 'save_quote failed';
    default:
      return `${tool} done`;
  }
}

// Renders each step as one line's worth of content — the caller is
// responsible for grouping these under their enclosing turn.
function describeStep(step) {
  switch (step.type) {
    case 'tool_call':
      return describeToolCall(step.tool, step.input);
    case 'tool_result':
      return describeToolResult(step.tool, step.result);
    case 'final_answer':
      return step.text;
    default:
      return null;
  }
}

// Groups the flat steps log into one entry per turn_start, with every step
// that followed it (until the next turn_start) nested underneath — turns
// into the "Turn N" header with its own indented children the progress log
// renders.
function groupStepsByTurn(steps) {
  const turns = [];
  let current = null;
  for (const step of steps) {
    if (step.type === 'turn_start') {
      current = { turn: step.turn, children: [] };
      turns.push(current);
      continue;
    }
    if (!current) {
      current = { turn: null, children: [] };
      turns.push(current);
    }
    current.children.push(step);
  }
  return turns;
}

export default function NewQuotePage() {
  const router = useRouter();
  const [trade, setTrade] = useState(VALID_TRADES[0]);
  const [tone, setTone] = useState(VALID_TONES[0]);
  const [jobDescription, setJobDescription] = useState('');
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState([]);
  const [question, setQuestion] = useState(null);
  // True from the moment an answer is submitted until we know whether the
  // next turn needs another answer — keeps the dialog open across
  // back-to-back questions instead of closing/reopening between them.
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [choiceSelections, setChoiceSelections] = useState({});
  const [otherText, setOtherText] = useState({});
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [error, setError] = useState(null);
  const runIdRef = useRef(null);
  const pollTimerRef = useRef(null);
  const pollStartRef = useRef(null);
  const dialogRef = useRef(null);
  // steps.length snapshot taken when waitingForNext turns true — pollStatus
  // only inspects steps written after this point to decide whether the next
  // turn needs another answer.
  const waitingSinceLenRef = useRef(0);
  // pollStatus is captured once by setInterval (see handleSubmit) and never
  // re-created, so it can't read fresh state via closure — mirrored here the
  // same way runIdRef mirrors runId.
  const waitingForNextRef = useRef(false);

  function setWaiting(value) {
    waitingForNextRef.current = value;
    setWaitingForNext(value);
  }
  // Polling replaces `question` with a fresh object every ~2s even when it's
  // the same pending question — only reset in-progress selections when the
  // question text actually changes, not on every poll tick.
  const prevQuestionTextRef = useRef(null);

  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  useEffect(() => stopPolling, []);

  useEffect(() => {
    const text = question?.question ?? null;
    if (text !== prevQuestionTextRef.current) {
      prevQuestionTextRef.current = text;
      setChoiceSelections({});
      setOtherText({});
      setAnswerText('');
      setSubmittingAnswer(false);
    }
  }, [question]);

  // Surfaces the pending question as a genuine modal — showModal() gives
  // focus-trapping and correct dialog semantics for free. There's no valid
  // way to dismiss it without answering (the agent loop is blocked waiting),
  // so Esc is suppressed via onCancel below; showModal() doesn't close on
  // backdrop click on its own, so nothing extra is needed for that.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const shouldBeOpen = Boolean(question) || waitingForNext;
    if (shouldBeOpen && !dialog.open) {
      dialog.showModal();
    } else if (!shouldBeOpen && dialog.open) {
      dialog.close();
    }
  }, [question, waitingForNext]);

  async function pollStatus() {
    if (!runIdRef.current) return;
    if (Date.now() - pollStartRef.current > MAX_POLL_MS) {
      stopPolling();
      setRunning(false);
      setError(
        'This is taking longer than expected — check your quotes list in a few minutes, or try again.',
      );
      return;
    }

    let response;
    try {
      response = await fetch(`/api/quote/${runIdRef.current}/status`);
    } catch {
      return; // transient network blip — retry next tick
    }

    if (response.status === 404) {
      stopPolling();
      setRunning(false);
      setError('This run could not be found.');
      return;
    }
    if (!response.ok) return; // transient server error — retry next tick

    const data = await response.json();
    const newSteps = data.steps ?? [];
    setSteps(newSteps);

    if (data.question) {
      setQuestion(data.question);
      setWaiting(false);
    } else if (waitingForNextRef.current) {
      // No question yet — inspect only the steps written since we started
      // waiting to see whether this turn is going to ask another one.
      const stepsSinceWaiting = newSteps.slice(waitingSinceLenRef.current);
      const toolCallSteps = stepsSinceWaiting.filter(
        (s) => s.type === 'tool_call',
      );
      const willAskAgain = toolCallSteps.some((s) => s.tool === 'ask_user');
      const hasFinalAnswer = stepsSinceWaiting.some(
        (s) => s.type === 'final_answer',
      );
      const turnResolvedWithoutQuestion =
        (toolCallSteps.length > 0 && !willAskAgain) || hasFinalAnswer;
      if (turnResolvedWithoutQuestion) setWaiting(false);
    }

    if (data.status === 'done') {
      stopPolling();
      setRunning(false);
      setWaiting(false);
      if (data.quoteId) {
        router.push(`/quote/${data.quoteId}`);
      } else {
        setError('Completed, but no quote was saved.');
      }
    } else if (data.status === 'error') {
      stopPolling();
      setRunning(false);
      setWaiting(false);
      setError(data.error || 'The run failed.');
    } else if (data.status === 'aborted') {
      stopPolling();
      setRunning(false);
      setWaiting(false);
      setError(data.error || 'This run was stopped.');
    }
  }

  // Returns the page to exactly what a fresh load looks like — used by
  // handleCancel, which cancels the whole in-flight quote, not just the
  // dialog it was triggered from.
  function resetToInitialState() {
    stopPolling()
    runIdRef.current = null
    setTrade(VALID_TRADES[0]);
    setTone(VALID_TONES[0]);
    setJobDescription('');
    setRunning(false);
    setSteps([]);
    setQuestion(null);
    setWaiting(false);
    waitingSinceLenRef.current = 0;
    setAnswerText('');
    setChoiceSelections({});
    setOtherText({});
    setSubmittingAnswer(false);
    setError(null);
  }

  // Hard stop, not an answer — resets local state immediately rather than
  // waiting on the server round-trip, since there's nothing left to show.
  async function handleCancel() {
    const runId = runIdRef.current;
    resetToInitialState();
    if (!runId) return;
    try {
      await fetch(`/api/quote/${runId}/cancel`, { method: 'POST' });
    } catch {
      // Best-effort — if this fails, the run's own watchdog will still stop
      // it once it notices the client has stopped polling (see
      // app/api/quote/route.js).
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setRunning(true);
    setSteps([]);
    setQuestion(null);
    setWaiting(false);
    waitingSinceLenRef.current = 0;
    setError(null);
    runIdRef.current = null;
    stopPolling();

    let response;
    try {
      response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade, tone, jobDescription }),
      });
    } catch {
      setError('Could not reach the server. Please try again.');
      setRunning(false);
      return;
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setError(errorBody?.error || `Request failed (${response.status})`);
      setRunning(false);
      return;
    }

    const { runId } = await response.json();
    runIdRef.current = runId;
    pollStartRef.current = Date.now();
    pollStatus();
    pollTimerRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
  }

  const hasChoices =
    Array.isArray(question?.choices) && question.choices.length > 0;

  // Resolves a group's selection, substituting the custom text wherever
  // "Other" was picked (falling back to the literal label if left blank).
  function resolveGroupValue(i) {
    const value = choiceSelections[i];
    const custom = (otherText[i] || '').trim() || OTHER_OPTION;
    if (Array.isArray(value))
      return value.map((v) => (v === OTHER_OPTION ? custom : v));
    return value === OTHER_OPTION ? custom : value;
  }

  // Combines each choice group's selection(s) with the free-text notes into
  // the single answer string the model expects back — same format the CLI's
  // equivalent inquirer-based flow produces (qf.js's promptForAnswer).
  function buildAnswerFromChoices() {
    const parts = question.choices.map((group, i) => {
      const value = resolveGroupValue(i);
      const prefix = group.label ? `${group.label}: ` : '';
      const valueText = Array.isArray(value)
        ? value.join(', ')
        : value || '(no selection)';
      return prefix + valueText;
    });
    if (answerText.trim()) parts.push(`Notes: ${answerText.trim()}`);
    return parts.join('. ');
  }

  async function handleAnswerSubmit(e) {
    e.preventDefault();
    if (!runIdRef.current || submittingAnswer) return;
    setSubmittingAnswer(true);
    try {
      const answer = hasChoices ? buildAnswerFromChoices() : answerText;
      await fetch(`/api/quote/${runIdRef.current}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });
      waitingSinceLenRef.current = steps.length;
      setQuestion(null);
      setWaiting(true);
      setAnswerText('');
      setChoiceSelections({});
      setOtherText({});
    } finally {
      setSubmittingAnswer(false);
    }
  }

  const turnLog = groupStepsByTurn(steps);

  return (
    <div style={{ maxWidth: 640 }}>
      <h1>New quote</h1>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div style={{ color: '#666', fontSize: '0.9rem' }}>
          Describe the job, pick a trade and tone, and we'll draft a
          ready-to-send quote — asking a few questions first if needed.
        </div>
        <section style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label>
            Trade
            <select
              style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              disabled={running}
            >
              {VALID_TRADES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tone
            <select
              style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              disabled={running}
            >
              {VALID_TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </section>

        <label
          style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
        >
          Job description
          <textarea
            rows={2}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            style={{
              fontFamily: 'inherit',
              fontSize: 'inherit',
              padding: '0.5rem',
            }}
            disabled={running}
            required
          />
        </label>

        <button
          type="submit"
          style={{ width: 'fit-content', padding: '0.5rem 1rem' }}
          disabled={running || !jobDescription.trim()}
        >
          {running ? 'Generating…' : 'Generate quote'}
        </button>
      </form>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          // Suppress the browser's own close-on-Esc — closing goes through
          // handleCancel so the run is actually cancelled server-side too,
          // not just visually dismissed.
          e.preventDefault();
          handleCancel();
        }}
        style={{
          maxWidth: 480,
          width: '90%',
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: '1.25rem',
        }}
      >
        {!question && waitingForNext && (
          <p style={{ color: '#666' }}>Thinking about your answer…</p>
        )}
        {question && (
          <form
            onSubmit={handleAnswerSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
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
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    padding: '0.5rem 0.75rem',
                  }}
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
                          name={`quote-question-choice-${i}`}
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
                      onChange={(e) =>
                        setOtherText((prev) => ({
                          ...prev,
                          [i]: e.target.value,
                        }))
                      }
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
              style={{
                padding: '0.5rem',
                fontFamily: 'inherit',
                fontSize: 'inherit',
              }}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder={
                hasChoices
                  ? 'Additional notes or comments (optional)'
                  : undefined
              }
              autoFocus={!hasChoices}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                style={{ width: 'fit-content', padding: '0.5rem 1rem' }}
                type="submit"
                disabled={submittingAnswer}
              >
                {submittingAnswer ? 'Answering…' : 'Answer'}
              </button>
              <button
                type="button"
                style={{ width: 'fit-content', padding: '0.5rem 1rem' }}
                onClick={handleCancel}
                disabled={submittingAnswer}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </dialog>

      {turnLog.length > 0 && (
        <div style={{ marginTop: '1.5rem', color: '#444' }}>
          {turnLog.map((t, ti) => {
            const childLines = t.children.map(describeStep).filter(Boolean);
            if (t.turn === null && childLines.length === 0) return null;
            return (
              // eslint-disable-next-line react/no-array-index-key
              <div key={ti} style={{ marginBottom: '0.5rem' }}>
                {t.turn !== null && (
                  <div style={{ fontWeight: 'bold' }}>Turn {t.turn}</div>
                )}
                {childLines.length > 0 && (
                  <ul style={{ marginTop: '0.25rem', marginLeft: '0.5rem' }}>
                    {childLines.map((line, li) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <li key={li}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
