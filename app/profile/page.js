import { getTraderProfile } from '../../lib/db.js'
import ProfileForm from './profile-form.js'

// Always read live from Neon — the CLI (`node qf.js profile`) can update
// this same row with no way to trigger Next's cache revalidation.
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const profile = await getTraderProfile()

  return (
    <div>
      <h1>Trader Profile</h1>
      <ProfileForm profile={profile} />
    </div>
  )
}
