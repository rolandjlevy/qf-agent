'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MAX_JOB_PHOTOS } from '../../../lib/constants.js';
import { compressImages } from '../../../lib/compress-image.js';
import MaterialsRefinement from '../../materials-refinement.js';
import { recordRefinementEvents } from '../../../lib/actions/log-refinement.js';
import AskQuestionForm from '../../ask-question-form.js';
import { PhotoFindingsReview } from '../../job-photos.js';
import { KeyQuestions, keyQuestionAnswer } from '../../key-questions-form.js';
import { keyQuestionsFor } from '../../../lib/key-questions.js';
import StepIndicator, { stepForPhase } from '@/components/quote/step-indicator';
import TradeChip from '@/components/quote/trade-chip';
import JobComposer from '@/components/quote/job-composer';
import ExampleChips from '@/components/quote/example-chips';
import { exampleSlug, isExampleDescription, showsExampleChips } from '@/lib/example-jobs';
import RecentQuotes from '@/components/quote/recent-quotes';
import SampleQuote from '@/components/quote/sample-quote';
import {
  MaterialsLoading,
  PhotoAnalysisLoading,
  QuoteDraftingProgress,
} from '@/components/quote/loading-states';
import PrimaryAction from '@/components/quote/primary-action';
import { StepHeader } from '@/components/quote/step-layout';
import { useMobileFocusScroll, useMobileScrollTopOn } from '@/components/quote/use-mobile-focus-scroll';
import { continueState } from '@/lib/new-quote';
import {
  examplePhoto,
  unsplashPhotoFileUrl,
} from '../../../lib/example-photos.js';

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

