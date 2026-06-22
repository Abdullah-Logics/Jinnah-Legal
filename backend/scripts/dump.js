import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, '../../data/jinnah_legal.db');

const wasmPath = resolve(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');
const initSqlJs = (await import('sql.js')).default;

const SQL = await initSqlJs({
  locateFile: () => wasmPath
});

const buffer = readFileSync(dbPath);
const db = new SQL.Database(buffer);

const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
const tableNames = tables[0].values.map(r => r[0]);

const data = {};
for (const table of tableNames) {
  const result = db.exec(`SELECT * FROM "${table}"`);
  const cols = result[0]?.columns || [];
  const rows = result[0]?.values || [];
  data[table] = rows.map(row => {
    const obj = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
  console.log(`  ${table}: ${rows.length} rows`);
}

const outDir = resolve(__dirname, '../seed');
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'seed.json'), JSON.stringify(data, null, 2));
console.log(`✅ Dumped ${tableNames.length} tables to seed/seed.json`);
db.close();
