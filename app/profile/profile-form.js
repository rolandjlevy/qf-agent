'use client'

import { useActionState } from 'react'
import { saveProfile } from '../../lib/actions/profile.js'

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '0.25rem' }
const inputStyle = { padding: '0.4rem 0.5rem', font: 'inherit' }

export default function ProfileForm({ profile }) {
  const [saveState, saveAction, savePending] = useActionState(saveProfile, { success: false, error: null })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', maxWidth: 480 }}>
      <form action={saveAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2>Business details</h2>

        <label style={fieldStyle}>
          Business name
          <input style={inputStyle} type="text" name="business_name" defaultValue={profile?.business_name || ''} />
        </label>

        <label style={fieldStyle}>
          Contact details (phone / email / address)
          <textarea style={inputStyle} name="contact_details" defaultValue={profile?.contact_details || ''} rows={2} />
        </label>

        <label style={fieldStyle}>
          Hourly rate (£)
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            name="hourly_rate"
            defaultValue={profile?.hourly_rate ?? ''}
          />
        </label>

        <label style={fieldStyle}>
          Standard T&Cs
          <textarea style={inputStyle} name="standard_terms" defaultValue={profile?.standard_terms || ''} rows={3} />
        </label>

        <label style={fieldStyle}>
          Sample of how you normally write to customers (used to match tone)
          <textarea style={inputStyle} name="voice_sample" defaultValue={profile?.voice_sample || ''} rows={2} />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" name="vat_registered" defaultChecked={profile?.vat_registered || false} />
          VAT registered
        </label>

        <label style={fieldStyle}>
          Certifications / registrations (e.g. "Gas Safe Reg 123456, Part P certified")
          <textarea style={inputStyle} name="certifications" defaultValue={profile?.certifications || ''} rows={2} />
        </label>

        <label style={fieldStyle}>
          Service area (e.g. "North London and surrounding areas")
          <input style={inputStyle} type="text" name="service_area" defaultValue={profile?.service_area || ''} />
        </label>

        <button type="submit" disabled={savePending}>
          {savePending ? 'Saving…' : 'Save profile'}
        </button>
        {saveState.success && <p style={{ color: 'green' }}>Profile saved.</p>}
        {saveState.error && <p style={{ color: 'crimson' }}>{saveState.error}</p>}
      </form>
    </div>
  )
}
