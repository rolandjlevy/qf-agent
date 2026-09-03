'use client'

import { useTransition } from 'react'
import { deleteQuote } from '../../lib/actions/quotes.js'

export default function DeleteQuoteButton({ id }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('Delete this quote permanently? This cannot be undone.')) return
    startTransition(() => deleteQuote(id))
  }

  return (
    <button onClick={handleClick} disabled={isPending} style={{ color: 'crimson' }}>
      {isPending ? 'Deleting…' : 'Delete'}
    </button>
  )
}
