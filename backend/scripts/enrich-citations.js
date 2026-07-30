import { run, query } from '../src/db/adapter.js';

function parseDescription(description, court) {
  const meta = {};
  if (!description) return meta;

  const lines = description.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.startsWith('Bench:')) meta.bench = line.replace('Bench:', '').trim();
    else if (line.startsWith('Judge:')) meta.judge = line.replace('Judge:', '').trim();
    else if (line.startsWith('Decided:')) meta.decided = line.replace('Decided:', '').trim();
    else if (line.startsWith('Section:')) meta.section = line.replace('Section:', '').trim();
    else if (line.startsWith('Subject:')) meta.subject = line.replace('Subject:', '').trim();
    else if (line.startsWith('Laws:')) meta.laws = line.replace('Laws:', '').trim();
    else if (line.startsWith('Author:')) meta.author = line.replace('Author:', '').trim();
    else if (line.startsWith('Remarks:')) meta.remarks = line.replace('Remarks:', '').trim();
    else if (line.startsWith('PDF:')) meta.pdfUrl = line.replace('PDF:', '').trim();
    else if (line.startsWith('Head Notes:')) meta.headNotes = line.replace('Head Notes:', '').trim();
    else if (line.startsWith('Tag Line:')) meta.tagLine = line.replace('Tag Line:', '').trim();
    else if (line.startsWith('Other Citations:')) meta.otherCitations = line.replace('Other Citations:', '').trim();
  }

  return meta;
}

async function enrichCitations() {
  console.log('🔍 Enriching citations with structured metadata and PDF URLs...');

  const citations = await query('SELECT id, description, court FROM citations WHERE description IS NOT NULL AND description != \'\'');
  console.log(`📄 Found ${citations.length} citations with descriptions`);

  let updated = 0;
  let pdfUrlsFound = 0;

  for (let i = 0; i < citations.length; i++) {
    const c = citations[i];
    const meta = parseDescription(c.description, c.court);
    const pdfUrl = meta.pdfUrl || null;
    delete meta.pdfUrl;

    const hasMeta = Object.keys(meta).length > 0;
    if (!hasMeta && !pdfUrl) continue;

    if (hasMeta) {
      await run('UPDATE citations SET metadata=?::jsonb WHERE id=?', [JSON.stringify(meta), c.id]);
    }
    if (pdfUrl) {
      await run('UPDATE citations SET pdf_url=? WHERE id=?', [pdfUrl, c.id]);
      pdfUrlsFound++;
    }
    updated++;

    if (updated % 500 === 0) process.stdout.write(`  Progress: ${updated}/${citations.length}\r`);
  }

  console.log(`\n✅ Enriched ${updated} citations with structured metadata`);
  console.log(`📎 Extracted ${pdfUrlsFound} PDF URLs (FSC cases)`);
}

enrichCitations().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
