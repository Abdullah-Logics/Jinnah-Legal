import pg from 'pg';
import { lookup } from 'dns/promises';

function buildPgQuery(sqlText, params = []) {
  let i = 0;
  const text = sqlText.replace(/\?/g, () => `$${++i}`);
  return { text, params };
}

async function resolveHost(host) {
  try {
    const { address: v6 } = await lookup(host, { family: 6, hints: 0x200 /* AI_V4MAPPED */ }).catch(() => ({}));
    if (v6) return v6;
  } catch { /* try v4 */ }
  try {
    const { address: v4 } = await lookup(host, { family: 4 });
    if (v4) return v4;
  } catch { /* try connect via hostname */ }
  return host;
}

export class PostgresAdapter {
  constructor() {
    this.pool = null;
  }

  async connect() {
    let url = process.env.SUPABASE_URL || process.env.DATABASE_URL;
    if (!url) throw new Error('SUPABASE_URL or DATABASE_URL is required');
    this.pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
    this.pool.on('error', err => console.error('PG pool error:', err.message));
    console.log(' PostgreSQL connected via Supabase');
    await this._createSchema();
  }

  async run(sqlText, params = []) {
    const { text, params: p } = buildPgQuery(sqlText, params);
    const client = await this.pool.connect();
    try {
      await client.query(text, p);
    } finally {
      client.release();
    }
  }

  async query(sqlText, params = []) {
    const { text, params: p } = buildPgQuery(sqlText, params);
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, p);
      return result.rows || [];
    } finally {
      client.release();
    }
  }

  async queryOne(sqlText, params = []) {
    const rows = await this.query(sqlText, params);
    return rows[0] ?? null;
  }

  async close() {
    if (this.pool) {
      try {
        await this.pool.end();
        console.log(' PostgreSQL pool closed');
      } catch (err) {
        console.error('Error closing PG pool:', err.message);
      }
      this.pool = null;
    }
  }

  async _createSchema() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          avatar TEXT, phone TEXT, address TEXT, city TEXT,
          lat DOUBLE PRECISION, lng DOUBLE PRECISION,
          firm_id TEXT,
          subscription_plan TEXT DEFAULT 'free',
          is_verified INTEGER DEFAULT 0,
          verification_status TEXT DEFAULT 'pending',
          bar_number TEXT, license_number TEXT, specialization TEXT,
          experience INTEGER, education TEXT,
          bio TEXT,
          is_firm_admin INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
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
          created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS firm_requests (
          id TEXT PRIMARY KEY,
          lawyer_id TEXT NOT NULL,
          firm_id TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          type TEXT NOT NULL DEFAULT 'join',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS cases (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
          client_id TEXT, lawyer_id TEXT,
          status TEXT DEFAULT 'pending', type TEXT,
          client_status TEXT DEFAULT 'pending',
          timeline TEXT DEFAULT '[]', documents TEXT DEFAULT '[]', court_dates TEXT DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY, sender_id TEXT, receiver_id TEXT,
          content TEXT NOT NULL, case_id TEXT, is_read INTEGER DEFAULT 0,
          attachments TEXT DEFAULT '[]',
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
          id TEXT PRIMARY KEY, user_id TEXT,
          date TEXT NOT NULL, notes TEXT,
          todos TEXT DEFAULT '[]', plans TEXT, content TEXT DEFAULT '',
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
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY, user_id TEXT,
          name TEXT NOT NULL, url TEXT NOT NULL, size INTEGER NOT NULL,
          content TEXT DEFAULT '', type TEXT DEFAULT 'draft', case_id TEXT,
          created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS ai_sessions (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'New Chat',
        created_at TIMESTAMP DEFAULT NOW()
      );
        CREATE TABLE IF NOT EXISTS ai_chat_history (
        id TEXT PRIMARY KEY, user_id TEXT,
        role TEXT NOT NULL, content TEXT NOT NULL,
        session_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS calls (
        id TEXT PRIMARY KEY,
        caller_id TEXT NOT NULL,
        callee_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'audio',
        status TEXT NOT NULL DEFAULT 'missed',
        duration INTEGER DEFAULT 0,
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL,
        reported_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        resolved_by TEXT,
        resolved_at TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS blocks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT DEFAULT '',
        blocked_by TEXT NOT NULL,
        reason TEXT DEFAULT '',
        type TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW(),
        unblocked_by TEXT,
        unblocked_at TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS groups_table (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'group',
        case_id TEXT,
        avatar TEXT DEFAULT '',
        created_by TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS group_members (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS call_logs (
        id TEXT PRIMARY KEY,
        caller_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'audio',
        status TEXT NOT NULL,
        duration INTEGER DEFAULT 0,
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      `);
      // Migrations for existing tables
      try { await client.query("ALTER TABLE messages ADD COLUMN share_data TEXT"); } catch {}
      try { await client.query("ALTER TABLE messages ADD COLUMN group_id TEXT"); } catch {}
      try { await client.query("ALTER TABLE users ADD COLUMN bio TEXT"); } catch {}
      console.log(' PostgreSQL schema ready');
    } finally {
      client.release();
    }
  }
}
