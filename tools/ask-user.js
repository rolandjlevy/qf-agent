// Every caller (CLI and web) must supply toolContext.askUser — this file has
// no direct prompt implementation of its own. Keeping it that way means
// nothing under app/ ever pulls in the CLI's `inquirer` prompt dependency:
// a static `import inquirer` here previously got traced into the
// /api/quote serverless function's bundle and broke Vercel's build-output
// packaging step (confirmed by isolating the route in a bare Next.js app —
// removing the inquirer import was the only change that fixed it). The CLI
// now supplies its inquirer-backed handler itself (see qf.js).
export async function askUser({ question, context }, toolContext = {}) {
  const answer = await toolContext.askUser(question, context)
  return { answer }
}
