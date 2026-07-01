import pg from 'pg';
import { v4 as uuid } from 'uuid';
import fs from 'fs';

const DATABASE_URL = 'postgresql://neondb_owner:npg_y7Czlpdfs4EG@ep-muddy-morning-adsqi9v5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const cases = JSON.parse(fs.readFileSync('scp-2025-results.json', 'utf-8'));
  console.log(`Loading ${cases.length} cases...`);

  let imported = 0;
  let skipped = 0;

  for (const c of cases) {
    if (!c.title || !c.year) { skipped++; continue; }

    // Check for duplicate by citation
    if (c.citation) {
      const existing = await pool.query('SELECT id FROM citations WHERE citation = $1', [c.citation]);
      if (existing.rows.length > 0) {
        console.log(`  SKIP (duplicate citation): ${c.citation}`);
        skipped++;
        continue;
      }
    }

    await pool.query(
      `INSERT INTO citations (id,title,citation,court,year,parties,category,description,full_text,keywords)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        uuid(), c.title, c.citation || '', c.court, c.year,
        c.parties || '', c.category || 'Civil',
        (c.description || '').slice(0, 500),
        (c.full_text || '').slice(0, 50000),
        c.keywords || '',
      ]
    );
    imported++;
    console.log(`  IMPORTED: ${c.citation || 'NO-CITE'} | ${c.title.slice(0, 50)}`);
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped`);

  // Verify total count
  const count = await pool.query('SELECT COUNT(*) as c FROM citations');
  console.log(`Total citations in DB: ${count.rows[0].c}`);

  await pool.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
