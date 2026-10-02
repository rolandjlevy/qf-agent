'use server'

import { revalidatePath } from 'next/cache'
import { deleteGeneratedQuote, updateQuoteCustomerName } from '../db.js'
import { normalizeCustomerName } from '../quote-customer.js'

export async function deleteQuote(id) {
  await deleteGeneratedQuote(id)
  revalidatePath('/quotes')
}

// A blank name clears it, bringing back the [CUSTOMER NAME] placeholder.
export async function updateCustomerName(quoteId, customerName) {
  if (!Number.isInteger(quoteId)) throw new Error('quoteId must be an integer')
  await updateQuoteCustomerName(quoteId, normalizeCustomerName(customerName))
  revalidatePath(`/quote/${quoteId}`)
  revalidatePath('/quotes')
}
