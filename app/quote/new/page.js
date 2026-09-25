'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VALID_TRADES, VALID_TONES, MAX_JOB_PHOTOS } from '../../../lib/constants.js';
import { compressImages } from '../../../lib/compress-image.js';
import MaterialsRefinement, {
  MaterialsSkeleton,
} from '../../materials-refinement.js';
import { recordRefinementEvents } from '../../../lib/actions/log-refinement.js';
import AskQuestionForm from '../../ask-question-form.js';
import { buttonStyle } from '../../button-style.js';
import { PhotoPicker, PhotoAnalysisSkeleton, PhotoFindingsReview } from '../../job-photos.js';

// Quick-start examples for the job description form — each pairs a short,
// realistic job description with the trade it actually belongs to, so
// picking one fills in both fields at once (the trader can still edit
// either afterwards, same as typing from scratch). Curated from real job
// descriptions traders have submitted, one per trade for variety rather
// than several near-duplicates of the same job.
const EXAMPLE_JOBS = [
  {
    label: 'Leaky tap needs fixing',
    trade: 'plumber',
    jobDescription: 'Leaky tap needs fixing',
  },
  {
    label: 'Faulty light switch needs replacing',
    trade: 'electrician',
    jobDescription: 'Faulty light switch needs replacing',
  },
  {
    label: 'Bedrooms need decorating',
    trade: 'decorator',
    jobDescription: 'Bedrooms need decorating',
  },
  {
    label: 'Wardrobe needs assembling',
    trade: 'handyman',
    jobDescription: 'Wardrobe needs assembling',
  },
  {
    label: 'Door lock needs fitting',
    trade: 'carpenter',
    jobDescription: 'Door lock needs fitting',
  },
  {
    label: 'Shower sealant renewal',
    trade: 'bathroom-fitter',
    jobDescription: 'Shower sealant renewal',
  },
  {
    label: 'Gutter needs clearing',
    trade: 'roofer',
    jobDescription: 'Gutter needs clearing',
  },
  {
    label: 'TV needs mounting',
    trade: 'handyman',
    jobDescription: 'TV needs mounting',
  },
  {
    label: 'Ceiling plaster needs repairing',
    trade: 'plasterer',
    jobDescription: 'Ceiling plaster needs repairing',
  },
];

const POLL_INTERVAL_MS = 2000;
// Slack above the server's 300s maxDuration budget — a purely client-side
// backstop so a genuinely stalled run (e.g. after() never firing, a
// platform-level edge case) doesn't poll forever with no feedback.
const MAX_POLL_MS = 6 * 60 * 1000;

