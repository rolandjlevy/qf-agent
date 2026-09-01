'use client';

import { useRef, useState } from 'react';
import { VALID_TRADES, VALID_TONES } from '../../../lib/constants.js';

function describeStep(step) {
  switch (step.type) {
    case 'turn_start':
      return `Turn ${step.turn}`;
    case 'tool_call':
      if (step.tool === 'lookup_price' && step.input?.material_name) {
        return `Calling lookup_price for ${step.input.material_name}…`;
      }
      return `Calling ${step.tool}…`;
    case 'tool_result':
      return step.result?.error
        ? `${step.tool} failed: ${step.result.message}`
        : `${step.tool} done`;
    case 'final_answer':
      return step.text;
    default:
      return null;
  }
}

export default function NewQuotePage() {
  const [trade, setTrade] = useState(VALID_TRADES[0]);
  const [tone, setTone] = useState(VALID_TONES[0]);
  const [customerName, setCustomerName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const runIdRef = useRef(null);

  function appendLog(line) {
    setLog((l) => [...l, line]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setRunning(true);
    setLog([]);
    setQuestion(null);
    setResult(null);
    setError(null);
    runIdRef.current = null;

    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade, tone, jobDescription, customerName: customerName || undefined }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          let event = 'message';
          let dataStr = '';
          for (const line of raw.split('\n')) {
            if (line.startsWith('event: ')) event = line.slice(7);
            if (line.startsWith('data: ')) dataStr += line.slice(6);
          }
          const data = dataStr ? JSON.parse(dataStr) : null;

          if (event === 'run_id') {
            runIdRef.current = data.runId;
          } else if (event === 'question') {
            setQuestion(data);
          } else if (event === 'done') {
            setResult(data);
          } else if (event === 'error') {
            setError(data.message);
          } else {
            const line = describeStep({ type: event, ...data });
            if (line) appendLog(line);
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  async function handleAnswerSubmit(e) {
    e.preventDefault();
    if (!runIdRef.current) return;
    await fetch(`/api/quote/${runIdRef.current}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer }),
    });
    appendLog(`You answered: "${answer}"`);
    setQuestion(null);
    setAnswer('');
  }

  return (
    <div>
      <h1>New quote</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          Trade
          <select value={trade} onChange={(e) => setTrade(e.target.value)} disabled={running}>
            {VALID_TRADES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Tone
          <select value={tone} onChange={(e) => setTone(e.target.value)} disabled={running}>
            {VALID_TONES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Customer name (optional)
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            disabled={running}
          />
        </label>
        <label>
          Job description
          <textarea
            rows={4}
            required
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            disabled={running}
          />
        </label>
        <button type="submit" disabled={running}>
          {running ? 'Generating…' : 'Generate quote'}
        </button>
      </form>

      {log.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2>Progress</h2>
          <ul>
            {log.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </div>
      )}

      {question && (
        <form onSubmit={handleAnswerSubmit} style={{ marginTop: '1rem', border: '1px solid #ddd', borderRadius: '6px', padding: '1rem' }}>
          <p><strong>{question.question}</strong></p>
          {question.context && <p style={{ color: '#666' }}>{question.context}</p>}
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            autoFocus
            style={{ width: '100%' }}
          />
          <button type="submit" style={{ marginTop: '0.5rem' }}>Answer</button>
        </form>
      )}

      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

      {result && (
        <div style={{ marginTop: '1.5rem' }}>
          {result.quoteId ? (
            <p>
              <a href={`/quote/${result.quoteId}`}>Your quote has been saved</a>.
            </p>
          ) : (
            <p>Run finished after {result.turns} turn{result.turns === 1 ? '' : 's'}, but no quote was saved.</p>
          )}
        </div>
      )}
    </div>
  );
}
