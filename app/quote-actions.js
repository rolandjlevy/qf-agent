'use client'

import { useState } from 'react'
import { buttonStyle } from './button-style.js'

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

export default function QuoteActions({ content, jobDescription, generatedAt, id, downloadLabel = '⬇️ Download as text' }) {
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

  function handleDownload() {
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

  return (
    <>
      {id != null && (
        <a
          href={`/quote/${id}`}
          className="btn-link"
          style={{ ...buttonStyle, display: 'inline-block', color: 'inherit', textDecoration: 'none' }}
        >
          👁️ View
        </a>
      )}
      {content && (
        <button onClick={handleCopy} style={buttonStyle}>
          {copyState === 'copied' ? '✅ Copied!' : copyState === 'error' ? '⚠️ Copy failed' : '📋 Copy'}
        </button>
      )}
      {content && (
        <button onClick={handleDownload} style={buttonStyle}>
          {downloadLabel}
        </button>
      )}
    </>
  )
}