function truncate(text, max = 70) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function describeToolCall(tool, input) {
  switch (tool) {
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
  // Index into EXAMPLE_JOBS of whichever example is currently loaded into
  // the form below, '' when none is (including after a manual edit — this
  // only tracks the dropdown's own selection, not whether trade/jobDescription
  // still match it, so editing either afterwards doesn't fight the trader.
  const [exampleChoice, setExampleChoice] = useState('');
  // With photos, 'form' -> 'analysingPhotos' -> 'reviewingPhotos' (trader confirms what the
  // photos show) comes first, then the same flow below. Without photos it's skipped entirely.
  // 'form' -> 'proposing' (Phase A in flight) <-> 'clarifying' (Phase A asked
  // a question; loops back to 'proposing' once answered) -> 'refining'
  // (trader reviews the materials proposal) -> 'generating' (Phase B request
  // just fired) -> 'running' (polling an in-flight Phase B run). See
  // CLAUDE.md's Phase 3a addendum and its clarifying-question follow-up.
  const [phase, setPhase] = useState('form');
  const [refinementMaterials, setRefinementMaterials] = useState([]);
  // The clarifying question Phase A is currently asking, if any — see
  // lib/propose-materials.js. Distinct from `question` below, which is
  // Phase B's (currently unused, since ask_user is excluded from Phase B —
  // see prompts/system.js's PHASE_B_MATERIALS_RULES — but the dialog
  // rendering is kept in case that ever changes).
  const [clarifyingQuestion, setClarifyingQuestion] = useState(null);
  // Answered clarifying questions so far: question, reduced answer string
  // (for the API), and raw AskQuestionForm selections (for Back to restore).
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  // Raw selections to prefill AskQuestionForm with; set by Back, null for a
  // fresh question.
  const [clarifyingInitialAnswer, setClarifyingInitialAnswer] = useState(null);
  // Every raw answer ever given this session, keyed by question text — a
  // re-asked question (e.g. after Back then Continue) restores from here too.
  const [answerDraftsByQuestion, setAnswerDraftsByQuestion] = useState({});
  // propose-materials responses keyed by the exact priorQuestions payload —
  // an unchanged Back-then-Continue replays this instead of re-asking the LLM.
  const [proposeCache, setProposeCache] = useState({});
  // Client-generated per-refinement-session id, used only to group this
  // session's material_refinement_events rows for later analysis — not an
  // auth/user concept (the app is single-tenant, see CLAUDE.md's Phase 4
  // roadmap note).
  const [sessionId, setSessionId] = useState(null);
  // `{ id, previewUrl, status, pathname?, error? }[]` — see app/job-photos.js's PhotoPicker.
  const [photos, setPhotos] = useState([]);
  // analyse-photos response, with an id + checked flag per observation and the photos it covered.
  const [photoAnalysis, setPhotoAnalysis] = useState(null);
  // Which trade/description/photos photoAnalysis was run for, so Back-then-Continue reuses it.
  const photoAnalysisKeyRef = useRef(null);
  const [steps, setSteps] = useState([]);
  const [question, setQuestion] = useState(null);
  // True from the moment an answer is submitted until we know whether the
  // next turn needs another answer — keeps the dialog open across
  // back-to-back questions instead of closing/reopening between them.
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [error, setError] = useState(null);
  const runIdRef = useRef(null);
  const pollTimerRef = useRef(null);
  const pollStartRef = useRef(null);
  const dialogRef = useRef(null);
  const examplesDialogRef = useRef(null);
  // steps.length snapshot taken when waitingForNext turns true — pollStatus
  // only inspects steps written after this point to decide whether the next
  // turn needs another answer.
  const waitingSinceLenRef = useRef(0);
  // pollStatus is captured once by setInterval (see handleContinueToQuote)
  // and never re-created, so it can't read fresh state via closure —
  // mirrored here the same way runIdRef mirrors runId.
  const waitingForNextRef = useRef(false);

  function setWaiting(value) {
    waitingForNextRef.current = value;
    setWaitingForNext(value);
  }
  // Polling replaces `question` with a fresh object every ~2s even when it's
  // the same pending question — only reset submittingAnswer when the
  // question text actually changes, not on every poll tick (AskQuestionForm
  // handles resetting its own fields the same way).
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
      setPhase('form');
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
      setPhase('form');
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
      setWaiting(false);
      if (data.quoteId) {
        // Deliberately leave `phase` as-is (still 'running') rather than
        // resetting to 'form' here — router.push() below is an async client
        // transition, not an immediate unmount, so resetting first briefly
        // re-rendered this page's empty job-description form before
        // navigation actually landed on /quote/[id]. Only the no-quoteId
        // fallback below stays on this page, so only it needs 'form' back.
        router.push(`/quote/${data.quoteId}`);
      } else {
        setPhase('form');
        setError('Completed, but no quote was saved.');
      }
    } else if (data.status === 'error') {
      stopPolling();
      setPhase('form');
      setWaiting(false);
      setError(data.error || 'The run failed.');
    } else if (data.status === 'aborted') {
      stopPolling();
      setPhase('form');
      setWaiting(false);
      setError(data.error || 'This run was stopped.');
    }
  }

  // Returns the page to exactly what a fresh load looks like — used by
  // handleCancel, which cancels the whole in-flight quote, not just the
  // dialog it was triggered from.
  function resetToInitialState() {
    stopPolling();
    runIdRef.current = null;
    setTrade(VALID_TRADES[0]);
    setTone(VALID_TONES[0]);
    setJobDescription('');
    setExampleChoice('');
    setPhase('form');
    setRefinementMaterials([]);
    setClarifyingQuestion(null);
    setAnsweredQuestions([]);
    setClarifyingInitialAnswer(null);
    setAnswerDraftsByQuestion({});
    setProposeCache({});
    setSessionId(null);
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setPhotoAnalysis(null);
    photoAnalysisKeyRef.current = null;
    setSteps([]);
    setQuestion(null);
    setWaiting(false);
    waitingSinceLenRef.current = 0;
    setSubmittingAnswer(false);
    setError(null);
  }

  function updatePhoto(id, patch) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  // Compresses then uploads straight to the private Blob store as soon as photos are chosen,
  // so they're usually ready by the time the trader has finished typing.
  async function handleAddPhotos(files) {
    if (!files.length) return;
    const entries = files.map((file) => ({
      id: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      status: 'compressing',
    }));
    setPhotos((prev) => [...prev, ...entries].slice(0, MAX_JOB_PHOTOS));

    // Loaded on demand: the Blob client is most of this page's JS, and most quotes have no photos.
    const [{ upload }, results] = await Promise.all([import('@vercel/blob/client'), compressImages(files)]);
    await Promise.all(
      results.map(async (r, i) => {
        const { id } = entries[i];
        if (r.error) {
          updatePhoto(id, { status: 'failed', error: "This photo couldn't be read. Try a JPEG or PNG." });
          return;
        }
        updatePhoto(id, { status: 'uploading' });
        try {
          const blob = await upload(`job-photos/${id}.jpg`, r.blob, {
            access: 'private',
            handleUploadUrl: '/api/quote/photos/upload',
            contentType: 'image/jpeg',
          });
          updatePhoto(id, { status: 'ready', pathname: blob.pathname });
        } catch {
          updatePhoto(id, { status: 'failed', error: 'Upload failed. Remove it and try again.' });
        }
      }),
    );
  }

  function handleRemovePhoto(id) {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function handleTogglePhotoObservation(id) {
    setPhotoAnalysis((prev) => ({
      ...prev,
      observations: prev.observations.map((o) => (o.id === id ? { ...o, checked: !o.checked } : o)),
    }));
  }

  // What Phase A and Phase B get: only ticked observations. Resolved topics aren't tied to single
  // observations, so they're dropped once no ticked observation comes from a photo of the property itself.
  function confirmedPhotoFindings(analysis = photoAnalysis) {
    if (!analysis) return undefined;
    const checked = analysis.observations.filter((o) => o.checked);
    const hasSiteEvidence = checked.some((o) => analysis.photos[o.imageIndex - 1]?.kind === 'site');
    return {
      observations: checked.map((o) => o.observation),
      resolved: hasSiteEvidence ? analysis.resolved : [],
      unclear: analysis.unclear,
    };
  }

  async function analysePhotos(readyPhotos) {
    const key = JSON.stringify({ trade, jobDescription, photos: readyPhotos.map((p) => p.pathname) });
    if (photoAnalysis && photoAnalysisKeyRef.current === key) {
      setPhase('reviewingPhotos');
      return;
    }
    setPhase('analysingPhotos');

    let response;
    try {
      response = await fetch('/api/quote/analyse-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade, jobDescription, photos: readyPhotos.map((p) => p.pathname) }),
      });
    } catch {
      setError('Could not reach the server. Please try again.');
      setPhase('form');
      return;
    }
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setError(
        `Couldn't analyse the photos (${errorBody?.error || `request failed, ${response.status}`}). Try again, or remove the photos to continue without them.`,
      );
      setPhase('form');
      return;
    }

    const data = await response.json();
    setPhotoAnalysis({
      ...data,
      sourcePhotos: readyPhotos,
      // A tentative reading only goes into the quote if the trader ticks it themselves.
      observations: data.observations.map((o) => ({ ...o, id: crypto.randomUUID(), checked: o.confidence !== 'low' })),
    });
    photoAnalysisKeyRef.current = key;
    setPhase('reviewingPhotos');
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

  // Phase A (see CLAUDE.md's Phase 3a addendum, and its clarifying-question
  // follow-up): calls propose-materials with whatever { question, answer }
  // pairs have accumulated so far. The response is either another
  // clarifying question (loop back to the 'clarifying' phase) or the final
  // materials list (move on to 'refining') — see lib/propose-materials.js.
  // drafts defaults to live state; a caller that just reset it must pass the
  // fresh value explicitly — setState hasn't landed within the same tick.
  function applyProposeMaterialsResult(data, drafts = answerDraftsByQuestion) {
    if (data.clarifyingQuestion) {
      setClarifyingQuestion(data.clarifyingQuestion);
      setClarifyingInitialAnswer(drafts[data.clarifyingQuestion.question] ?? null);
      setPhase('clarifying');
      return;
    }

    setRefinementMaterials(
      (data.materials ?? []).map((m) => ({
        id: crypto.randomUUID(),
        label: m.label,
        quantity: m.quantity ?? null,
        description: m.description ?? null,
        source: 'llm_proposed',
        checked: true,
      })),
    );
    setSessionId(crypto.randomUUID());
    setPhase('refining');
  }

  // cache/drafts default to live state for the same reason as above — see
  // handleProposeMaterials for the one caller that must override them.
  async function callProposeMaterials(
    priorQs,
    { cache = proposeCache, drafts = answerDraftsByQuestion, photoFindings = confirmedPhotoFindings() } = {},
  ) {
    setPhase('proposing');

    // Findings are part of the key: unticking an observation changes what Phase A should propose.
    const cacheKey = JSON.stringify({ priorQs, photoFindings });
    if (Object.hasOwn(cache, cacheKey)) {
      applyProposeMaterialsResult(cache[cacheKey], drafts);
      return;
    }

    let response;
    try {
      response = await fetch('/api/quote/propose-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trade,
          jobDescription,
          priorQuestions: priorQs,
          photoFindings,
        }),
      });
    } catch {
      setError('Could not reach the server. Please try again.');
      setPhase('form');
      return;
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setError(errorBody?.error || `Request failed (${response.status})`);
      setPhase('form');
      return;
    }

    const data = await response.json();
    setProposeCache((prev) => ({ ...prev, [cacheKey]: data }));
    applyProposeMaterialsResult(data, drafts);
  }

  function handleOpenExamples() {
    examplesDialogRef.current?.showModal();
  }

  // Populates trade + jobDescription from the chosen example on submit —
  // the trader can still edit either field afterwards.
  function handleExamplesSubmit(e) {
    e.preventDefault();
    const example = EXAMPLE_JOBS[Number(exampleChoice)];
    if (example) {
      setTrade(example.trade);
      setJobDescription(example.jobDescription);
    }
    examplesDialogRef.current?.close();
  }

  function handleExamplesCancel() {
    examplesDialogRef.current?.close();
  }

  // Resets the picker to unselected whenever the modal closes (submit,
  // cancel, or Esc).
  function handleExamplesClose() {
    setExampleChoice('');
  }

  function resetClarifyingState() {
    setError(null);
    setAnsweredQuestions([]);
    setAnswerDraftsByQuestion({});
    setProposeCache({});
    setClarifyingQuestion(null);
  }

  async function handleProposeMaterials(e) {
    e.preventDefault();
    resetClarifyingState();
    const readyPhotos = photos.filter((p) => p.status === 'ready');
    if (readyPhotos.length) {
      await analysePhotos(readyPhotos);
      return;
    }
    setPhotoAnalysis(null);
    photoAnalysisKeyRef.current = null;
    // Passed explicitly (not read back from state) — the resets above
    // haven't landed yet within this same synchronous handler.
    await callProposeMaterials([], { cache: {}, drafts: {}, photoFindings: undefined });
  }

  async function handleContinueFromPhotos() {
    resetClarifyingState();
    await callProposeMaterials([], { cache: {}, drafts: {} });
  }

  async function handleClarifyingAnswer(answer, rawAnswer) {
    const updated = [
      ...answeredQuestions,
      { question: clarifyingQuestion, answer, rawAnswer },
    ];
    setAnsweredQuestions(updated);
    setAnswerDraftsByQuestion((prev) => ({
      ...prev,
      [clarifyingQuestion.question]: rawAnswer,
    }));
    setClarifyingQuestion(null);
    await callProposeMaterials(
      updated.map((e) => ({ question: e.question.question, answer: e.answer })),
    );
  }

  // Steps back one question at a time (used from both 'clarifying' and
  // 'refining') rather than jumping straight to the form in one go.
  function handleBack() {
    if (answeredQuestions.length === 0) {
      setPhase(photoAnalysis ? 'reviewingPhotos' : 'form');
      setAnsweredQuestions([]);
      setClarifyingQuestion(null);
      setRefinementMaterials([]);
      setSessionId(null);
      return;
    }
    const previous = answeredQuestions[answeredQuestions.length - 1];
    setAnsweredQuestions((prev) => prev.slice(0, -1));
    setClarifyingQuestion(previous.question);
    setClarifyingInitialAnswer(previous.rawAnswer);
    setRefinementMaterials([]);
    setSessionId(null);
    setPhase('clarifying');
  }

  function handleToggleMaterial(id) {
    setRefinementMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m)),
    );
  }

  function handleAddMaterial(label) {
    setRefinementMaterials((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label,
        quantity: null,
        description: null,
        source: 'trader_added',
        checked: true,
      },
    ]);
  }

  // Phase B: fires the quote-generation run with exactly the trader-checked
  // materials (plus the clarifying Q&A gathered in Phase A, as
  // `followUpAnswers` — Phase B can't ask its own questions, see
  // prompts/system.js's PHASE_B_MATERIALS_RULES), then (only once that
  // request is underway) records which proposals were kept/dropped and which
  // were trader-added — see recordRefinementEvents; a failure there must
  // never affect this flow.
  async function handleContinueToQuote() {
    const checkedMaterials = refinementMaterials.filter((m) => m.checked);
    const materialsPayload = checkedMaterials.map((m) => ({
      label: m.label,
      ...(m.quantity ? { quantity: m.quantity } : {}),
      ...(m.description ? { description: m.description } : {}),
    }));

    setPhase('generating');
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
        body: JSON.stringify({
          trade,
          tone,
          jobDescription,
          materials: materialsPayload,
          followUpAnswers: answeredQuestions.map((e) => ({
            question: e.question.question,
            answer: e.answer,
          })),
          photoFindings: confirmedPhotoFindings(),
        }),
      });
    } catch {
      setError('Could not reach the server. Please try again.');
      setPhase('refining');
      return;
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setError(errorBody?.error || `Request failed (${response.status})`);
      setPhase('refining');
      return;
    }

    const { runId } = await response.json();
    runIdRef.current = runId;
    pollStartRef.current = Date.now();
    setPhase('running');
    pollStatus();
    pollTimerRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);

    const events = [
      ...refinementMaterials
        .filter((m) => m.source === 'llm_proposed')
        .map((m) => ({
          label: m.label,
          source: 'llm_proposed',
          action: m.checked ? 'accepted' : 'rejected',
        })),
      ...refinementMaterials
        .filter((m) => m.source === 'trader_added' && m.checked)
        .map((m) => ({
          label: m.label,
          source: 'trader_added',
          action: 'accepted',
        })),
    ];
    // .catch() guards the RPC itself (e.g. a stale action id after a dev
    // hot reload) — the try/catch inside only covers its own DB write.
    recordRefinementEvents(sessionId, jobDescription, events).catch(() => {});
  }

  async function handleAnswerSubmit(answer) {
    if (!runIdRef.current || submittingAnswer) return;
    setSubmittingAnswer(true);
    try {
      await fetch(`/api/quote/${runIdRef.current}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });
      waitingSinceLenRef.current = steps.length;
      setQuestion(null);
      setWaiting(true);
    } finally {
      setSubmittingAnswer(false);
    }
  }

  const turnLog = groupStepsByTurn(steps);
  const photosBusy = photos.some((p) => p.status === 'compressing' || p.status === 'uploading');
  const checkedMaterialsCount = refinementMaterials.filter(
    (m) => m.checked,
  ).length;

  return (
    <div style={{ maxWidth: 640 }}>
      <h1>New quote</h1>

      {phase === 'form' && (
        <form
          onSubmit={handleProposeMaterials}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div style={{ color: '#666', fontSize: '0.9rem' }}>
            Describe the job and pick a trade and tone, and add photos if you
            have them — we'll ask a quick question first if needed, then propose
            a materials list for you to review before drafting the quote.
          </div>

          <section style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <label>
              Trade
              <select
                style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
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
              required
            />
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleOpenExamples();
              }}
              style={{ alignSelf: 'flex-end', fontSize: '0.85rem' }}
            >
              Examples
            </a>
          </label>

          <PhotoPicker photos={photos} onAdd={handleAddPhotos} onRemove={handleRemovePhoto} />

          <button
            type="submit"
            style={{ ...buttonStyle, width: 'fit-content', padding: '0.5rem 1rem' }}
            disabled={!jobDescription.trim() || photosBusy}
          >
            {photosBusy ? '⏳ Uploading photos…' : '➡️ Continue'}
          </button>
        </form>
      )}

      <dialog
        ref={examplesDialogRef}
        onClose={handleExamplesClose}
        style={{
          maxWidth: 480,
          width: '90%',
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: '1.25rem',
        }}
      >
        <h2>Try some common examples</h2>
        <form
          onSubmit={handleExamplesSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <select
            style={{ padding: '0.25rem' }}
            value={exampleChoice}
            onChange={(e) => setExampleChoice(e.target.value)}
          >
            <option value="">Choose an example…</option>
            {EXAMPLE_JOBS.map((example, index) => (
              <option key={example.label} value={index}>
                {example.label}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" style={buttonStyle} onClick={handleExamplesCancel}>
              ❌ Cancel
            </button>
            <button type="submit" style={buttonStyle} disabled={exampleChoice === ''}>
              ✅ Submit
            </button>
          </div>
        </form>
      </dialog>

      {phase === 'analysingPhotos' && (
        <PhotoAnalysisSkeleton count={photos.filter((p) => p.status === 'ready').length} />
      )}

      {phase === 'reviewingPhotos' && photoAnalysis && (
        <PhotoFindingsReview
          photos={photoAnalysis.sourcePhotos}
          analysis={photoAnalysis}
          onToggle={handleTogglePhotoObservation}
          onBack={() => setPhase('form')}
          onContinue={handleContinueFromPhotos}
        />
      )}

      {phase === 'proposing' && <MaterialsSkeleton />}

      {phase === 'clarifying' && clarifyingQuestion && (
        <div>
          <h2>Quick question</h2>
          <AskQuestionForm
            question={clarifyingQuestion}
            onSubmit={handleClarifyingAnswer}
            initialAnswer={clarifyingInitialAnswer}
            submitLabel="➡️ Continue"
            actions={
              <button
                type="button"
                style={{ ...buttonStyle, width: 'fit-content', padding: '0.5rem 1rem' }}
                onClick={handleBack}
              >
                ⬅️ Back
              </button>
            }
          />
        </div>
      )}

      {phase === 'refining' && (
        <MaterialsRefinement
          materials={refinementMaterials}
          onToggle={handleToggleMaterial}
          onAdd={handleAddMaterial}
          onBack={handleBack}
          onContinue={handleContinueToQuote}
        />
      )}

      {(phase === 'generating' || phase === 'running') && (
        <p style={{ color: '#666' }}>
          Generating quote using {checkedMaterialsCount} material
          {checkedMaterialsCount === 1 ? '' : 's'}…
        </p>
      )}

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          // Suppress the browser's own close-on-Esc — closing goes through
          // handleCancel so the run is actually cancelled server-side too,
          // not just visually dismissed. Ignored mid-submit, same as the
          // explicit Cancel button's own `disabled={submittingAnswer}` — an
          // Esc landing right as the answer POST is in flight shouldn't race
          // it into cancelling a run whose answer is about to be accepted.
          e.preventDefault();
          if (submittingAnswer) return;
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
          <AskQuestionForm
            question={question}
            onSubmit={handleAnswerSubmit}
            submitting={submittingAnswer}
            actions={
              <button
                type="button"
                style={{ ...buttonStyle, width: 'fit-content', padding: '0.5rem 1rem' }}
                onClick={handleCancel}
                disabled={submittingAnswer}
              >
                ❌ Cancel
              </button>
            }
          />
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
