import https from 'https';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { v4 as uuid } from 'uuid';
import initSqlJs from 'sql.js';

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

function loadJSON(relativePath) {
  const fullPath = path.resolve(ROOT, relativePath);
  if (!existsSync(fullPath)) { return null; }
  return JSON.parse(readFileSync(fullPath, 'utf-8'));
}

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function batchInsert(table, columns, rows, batchSize = 100) {
  let total = 0;
  let batchErrors = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valueSets = batch.map(row => {
      const vals = row.map(v => esc(v));
      return `(${vals.join(',')})`;
    });
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${valueSets.join(',')}`;
    try {
      await rpc(sql);
      total += batch.length;
    } catch (err) {
      batchErrors++;
      // If batch fails, try one by one
      for (const row of batch) {
        const vals = row.map(v => esc(v));
        const sql2 = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${vals.join(',')})`;
        try { await rpc(sql2); total++; } catch (e) { /* individual failures expected for schema mismatch */ }
      }
    }
  }
  if (batchErrors > 0) console.log(`    ${table}: ${total}/${rows.length} inserted (${batchErrors} batches had errors)`);
  else console.log(`    ${total}/${rows.length} inserted`);
  return total;
}

async function importCitations() {
  console.log('\n=== IMPORTING CITATIONS ===\n');

  const DATA_SOURCES = [
    { path: 'lhc-judgments.json', label: 'LHC Judgments' },
    { path: 'phc-judgments.json', label: 'PHC Judgments' },
    { path: 'scp-2025-results.json', label: 'SCP 2025 Results' },
    { path: 'scripts/fsc-judgments.json', label: 'FSC Judgments' },
    { path: 'scripts/ihc-judgments.json', label: 'IHC Judgments' },
  ];

  // Get existing citation strings
  const existing = await rpc("SELECT citation FROM citations WHERE citation IS NOT NULL AND citation != ''");
  const existingCitations = new Set(existing.map(r => r.citation));
  console.log(`Existing citations: ${existingCitations.size}`);

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
        (item.court || '').slice(0, 200),
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

  console.log(`\nTotal new citations to insert: ${allRows.length}`);
  if (allRows.length === 0) { console.log('Nothing to import.'); return; }

  const inserted = await batchInsert('citations', COLS, allRows, 50);
  console.log(`\nInserted: ${inserted}`);
}

async function importAppData() {
  console.log('\n=== IMPORTING APP DATA FROM SQLITE ===\n');

  const backupPath = path.resolve(ROOT, 'data', 'jinnah_legal.db.backup-20260624-182500');
  if (!existsSync(backupPath)) { console.log('Backup not found'); return; }

  const SQL = await initSqlJs();
  const db = new SQL.Database(readFileSync(backupPath));

  function getRows(table) {
    const res = db.exec(`SELECT * FROM ${table}`);
    if (res.length === 0) return [];
    const { columns, values } = res[0];
    return values.map(row => {
      const obj = {};
      columns.forEach((c, i) => { obj[c] = row[i]; });
      return obj;
    });
  }

  const schema = 'public';

  // Users — include all columns from backup
  console.log('\n--- Users ---');
  const users = getRows('users');
  console.log(`  ${users.length} users`);
  for (const u of users) {
    const cols = Object.keys(u);
    const updates = cols.map(c => `${c}=EXCLUDED.${c}`).join(',');
    const vals = cols.map(c => esc(u[c]));
    const sql = `INSERT INTO ${schema}.users (${cols.join(',')}) VALUES (${vals.join(',')})
                 ON CONFLICT (id) DO UPDATE SET ${updates}`;
    try { await rpc(sql); } catch (err) { console.error(`  User ${u.email}: ${err.message.slice(0, 120)}`); }
  }

  // Other tables — batch insert
  const tables = ['firms', 'cases', 'documents', 'messages', 'ai_chat_history', 'ai_sessions', 'connections', 'connection_requests', 'journal_entries'];

  for (const name of tables) {
    const rows = getRows(name);
    console.log(`  ${name}: ${rows.length}`);
    if (rows.length === 0) continue;
    const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
    const data = rows.map(r => cols.map(c => r[c]));
    await batchInsert(`${schema}.${name}`, cols, data, 50);
  }

  db.close();
  console.log('\nSQLite data import complete.');
}

async function main() {
  try { await importCitations(); } catch (err) { console.error('Citations import error:', err.message); }
  try { await importAppData(); } catch (err) { console.error('App data import error:', err.message); }

  const result = await rpc("SELECT 'citations' as tbl, COUNT(*) as cnt FROM citations UNION ALL SELECT 'users', COUNT(*) FROM users UNION ALL SELECT 'cases', COUNT(*) FROM cases UNION ALL SELECT 'firms', COUNT(*) FROM firms UNION ALL SELECT 'documents', COUNT(*) FROM documents UNION ALL SELECT 'messages', COUNT(*) FROM messages UNION ALL SELECT 'ai_chat_history', COUNT(*) FROM ai_chat_history UNION ALL SELECT 'ai_sessions', COUNT(*) FROM ai_sessions ORDER BY tbl");
  console.log('\n=== FINAL TABLE COUNTS ===');
  for (const r of result) console.log(`  ${r.tbl}: ${r.cnt}`);
}

main().catch(console.error);
