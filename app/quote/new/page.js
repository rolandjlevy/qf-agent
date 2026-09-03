'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { VALID_TRADES, VALID_TONES } from '../../../lib/constants.js'

// Splits a buffer of one-or-more "event: X\ndata: Y\n\n" blocks (and bare
// ": heartbeat\n\n" comments) into { events, rest } — rest is the trailing
// partial block to prepend to the next chunk read from the stream.
function parseSSEChunk(buffer) {
  const blocks = buffer.split('\n\n')
  const rest = blocks.pop() ?? ''
  const events = []

  for (const block of blocks) {
    if (!block || block.startsWith(':')) continue
    let event = 'message'
    let data = ''
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7)
      else if (line.startsWith('data: ')) data = line.slice(6)
    }
    try {
      events.push({ event, data: JSON.parse(data) })
    } catch {
      // ignore malformed block
    }
  }

  return { events, rest }
}

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
  const [log, setLog] = useState([])
  const [question, setQuestion] = useState(null)
  const [answerText, setAnswerText] = useState('')
  const [error, setError] = useState(null)
  const runIdRef = useRef(null)

  function appendLog(line) {
    setLog((prev) => [...prev, line])
  }

  function handleEvent(event, data) {
    switch (event) {
      case 'run_started':
        runIdRef.current = data.runId
        break
      case 'question':
        setQuestion(data)
        break
      case 'done':
        setRunning(false)
        if (data.quoteId) {
          router.push(`/quote/${data.quoteId}`)
        } else {
          appendLog('Completed, but no quote was saved.')
        }
        break
      case 'error':
        setRunning(false)
        setError(data.message)
        break
      default: {
        const line = describeStep(data)
        if (line) appendLog(line)
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setRunning(true)
    setLog([])
    setQuestion(null)
    setError(null)
    runIdRef.current = null

    const response = await fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trade, tone, jobDescription }),
    })

    if (!response.ok || !response.body) {
      const errorBody = await response.json().catch(() => null)
      setError(errorBody?.error || `Request failed (${response.status})`)
      setRunning(false)
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const { events, rest } = parseSSEChunk(buffer)
      buffer = rest
      for (const { event, data } of events) {
        handleEvent(event, data)
      }
    }
  }

  async function handleAnswerSubmit(e) {
    e.preventDefault()
    if (!runIdRef.current) return
    await fetch(`/api/quote/${runIdRef.current}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: answerText }),
    })
    appendLog(`You answered: ${answerText}`)
    setQuestion(null)
    setAnswerText('')
  }

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
