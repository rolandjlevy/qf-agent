import { Fragment } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { getGeneratedQuoteById, getQuoteLinePrices } from '../../../lib/db.js';
import { extractMaterialsFromToolCallLog } from '../../../lib/quote-materials.js';
import { extractIntegerQuantity } from '../../../lib/quantity.js';
import { FOLLOW_UP_ANSWERS_HEADING } from '../../../tools/save-quote.js';
import { applyCustomerName } from '../../../lib/quote-customer.js';
import QuoteActions from '../../quote-actions.js';
import MaterialsPricing from '../../materials-pricing.js';
import CustomerNameField from '../../customer-name-field.js';
import { VALID_TRADES, tradeLabel } from '../../../lib/constants.js';
import { cn } from '@/lib/utils';
import { PageShell } from '@/components/app-page';
import { CARD_CLASS } from '@/components/quote/step-layout';

// Belt-and-braces alongside app/quotes/page.js's force-dynamic — this route
// is already dynamic due to its [id] param, but explicit costs nothing.
export const dynamic = 'force-dynamic';

// Matches the fixed all-caps headings tools/save-quote.js's assembleQuote()
// writes into quote.content — used to split the plain-text quote into
// collapsible sections without needing a structured representation in the DB.
const SECTION_HEADINGS = [
  'MATERIALS & EQUIPMENT',
  'SCOPE OF WORK',
  'ASSUMPTIONS',
  'EXCLUSIONS',
  'NEXT STEPS',
  'DISCLAIMERS',
];

function parseQuoteSections(content) {
  const lines = content.split('\n');
  const headingSet = new Set(SECTION_HEADINGS);
  const firstHeadingIndex = lines.findIndex((line) => headingSet.has(line.trim()));

  // No recognized headings (e.g. an older or hand-edited quote) — fall back
  // to rendering the whole thing as one block, same as before this feature.
  if (firstHeadingIndex === -1) {
    return { preamble: content, sections: [] };
  }

  const preamble = lines.slice(0, firstHeadingIndex).join('\n').trimEnd();

  const sections = [];
  let i = firstHeadingIndex;
  while (i < lines.length) {
    const heading = lines[i].trim();
    let next = i + 1;
    while (next < lines.length && !headingSet.has(lines[next].trim())) next++;
    sections.push({ heading, body: lines.slice(i + 1, next).join('\n').trim() });
    i = next;
  }

  return { preamble, sections };
}

// When the interactive MaterialsPricing list is shown, it already repeats
// every bullet line (name/qty/notes) with a price control attached — leaving
// the identical bullets in the drafted <pre> body too reads as the same list
// twice. Drop just the bullet lines here; the underlying quote.content (used
// by Copy/Download) is untouched, only this on-screen display is trimmed.
function stripMaterialBullets(body) {
  return body
    .split('\n')
    .filter((line) => !line.trim().startsWith('•'))
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function formatLinePrice(product) {
  const amount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: product.currency || 'GBP' }).format(product.price);
  return `${amount} (${product.merchant})`;
}

// Mirrors buildMaterialLines()'s bullet shape in tools/draft-section.js (the
// same shape draft_section itself was instructed to produce), but with the
// real selected price substituted for "[Price TBC]" and the trader's
// quantity override applied — this is what Copy/Download should actually
// contain, not the frozen-at-drafting-time text.
function formatMaterialLine(material, override) {
  const rawQuantity = override?.quantity ?? material.quantity;
  // Never let a raw range/unparsed string ("2-3 bags") leak into the
  // exported quote text just because the trader never touched this line's
  // Qty input — same integer-only rule the input itself enforces (see
  // lib/quantity.js), so Copy/Download can't disagree with what's on screen.
  const qty = rawQuantity ? ` (qty: ${extractIntegerQuantity(rawQuantity)})` : '';
  const notes = material.notes ? ` — ${material.notes}` : '';
  const price = override?.product ? ` — ${formatLinePrice(override.product)}` : ' — [Price TBC]';
  const name = override?.nameOverride ?? material.name;
  return `• ${name}${qty}${notes}${price}`;
}

