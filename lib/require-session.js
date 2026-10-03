import { cookies } from 'next/headers'
import { SESSION_COOKIE, isValidSession } from './auth.js'

// For Server Actions, behind middleware.js's check: an action can be posted to any page, so each one checks too.
export async function requireSession() {
  if (!(await isValidSession((await cookies()).get(SESSION_COOKIE)?.value))) {
    throw new Error('Sign in to QuoteFetch first.')
  }
}
