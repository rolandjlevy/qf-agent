'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Pencil, UserPlus, X } from 'lucide-react'
import { updateCustomerName } from '../lib/actions/quotes.js'
import { CUSTOMER_NAME_MAX } from '../lib/quote-customer.js'
import { cn } from '@/lib/utils'
import { secondaryButtonClass } from '@/components/app-page'
import { CARD_CLASS, TextField } from '@/components/quote/step-layout'

const ICON = 'size-4'

// Shown on /quote/[id]: the saved name fills the quote's [CUSTOMER NAME] placeholder and greeting.
export default function CustomerNameField({ quoteId, customerName }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(customerName ?? '')
  const [error, setError] = useState(null)
  const [isPending, startTransition] = useTransition()
  const button = secondaryButtonClass({ size: 'sm' })

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
      <div className={cn(CARD_CLASS, 'flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5')}>
        <div className="flex min-w-0 flex-col">
          <span className="text-[13px] text-muted-foreground">Customer</span>
          <span className={cn('truncate text-[15px] font-semibold', !customerName && 'font-normal text-muted-foreground')}>
            {customerName || 'Not added yet'}
          </span>
        </div>
        <button type="button" data-slot="secondary-action" onClick={() => setEditing(true)} className={button}>
          {customerName ? <Pencil className={ICON} strokeWidth={1.75} aria-hidden="true" /> : <UserPlus className={ICON} strokeWidth={1.75} aria-hidden="true" />}
          {customerName ? 'Edit' : 'Add customer name'}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={cn(CARD_CLASS, 'flex flex-col gap-2 px-4 py-4 md:px-5')}>
      <label htmlFor="customer-name" className="text-sm font-semibold">
        Customer name
      </label>
      <p id="customer-name-hint" className="m-0 -mt-1 text-[13px] text-muted-foreground">
        Shown in the quote&apos;s header and greeting. Leave blank to remove it.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <TextField
          id="customer-name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={CUSTOMER_NAME_MAX}
          autoComplete="off"
          autoFocus
          placeholder="e.g. Jason Carper"
          aria-describedby="customer-name-hint"
          className="sm:flex-1"
        />
        <div className="flex gap-2">
          <button type="submit" data-slot="secondary-action" disabled={isPending} className={cn(button, 'min-h-11 flex-1 sm:flex-none')}>
            {isPending ? (
              <Loader2 className={cn(ICON, 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
            ) : (
              <Check className={ICON} strokeWidth={1.75} aria-hidden="true" />
            )}
            {isPending ? 'Saving…' : 'Save'}
          </button>
          <button type="button" data-slot="secondary-action" onClick={handleCancel} disabled={isPending} className={cn(button, 'min-h-11 flex-1 sm:flex-none')}>
            <X className={ICON} strokeWidth={1.75} aria-hidden="true" />
            Cancel
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="m-0 text-[13px] text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
