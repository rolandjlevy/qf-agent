'use client'

import { useActionState } from 'react'
import { saveProfile, importQuote } from '../../lib/actions/profile.js'

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '0.25rem' }
const inputStyle = { padding: '0.4rem 0.5rem', font: 'inherit' }

export default function ProfileForm({ profile }) {
  const [saveState, saveAction, savePending] = useActionState(saveProfile, { success: false, error: null })
  const [importState, importAction, importPending] = useActionState(importQuote, {
    success: false,
    error: null,
    imported: [],
  })

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

        <button type="submit" disabled={savePending}>
          {savePending ? 'Saving…' : 'Save profile'}
        </button>
        {saveState.success && <p style={{ color: 'green' }}>Profile saved.</p>}
        {saveState.error && <p style={{ color: 'crimson' }}>{saveState.error}</p>}
      </form>

      <form action={importAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2>Import past quotes</h2>
        <p style={{ color: '#666', margin: 0 }}>
          Upload a few past quotes (.md, .txt, .pdf, .docx) so QuoteFetch can learn your real material prices.
        </p>

        <input type="file" name="files" multiple accept=".md,.txt,.pdf,.docx" />

        <button type="submit" disabled={importPending}>
          {importPending ? 'Importing…' : 'Import'}
        </button>

        {importState.error && <p style={{ color: 'crimson' }}>{importState.error}</p>}
        {importState.imported.length > 0 && (
          <ul>
            {importState.imported.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </form>
    </div>
  )
}
