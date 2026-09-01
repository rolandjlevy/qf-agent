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

    let content;
    try {
      content = readFileSync(quote.output_path, 'utf8');
    } catch {
      content = null;
    }

    return Response.json({ quote: { ...quote, content } });
  } catch (err) {
    return Response.json({ error: true, message: err.message }, { status: 500 });
  }
}
