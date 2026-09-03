import chalk from 'chalk'
import inquirer from 'inquirer'
import { getTraderProfile, upsertTraderProfile } from '../lib/db.js'

export async function runProfileCommand() {
  const existing = await getTraderProfile()

  console.log()
  console.log(chalk.bold('🛠  QuoteFetch Trader Profile'))
  console.log(chalk.gray('─────────────────────────────────────────'))
  if (existing) {
    console.log(chalk.gray('Editing existing profile. Press enter to keep the current value.'))
  } else {
    console.log(chalk.gray('No profile set yet — this will be used to fill in every quote.'))
  }
  console.log()

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'business_name',
      message: 'Business name:',
      default: existing?.business_name || undefined,
    },
    {
      type: 'input',
      name: 'contact_details',
      message: 'Contact details (phone / email / address):',
      default: existing?.contact_details || undefined,
    },
    {
      type: 'number',
      name: 'hourly_rate',
      message: 'Hourly rate (£):',
      default: existing?.hourly_rate ?? undefined,
    },
    {
      type: 'input',
      name: 'standard_terms',
      message: 'Standard T&Cs (short summary):',
      default: existing?.standard_terms || undefined,
    },
    {
      type: 'input',
      name: 'voice_sample',
      message: 'A sample of how you normally write to customers (a sentence or two, used to match tone):',
      default: existing?.voice_sample || undefined,
    },
  ])

  const profile = await upsertTraderProfile(answers)

  console.log()
  console.log(chalk.green('Profile saved.'))
  console.log(chalk.gray(`  Business:  ${profile.business_name || '(not set)'}`))
  console.log(chalk.gray(`  Contact:   ${profile.contact_details || '(not set)'}`))
  console.log(chalk.gray(`  Rate:      ${profile.hourly_rate ? `£${profile.hourly_rate}/hr` : '(not set)'}`))
  console.log()
}
