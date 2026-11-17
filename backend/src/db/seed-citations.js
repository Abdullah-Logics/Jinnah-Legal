import { v4 as uuid } from 'uuid';
import { run, query, queryOne } from './adapter.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, '..', '..');

function loadJSON(relativePath) {
  const fullPath = path.resolve(BACKEND_DIR, relativePath);
  if (!existsSync(fullPath)) {
    console.log(`[seed-citations] File not found, skipping: ${fullPath}`);
    return null;
  }
  const raw = readFileSync(fullPath, 'utf-8');
  return JSON.parse(raw);
}

function mapJudgment(item) {
  const hasFullText = 'full_text' in item && item.full_text;
  return {
    id: uuid(),
    title: item.title || '',
    citation: item.citation || '',
    court: item.court || '',
    year: Number(item.year) || 0,
    parties: item.parties || '',
    category: item.category || 'Civil',
    description: (item.description || '').slice(0, 500),
    full_text: hasFullText ? String(item.full_text).slice(0, 50000) : '',
    keywords: item.keywords || '',
    source_url: item.source_url || item.url || item.pdf_url || '',
    source_type: 'existing_corpus',
    verification_status: 'verified_source',
  };
}

const DATA_SOURCES = [
  { path: '../lhc-judgments.json', label: 'LHC Judgments' },
  { path: '../phc-judgments.json', label: 'PHC Judgments' },
  { path: '../scp-2025-results.json', label: 'SCP 2025 Results' },
  { path: '../scripts/fsc-judgments.json', label: 'FSC Judgments' },
  { path: '../scripts/ihc-judgments.json', label: 'IHC Judgments' },
  { path: '../backend/data/supreme_court_cases.json', label: 'Supreme Court Cases' },
  { path: '../backend/data/sc_cases_2015_2024.json', label: 'SC Cases 2015-2024' },
  { path: '../scripts/shc-afr-judgments.json', label: 'SHC Judgments' },
];

export async function seedCitations() {
  try {
    const existing = await queryOne('SELECT COUNT(*) as c FROM citations');
    const count = Number(existing?.c || 0);
    if (count > 0) {
      console.log(`[seed-citations] Citations table already has ${count} row(s) — skipping auto-seed`);
      return;
    }
  } catch {
    console.log('[seed-citations] Citations table not accessible — skipping auto-seed');
    return;
  }

  console.log('[seed-citations] Citations table is empty — starting auto-import from JSON files...');

  const seen = new Set();
  let totalInserted = 0;

  for (const src of DATA_SOURCES) {
    const data = loadJSON(src.path);
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`[seed-citations] ${src.label}: 0 rows (empty or invalid)`);
      continue;
    }

    let fileInserted = 0;
    for (const raw of data) {
      const citationStr = (raw.citation || '').trim();
      if (!citationStr) continue;
      if (seen.has(citationStr)) continue;
      seen.add(citationStr);

      const item = mapJudgment(raw);
      try {
        await run(
          `INSERT INTO citations (id,title,citation,court,year,parties,category,description,full_text,keywords,source_url,source_type,verification_status)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [item.id, item.title, item.citation, item.court, item.year,
            item.parties, item.category, item.description, item.full_text, item.keywords,
            item.source_url, item.source_type, item.verification_status]
        );
        fileInserted++;
      } catch (err) {
        console.error(`[seed-citations] Error inserting citation "${citationStr}": ${err.message}`);
      }
    }
    totalInserted += fileInserted;
    console.log(`[seed-citations] ${src.label}: ${fileInserted} citations inserted (${data.length - fileInserted} skipped/duplicate)`);
  }

  console.log(`[seed-citations] Auto-seed complete — ${totalInserted} total citations inserted`);
}

export async function seedLandmarkCases() {
  console.log('[seed-citations] Hardcoded landmark seeding is disabled — use verified legal source ingestion');
}
