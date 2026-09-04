'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { VALID_TRADES, VALID_TONES } from '../../../lib/constants.js'

const POLL_INTERVAL_MS = 2000
// Slack above the server's 300s maxDuration budget — a purely client-side
// backstop so a genuinely stalled run (e.g. after() never firing, a
// platform-level edge case) doesn't poll forever with no feedback.
const MAX_POLL_MS = 6 * 60 * 1000

function describeStep(step) {
  switch (step.type) {
    case 'turn_start':
      return `Turn ${step.turn}`
    case 'tool_call':
      return `Calling ${step.tool}…`
    case 'tool_result':
      if (step.result?.error) return `${step.tool} failed: ${step.result.message}`
      return `${step.tool} done`
    case 'final_answer':
      return step.text
    default:
      return null
  }
}

export default function NewQuotePage() {
  const router = useRouter()
  const [trade, setTrade] = useState(VALID_TRADES[0])
  const [tone, setTone] = useState(VALID_TONES[0])
  const [jobDescription, setJobDescription] = useState('')
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState([])
  const [question, setQuestion] = useState(null)
  const [answerText, setAnswerText] = useState('')
  const [error, setError] = useState(null)
  const runIdRef = useRef(null)
  const pollTimerRef = useRef(null)
  const pollStartRef = useRef(null)

  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  useEffect(() => stopPolling, [])

  async function pollStatus() {
    if (!runIdRef.current) return
    if (Date.now() - pollStartRef.current > MAX_POLL_MS) {
      stopPolling()
      setRunning(false)
      setError('This is taking longer than expected — check your quotes list in a few minutes, or try again.')
      return
    }

    let response
    try {
      response = await fetch(`/api/quote/${runIdRef.current}/status`)
    } catch {
      return // transient network blip — retry next tick
    }

    if (response.status === 404) {
      stopPolling()
      setRunning(false)
      setError('This run could not be found.')
      return
    }
    if (!response.ok) return // transient server error — retry next tick

    const data = await response.json()
    setSteps(data.steps ?? [])
    setQuestion(data.question ?? null)

    if (data.status === 'done') {
      stopPolling()
      setRunning(false)
      if (data.quoteId) {
        router.push(`/quote/${data.quoteId}`)
      } else {
        setError('Completed, but no quote was saved.')
      }
    } else if (data.status === 'error') {
      stopPolling()
      setRunning(false)
      setError(data.error || 'The run failed.')
    } else if (data.status === 'aborted') {
      stopPolling()
      setRunning(false)
      setError(data.error || 'This run was stopped.')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setRunning(true)
    setSteps([])
    setQuestion(null)
    setError(null)
    runIdRef.current = null
    stopPolling()

    let response
    try {
      response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade, tone, jobDescription }),
      })
    } catch {
      setError('Could not reach the server. Please try again.')
      setRunning(false)
      return
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null)
      setError(errorBody?.error || `Request failed (${response.status})`)
      setRunning(false)
      return
    }

    const { runId } = await response.json()
    runIdRef.current = runId
    pollStartRef.current = Date.now()
    pollStatus()
    pollTimerRef.current = setInterval(pollStatus, POLL_INTERVAL_MS)
  }

  async function handleAnswerSubmit(e) {
    e.preventDefault()
    if (!runIdRef.current) return
    await fetch(`/api/quote/${runIdRef.current}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: answerText }),
    })
    setQuestion(null)
    setAnswerText('')
  }

  const log = steps.map(describeStep).filter(Boolean)

  return (
    <div style={{ maxWidth: 640 }}>
      <h1>New quote</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          Trade
          <select value={trade} onChange={(e) => setTrade(e.target.value)} disabled={running}>
            {VALID_TRADES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tone
          <select value={tone} onChange={(e) => setTone(e.target.value)} disabled={running}>
            {VALID_TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label>
          Job description
          <textarea
            rows={5}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            disabled={running}
            required
          />
        </label>

        <button type="submit" disabled={running || !jobDescription.trim()}>
          {running ? 'Generating…' : 'Generate quote'}
        </button>
      </form>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {question && (
        <form
          onSubmit={handleAnswerSubmit}
          style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <p>
            <strong>{question.question}</strong>
            {question.context && (
              <>
                <br />
                <span style={{ color: '#666' }}>{question.context}</span>
              </>
            )}
          </p>
          <input type="text" value={answerText} onChange={(e) => setAnswerText(e.target.value)} autoFocus />
          <button type="submit">Answer</button>
        </form>
      )}

      {log.length > 0 && (
        <ul style={{ marginTop: '1.5rem', color: '#444' }}>
          {log.map((line, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
