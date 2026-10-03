import { describe, it, expect } from 'vitest'
import { applyCustomerName, normalizeCustomerName, CUSTOMER_NAME_MAX } from './quote-customer.js'

const quote = [
  'Biz | 0123 | Customer: [CUSTOMER NAME] | Quote no: Q-20261002-AB2C | Date: 2 October 2026',
  '',
  'Thanks so much for getting in touch!',
  '',
  'MATERIALS & EQUIPMENT',
  '• Tap — [Price TBC]',
].join('\n')

describe('normalizeCustomerName', () => {
  it('trims and collapses spaces, and treats blank as no name', () => {
    expect(normalizeCustomerName('  Jason   Carper ')).toBe('Jason Carper')
    expect(normalizeCustomerName('   ')).toBeNull()
    expect(normalizeCustomerName(null)).toBeNull()
  })

  it('rejects non-strings and over-long names', () => {
    expect(() => normalizeCustomerName(42)).toThrow()
    expect(() => normalizeCustomerName('x'.repeat(CUSTOMER_NAME_MAX + 1))).toThrow()
  })
})

describe('applyCustomerName', () => {
  it('fills the header placeholder and greets the customer', () => {
    const lines = applyCustomerName(quote, 'Jason Carper').split('\n')
    expect(lines[0]).toBe('Biz | 0123 | Customer: Jason Carper | Quote no: Q-20261002-AB2C | Date: 2 October 2026')
    expect(lines.slice(1, 5)).toEqual(['', 'Dear Jason Carper,', '', 'Thanks so much for getting in touch!'])
  })

  it('leaves the quote alone with no name', () => {
    expect(applyCustomerName(quote, '  ')).toBe(quote)
    expect(applyCustomerName(quote, null)).toBe(quote)
  })

  it('adds the Customer segment before Date on quotes saved without one', () => {
    const old = 'Biz | 0123 | Date: 1 May 2026\n\nHello.'
    expect(applyCustomerName(old, 'Mr Jones').split('\n')[0]).toBe('Biz | 0123 | Customer: Mr Jones | Date: 1 May 2026')
  })

  it('renames an existing Dear line instead of adding a second', () => {
    const named = 'Biz | Customer: Ann | Date: x\n\nDear Ann,\n\nHello.'
    expect(applyCustomerName(named, 'Ann Smith')).toBe('Biz | Customer: Ann Smith | Date: x\n\nDear Ann Smith,\n\nHello.')
  })
})
