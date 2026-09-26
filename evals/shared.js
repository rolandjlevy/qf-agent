import { keyQuestionsFor } from '../lib/key-questions.js'

// Shared across every case: none of these may appear anywhere in the output.
export const FORBIDDEN = [/part p/i, /gas safe/i, /bs ?7671/i, /water regulations/i, /complian/i, /certif/i, /wras/i, /approved/i, /£\s?\d/]

// The trade's key questions answered as { question, answer }, built from lib/key-questions.js so
// cases can't drift from it. `answers` maps a topic to its answer; the rest take the first option.
export function keyAnswersFor(trade, answers = {}) {
  return keyQuestionsFor(trade).map((q) => ({ question: q.question, answer: answers[q.topic] ?? q.options[0] }))
}
