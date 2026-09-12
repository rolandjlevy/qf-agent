'use server'

import { revalidatePath } from 'next/cache'
import { upsertTraderProfile } from '../db.js'

export async function saveProfile(prevState, formData) {
  try {
    const hourlyRate = formData.get('hourly_rate')
    await upsertTraderProfile({
      business_name: formData.get('business_name') || null,
      contact_details: formData.get('contact_details') || null,
      hourly_rate: hourlyRate ? Number(hourlyRate) : null,
      standard_terms: formData.get('standard_terms') || null,
      voice_sample: formData.get('voice_sample') || null,
      vat_registered: formData.get('vat_registered') === 'on',
      certifications: formData.get('certifications') || null,
      service_area: formData.get('service_area') || null,
    })
    revalidatePath('/profile')
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
