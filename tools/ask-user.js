import inquirer from 'inquirer'

// toolContext.askUser lets a caller other than the terminal CLI (e.g. a web
// route with no TTY to prompt) supply its own way of asking the question —
// defaults to the original inquirer prompt when absent, so CLI behavior is
// unchanged.
export async function askUser({ question, context }, toolContext = {}) {
  if (toolContext.askUser) {
    const answer = await toolContext.askUser(question, context)
    return { answer }
  }

  const message = context ? `${context}\n\n${question}` : question

  const { answer } = await inquirer.prompt([
    {
      type: 'input',
      name: 'answer',
      message,
    },
  ])

  return { answer }
}
