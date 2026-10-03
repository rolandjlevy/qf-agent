// A single shared password (APP_PASSWORD) in front of the app until real sign-in (Phase 4). The session cookie
// holds an HMAC of a fixed string keyed by the password, so changing the password signs everyone out.
// Web Crypto only, so middleware.js (Edge) and the Server Actions (Node) can both use it.

export const SESSION_COOKIE = 'qf_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_MESSAGE = 'qf-session-v1';

// Unset (local dev, the CLI) = no password: every page stays open.
export function authEnabled() {
  return Boolean(process.env.APP_PASSWORD);
}

async function hmacHex(key, message) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Compares every character whatever the input, so timing doesn't reveal how much of a guess was right.
function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sessionToken() {
  return hmacHex(process.env.APP_PASSWORD, SESSION_MESSAGE);
}

export async function isValidSession(cookieValue) {
  if (!authEnabled()) return true;
  return constantTimeEqual(cookieValue, await sessionToken());
}

// Both sides are hashed first, so the comparison is always the same length.
export async function passwordMatches(input) {
  if (!authEnabled() || typeof input !== 'string') return false;
  const [given, expected] = await Promise.all([hmacHex(SESSION_MESSAGE, input), hmacHex(SESSION_MESSAGE, process.env.APP_PASSWORD)]);
  return constantTimeEqual(given, expected);
}

// Marketing pages and the read-only example quotes stay public; everything else needs the password.
export function isPublicPath(pathname) {
  return pathname === '/' || pathname === '/pricing' || pathname === '/login' || /^\/quote\/example(\/|$)/.test(pathname);
}

// Where to go after signing in: only a path on this site, never another domain ("//evil.com", "/\evil.com").
export function safeNextPath(next) {
  return typeof next === 'string' && /^\/(?![/\\])/.test(next) ? next : '/quote/new';
}
