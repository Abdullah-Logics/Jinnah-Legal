import { readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import { run, query, queryOne } from '../src/db/adapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PDF_DIR = resolve(__dirname, '..', 'fsc_pdfs');

async function extractPdfUrl(description) {
  const match = description.match(/PDF:\s*(.+)/);
  if (!match) return null;
  let url = match[1].trim();
  if (!url.startsWith('http')) return null;
  return url;
}

async function downloadPdf(url) {
  const encodedUrl = url.replace(/ /g, '%20');
  try {
    const res = await fetch(encodedUrl, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer);
  } catch {
    return null;
  }
}

async function extractTextFromPdf(buffer) {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch {
    return '';
  }
}

async function scrapeFscPdfs() {
  console.log('🔍 Fetching FSC citations that need full_text...');

  const fscCases = await query(
    `SELECT id, title, citation, description FROM citations WHERE court = 'Federal Shariat Court' AND (full_text IS NULL OR full_text = '' OR full_text = description) AND description LIKE '%PDF:%'`
  );
  console.log(`📄 Found ${fscCases.length} FSC cases with PDF URLs to scrape`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  if (!existsSync(PDF_DIR)) mkdirSync(PDF_DIR, { recursive: true });

  for (let i = 0; i < fscCases.length; i++) {
    const c = fscCases[i];
    const pdfUrl = await extractPdfUrl(c.description);
    if (!pdfUrl) { skipped++; continue; }

    const safeName = c.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50) || `fsc_${c.id.slice(0, 8)}`;
    const pdfPath = resolve(PDF_DIR, `${safeName}.pdf`);

    let pdfBuffer;
    if (existsSync(pdfPath)) {
      pdfBuffer = readFileSync(pdfPath);
    } else {
      pdfBuffer = await downloadPdf(pdfUrl);
      if (!pdfBuffer) { failed++; continue; }
    }

    let text = '';
    if (pdfBuffer.length > 100) {
      text = await extractTextFromPdf(pdfBuffer);
    }

    if (text && text.length > 100) {
      text = text.slice(0, 50000);
      await run('UPDATE citations SET full_text=? WHERE id=?', [text, c.id]);
      success++;
      if (success % 50 === 0) console.log(`  ✅ ${success} done...`);
    } else {
      failed++;
    }

    if (i % 10 === 0 && i > 0) {
      process.stdout.write(`\r  Progress: ${i}/${fscCases.length} | ✅ ${success} | ❌ ${failed} | ⏭ ${skipped}`);
    }
  }

  console.log(`\n📊 Done! ✅ ${success} enriched | ❌ ${failed} failed | ⏭ ${skipped} skipped`);
}

scrapeFscPdfs().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
