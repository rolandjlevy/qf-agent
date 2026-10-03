import { redirect } from 'next/navigation'
import { authEnabled, safeNextPath } from '../../lib/auth.js'
import { PageShell } from '@/components/app-page'
import LoginForm from './login-form.js'

export const metadata = { title: 'Sign in · QuoteFetch', robots: { index: false } }
// Reads the env at request time, so turning the password on or off needs no rebuild.
export const dynamic = 'force-dynamic'

export default async function LoginPage({ searchParams }) {
  const next = safeNextPath((await searchParams).next)
  if (!authEnabled()) redirect(next)

  return (
    <PageShell className="max-w-[440px] md:pt-20">
      <LoginForm next={next} />
    </PageShell>
  )
}
