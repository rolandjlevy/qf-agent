import { MAX_JOB_PHOTOS } from './constants.js';

// Splits newly chosen or dropped files into the ones to add and a message for the rest,
// so extra files are refused inline instead of being silently dropped.
export function acceptPhotoFiles(files, currentCount, max = MAX_JOB_PHOTOS) {
  const images = files.filter((f) => f.type?.startsWith('image/'));
  const accepted = images.slice(0, Math.max(0, max - currentCount));
  const over = images.length - accepted.length;

  let message = null;
  if (over > 0) {
    message = `You can add up to ${max} photos, so ${over} ${over === 1 ? "wasn't" : "weren't"} added.`;
  } else if (images.length < files.length) {
    message = 'Only photos can be added here.';
  }
  return { accepted, message };
}

// Whether step 1 can continue, and if not, the reason shown beside the button.
// Text alone or one uploaded photo is enough; photos still uploading hold it back.
export function continueState({ description, photos, trade }) {
  if (photos.some((p) => p.status === 'compressing' || p.status === 'uploading')) {
    return { enabled: false, reason: 'Uploading photos…' };
  }
  if (!description.trim() && !photos.some((p) => p.status === 'ready')) {
    return { enabled: false, reason: 'Add a description or photo to continue' };
  }
  if (!trade) return { enabled: false, reason: 'Choose a trade to continue' };
  return { enabled: true, reason: null };
}

const TITLE_MAX = 60;

// A recent-quote card's title: the description's first sentence, cut at a word to fit.
export function quoteTitle(description) {
  const text = (description ?? '').trim().replace(/\s+/g, ' ');
  const sentence = text.split(/(?<=[.!?])\s/)[0].replace(/[.!?]$/, '');
  if (sentence.length <= TITLE_MAX) return sentence;
  const cut = sentence.slice(0, TITLE_MAX - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:–-]+$/, '')}…`;
}

const LONDON_DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: 'numeric', day: 'numeric' });

// The London calendar day as a UTC midnight timestamp, so two days subtract to whole days.
function londonDay(date) {
  const { year, month, day } = Object.fromEntries(LONDON_DATE.formatToParts(date).map((p) => [p.type, Number(p.value)]));
  return Date.UTC(year, month - 1, day);
}

// A recent-quote card's age by London calendar day: "Today", "Yesterday", "3d ago", "2w ago", then the date.
export function relativeTime(iso, now = new Date()) {
  const date = new Date(iso);
  const days = Math.round((londonDay(now) - londonDay(date)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 35) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' });
}

// Mobile focus scroll: the window scrollY that puts a focused field (or its label, when the label sits
// just above it) `gap` px under the sticky header. Null when it's already within a few px of there.
export function focusScrollTarget({ scrollY, fieldTop, labelTop = null, headerBottom, gap = 12 }) {
  const top = labelTop !== null && labelTop < fieldTop && fieldTop - labelTop <= 80 ? labelTop : fieldTop;
  const target = Math.max(0, Math.round(scrollY + top - headerBottom - gap));
  return Math.abs(target - scrollY) < 4 ? null : target;
}

// The seven drafted sections in the order the quote shows them (tools/save-quote.js).
export const QUOTE_SECTIONS = [
  ['introduction', 'Introduction'],
  ['materials', 'Materials'],
  ['scope', 'Scope of work'],
  ['assumptions', 'Assumptions'],
  ['exclusions', 'Exclusions'],
  ['next_steps', 'Next steps'],
  ['disclaimers', 'Disclaimers'],
];

// Real Phase B progress from the run's steps: each section is pending, active (drafting)
// or done, then the quote is saved. `fraction` counts the save as one more step.
export function draftingProgress(steps = []) {
  const started = new Set();
  const drafted = new Set();
  let saving = false;
  let saved = false;
  for (const step of steps) {
    if (step.tool === 'draft_section') {
      if (step.type === 'tool_call' && step.input?.section) started.add(step.input.section);
      if (step.type === 'tool_result' && step.result?.section && !step.result.error) drafted.add(step.result.section);
    } else if (step.tool === 'save_quote') {
      if (step.type === 'tool_call') saving = true;
      if (step.type === 'tool_result' && step.result?.success) saved = true;
    }
  }
  const sections = QUOTE_SECTIONS.map(([key, label]) => ({
    key,
    label,
    state: drafted.has(key) ? 'done' : started.has(key) ? 'active' : 'pending',
  }));
  const doneCount = sections.filter((s) => s.state === 'done').length;
  return {
    sections,
    doneCount,
    saving: saving && !saved,
    saved,
    fraction: (doneCount + (saved ? 1 : 0)) / (QUOTE_SECTIONS.length + 1),
  };
}
