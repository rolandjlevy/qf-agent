'use client'

import { useActionState } from 'react'
import { CircleAlert, Loader2, LockKeyhole, LogIn } from 'lucide-react'
import { login } from '../../lib/actions/auth.js'
import { cn } from '@/lib/utils'
import { CARD_CLASS } from '@/components/quote/step-layout'
import { primaryButtonClass } from '@/components/quote/primary-action'

export default function LoginForm({ next }) {
  const [state, action, pending] = useActionState(login, { error: null })

  return (
    <form action={action} className={cn(CARD_CLASS, 'flex flex-col gap-5 p-6 md:p-8')}>
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand">
          <LockKeyhole className="size-6" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h1 className="m-0 text-[28px] leading-tight font-bold tracking-[-0.02em]">Sign in</h1>
        <p className="m-0 text-[15px] text-muted-foreground">QuoteFetch is private for now. Enter the password to continue.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          data-slot="input"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? 'login-error' : undefined}
          className="h-11 w-full rounded-control border border-input bg-card px-3.5 text-base text-foreground shadow-xs outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-subtle-border aria-invalid:border-destructive md:text-[15px]"
        />
        <p
          id="login-error"
          role="alert"
          className={cn('m-0 flex items-center gap-1.5 text-[13px] text-destructive', !state.error && 'sr-only')}
        >
          {state.error && <CircleAlert className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />}
          {state.error}
        </p>
      </div>

      <button type="submit" data-slot="primary-action" disabled={pending} className={cn(primaryButtonClass(!pending), 'w-full')}>
        {pending ? (
          <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <LogIn className="size-5" strokeWidth={1.75} aria-hidden="true" />
        )}
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
