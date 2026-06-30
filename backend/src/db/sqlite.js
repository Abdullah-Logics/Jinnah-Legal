// On Vercel, use asm.js variant (no WASM binary needed)
const sqlInit = process.env.VERCEL
  ? () => import('sql.js/dist/sql-asm.js').then(m => m.default())
  : () => import('sql.js').then(m => m.default());
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
    this.SQL = await sqlInit();

    // On Vercel (no persistent filesystem), use in-memory DB
    if (process.env.VERCEL) {
      this.db = new this.SQL.Database();
      this._memoryOnly = true;
      console.log('✅  SQLite (in-memory) ready → Vercel ephemeral mode');
      console.log('⚠️  Set DATABASE_URL for persistent PostgreSQL');
      await this._createSchema();
      await this._seedFromBackup();
      return;
    }

    mkdirSync(DB_DIR, { recursive: true });
    mkdirSync(BACKUP_DIR, { recursive: true });

    if (existsSync(DB_FILE)) {
      backup();
    }

    if (existsSync(DB_FILE)) {
      this.db = new this.SQL.Database(readFileSync(DB_FILE));
    } else {
      this.db = new this.SQL.Database();
    }
    this._save();
    await this._createSchema();
    console.log('✅  SQLite (local) ready →', DB_FILE);
    console.log('💾  Backups →', BACKUP_DIR);

    // Hourly auto-backup (skip on Vercel)
    if (!process.env.VERCEL) {
      setInterval(() => {
        if (this.db) {
          backup();
          console.log('⏰ Hourly backup saved');
        }
      }, 60 * 60 * 1000);
    }
  }

  _save() {
    if (this._memoryOnly) return;
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

  async _seedFromBackup() {
    try {
      const { existsSync: _exists, readFileSync: _read } = await import('fs');
      const { resolve } = await import('path');
      const seedPath = resolve(__dirname, '../../seed/seed.json');
      if (!_exists(seedPath)) return;
      const existing = this.db.exec("SELECT COUNT(*) as c FROM users");
      if (existing[0]?.values[0][0] > 0) return;
      const data = JSON.parse(_read(seedPath, 'utf-8'));
      const tables = ['users','firms','firm_requests','cases','messages',
        'connection_requests','connections','journal_entries',
        'invoices','time_entries','documents','ai_sessions','ai_chat_history',
        'reports','blocks','groups_table','group_members','call_logs'];
      for (const table of tables) {
        const rows = data[table];
        if (!rows?.length) continue;
        const cols = Object.keys(rows[0]);
        const ph = cols.map(() => '?').join(',');
        const stmt = this.db.prepare(`INSERT OR IGNORE INTO "${table}" (${cols.map(c=>'"'+c+'"').join(',')}) VALUES (${ph})`);
        for (const r of rows) stmt.run(cols.map(c => r[c] ?? null));
        stmt.free();
      }
      console.log('✅ Seed data loaded from backup');
    } catch (err) {
      console.error('Seed from backup failed:', err.message);
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
        bio TEXT,
        is_firm_admin INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        chat_wallpaper TEXT DEFAULT '',
        FOREIGN KEY (user_id) REFERENCES users(id)
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
      CREATE TABLE IF NOT EXISTS firm_requests (
        id TEXT PRIMARY KEY,
        lawyer_id TEXT NOT NULL,
        firm_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        type TEXT NOT NULL DEFAULT 'join',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
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
        attachments TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS connection_requests (
        id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, receiver_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending', message TEXT,
        created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY, user1_id TEXT NOT NULL, user2_id TEXT NOT NULL,
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
      CREATE TABLE IF NOT EXISTS calls (
        id TEXT PRIMARY KEY,
        caller_id TEXT NOT NULL,
        callee_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'audio',
        status TEXT NOT NULL DEFAULT 'missed',
        duration INTEGER DEFAULT 0,
        started_at TEXT,
        ended_at TEXT,
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
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL,
        reported_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        resolved_by TEXT,
        resolved_at TEXT
      );
      CREATE TABLE IF NOT EXISTS blocks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT DEFAULT '',
        blocked_by TEXT NOT NULL,
        reason TEXT DEFAULT '',
        type TEXT NOT NULL DEFAULT 'user',
        created_at TEXT DEFAULT (datetime('now')),
        unblocked_by TEXT,
        unblocked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS groups_table (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'group',
        case_id TEXT,
        avatar TEXT DEFAULT '',
        created_by TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS group_members (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        joined_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS call_logs (
        id TEXT PRIMARY KEY,
        caller_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'audio',
        status TEXT NOT NULL,
        duration INTEGER DEFAULT 0,
        started_at TEXT,
        ended_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS citations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        citation TEXT NOT NULL,
        court TEXT NOT NULL,
        year INTEGER NOT NULL,
        parties TEXT,
        category TEXT,
        description TEXT,
        full_text TEXT,
        relevant_statutes TEXT,
        keywords TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    try { this.db.run("ALTER TABLE cases ADD COLUMN client_status TEXT DEFAULT 'pending'"); } catch {}
    try { this.db.run("ALTER TABLE documents ADD COLUMN content TEXT DEFAULT ''"); } catch {}
    try { this.db.run("ALTER TABLE documents ADD COLUMN type TEXT DEFAULT 'draft'"); } catch {}
    try { this.db.run("ALTER TABLE documents ADD COLUMN case_id TEXT"); } catch {}
    try { this.db.run("ALTER TABLE documents ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))"); } catch {}
    try { this.db.run("ALTER TABLE journal_entries ADD COLUMN content TEXT DEFAULT ''"); } catch {}
    try { this.db.run("ALTER TABLE messages ADD COLUMN attachments TEXT DEFAULT '[]'"); } catch {}
    try { this.db.run("ALTER TABLE messages ADD COLUMN share_data TEXT"); } catch {}
    try { this.db.run("ALTER TABLE messages ADD COLUMN group_id TEXT"); } catch {}
    try { this.db.run("DELETE FROM ai_sessions WHERE id LIKE 'doc-%' OR id LIKE 'research-%'"); } catch {}
    try { this.db.run("DELETE FROM ai_chat_history WHERE session_id LIKE 'doc-%' OR session_id LIKE 'research-%'"); } catch {}
    try { this.db.run("ALTER TABLE users ADD COLUMN bio TEXT"); } catch {}
    this._save();
  }
}
