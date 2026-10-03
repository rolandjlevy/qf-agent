'use client'

import { useState } from 'react'
import { Check, Copy, Download, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { secondaryButtonClass } from '@/components/app-page'
import { ACTION_BAR_CLASS, primaryButtonClass } from '@/components/quote/primary-action'

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'quote'
}

function buildFilename(jobDescription, generatedAt) {
  const date = generatedAt ? new Date(generatedAt) : new Date()
  const datePart = Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10)
  return `quote-${datePart}-${slugify(jobDescription)}.txt`
}

// Saves the quote as a .txt file named after the job and date.
export function downloadQuote(content, jobDescription, generatedAt) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = buildFilename(jobDescription, generatedAt)
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

// Copy and Download for /quote/[id]: inline under the heading on desktop, a bar fixed to the bottom on mobile.
export default function QuoteActions({ content, jobDescription, generatedAt }) {
  const [copyState, setCopyState] = useState('idle') // idle | copied | error

  async function handleCopy() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error('Clipboard API unavailable')
      }
      await navigator.clipboard.writeText(content)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    } finally {
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  const CopyIcon = copyState === 'copied' ? Check : copyState === 'error' ? TriangleAlert : Copy
  return (
    <div className={ACTION_BAR_CLASS}>
      <div className="flex gap-2.5 md:gap-3">
        <button
          type="button"
          data-slot="primary-action"
          onClick={handleCopy}
          className={cn(primaryButtonClass(true), 'flex-1 px-6 md:flex-none md:px-8')}
        >
          <CopyIcon className="size-5" strokeWidth={1.75} aria-hidden="true" />
          <span aria-live="polite">
            {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy failed' : 'Copy quote'}
          </span>
        </button>
        <button
          type="button"
          data-slot="secondary-action"
          onClick={() => downloadQuote(content, jobDescription, generatedAt)}
          className={secondaryButtonClass()}
        >
          <Download className="size-5" strokeWidth={1.75} aria-hidden="true" />
          Download
        </button>
      </div>
    </div>
  )
}
