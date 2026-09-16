import { notFound } from 'next/navigation';
import { getGeneratedQuoteById, getQuoteLinePrices } from '../../../lib/db.js';
import { extractMaterialsFromToolCallLog } from '../../../lib/quote-materials.js';
import { extractIntegerQuantity } from '../../../lib/quantity.js';
import QuoteActions from '../../quote-actions.js';
import MaterialsPricing from '../../materials-pricing.js';

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
  return `• ${material.name}${qty}${notes}${price}`;
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
function buildDisplayContent(quote, preamble, sections, materials, overridesByName) {
  if (!sections.length || !materials.length) return quote.content;

  const activeMaterials = materials.filter((m) => (overridesByName[m.name]?.status ?? 'active') === 'active');
  const rebuiltSections = sections.map((section) =>
    section.heading === 'MATERIALS & EQUIPMENT'
      ? { ...section, body: rebuildMaterialsBody(section.body, activeMaterials, overridesByName) }
      : section,
  );

  const body = rebuiltSections.map((s) => `${s.heading}\n${s.body}`).join('\n\n');
  return preamble ? `${preamble}\n\n${body}` : body;
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

const preStyle = {
  whiteSpace: 'pre-wrap',
  fontFamily: 'inherit',
  border: '1px solid #ddd',
  borderRadius: 6,
  padding: '1rem 1.25rem',
  lineHeight: 1.75,
  marginBottom: '0.5rem',
};

const detailsStyle = {
  border: '1px solid #ddd',
  borderRadius: 6,
  marginBottom: '0.5rem',
};

const summaryStyle = {
  cursor: 'pointer',
  fontWeight: 'bold',
  padding: '0.75rem 1.25rem',
};

const sectionBodyStyle = {
  whiteSpace: 'pre-wrap',
  fontFamily: 'inherit',
  margin: 0,
  padding: '0 1.25rem 1rem',
  lineHeight: 1.75,
};

export default async function QuotePage({ params }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) notFound();

  const quote = await getGeneratedQuoteById(idNum);
  if (!quote) notFound();

  const { preamble = '', sections = [] } = quote.content ? parseQuoteSections(quote.content) : {};

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
      return [row.material_name, { product, quantity: row.quantity_override, status: row.status }];
    }),
  );

  const displayContent = quote.content ? buildDisplayContent(quote, preamble, sections, materials, overridesByName) : quote.content;

  return (
    <div>
      <h1>{quote.job_description}</h1>
      <p style={{ color: '#666' }}>
        Generated {formatDate(quote.generated_at)}
      </p>
      {quote.content ? (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <QuoteActions
              content={displayContent}
              jobDescription={quote.job_description}
              generatedAt={quote.generated_at}
            />
          </div>
          {preamble && <pre style={preStyle}>{preamble}</pre>}
          {sections.map((section) => (
            <details
              key={section.heading}
              style={detailsStyle}
              open={section.heading === 'MATERIALS & EQUIPMENT' && materials.length > 0 ? true : undefined}
            >
              <summary style={summaryStyle}>{section.heading}</summary>
              <pre style={sectionBodyStyle}>
                {section.heading === 'MATERIALS & EQUIPMENT' && materials.length > 0
                  ? stripMaterialBullets(section.body)
                  : section.body}
              </pre>
              {section.heading === 'MATERIALS & EQUIPMENT' && materials.length > 0 && (
                <div style={{ padding: '0 1.25rem 1rem' }}>
                  <MaterialsPricing quoteId={idNum} materials={materials} overridesByName={overridesByName} />
                </div>
              )}
            </details>
          ))}
        </>
      ) : (
        <p>No content was saved for this quote.</p>
      )}
    </div>
  );
}
