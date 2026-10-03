'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Pencil, UserPlus, X } from 'lucide-react'
import { updateCustomerName } from '../lib/actions/quotes.js'
import { CUSTOMER_NAME_MAX } from '../lib/quote-customer.js'
import { buttonStyle } from './button-style.js'

// buttonStyle laid out for an icon beside the label.
const iconButtonStyle = { ...buttonStyle, display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }
const iconProps = { size: 16, strokeWidth: 1.75, 'aria-hidden': true }

// Shown on /quote/[id]: the saved name fills the quote's [CUSTOMER NAME] placeholder and greeting.
export default function CustomerNameField({ quoteId, customerName }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(customerName ?? '')
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await updateCustomerName(quoteId, value)
        setEditing(false)
      } catch {
        setError("Couldn't save the customer name. Try again.")
      }
    })
  }

  function handleCancel() {
    setValue(customerName ?? '')
    setError(null)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', margin: '0 0 1rem' }}>
        {customerName ? (
          <>
            <span>
              Customer: <strong>{customerName}</strong>
            </span>
            <button type="button" onClick={() => setEditing(true)} style={iconButtonStyle}>
              <Pencil {...iconProps} />
              Edit
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setEditing(true)} style={iconButtonStyle}>
            <UserPlus {...iconProps} />
            Add customer name
          </button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ margin: '0 0 1rem' }}>
      <label htmlFor="customer-name" style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
        Customer name
      </label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          id="customer-name"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={CUSTOMER_NAME_MAX}
          autoComplete="off"
          autoFocus
          placeholder="e.g. Mrs Patel"
          style={{ width: '20rem', maxWidth: '100%', padding: '0.4rem 0.6rem', fontSize: '1rem' }}
        />
        <button type="submit" disabled={isPending} style={iconButtonStyle}>
          {isPending ? <Loader2 {...iconProps} className="animate-spin motion-reduce:animate-none" /> : <Check {...iconProps} />}
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={handleCancel} disabled={isPending} style={iconButtonStyle}>
          <X {...iconProps} />
          Cancel
        </button>
      </div>
      <p style={{ color: '#666', fontSize: '0.85rem', margin: '0.35rem 0 0' }}>
        Shown in the quote's header and greeting. Leave blank to remove it.
      </p>
      {error && (
        <p role="alert" style={{ color: 'crimson', margin: '0.35rem 0 0' }}>
          {error}
        </p>
      )}
    </form>
  )
}
