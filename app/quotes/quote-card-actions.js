'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Check, Copy, Download, Eye, Loader2, Trash2, X } from 'lucide-react'
import { deleteQuote } from '../../lib/actions/quotes.js'
import { downloadQuote } from '../quote-actions.js'
import { secondaryButtonClass } from '@/components/app-page'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const ICON = 'size-4'

// View, Copy, Download and Delete for one quote card on /quotes (the card must be `relative`). Delete asks first.
export default function QuoteCardActions({ id, title, content, jobDescription, generatedAt }) {
  const [copyState, setCopyState] = useState('idle') // idle | copied | error
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, startDelete] = useTransition()
  const button = secondaryButtonClass({ size: 'sm' })

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    } finally {
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  function handleDelete() {
    startDelete(async () => {
      await deleteQuote(id)
      setConfirmOpen(false)
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/quote/${id}`} data-slot="secondary-action" className={button}>
        <Eye className={ICON} strokeWidth={1.75} aria-hidden="true" />
        View
      </Link>
      {content && (
        <>
          <button type="button" data-slot="secondary-action" onClick={handleCopy} className={button}>
            {copyState === 'copied' ? (
              <Check className={`${ICON} text-success`} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Copy className={ICON} strokeWidth={1.75} aria-hidden="true" />
            )}
            <span aria-live="polite">
              {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy failed' : 'Copy'}
            </span>
          </button>
          <button
            type="button"
            data-slot="secondary-action"
            onClick={() => downloadQuote(content, jobDescription, generatedAt)}
            className={button}
          >
            <Download className={ICON} strokeWidth={1.75} aria-hidden="true" />
            Download
          </button>
        </>
      )}
      {/* Mobile: the card's top-right corner, so View, Copy and Download fit on one row. */}
      <button
        type="button"
        data-slot="secondary-action"
        onClick={() => setConfirmOpen(true)}
        aria-label={`Delete quote: ${title}`}
        className={`${secondaryButtonClass({ size: 'sm', tone: 'danger' })} absolute top-3 right-3 min-w-10 px-2.5 md:static md:ml-auto md:px-3`}
      >
        <Trash2 className={ICON} strokeWidth={1.75} aria-hidden="true" />
        <span className="hidden md:inline">Delete</span>
      </button>

      <Dialog open={confirmOpen} onOpenChange={(open) => !deleting && setConfirmOpen(open)}>
        <DialogContent className="rounded-card bg-card">
          <DialogHeader>
            <DialogTitle className="m-0 text-lg font-bold">Delete this quote?</DialogTitle>
            <DialogDescription className="m-0 text-muted-foreground">
              &ldquo;{title}&rdquo; will be deleted permanently. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button type="button" data-slot="secondary-action" disabled={deleting} className={button}>
                <X className={ICON} strokeWidth={1.75} aria-hidden="true" />
                Cancel
              </button>
            </DialogClose>
            <button
              type="button"
              data-slot="secondary-action"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-destructive bg-destructive px-4 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 className={`${ICON} animate-spin motion-reduce:animate-none`} aria-hidden="true" />
              ) : (
                <Trash2 className={ICON} strokeWidth={1.75} aria-hidden="true" />
              )}
              {deleting ? 'Deleting…' : 'Delete quote'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
