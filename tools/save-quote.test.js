import { describe, it, expect, vi } from 'vitest';

vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn(() => false),
}));

const { saveQuote, formatHeaderLine, newQuoteNumber, SECTION_NAMES } =
  await import('./save-quote.js');

const sectionStore = Object.fromEntries(
  SECTION_NAMES.map((name) => [name, `${name} text`]),
);
const profile = {
  business_name: 'Biz Ltd',
  contact_details: '0123\nbiz@example.com',
};

describe('newQuoteNumber', () => {
  it('is Q-, the date, and a 4-character code', () => {
    expect(newQuoteNumber(new Date('2026-10-02T12:00:00Z'))).toMatch(
      /^Q-20261002-[2-9A-HJ-NP-Z]{4}$/,
    );
  });
});

describe('formatHeaderLine', () => {
  it('puts the customer and quote number on the one header line', () => {
    const line = formatHeaderLine(profile, {
      customerName: 'Jason Carper',
      quoteNumber: 'Q-20261002-AB2C',
    });
    expect(line).toMatch(
      /^Biz Ltd \| 0123 \| biz@example\.com \| Customer: Jason Carper \| Quote no: Q-20261002-AB2C \| Date: /,
    );
  });

  it('shows a placeholder when the customer is unknown', () => {
    expect(formatHeaderLine(profile, { quoteNumber: 'Q-1' })).toContain(
      'Customer: [CUSTOMER NAME]',
    );
  });
});

describe('saveQuote', () => {
  it('numbers the quote and uses the customer name from draft_section', () => {
    const toolContext = {
      traderProfile: profile,
      sectionStore,
      trade: 'plumber',
      jobDescription: 'Fix tap',
      customerName: 'Mr Jones',
    };
    const result = saveQuote({}, toolContext);
    const header = toolContext.savedQuote.content.split('\n')[0];
    expect(header).toContain('Customer: Mr Jones');
    expect(header).toContain(`Quote no: ${result.quote_number}`);
    expect(toolContext.savedQuote.content).toContain('Dear Mr Jones,');
  });

  it('uses the placeholder with no customer name', () => {
    const toolContext = {
      traderProfile: profile,
      sectionStore,
      trade: 'plumber',
      jobDescription: 'Fix tap',
    };
    saveQuote({}, toolContext);
    expect(toolContext.savedQuote.content.split('\n')[0]).toContain(
      'Customer: [CUSTOMER NAME]',
    );
    expect(toolContext.savedQuote.content).not.toContain('Dear ');
  });
});
