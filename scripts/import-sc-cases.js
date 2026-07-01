import https from 'https';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { v4 as uuid } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdnlnbGpmcm9xemt4eXpwdmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4Nzc4MTMsImV4cCI6MjA5NzQ1MzgxM30.Bve-HhJu-DQvkh2P56CrVQVNZRu7RQ0v3Vs8hQL9hFY';

function rpc(queryText) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query_text: queryText });
    const opts = {
      hostname: 'vqvygljfroqzkxyzpvlo.supabase.co',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        } else {
          try {
            const parsed = JSON.parse(data);
            if (parsed && typeof parsed === 'object' && '_error' in parsed) {
              reject(new Error(parsed._error));
            } else {
              resolve(parsed);
            }
          } catch { resolve(data); }
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function loadJSON(relativePath) {
  const fullPath = path.resolve(ROOT, relativePath);
  if (!existsSync(fullPath)) { console.log(`  File not found: ${fullPath}`); return null; }
  return JSON.parse(readFileSync(fullPath, 'utf-8'));
}

async function main() {
  console.log('\n=== IMPORTING SUPREME COURT CASES ===\n');

  const DATA_SOURCES = [
    { path: 'backend/data/supreme_court_cases.json', label: 'Supreme Court Cases (recent)' },
    { path: 'backend/data/sc_cases_2015_2024.json', label: 'SC Cases 2015-2024' },
  ];

  // Get existing citations to avoid re-checking
  const existing = await rpc("SELECT citation FROM public.citations WHERE citation IS NOT NULL AND citation != ''");
  const existingCitations = new Set(existing.map(r => r.citation));
  console.log(`Existing citations in DB: ${existingCitations.size}`);

  const COLS = ['id', 'title', 'citation', 'court', 'year', 'parties', 'category', 'description', 'full_text', 'keywords'];
  const seen = new Set();
  let allRows = [];

  for (const src of DATA_SOURCES) {
    const data = loadJSON(src.path);
    if (!Array.isArray(data)) { console.log(`  ${src.label}: SKIPPED`); continue; }

    let added = 0;
    for (const item of data) {
      const c = (item.citation || '').trim();
      if (!c || existingCitations.has(c) || seen.has(c)) continue;
      seen.add(c);

      allRows.push([
        uuid(),
        (item.title || '').slice(0, 500),
        c.slice(0, 200),
        (item.court || 'Supreme Court of Pakistan').slice(0, 200),
        Number(item.year) || 0,
        (item.parties || '').slice(0, 500),
        (item.category || 'Civil').slice(0, 100),
        (item.description || '').slice(0, 1000),
        (item.full_text ? String(item.full_text) : (item.description || '')).slice(0, 50000),
        (item.keywords || '').slice(0, 500),
      ]);
      added++;
    }
    console.log(`  ${src.label}: ${added} new (${data.length - added} skipped)`);
  }

  if (allRows.length === 0) { console.log('\nNothing to import.'); return; }
  console.log(`\nTotal new citations to insert: ${allRows.length}`);

  // Batch insert
  let total = 0;
  const batchSize = 30;
  for (let i = 0; i < allRows.length; i += batchSize) {
    const batch = allRows.slice(i, i + batchSize);
    const valueSets = batch.map(row => {
      const vals = row.map(v => esc(v));
      return `(${vals.join(',')})`;
    });
    const sql = `INSERT INTO public.citations (${COLS.join(',')}) VALUES ${valueSets.join(',')}`;
    try {
      await rpc(sql);
      total += batch.length;
    } catch (err) {
      // Fallback: one by one
      for (const row of batch) {
        const vals = row.map(v => esc(v));
        const sql2 = `INSERT INTO public.citations (${COLS.join(',')}) VALUES (${vals.join(',')})`;
        try { await rpc(sql2); total++; } catch {}
      }
    }
    if ((i + batchSize) % 300 === 0 || i + batchSize >= allRows.length) {
      console.log(`  ${total}/${allRows.length} inserted...`);
    }
  }

  console.log(`\nDone! ${total} new citations inserted.`);

  // Final count
  const result = await rpc("SELECT COUNT(*) as cnt FROM public.citations");
  console.log(`Total citations in DB: ${result[0].cnt}`);
}

main().catch(console.error);
