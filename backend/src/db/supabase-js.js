import { createClient } from '@supabase/supabase-js';

export class SupabaseJsAdapter {
  constructor() {
    this.supabase = null;
  }

  async connect() {
    const url = process.env.SUPABASE_URL || process.env.DATABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) throw new Error('SUPABASE_URL or DATABASE_URL is required');
    if (!key) throw new Error('SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY is required');

    const parsed = new URL(url);
    const projectUrl = `https://${parsed.hostname.replace('db.', '')}`;
    this.supabase = createClient(projectUrl, key);
    console.log(` Supabase JS client initialized (${projectUrl})`);
    await this._createSchema().catch(e => console.warn('Schema creation warning:', e.message));
  }

  _inlineParams(sql, params = []) {
    return sql.replace(/\?/g, () => {
      const v = params.shift();
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return String(v);
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      return `'${String(v).replace(/'/g, "''")}'`;
    });
  }

  async _execRpc(sqlText, params = []) {
    const query = this._inlineParams(sqlText, [...params]);
    const { data, error } = await this.supabase.rpc('exec_sql', { query_text: query });
    if (error) throw new Error(`Supabase RPC error: ${error.message}`);
    if (data && typeof data === 'object' && !Array.isArray(data) && data._error) {
      throw new Error(`SQL error: ${data._error}`);
    }
    return data;
  }

  async run(sqlText, params = []) {
    await this._execRpc(sqlText, params);
  }

  async query(sqlText, params = []) {
    const data = await this._execRpc(sqlText, params);
    return Array.isArray(data) ? data : (data || []);
  }

  async _ensureTable(ddl) {
    try { await this._execRpc(ddl); } catch (e) { console.warn(`Table creation: ${e.message}`); }
  }

  async _createSchema() {
    await this._ensureTable(
      `CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, case_id TEXT, client_id TEXT, lawyer_id TEXT, amount DOUBLE PRECISION NOT NULL, hours DOUBLE PRECISION, description TEXT, status TEXT DEFAULT 'pending', due_date TEXT, created_at TIMESTAMP DEFAULT NOW())`
    );
    await this._ensureTable(
      `CREATE TABLE IF NOT EXISTS time_entries (id TEXT PRIMARY KEY, lawyer_id TEXT, case_id TEXT, hours DOUBLE PRECISION NOT NULL, description TEXT, date TEXT NOT NULL, rate DOUBLE PRECISION, created_at TIMESTAMP DEFAULT NOW())`
    );
    await this._ensureTable(
      `CREATE TABLE IF NOT EXISTS payment_methods (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'card', last_four TEXT, expiry TEXT, card_brand TEXT, is_default INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())`
    );
    await this._ensureTable(
      `CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL, payment_method_id TEXT, amount DOUBLE PRECISION NOT NULL, status TEXT DEFAULT 'completed', transaction_id TEXT, paid_at TIMESTAMP DEFAULT NOW())`
    );
  }

  async queryOne(sqlText, params = []) {
    const rows = await this.query(sqlText, params);
    return rows[0] ?? null;
  }

  async close() {
    this.supabase = null;
  }
}
