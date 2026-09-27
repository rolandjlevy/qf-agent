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
