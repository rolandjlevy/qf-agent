'use client';

import { useEffect, useState } from 'react';

const FIELDS = [
  { name: 'business_name', label: 'Business name', type: 'text' },
  { name: 'contact_details', label: 'Contact details (phone / email / address)', type: 'text' },
  { name: 'hourly_rate', label: 'Hourly rate (£)', type: 'number' },
  { name: 'standard_terms', label: 'Standard T&Cs (short summary)', type: 'textarea' },
  { name: 'voice_sample', label: "Sample of how you normally write to customers", type: 'textarea' },
];

const EMPTY_FORM = {
  business_name: '',
  contact_details: '',
  hourly_rate: '',
  standard_terms: '',
  voice_sample: '',
};

export default function ProfilePage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then(({ profile }) => {
        if (profile) {
          setForm({
            business_name: profile.business_name || '',
            contact_details: profile.contact_details || '',
            hourly_rate: profile.hourly_rate ?? '',
            standard_terms: profile.standard_terms || '',
            voice_sample: profile.voice_sample || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function updateField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSavedAt(null);
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/import', { method: 'POST', body });
      const data = await res.json();
      setImportResult(data);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  if (loading) return <p>Loading profile…</p>;

  return (
    <div>
      <h1>Trader profile</h1>
      <p>Used to fill in every quote automatically — business details, rate, and your usual voice.</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {FIELDS.map(({ name, label, type }) => (
          <label key={name} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {label}
            {type === 'textarea' ? (
              <textarea
                rows={3}
                value={form[name]}
                onChange={(e) => updateField(name, e.target.value)}
              />
            ) : (
              <input
                type={type}
                value={form[name]}
                onChange={(e) => updateField(name, e.target.value)}
              />
            )}
          </label>
        ))}
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {savedAt && <span>Saved.</span>}
      </form>

      <hr style={{ margin: '2rem 0' }} />

      <h2>Import a past quote</h2>
      <p>Upload a .md, .txt, .pdf, or .docx quote you've sent before — QuoteFetch will learn your material prices from it.</p>
      <input type="file" accept=".md,.txt,.pdf,.docx" onChange={handleImport} disabled={importing} />
      {importing && <p>Importing…</p>}
      {importResult && !importResult.error && (
        <div>
          {importResult.imported.length === 0 ? (
            <p>No priced materials found in that document — nothing imported.</p>
          ) : (
            <>
              <p>Imported {importResult.imported.length} priced material{importResult.imported.length === 1 ? '' : 's'}:</p>
              <ul>
                {importResult.imported.map((item, i) => (
                  <li key={i}>
                    {item.material_name} — £{item.unit_price.toFixed(2)}
                    {item.unit ? ` / ${item.unit}` : ''}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {importResult?.error && <p style={{ color: 'crimson' }}>Error: {importResult.message}</p>}
    </div>
  );
}
