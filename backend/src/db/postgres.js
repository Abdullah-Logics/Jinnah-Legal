import pg from 'pg';

function buildPgQuery(sqlText, params = []) {
  let i = 0;
  const text = sqlText.replace(/\?/g, () => `$${++i}`);
  return { text, params };
}

export class PostgresAdapter {
  constructor() {
    this.pool = null;
  }

  async connect() {
    const url = process.env.SUPABASE_URL || process.env.DATABASE_URL;
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
          is_firm_admin INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
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
        CREATE TABLE IF NOT EXISTS cases (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
          client_id TEXT, lawyer_id TEXT,
          status TEXT DEFAULT 'pending', type TEXT,
          timeline TEXT DEFAULT '[]', documents TEXT DEFAULT '[]', court_dates TEXT DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY, sender_id TEXT, receiver_id TEXT,
          content TEXT NOT NULL, case_id TEXT, is_read INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS journal_entries (
          id TEXT PRIMARY KEY, user_id TEXT,
          date TEXT NOT NULL, notes TEXT,
          todos TEXT DEFAULT '[]', plans TEXT,
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
        CREATE TABLE IF NOT EXISTS ai_chat_history (
          id TEXT PRIMARY KEY, user_id TEXT,
          role TEXT NOT NULL, content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log(' PostgreSQL schema ready');
    } finally {
      client.release();
    }
  }
}
