import pg from 'pg';
import { v4 as uuid } from 'uuid';
import fs from 'fs';

const DATABASE_URL = 'postgresql://neondb_owner:npg_y7Czlpdfs4EG@ep-muddy-morning-adsqi9v5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const filePath = process.argv[2];
if (!filePath) { console.error('Usage: node import-to-neon.js <json-file>'); process.exit(1); }

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });

async function main() {
  const cases = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`Loading ${cases.length} cases from ${filePath}...`);

  // First, get existing citations for dedup
  const existing = await pool.query('SELECT citation FROM citations WHERE citation IS NOT NULL AND citation != \'\'');
  const existingSet = new Set(existing.rows.map(r => r.citation));

  const BATCH_SIZE = 50;
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < cases.length; i += BATCH_SIZE) {
    const batch = cases.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    let paramIdx = 1;

    for (const c of batch) {
      if (!c.title || !c.year) { skipped++; continue; }

      const year = c.year > 2026 ? 2025 : c.year;

      if (c.citation && existingSet.has(c.citation)) {
        skipped++;
        continue;
      }

      const id = uuid();
      const title = c.title;
      const citation = c.citation || '';
      const court = c.court;
      const parties = c.parties || '';
      const category = c.category || 'Civil';
      const description = (c.description || '').slice(0, 500);
      const fullText = (c.full_text || c.description || '').slice(0, 50000);
      const keywords = c.keywords || '';

      params.push(id, title, citation, court, year, parties, category, description, fullText, keywords);
      values.push(`($${paramIdx},$${paramIdx+1},$${paramIdx+2},$${paramIdx+3},$${paramIdx+4},$${paramIdx+5},$${paramIdx+6},$${paramIdx+7},$${paramIdx+8},$${paramIdx+9})`);
      paramIdx += 10;

      if (citation) existingSet.add(citation);
      imported++;
    }

    if (values.length === 0) continue;

    const sql = `INSERT INTO citations (id,title,citation,court,year,parties,category,description,full_text,keywords) VALUES ${values.join(',')}`;
    await pool.query(sql, params);

    if (imported % 200 === 0) console.log(`  ${imported} imported...`);
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped`);

  const count = await pool.query('SELECT COUNT(*) as c FROM citations');
  console.log(`Total citations in DB: ${count.rows[0].c}`);

  await pool.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
