'use server'

import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { revalidatePath } from 'next/cache'
import {
  upsertTraderProfile,
  insertHistoricalQuote,
  updateHistoricalQuoteStatus,
  upsertTraderPrice,
} from '../db.js'
import { extractQuoteFile } from '../extract-quote.js'

export async function saveProfile(prevState, formData) {
  try {
    const hourlyRate = formData.get('hourly_rate')
    await upsertTraderProfile({
      business_name: formData.get('business_name') || null,
      contact_details: formData.get('contact_details') || null,
      hourly_rate: hourlyRate ? Number(hourlyRate) : null,
      standard_terms: formData.get('standard_terms') || null,
      voice_sample: formData.get('voice_sample') || null,
    })
    revalidatePath('/profile')
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// Vercel's filesystem is read-only outside /tmp, and /tmp is ephemeral —
// only good for the lifetime of this one invocation. So file_path is
// display-only for web uploads (the original filename), not a working
// path; extracted_text + the derived trader_prices rows are the durable
// record, same as commands/import.js's CLI path but there the file_path
// really is a real, permanent path on the trader's own machine.
export async function importQuote(prevState, formData) {
  const files = formData.getAll('files').filter((file) => file && file.size > 0)
  if (files.length === 0) {
    return { success: false, error: 'Select at least one file to import.', imported: [] }
  }

  const imported = []
  const errors = []

  for (const file of files) {
    const quoteId = await insertHistoricalQuote({ file_path: file.name, extraction_status: 'pending' })
    const tmpPath = join(tmpdir(), `qf-import-${Date.now()}-${file.name}`)

    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      writeFileSync(tmpPath, buffer)

      const { text, items } = await extractQuoteFile(tmpPath)

      if (items.length === 0) {
        await updateHistoricalQuoteStatus(quoteId, {
          extraction_status: 'failed',
          extracted_text: text,
          notes: 'No priced material line items could be extracted',
        })
        errors.push(`${file.name}: no priced materials found`)
        continue
      }

      for (const item of items) {
        await upsertTraderPrice({
          material_name: item.material_name,
          canonical_name: item.material_name,
          unit: item.unit || null,
          unit_price: item.unit_price,
          source: 'historical_quote',
          source_ref: file.name,
        })
      }

      await updateHistoricalQuoteStatus(quoteId, {
        extraction_status: 'success',
        extracted_text: text,
        notes: `Imported ${items.length} priced item${items.length === 1 ? '' : 's'}`,
      })

      imported.push(`${file.name}: imported ${items.length} priced item${items.length === 1 ? '' : 's'}`)
    } catch (err) {
      await updateHistoricalQuoteStatus(quoteId, { extraction_status: 'failed', notes: err.message })
      errors.push(`${file.name}: ${err.message}`)
    } finally {
      try {
        unlinkSync(tmpPath)
      } catch {
        // best-effort cleanup only
      }
    }
  }

  revalidatePath('/profile')
  return {
    success: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : null,
    imported,
  }
}
