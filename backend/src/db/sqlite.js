import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR  = join(__dirname, '../../../data');
const DB_FILE = join(DB_DIR, 'jinnah_legal.db');
const BACKUP_DIR = join(__dirname, '../../../backups');

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function backup() {
  if (!existsSync(DB_FILE)) return;
  mkdirSync(BACKUP_DIR, { recursive: true });
  const date = new Date();
  const folder = join(BACKUP_DIR, `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`);
  mkdirSync(folder, { recursive: true });
  const dest = join(folder, `jinnah_legal_${timestamp()}.db`);
  copyFileSync(DB_FILE, dest);
}

let lastBackup = 0;

export class SqliteAdapter {
  constructor() { this.db = null; this.SQL = null; this._writeCount = 0; }

  async connect() {
    mkdirSync(DB_DIR, { recursive: true });
    mkdirSync(BACKUP_DIR, { recursive: true });

    if (existsSync(DB_FILE)) {
      backup();
    }

    this.SQL = await initSqlJs();
    if (existsSync(DB_FILE)) {
      this.db = new this.SQL.Database(readFileSync(DB_FILE));
    } else {
      this.db = new this.SQL.Database();
    }
    this._save();
    await this._createSchema();
    console.log('✅  SQLite (local) ready →', DB_FILE);
    console.log('💾  Backups →', BACKUP_DIR);

    // Hourly auto-backup
    setInterval(() => {
      if (this.db) {
        backup();
        console.log('⏰ Hourly backup saved');
      }
    }, 60 * 60 * 1000);
  }

  _save() {
    // Backup before every 10th write (plus startup)
    this._writeCount++;
    if (this._writeCount % 10 === 0) {
      backup();
    }
    writeFileSync(DB_FILE, Buffer.from(this.db.export()));
  }

  async run(sql, params = []) {
    this.db.run(sql, params);
    this._save();
  }

  async query(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  async queryOne(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows[0] ?? null;
  }

  async close() {
    if (this.db) {
      this._save();
      this.db.close();
      this.db = null;
      console.log('✅ SQLite connection closed');
    }
  }

  async _createSchema() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        avatar TEXT, phone TEXT, address TEXT, city TEXT, lat REAL, lng REAL,
        firm_id TEXT,
        subscription_plan TEXT DEFAULT 'free',
        is_verified INTEGER DEFAULT 0,
        verification_status TEXT DEFAULT 'pending',
        bar_number TEXT, license_number TEXT, specialization TEXT,
        experience INTEGER, education TEXT,
        is_firm_admin INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS firms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT, address TEXT, city TEXT,
        description TEXT,
        registration_number TEXT,
        is_verified INTEGER DEFAULT 0,
        verification_status TEXT DEFAULT 'pending',
        admin_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
        client_id TEXT, lawyer_id TEXT,
        status TEXT DEFAULT 'pending', type TEXT,
        client_status TEXT DEFAULT 'pending',
        timeline TEXT DEFAULT '[]', documents TEXT DEFAULT '[]', court_dates TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY, sender_id TEXT, receiver_id TEXT,
        content TEXT NOT NULL, case_id TEXT, is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY, user_id TEXT, date TEXT NOT NULL,
        notes TEXT, todos TEXT DEFAULT '[]', plans TEXT, content TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY, case_id TEXT, client_id TEXT, lawyer_id TEXT,
        amount REAL NOT NULL, hours REAL, description TEXT,
        status TEXT DEFAULT 'pending', due_date TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY, lawyer_id TEXT, case_id TEXT,
        hours REAL NOT NULL, description TEXT, date TEXT NOT NULL, rate REAL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY, user_id TEXT,
        name TEXT NOT NULL, url TEXT NOT NULL, size INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS ai_sessions (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'New Chat',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS ai_chat_history (
        id TEXT PRIMARY KEY, user_id TEXT, role TEXT NOT NULL,
        content TEXT NOT NULL, session_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    try { this.db.run("ALTER TABLE cases ADD COLUMN client_status TEXT DEFAULT 'pending'"); } catch {}
    try { this.db.run("ALTER TABLE documents ADD COLUMN content TEXT DEFAULT ''"); } catch {}
    try { this.db.run("ALTER TABLE documents ADD COLUMN type TEXT DEFAULT 'draft'"); } catch {}
    try { this.db.run("ALTER TABLE documents ADD COLUMN case_id TEXT"); } catch {}
    try { this.db.run("ALTER TABLE documents ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))"); } catch {}
    try { this.db.run("ALTER TABLE journal_entries ADD COLUMN content TEXT DEFAULT ''"); } catch {}
    try { this.db.run("DELETE FROM ai_sessions WHERE id LIKE 'doc-%' OR id LIKE 'research-%'"); } catch {}
    try { this.db.run("DELETE FROM ai_chat_history WHERE session_id LIKE 'doc-%' OR session_id LIKE 'research-%'"); } catch {}
    this._save();
  }
}
