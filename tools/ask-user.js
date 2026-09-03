// The transport for asking a human a question and getting an answer back is
// supplied by the caller via toolContext.askUser(question, context) — an
// inquirer-backed callback in the CLI, an SSE-question/wait-for-answer
// callback in the web UI. This file stays transport-agnostic (no `inquirer`
// import) so it can be safely reached from a Vercel API route's module
// graph without inquirer getting bundled into it.
export async function askUser({ question, context }, toolContext = {}) {
  const answer = await toolContext.askUser(question, context)
  return { answer }
}
