// Turns a trader_profile row into a prompt-ready text block. Returns '' when
// there's no profile yet (or it's empty), so callers can splice it in
// unconditionally without special-casing the empty-profile case themselves.
export function formatTraderContext(profile) {
  if (!profile) return ''

  const lines = []
  if (profile.business_name) lines.push(`Business name: ${profile.business_name}`)
  if (profile.contact_details) lines.push(`Contact details: ${profile.contact_details}`)
  if (profile.hourly_rate) lines.push(`Hourly rate: £${profile.hourly_rate}/hr`)
  if (profile.service_area) lines.push(`Service area: ${profile.service_area}`)
  if (profile.standard_terms) lines.push(`Standard T&Cs: ${profile.standard_terms}`)
  if (profile.vat_registered) {
    lines.push(
      'VAT registered: yes — you may note that quoted prices are subject to VAT, but never calculate or state a VAT amount (no real prices exist in this build)',
    )
  }
  if (profile.certifications) {
    lines.push(
      `Certifications/registrations (state verbatim only if relevant — do not imply this specific job has been assessed against them): ${profile.certifications}`,
    )
  }
  if (profile.voice_sample) {
    lines.push(`Trader's usual writing voice (match this tone where it fits): "${profile.voice_sample}"`)
  }

  if (lines.length === 0) return ''

  return `TRADER PROFILE (use this to personalise the quote — do not invent any detail beyond what's given here):\n${lines.join('\n')}`
}
