import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { extractQuoteFile } from '../../../lib/extract-quote.js';
import {
  insertHistoricalQuote,
  updateHistoricalQuoteStatus,
  upsertTraderPrice,
} from '../../../lib/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Override lets tests write to a throwaway directory instead of the real
// data/uploads/ folder — never unset in normal web usage.
const UPLOADS_DIR = process.env.QF_UPLOADS_DIR || join(__dirname, '../../../data/uploads');
const ALLOWED_EXTENSIONS = new Set(['.md', '.txt', '.pdf', '.docx']);

export const runtime = 'nodejs';

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
}

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string') {
    return Response.json({ error: true, message: 'No file uploaded' }, { status: 400 });
  }

  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return Response.json(
      { error: true, message: `Unsupported file type "${ext}". Supported: .md, .txt, .pdf, .docx` },
      { status: 400 },
    );
  }

  mkdirSync(UPLOADS_DIR, { recursive: true });
  const filePath = join(UPLOADS_DIR, `${Date.now()}-${sanitizeFilename(file.name)}`);
  writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));

  const quoteId = await insertHistoricalQuote({ file_path: filePath, extraction_status: 'pending' });

  try {
    const { text, items } = await extractQuoteFile(filePath);

    if (items.length === 0) {
      await updateHistoricalQuoteStatus(quoteId, {
        extraction_status: 'failed',
        extracted_text: text,
        notes: 'No priced material line items could be extracted',
      });
      return Response.json({ imported: [] });
    }

    for (const item of items) {
      await upsertTraderPrice({
        material_name: item.material_name,
        canonical_name: item.material_name,
        unit: item.unit || null,
        unit_price: item.unit_price,
        source: 'historical_quote',
        source_ref: filePath,
      });
    }

    await updateHistoricalQuoteStatus(quoteId, {
      extraction_status: 'success',
      extracted_text: text,
      notes: `Imported ${items.length} priced item${items.length === 1 ? '' : 's'}`,
    });

    return Response.json({ imported: items });
  } catch (err) {
    await updateHistoricalQuoteStatus(quoteId, { extraction_status: 'failed', notes: err.message });
    return Response.json({ error: true, message: err.message }, { status: 500 });
  }
}
