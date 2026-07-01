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
    return data;
  }

  async run(sqlText, params = []) {
    await this._execRpc(sqlText, params);
  }

  async query(sqlText, params = []) {
    const data = await this._execRpc(sqlText, params);
    return Array.isArray(data) ? data : (data || []);
  }

  async queryOne(sqlText, params = []) {
    const rows = await this.query(sqlText, params);
    return rows[0] ?? null;
  }

  async close() {
    this.supabase = null;
  }
}
