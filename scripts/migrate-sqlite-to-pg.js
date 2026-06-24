import initSqlJs from 'sql.js';
import { readFileSync, existsSync } from 'fs';
import pg from 'pg';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_FILE = join(__dirname, '../data/jinnah_legal.db');

const TABLES = [
  'users', 'firms', 'firm_requests', 'cases', 'messages',
  'connection_requests', 'connections', 'journal_entries',
  'invoices', 'time_entries', 'calls', 'documents',
  'ai_sessions', 'ai_chat_history',
];

async function migrate() {
  // 1. Load SQLite
  if (!existsSync(DB_FILE)) {
    console.error(`SQLite database not found at ${DB_FILE}`);
    process.exit(1);
  }
  const SQL = await initSqlJs();
  const buffer = readFileSync(DB_FILE);
  const sqlite = new SQL.Database(buffer);

  // 2. Connect to PostgreSQL
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

  // 3. Create schema (ensure all tables exist)
  console.log('Creating PostgreSQL schema...');
  const schemaClient = await pool.connect();
  try {
    await schemaClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
        name TEXT NOT NULL, role TEXT NOT NULL, avatar TEXT, phone TEXT,
        address TEXT, city TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION,
        firm_id TEXT, subscription_plan TEXT DEFAULT 'free',
        is_verified INTEGER DEFAULT 0, verification_status TEXT DEFAULT 'pending',
        bar_number TEXT, license_number TEXT, specialization TEXT,
        experience INTEGER, education TEXT, is_firm_admin INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS firms (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
        phone TEXT, address TEXT, city TEXT, description TEXT,
        registration_number TEXT, is_verified INTEGER DEFAULT 0,
        verification_status TEXT DEFAULT 'pending', admin_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS firm_requests (
        id TEXT PRIMARY KEY, lawyer_id TEXT NOT NULL, firm_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending', type TEXT NOT NULL DEFAULT 'join',
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
        client_id TEXT, lawyer_id TEXT, status TEXT DEFAULT 'pending', type TEXT,
        client_status TEXT DEFAULT 'pending',
        timeline TEXT DEFAULT '[]', documents TEXT DEFAULT '[]', court_dates TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY, sender_id TEXT, receiver_id TEXT,
        content TEXT NOT NULL, case_id TEXT, is_read INTEGER DEFAULT 0,
        attachments TEXT DEFAULT '[]', share_data TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS connection_requests (
        id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, receiver_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending', message TEXT,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY, user1_id TEXT NOT NULL, user2_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY, user_id TEXT, date TEXT NOT NULL,
        notes TEXT, todos TEXT DEFAULT '[]', plans TEXT, content TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY, case_id TEXT, client_id TEXT, lawyer_id TEXT,
        amount DOUBLE PRECISION NOT NULL, hours DOUBLE PRECISION, description TEXT,
        status TEXT DEFAULT 'pending', due_date TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY, lawyer_id TEXT, case_id TEXT,
        hours DOUBLE PRECISION NOT NULL, description TEXT, date TEXT NOT NULL, rate DOUBLE PRECISION,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS calls (
        id TEXT PRIMARY KEY, caller_id TEXT NOT NULL, callee_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'audio', status TEXT NOT NULL DEFAULT 'missed',
        duration INTEGER DEFAULT 0, started_at TIMESTAMP, ended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY, user_id TEXT, name TEXT NOT NULL, url TEXT NOT NULL,
        size INTEGER NOT NULL, content TEXT DEFAULT '', type TEXT DEFAULT 'draft', case_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS ai_sessions (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'New Chat',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS ai_chat_history (
        id TEXT PRIMARY KEY, user_id TEXT, role TEXT NOT NULL,
        content TEXT NOT NULL, session_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Schema created');
  } finally {
    schemaClient.release();
  }

  // 4. Migrate each table
  for (const table of TABLES) {
    // Get column info from SQLite
    const pragma = sqlite.exec(`PRAGMA table_info("${table}")`);
    if (!pragma.length) {
      console.warn(`Table "${table}" not found in SQLite, skipping`);
      continue;
    }

    // Check if table has any rows
    const countResult = sqlite.exec(`SELECT COUNT(*) as cnt FROM "${table}"`);
    if (!countResult.length || !countResult[0].values.length) continue;
    const rowCount = countResult[0].values[0][0];
    if (rowCount === 0) {
      console.log(`Table "${table}" is empty, skipping`);
      continue;
    }

    // Get all rows
    const result = sqlite.exec(`SELECT * FROM "${table}"`);
    const columns = result[0].columns;
    const rows = result[0].values;

    // Insert in batches of 100
    const client = await pool.connect();
    try {
      let inserted = 0;
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const placeholders = batch.map((_, ri) =>
          `(${columns.map((__, ci) => `$${ri * columns.length + ci + 1}`).join(',')})`
        ).join(',');
        const flat = batch.flat();
        const cols = columns.map(c => `"${c}"`).join(',');
        const sql = `INSERT INTO "${table}" (${cols}) VALUES ${placeholders} ON CONFLICT DO NOTHING`;
        await client.query(sql, flat);
        inserted += batch.length;
        console.log(`  ${table}: ${inserted}/${rowCount} rows`);
      }
      console.log(`✅ "${table}": ${inserted} rows migrated`);
    } catch (err) {
      console.error(`❌ "${table}" migration failed:`, err.message);
      // Try row by row for this table to isolate bad rows
      console.log(`  Retrying "${table}" row by row...`);
      for (const row of rows) {
        try {
          const ph = columns.map((_, i) => `$${i + 1}`).join(',');
          const cols = columns.map(c => `"${c}"`).join(',');
          await client.query(
            `INSERT INTO "${table}" (${cols}) VALUES (${ph}) ON CONFLICT DO NOTHING`,
            row
          );
        } catch (rowErr) {
          console.error(`  Skipping bad row in "${table}": ${JSON.stringify(row)}`);
          console.error(`  Error: ${rowErr.message}`);
        }
      }
    } finally {
      client.release();
    }
  }

  await pool.end();
  sqlite.close();
  console.log('\n Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
