import { getTraderProfile } from '../../lib/db.js'
import { PageHeader, PageShell } from '@/components/app-page'
import ProfileForm from './profile-form.js'

// Always read live from Neon — the CLI (`node qf.js profile`) can update
// this same row with no way to trigger Next's cache revalidation.
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const profile = await getTraderProfile()

  return (
    <PageShell className="pb-40 md:pb-12">
      <PageHeader
        title="Your business"
        description="These details go on every quote, so your customers know who it's from."
      />
      <ProfileForm profile={profile} />
    </PageShell>
  )
}
