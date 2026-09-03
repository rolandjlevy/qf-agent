import chalk from 'chalk'
import { existsSync } from 'fs'
import { extractQuoteFile } from '../lib/extract-quote.js'
import { insertHistoricalQuote, updateHistoricalQuoteStatus, upsertTraderPrice } from '../lib/db.js'

export async function runImportCommand(argv) {
  const filePath = argv.path

  console.log()
  console.log(chalk.bold('🛠  QuoteFetch Import'))
  console.log(chalk.gray('─────────────────────────────────────────'))

  if (!existsSync(filePath)) {
    console.error(chalk.red(`Error: file not found: ${filePath}`))
    process.exit(1)
  }

  console.log(chalk.cyan('Reading: ') + chalk.white(filePath))
  console.log()

  const quoteId = await insertHistoricalQuote({ file_path: filePath, extraction_status: 'pending' })

  try {
    const { text, items } = await extractQuoteFile(filePath)

    if (items.length === 0) {
      await updateHistoricalQuoteStatus(quoteId, {
        extraction_status: 'failed',
        extracted_text: text,
        notes: 'No priced material line items could be extracted',
      })
      console.log(chalk.yellow('No priced materials found in this document — nothing imported.'))
      return
    }

    for (const item of items) {
      await upsertTraderPrice({
        material_name: item.material_name,
        canonical_name: item.material_name,
        unit: item.unit || null,
        unit_price: item.unit_price,
        source: 'historical_quote',
        source_ref: filePath,
      })
    }

    await updateHistoricalQuoteStatus(quoteId, {
      extraction_status: 'success',
      extracted_text: text,
      notes: `Imported ${items.length} priced item${items.length === 1 ? '' : 's'}`,
    })

    console.log(chalk.green(`Imported ${items.length} priced material${items.length === 1 ? '' : 's'}:`))
    for (const item of items) {
      const unitSuffix = item.unit ? ` / ${item.unit}` : ''
      console.log(chalk.gray(`  • ${item.material_name} — £${item.unit_price.toFixed(2)}${unitSuffix}`))
    }
    console.log()
  } catch (err) {
    await updateHistoricalQuoteStatus(quoteId, { extraction_status: 'failed', notes: err.message })
    console.error(chalk.red(`Error importing quote: ${err.message}`))
    process.exit(1)
  }
}