// Replaces just the bullet lines inside the drafted MATERIALS & EQUIPMENT
// body with freshly built ones (real prices, edited quantities, 'deleted'/
// 'saved_for_later' lines omitted entirely), keeping whatever intro/closing
// prose the sub-LLM wrote around them in place. Falls back to the untouched
// body if it doesn't contain the expected bullet-list shape (e.g. a
// hand-edited or unusually-drafted quote) rather than guessing at a rewrite.
function rebuildMaterialsBody(body, activeMaterials, overridesByName) {
  const lines = body.split('\n');
  const isBullet = (line) => line.trim().startsWith('•');
  const firstBulletIndex = lines.findIndex(isBullet);
  if (firstBulletIndex === -1) return body;
  let lastBulletIndex = firstBulletIndex;
  for (let i = lines.length - 1; i > lastBulletIndex; i--) {
    if (isBullet(lines[i])) {
      lastBulletIndex = i;
      break;
    }
  }

  const before = lines.slice(0, firstBulletIndex);
  const after = lines.slice(lastBulletIndex + 1);
  const newBullets = activeMaterials.map((m) => formatMaterialLine(m, overridesByName[m.name]));

  return [...before, ...newBullets, ...after].join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Rebuilds the full plain-text quote for Copy/Download from the parsed
// preamble/sections, substituting a freshly built MATERIALS & EQUIPMENT body
// (see rebuildMaterialsBody) in place of the one frozen at drafting time.
// Mirrors tools/save-quote.js's assembleQuote() join style exactly, so a
// quote with no line overrides at all produces byte-identical output to the
// original quote.content.
function buildDisplayContent(content, preamble, sections, materials, overridesByName) {
  if (!sections.length || !materials.length) return content;

  const activeMaterials = materials.filter((m) => (overridesByName[m.name]?.status ?? 'active') === 'active');
  const rebuiltSections = sections.map((section) =>
    section.heading === 'MATERIALS & EQUIPMENT'
      ? { ...section, body: rebuildMaterialsBody(section.body, activeMaterials, overridesByName) }
      : section,
  );

  const body = rebuiltSections.map((s) => `${s.heading}\n${s.body}`).join('\n\n');
  return preamble ? `${preamble}\n\n${body}` : body;
}

// Bolds the FOLLOW_UP_ANSWERS_HEADING line for on-screen display only — the
// underlying content (Copy/Download, DB) stays plain text, unaffected.
function renderPreamble(preamble) {
  return preamble.split('\n').map((line, i) => (
    <Fragment key={i}>
      {i > 0 && '\n'}
      {line === FOLLOW_UP_ANSWERS_HEADING ? <strong>{line}</strong> : line}
    </Fragment>
  ));
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// The quote's own text: plain, wrapped, in the page font, as it pastes into an email.
const QUOTE_TEXT_CLASS = 'm-0 font-sans text-[15px] leading-[1.7] whitespace-pre-wrap text-foreground';

export default async function QuotePage({ params }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) notFound();

  const quote = await getGeneratedQuoteById(idNum);
  if (!quote) notFound();

  // Everything below (screen, Copy, Download) works from the content with the customer name applied.
  const content = applyCustomerName(quote.content, quote.customer_name);
  const { preamble = '', sections = [] } = content ? parseQuoteSections(content) : {};

  let toolCallLog = [];
  try {
    toolCallLog = JSON.parse(quote.tool_call_log || '[]');
  } catch {
    toolCallLog = [];
  }
  const materials = extractMaterialsFromToolCallLog(toolCallLog);

  const priceRows = materials.length ? await getQuoteLinePrices(idNum) : [];
  const overridesByName = Object.fromEntries(
    priceRows.map((row) => {
      let product = null;
      try {
        product = row.product ? JSON.parse(row.product) : null;
      } catch {
        // A malformed row degrades to "no price selected" for that one line
        // rather than throwing and 500ing the whole page.
        product = null;
      }
      return [row.material_name, { product, quantity: row.quantity_override, status: row.status, nameOverride: row.name_override }];
    }),
  );

  const displayContent = content ? buildDisplayContent(content, preamble, sections, materials, overridesByName) : content;

  const trade = VALID_TRADES.includes(quote.trade) ? tradeLabel(quote.trade) : null;
  const hasMaterials = materials.length > 0;

  return (
    // Bottom padding on mobile keeps the last section clear of the fixed Copy / Download bar.
    <PageShell className={cn('gap-5 md:gap-6', quote.content && 'pb-40 md:pb-12')}>
      <Link
        href="/quotes"
        className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-foreground no-underline hover:text-brand hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All quotes
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[32px] leading-tight font-bold tracking-[-0.02em] md:text-[44px] md:leading-[1.15] md:tracking-[-0.025em]">
          Your Quote
        </h1>
        <h2 className="m-0 text-lg leading-snug font-medium text-muted-foreground md:text-xl">{quote.job_description}</h2>
        <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
          {trade && (
            <span className="rounded border border-brand-subtle-border bg-brand-tint px-2 py-0.5 text-[11px] font-semibold tracking-wider text-brand uppercase">
              {trade}
            </span>
          )}
          <span>Generated {formatDate(quote.generated_at)}</span>
        </p>
      </div>

      {quote.content ? (
        <>
          <QuoteActions content={displayContent} jobDescription={quote.job_description} generatedAt={quote.generated_at} />
          <CustomerNameField quoteId={idNum} customerName={quote.customer_name} />

          {preamble && <pre className={cn(CARD_CLASS, QUOTE_TEXT_CLASS, 'p-5 md:p-7')}>{renderPreamble(preamble)}</pre>}

          <div className="flex flex-col gap-3">
            {sections.map((section) => {
              const isMaterials = section.heading === 'MATERIALS & EQUIPMENT' && hasMaterials;
              const body = isMaterials ? stripMaterialBullets(section.body) : section.body;
              return (
                <details key={section.heading} open={isMaterials ? true : undefined} className={cn(CARD_CLASS, 'group overflow-hidden')}>
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-bold tracking-[0.06em] uppercase select-none hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:px-7 [&::-webkit-details-marker]:hidden">
                    {section.heading}
                    <ChevronDown
                      className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="flex flex-col gap-4 border-t border-border-subtle px-5 pt-4 pb-5 md:px-7 md:pb-7">
                    {body && <pre className={QUOTE_TEXT_CLASS}>{body}</pre>}
                    {isMaterials && <MaterialsPricing quoteId={idNum} materials={materials} overridesByName={overridesByName} />}
                  </div>
                </details>
              );
            })}
          </div>
        </>
      ) : (
        <p className={cn(CARD_CLASS, 'm-0 p-5 text-muted-foreground')}>No content was saved for this quote.</p>
      )}
    </PageShell>
  );
}
