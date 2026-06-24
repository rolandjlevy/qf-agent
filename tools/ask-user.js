import inquirer from 'inquirer'

export async function askUser({ question, context }) {
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
