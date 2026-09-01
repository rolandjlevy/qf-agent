import { readFileSync } from 'fs';
import { getGeneratedQuoteById } from '../../../../lib/db.js';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const quote = await getGeneratedQuoteById(Number(id));

    if (!quote) {
      return Response.json({ error: true, message: 'Quote not found' }, { status: 404 });
    }

    // content is stored directly on the row for quotes saved since the DB
    // migration; older rows only have a local output_path, so fall back to
    // reading it off disk (works for CLI/local use, not on Vercel).
    let content = quote.content ?? null;
    if (content === null && quote.output_path) {
      try {
        content = readFileSync(quote.output_path, 'utf8');
      } catch {
        content = null;
      }
    }

    return Response.json({ quote: { ...quote, content } });
  } catch (err) {
    return Response.json({ error: true, message: err.message }, { status: 500 });
  }
}
