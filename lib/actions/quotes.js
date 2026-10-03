'use server'

import { revalidatePath } from 'next/cache'
import { deleteGeneratedQuote, getGeneratedQuoteById, updateQuoteCustomerName } from '../db.js'
import { applyCustomerName, normalizeCustomerName } from '../quote-customer.js'
import { requireSession } from '../require-session.js'

export async function deleteQuote(id) {
  await requireSession()
  if (!Number.isInteger(id)) throw new Error('id must be an integer')
  await deleteGeneratedQuote(id)
  revalidatePath('/quotes')
}

// The quote as the customer receives it, for /quotes' Copy and Download (the list doesn't carry the text).
export async function getQuoteText(id) {
  await requireSession()
  if (!Number.isInteger(id)) throw new Error('id must be an integer')
  const quote = await getGeneratedQuoteById(id)
  if (!quote?.content) throw new Error('Quote not found')
  return applyCustomerName(quote.content, quote.customer_name)
}

// A blank name clears it, bringing back the [CUSTOMER NAME] placeholder.
export async function updateCustomerName(quoteId, customerName) {
  await requireSession()
  if (!Number.isInteger(quoteId)) throw new Error('quoteId must be an integer')
  await updateQuoteCustomerName(quoteId, normalizeCustomerName(customerName))
  revalidatePath(`/quote/${quoteId}`)
  revalidatePath('/quotes')
}
