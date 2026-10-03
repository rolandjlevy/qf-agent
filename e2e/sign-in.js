import { SESSION_COOKIE, authEnabled, sessionToken } from '../lib/auth.js';

// With APP_PASSWORD set (playwright.config.js loads .env), every app page needs a session. This adds the
// cookie the sign-in page would set, so tests skip the form and its five-tries-a-minute limit.
export async function signIn(context) {
  if (!authEnabled()) return;
  await context.addCookies([{ name: SESSION_COOKIE, value: await sessionToken(), url: 'http://localhost:3000' }]);
}
