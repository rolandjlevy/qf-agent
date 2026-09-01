import { listGeneratedQuotes } from '../../../lib/db.js';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const quotes = listGeneratedQuotes();
    return Response.json({ quotes });
  } catch (err) {
    return Response.json({ error: true, message: err.message }, { status: 500 });
  }
}
