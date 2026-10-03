'use server'

import { revalidatePath } from 'next/cache'
import { upsertTraderProfile } from '../db.js'
import { VALID_TRADES, toneOrDefault } from '../constants.js'
import { requireSession } from '../require-session.js'

export async function saveProfile(prevState, formData) {
  await requireSession()
  try {
    const hourlyRate = formData.get('hourly_rate')
    const trade = formData.get('trade')
    const tone = formData.get('default_tone')
    await upsertTraderProfile({
      business_name: formData.get('business_name') || null,
      contact_details: formData.get('contact_details') || null,
      hourly_rate: hourlyRate ? Number(hourlyRate) : null,
      standard_terms: formData.get('standard_terms') || null,
      voice_sample: formData.get('voice_sample') || null,
      vat_registered: formData.get('vat_registered') === 'on',
      certifications: formData.get('certifications') || null,
      service_area: formData.get('service_area') || null,
      trade: VALID_TRADES.includes(trade) ? trade : null,
      default_tone: toneOrDefault(tone),
    })
    revalidatePath('/profile')
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
