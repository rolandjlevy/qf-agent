'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, passwordMatches, safeNextPath, sessionToken } from '../auth.js'
import { createRateLimiter } from '../rate-limit.js'

// Five tries a minute per IP, shared across instances, so the password can't be guessed by brute force.
const isLoginRateLimited = createRateLimiter({ prefix: 'login', max: 5, windowSeconds: 60 })

export async function login(_prevState, formData) {
  const forwarded = (await headers()).get('x-forwarded-for')
  if (await isLoginRateLimited(forwarded ? forwarded.split(',')[0].trim() : 'unknown')) {
    return { error: 'Too many attempts. Wait a minute and try again.' }
  }
  if (!(await passwordMatches(formData.get('password')))) {
    return { error: "That password isn't right." }
  }
  ;(await cookies()).set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
  redirect(safeNextPath(formData.get('next')))
}

export async function logout() {
  ;(await cookies()).delete(SESSION_COOKIE)
  redirect('/')
}
