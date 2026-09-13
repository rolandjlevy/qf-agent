'use server'

import { revalidatePath } from 'next/cache'
import { upsertQuoteLinePrice } from '../db.js'

// Called imperatively from the client-side product picker (not a <form
// action> — there's no form here, just a click on a product card), which
// Server Actions support directly as long as the arguments are serializable.
export async function selectLinePrice(quoteId, materialName, product) {
  if (!Number.isInteger(quoteId)) throw new Error('quoteId must be an integer')
  if (typeof materialName !== 'string' || !materialName.trim()) throw new Error('materialName is required')
  if (!product || typeof product !== 'object') throw new Error('product is required')

  await upsertQuoteLinePrice(quoteId, materialName, product)
  revalidatePath(`/quote/${quoteId}`)
}