// initialTrade/initialDescription come from the profile, a recent quote or an example (page.js); trade may be null.
// initialExample is the ?example= slug, whose photo is attached on load as a chip tap would.
// Tone isn't chosen here: the quote route uses the profile's. sampleTitles maps sample key to title.
export default function NewQuoteFlow({ initialTrade, initialDescription = '', initialExample = null, recentQuotes = [], quoteCount = 0, sampleTitles = {} }) {
  const router = useRouter();
  const [trade, setTrade] = useState(initialTrade);
  const [jobDescription, setJobDescription] = useState(initialDescription);
  // True while step 1's submit is waiting on the server, before the phase moves on.
  const [submitting, setSubmitting] = useState(false);
  // 'keyQuestions' (lib/key-questions.js, plus any gaps the photos found) always comes first.
  // With photos, 'form' -> 'analysingPhotos' -> 'reviewingPhotos' (trader confirms what the
  // photos show) comes before it and can skip questions the photos answer.
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
  // Phase A's match against the trade's knowledge pack (lib/trade-knowledge/), passed on to Phase B.
  const [jobType, setJobType] = useState(null);
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
  // `{ id, previewUrl, status, pathname?, error? }[]` — see components/quote/photo-thumbnails.jsx.
  const [photos, setPhotos] = useState([]);
  // analyse-photos response, with an id + checked flag per observation and the photos it covered.
  const [photoAnalysis, setPhotoAnalysis] = useState(null);
  // Which trade/description/photos photoAnalysis was run for, so Back-then-Continue reuses it.
  const photoAnalysisKeyRef = useRef(null);
  // What Phase A, Phase B and analytics get: the typed description, or for a photos-only job,
  // the summary photo analysis wrote. The routes after photo analysis all require one.
  const effectiveDescription = jobDescription.trim() || photoAnalysis?.jobSummary || '';
  const canContinue = continueState({ description: jobDescription, photos, trade });
  const sampleKey = trade && Object.hasOwn(sampleTitles, trade) ? trade : 'general';
  // `{ [topic]: { choice, otherText } }` for keyQuestionsToAsk() — see app/key-questions-form.js.
  const [keyAnswers, setKeyAnswers] = useState({});
  // Without photos: the key questions for this description, minus any its matched pack job skips.
  const [jobKeyQuestions, setJobKeyQuestions] = useState(null);
  const [steps, setSteps] = useState([]);
  const [question, setQuestion] = useState(null);
  // True from the moment an answer is submitted until we know whether the
  // next turn needs another answer — keeps the dialog open across
  // back-to-back questions instead of closing/reopening between them.
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [error, setError] = useState(null);
  const runIdRef = useRef(null);
  const shellRef = useRef(null);
  useMobileFocusScroll(shellRef);
  useMobileScrollTopOn(phase);
  const pollTimerRef = useRef(null);
  const pollStartRef = useRef(null);
  const dialogRef = useRef(null);
  const textareaRef = useRef(null);
  // Bumped whenever the example photo is replaced or dropped, so a download still in flight is discarded.
  const examplePhotoRequestRef = useRef(0);
  const [clearedDescription, setClearedDescription] = useState(null);
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

  // The ref keeps Strict Mode's second effect run from attaching the photo twice.
  const initialExampleAttachedRef = useRef(false);
  useEffect(() => {
    if (!initialExample || initialExampleAttachedRef.current) return;
    initialExampleAttachedRef.current = true;
    pickExamplePhoto(initialExample);
  }, [initialExample]);

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
    setTrade(initialTrade);
    setJobDescription(initialDescription);
    setClearedDescription(null);
    setPhase('form');
    setRefinementMaterials([]);
    setClarifyingQuestion(null);
    setAnsweredQuestions([]);
    setClarifyingInitialAnswer(null);
    setAnswerDraftsByQuestion({});
    setProposeCache({});
    setJobType(null);
    setSessionId(null);
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setPhotoAnalysis(null);
    photoAnalysisKeyRef.current = null;
    setKeyAnswers({});
    setJobKeyQuestions(null);
    setSteps([]);
    setQuestion(null);
    setWaiting(false);
    waitingSinceLenRef.current = 0;
    setSubmittingAnswer(false);
    setError(null);
  }

  function updatePhoto(id, patch) {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }

  // Compresses then uploads straight to the private Blob store as soon as photos are chosen,
  // so they're usually ready by the time the trader has finished typing.
  async function handleAddPhotos(files, meta = {}) {
    if (!files.length) return;
    setClearedDescription(null);
    const entries = files.map((file) => ({
      id: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      status: 'compressing',
      ...meta,
    }));
    setPhotos((prev) => [...prev, ...entries].slice(0, MAX_JOB_PHOTOS));

    // Loaded on demand: the Blob client is most of this page's JS, and most quotes have no photos.
    const [{ upload }, results] = await Promise.all([
      import('@vercel/blob/client'),
      compressImages(files),
    ]);
    await Promise.all(
      results.map(async (r, i) => {
        const { id } = entries[i];
        if (r.error) {
          updatePhoto(id, {
            status: 'failed',
            error: "Couldn't be read. Try a JPEG or PNG.",
          });
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
          updatePhoto(id, {
            status: 'failed',
            error: 'Upload failed. Remove and try again.',
          });
        }
      }),
    );
  }

  // Removing the last photo also clears the description, with an Undo under the box.
  function handleRemovePhoto(id) {
    if (photos.every((p) => p.id === id) && jobDescription.trim()) {
      setClearedDescription(jobDescription);
      setJobDescription('');
    }
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function handleTogglePhotoObservation(id) {
    setPhotoAnalysis((prev) => ({
      ...prev,
      observations: prev.observations.map((o) =>
        o.id === id ? { ...o, checked: !o.checked } : o,
      ),
    }));
  }

  function hasCheckedSiteEvidence(analysis) {
    return analysis.observations.some(
      (o) => o.checked && analysis.photos[o.imageIndex - 1]?.kind === 'site',
    );
  }

  // Without photos, the trade's key questions. With them, the analysis's list, minus any key
  // question the photos answered, unless the trader unticked every observation of the property.
  function keyQuestionsToAsk(analysis = photoAnalysis) {
    if (!analysis) return jobKeyQuestions ?? keyQuestionsFor(trade);
    const siteEvidence = hasCheckedSiteEvidence(analysis);
    return analysis.unclear.filter((q) => !q.answeredByPhotos || !siteEvidence);
  }

  // What Phase A and Phase B get: only ticked observations. Resolved topics aren't tied to single
  // observations, so they're dropped once no ticked observation comes from a photo of the property itself.
  // `unclear` keeps only the questions the trader couldn't answer; answered ones go out via keyQuestionPairs.
  function jobFindings(analysis = photoAnalysis) {
    const unclear = keyQuestionsToAsk(analysis)
      .filter((q) => !keyQuestionAnswer(keyAnswers[q.topic]))
      .map((q) => q.topic);
    if (!analysis)
      return unclear.length
        ? { observations: [], resolved: [], unclear }
        : undefined;
    const checked = analysis.observations.filter((o) => o.checked);
    return {
      observations: checked.map((o) => o.observation),
      resolved: hasCheckedSiteEvidence(analysis) ? analysis.resolved : [],
      unclear,
    };
  }

  // Answered key questions as { question, answer }, sent ahead of Phase A's own Q&A.
  function keyQuestionPairs() {
    return keyQuestionsToAsk()
      .map((q) => ({
        question: q.question,
        answer: keyQuestionAnswer(keyAnswers[q.topic]),
      }))
      .filter((qa) => qa.answer);
  }

  async function analysePhotos(readyPhotos) {
    const key = JSON.stringify({
      trade,
      jobDescription,
      photos: readyPhotos.map((p) => p.pathname),
    });
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
        body: JSON.stringify({
          trade,
          jobDescription,
          photos: readyPhotos.map((p) => p.pathname),
        }),
      });
    } catch {
      setError('Could not reach the server. Please try again.');
      setPhase('form');
      return;
    }
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      // 422: photos only, and the job couldn't be worked out from them; the message says what to do.
      setError(
        response.status === 422 && errorBody?.error
          ? errorBody.error
          : `Couldn't analyse the photos (${errorBody?.error || `request failed, ${response.status}`}). Try again, or remove the photos to continue without them.`,
      );
      setPhase('form');
      return;
    }

    const data = await response.json();
    setPhotoAnalysis({
      ...data,
      sourcePhotos: readyPhotos,
      // Tentative readings, and anything from a photo judged not to show the job, start unticked.
      observations: data.observations.map((o) => ({
        ...o,
        id: crypto.randomUUID(),
        checked: o.confidence !== 'low' && data.photos[o.imageIndex - 1]?.kind !== 'irrelevant',
      })),
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
    if (data.jobType) setJobType(data.jobType);
    if (data.clarifyingQuestion) {
      setClarifyingQuestion(data.clarifyingQuestion);
      setClarifyingInitialAnswer(
        drafts[data.clarifyingQuestion.question] ?? null,
      );
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
    {
      cache = proposeCache,
      drafts = answerDraftsByQuestion,
      photoFindings = jobFindings(),
    } = {},
  ) {
    setPhase('proposing');

    // Sent apart from priorQs: key answers don't count toward Phase A's own question cap.
    const keyPairs = keyQuestionPairs();
    // Findings are part of the key: unticking an observation changes what Phase A should propose.
    const cacheKey = JSON.stringify({ keyPairs, priorQs, photoFindings });
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
          jobDescription: effectiveDescription,
          priorQuestions: priorQs,
          keyAnswers: keyPairs,
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

  // An untouched example belongs to the old trade, so it goes (with its photo) and the new trade's chips show.
  // Anything the trader typed or pasted stays.
  function handleTradeChange(next) {
    if (next !== trade && isExampleDescription(jobDescription)) {
      setJobDescription('');
      setClearedDescription(null);
      removeExamplePhotos();
    }
    setTrade(next);
  }

  function handleDescriptionChange(value) {
    setClearedDescription(null);
    setJobDescription(value);
  }

  function handleUndoClear() {
    setJobDescription(clearedDescription);
    setClearedDescription(null);
    textareaRef.current?.focus();
  }

  // An example chip fills the description and attaches that example's Unsplash photo.
  function handlePickExample(example) {
    setJobDescription(example.jobDescription);
    setClearedDescription(null);
    textareaRef.current?.focus();
    pickExamplePhoto(exampleSlug(example));
  }

  // Unsplash requires a download report when a photo is used; failure is ignored.
  function pickExamplePhoto(slug) {
    attachExamplePhoto(slug);
    fetch('/api/examples/unsplash-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ example: slug }),
    }).catch(() => {});
  }

  // Removes the example photo (uploaded ones stay) and discards any still downloading.
  function removeExamplePhotos() {
    examplePhotoRequestRef.current += 1;
    setPhotos((prev) => {
      prev
        .filter((p) => p.fromExample)
        .forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return prev.filter((p) => !p.fromExample);
    });
  }

  // Adds the example's photo as a job photo, through the same compress-and-upload path as
  // the trader's own. It replaces any earlier example photo but leaves uploaded ones alone.
  async function attachExamplePhoto(slug) {
    const photo = examplePhoto(slug);
    if (!photo) return;
    removeExamplePhotos();
    const request = examplePhotoRequestRef.current;
    try {
      const response = await fetch(unsplashPhotoFileUrl(photo));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (request !== examplePhotoRequestRef.current) return;
      const file = new File([blob], `${slug}-example.jpg`, { type: 'image/jpeg' });
      await handleAddPhotos([file], { fromExample: slug });
    } catch (err) {
      console.warn('Could not attach the example photo:', err.message);
    }
  }

  function resetClarifyingState() {
    setError(null);
    setAnsweredQuestions([]);
    setAnswerDraftsByQuestion({});
    setProposeCache({});
    setClarifyingQuestion(null);
    setJobType(null);
  }

  async function handleProposeMaterials(e) {
    e.preventDefault();
    if (!canContinue.enabled || submitting) return;
    resetClarifyingState();
    setSubmitting(true);
    try {
      const readyPhotos = photos.filter((p) => p.status === 'ready');
      if (readyPhotos.length) {
        await analysePhotos(readyPhotos);
        return;
      }
      setPhotoAnalysis(null);
      photoAnalysisKeyRef.current = null;
      setJobKeyQuestions(await fetchJobKeyQuestions());
      // Every trade has key questions, and no pack job skips all of them, so this never skips Phase A.
      setPhase('keyQuestions');
    } finally {
      setSubmitting(false);
    }
  }

  // Falls back to the full trade list (null) if the request fails, which is the old behaviour.
  async function fetchJobKeyQuestions() {
    try {
      const response = await fetch('/api/quote/key-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade, jobDescription }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return Array.isArray(data.questions) && data.questions.length ? data.questions : null;
    } catch {
      return null;
    }
  }

  async function handleContinueFromPhotos() {
    if (keyQuestionsToAsk().length) {
      setPhase('keyQuestions');
      return;
    }
    await handleContinueFromKeyQuestions();
  }

  async function handleContinueFromKeyQuestions() {
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
      if (keyQuestionsToAsk().length) setPhase('keyQuestions');
      else setPhase(photoAnalysis ? 'reviewingPhotos' : 'form');
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
          jobDescription: effectiveDescription,
          materials: materialsPayload,
          followUpAnswers: [
            ...keyQuestionPairs(),
            ...answeredQuestions.map((e) => ({
              question: e.question.question,
              answer: e.answer,
            })),
          ],
          photoFindings: jobFindings(),
          jobType,
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
    recordRefinementEvents(sessionId, effectiveDescription, events).catch(() => {});
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
  const checkedMaterialsCount = refinementMaterials.filter(
    (m) => m.checked,
  ).length;

  return (
    // data-page-shell opts this page out of the layout's legacy <main> padding.
    <div
      ref={shellRef}
      data-page-shell
      className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-5 pt-4 pb-12 md:gap-7 md:px-0 md:py-12"
    >
      <StepIndicator current={stepForPhase(phase)} />
      {phase === 'form' ? (
        <div className="flex flex-col gap-2.5 pt-1 md:flex-row md:items-baseline md:justify-between md:gap-4">
          <h1 className="m-0 text-[32px] leading-tight font-bold tracking-[-0.02em] md:text-[44px] md:leading-[1.15] md:tracking-[-0.025em]">
            What&apos;s the job?
          </h1>
          <TradeChip value={trade} onChange={handleTradeChange} />
        </div>
      ) : (
        <h1 className="sr-only">New quote</h1>
      )}

      <div>

      {phase === 'form' && (
        // Mobile bottom padding keeps the last content clear of PrimaryAction's fixed bar.
        <form onSubmit={handleProposeMaterials} className="flex flex-col gap-5 pb-36 md:gap-7 md:pb-0">
          <JobComposer
            value={jobDescription}
            onChange={handleDescriptionChange}
            trade={trade}
            photos={photos}
            onAddPhotos={handleAddPhotos}
            onRemovePhoto={handleRemovePhoto}
            textareaRef={textareaRef}
            onUndoClear={clearedDescription ? handleUndoClear : null}
          />

          {showsExampleChips(trade, jobDescription) && <ExampleChips trade={trade} onPick={handlePickExample} />}

          <PrimaryAction
            enabled={canContinue.enabled}
            reason={canContinue.reason}
            submitting={submitting}
          />

          {/* Desktop only for now. New traders see a sample quote until they have quotes of their own. */}
          <div className="hidden border-t border-border pt-7 md:block">
            {recentQuotes.length > 0 ? (
              <RecentQuotes quotes={recentQuotes} total={quoteCount} />
            ) : (
              <SampleQuote sample={{ key: sampleKey, title: sampleTitles[sampleKey] }} />
            )}
          </div>
        </form>
      )}


      {phase === 'analysingPhotos' && (
        <PhotoAnalysisLoading photos={photos.filter((p) => p.status === 'ready')} />
      )}

      {phase === 'reviewingPhotos' && photoAnalysis && (
        <PhotoFindingsReview
          photos={photoAnalysis.sourcePhotos}
          analysis={photoAnalysis}
          jobSummary={jobDescription.trim() ? null : photoAnalysis.jobSummary}
          questionCount={keyQuestionsToAsk().length}
          onToggle={handleTogglePhotoObservation}
          onBack={() => setPhase('form')}
          onContinue={handleContinueFromPhotos}
        />
      )}

      {phase === 'keyQuestions' && (
        <KeyQuestions
          title={
            photoAnalysis
              ? "Things the photos can't show"
              : 'A few quick questions'
          }
          questions={keyQuestionsToAsk()}
          answers={keyAnswers}
          onChange={setKeyAnswers}
          onBack={() => setPhase(photoAnalysis ? 'reviewingPhotos' : 'form')}
          onContinue={handleContinueFromKeyQuestions}
        />
      )}

      {phase === 'proposing' && <MaterialsLoading />}

      {phase === 'clarifying' && clarifyingQuestion && (
        <AskQuestionForm
          question={clarifyingQuestion}
          onSubmit={handleClarifyingAnswer}
          initialAnswer={clarifyingInitialAnswer}
          submitLabel="Continue"
          onBack={handleBack}
          sticky
        >
          <StepHeader title="Quick question">One more detail that changes which materials the job needs.</StepHeader>
        </AskQuestionForm>
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
        <QuoteDraftingProgress steps={steps} materialsCount={checkedMaterialsCount} />
      )}

      {error && (
        <p role="alert" className="m-0 mt-4 rounded-control border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

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
        className="m-auto w-[90%] max-w-[520px] rounded-card border border-border bg-background p-5 shadow-card backdrop:bg-foreground/40"
      >
        {!question && waitingForNext && (
          <p className="m-0 text-[15px] text-muted-foreground">Thinking about your answer…</p>
        )}
        {question && (
          <AskQuestionForm
            question={question}
            onSubmit={handleAnswerSubmit}
            submitting={submittingAnswer}
            onBack={handleCancel}
            backLabel="Cancel"
          />
        )}
      </dialog>

      {/* The raw agent log, kept for troubleshooting; QuoteDraftingProgress is the trader's view. */}
      {turnLog.length > 0 && (
        <details style={{ marginTop: '1.5rem', color: '#444' }}>
          <summary className="min-h-11 cursor-pointer py-2 text-sm text-muted-foreground">
            Show technical log
          </summary>
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
        </details>
      )}
      </div>
    </div>
  );
}
