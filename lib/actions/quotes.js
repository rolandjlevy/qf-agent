'use server'

import { revalidatePath } from 'next/cache'
import { deleteGeneratedQuote } from '../db.js'

export async function deleteQuote(id) {
  await deleteGeneratedQuote(id)
  revalidatePath('/quotes')
}
