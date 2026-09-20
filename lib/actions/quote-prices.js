'use server'

import { revalidatePath } from 'next/cache'
import { upsertQuoteLinePrice, upsertQuoteLineQuantity, upsertQuoteLineStatus } from '../db.js'

const LINE_STATUSES = ['active', 'saved_for_later', 'deleted']

// Called imperatively from the client-side product picker (not a <form
// action> — there's no form here, just a click on a product card), which
// Server Actions support directly as long as the arguments are serializable.
//
// nameOverride is the search term the trader actually found this product
// under, when it differs from the original identify_materials label (e.g.
// "Gutter cleaning brush" -> "Gutter cleaning brush set") — every later
// display of this line should show that term instead. Omitted/undefined
// leaves any existing override alone; materialName itself never changes,
// it's still the stable (quote_id, material_name) join key.
export async function selectLinePrice(quoteId, materialName, product, nameOverride) {
  if (!Number.isInteger(quoteId)) throw new Error('quoteId must be an integer')
  if (typeof materialName !== 'string' || !materialName.trim()) throw new Error('materialName is required')
  if (!product || typeof product !== 'object') throw new Error('product is required')
  if (nameOverride !== undefined && (typeof nameOverride !== 'string' || !nameOverride.trim())) {
    throw new Error('nameOverride must be a non-empty string when provided')
  }

  await upsertQuoteLinePrice(quoteId, materialName, product, nameOverride)
  revalidatePath(`/quote/${quoteId}`)
}

// Quantity stays a free-text string, same loose format identify_materials
// itself returns ("25m", "1 box") — no numeric coercion here, that only
// happens where a total is actually calculated (app/materials-pricing.js).
export async function updateLineQuantity(quoteId, materialName, quantity) {
  if (!Number.isInteger(quoteId)) throw new Error('quoteId must be an integer')
  if (typeof materialName !== 'string' || !materialName.trim()) throw new Error('materialName is required')
  if (typeof quantity !== 'string') throw new Error('quantity must be a string')

  await upsertQuoteLineQuantity(quoteId, materialName, quantity)
  revalidatePath(`/quote/${quoteId}`)
}

// Drives both "Delete" and "Save for later" — see lib/schema.sql's
// quote_line_prices comment for why these share one status field rather
// than being two separate mechanisms.
export async function updateLineStatus(quoteId, materialName, status) {
  if (!Number.isInteger(quoteId)) throw new Error('quoteId must be an integer')
  if (typeof materialName !== 'string' || !materialName.trim()) throw new Error('materialName is required')
  if (!LINE_STATUSES.includes(status)) throw new Error(`status must be one of: ${LINE_STATUSES.join(', ')}`)

  await upsertQuoteLineStatus(quoteId, materialName, status)
  revalidatePath(`/quote/${quoteId}`)
}
