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
      `CREATE TABLE IF NOT EXISTS invoices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), case_id UUID, client_id UUID, lawyer_id UUID, amount DOUBLE PRECISION NOT NULL, hours DOUBLE PRECISION, description TEXT, status TEXT DEFAULT 'pending', due_date TEXT, created_at TIMESTAMP DEFAULT NOW())`
    );
    await this._ensureTable(
      `CREATE TABLE IF NOT EXISTS time_entries (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lawyer_id UUID, case_id UUID, hours DOUBLE PRECISION NOT NULL, description TEXT, date TEXT NOT NULL, rate DOUBLE PRECISION, created_at TIMESTAMP DEFAULT NOW())`
    );
    await this._ensureTable(
      `CREATE TABLE IF NOT EXISTS payment_methods (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, type TEXT NOT NULL DEFAULT 'card', last_four TEXT, expiry TEXT, card_brand TEXT, is_default INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`
    );
    await this._ensureTable(
      `CREATE TABLE IF NOT EXISTS payments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id UUID NOT NULL, payment_method_id UUID, amount DOUBLE PRECISION NOT NULL, status TEXT DEFAULT 'completed', transaction_id TEXT, paid_at TIMESTAMPTZ DEFAULT NOW())`
    );
    await this._ensureExtension();
    await this._ensureFtsIndexes();
    await this._ensureNewTables();
    await this._ensureConstitutionTable();
    await this._ensureRagTable();
    await this._seedConstitution();
    await this._autoLinkReferences();
  }

  async _ensureExtension() {
    try {
      await this._execRpc(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    } catch (e) {
      console.warn('pg_trgm extension:', e.message);
    }
  }

  async _ensureFtsIndexes() {
    try {
      await this._execRpc(`CREATE INDEX IF NOT EXISTS idx_citations_fts ON citations USING GIN(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(keywords,'') || ' ' || coalesce(full_text,'') || ' ' || coalesce(parties,'') || ' ' || coalesce(relevant_statutes,'') || ' ' || coalesce(citation,'')))`);
    } catch (e) {
      console.warn('FTS index:', e.message);
    }
    try {
      await this._execRpc(`CREATE INDEX IF NOT EXISTS idx_citations_trgm_title ON citations USING GIN(title gin_trgm_ops)`);
    } catch (e) {
      console.warn('trgm title index:', e.message);
    }
    try {
      await this._execRpc(`CREATE INDEX IF NOT EXISTS idx_citations_trgm_description ON citations USING GIN(description gin_trgm_ops)`);
    } catch (e) {
      console.warn('trgm description index:', e.message);
    }
  }

  async _ensureNewTables() {
    await this._ensureTable(
      `CREATE TABLE IF NOT EXISTS citation_references (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        citation_id UUID NOT NULL REFERENCES citations(id) ON DELETE CASCADE,
        referenced_citation_id UUID NOT NULL REFERENCES citations(id) ON DELETE CASCADE,
        reference_type TEXT NOT NULL DEFAULT 'cited_in',
        context TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(citation_id, referenced_citation_id, reference_type)
      )`
    );
    await this._ensureTable(
      `CREATE TABLE IF NOT EXISTS evidence (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        case_id TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'document',
        file_url TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        category TEXT DEFAULT 'general',
        description TEXT,
        status TEXT DEFAULT 'pending',
        metadata TEXT DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`
    );
    await this._ensureTable(
      `CREATE TABLE IF NOT EXISTS evidence_analysis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        analysis_type TEXT NOT NULL DEFAULT 'full',
        result TEXT DEFAULT '{}',
        summary TEXT,
        facts TEXT DEFAULT '[]',
        contradictions TEXT DEFAULT '[]',
        confidence_score DOUBLE PRECISION DEFAULT 0,
        authenticity_score DOUBLE PRECISION DEFAULT 0,
        consistency_score DOUBLE PRECISION DEFAULT 0,
        tags TEXT DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    );
  }

  async _ensureConstitutionTable() {
    await this._ensureTable(
      `CREATE TABLE IF NOT EXISTS constitution (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        part TEXT NOT NULL,
        part_title TEXT NOT NULL,
        chapter TEXT DEFAULT '',
        chapter_title TEXT DEFAULT '',
        article TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    );
    try {
      await this._execRpc(`CREATE INDEX IF NOT EXISTS idx_constitution_part ON constitution(part)`);
      await this._execRpc(`CREATE INDEX IF NOT EXISTS idx_constitution_article ON constitution(article)`);
      await this._execRpc(`CREATE INDEX IF NOT EXISTS idx_constitution_category ON constitution(category)`);
    } catch (e) {
      console.warn('Constitution indexes:', e.message);
    }
  }

  async _ensureRagTable() {
    try {
      await this._execRpc(`CREATE EXTENSION IF NOT EXISTS vector`);
    } catch (e) {
      console.warn('pgvector extension:', e.message);
    }
    try {
      await this._ensureTable(
        `CREATE TABLE IF NOT EXISTS rag_chunks (
          id TEXT PRIMARY KEY,
          source_type TEXT NOT NULL,
          source_id TEXT DEFAULT '',
          title TEXT DEFAULT '',
          chunk_text TEXT NOT NULL,
          citation TEXT DEFAULT '',
          court TEXT DEFAULT '',
          year INTEGER DEFAULT 0,
          category TEXT DEFAULT '',
          keywords TEXT DEFAULT '',
          article TEXT DEFAULT '',
          metadata TEXT DEFAULT '{}',
          embedding vector(3072),
          created_at TIMESTAMPTZ DEFAULT NOW()
        )`
      );
      try {
        await this._execRpc(`ALTER TABLE rag_chunks ADD COLUMN IF NOT EXISTS embedding vector(3072)`);
      } catch (e) {
        console.warn('Add embedding column:', e.message);
      }
      try {
        await this._execRpc(`ALTER TABLE rag_chunks ALTER COLUMN embedding TYPE vector(3072)`);
      } catch (e) {
        console.warn('Alter embedding type:', e.message);
      }
      try {
        await this._execRpc(`DROP INDEX IF EXISTS idx_rag_chunks_embedding`);
        await this._execRpc(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding ON rag_chunks USING hnsw (embedding vector_cosine_ops)`);
      } catch (e) {
        console.warn('hnsw index:', e.message);
      }
      await this._execRpc(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_type ON rag_chunks(source_type)`);
      await this._execRpc(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_court ON rag_chunks(court)`);
      await this._execRpc(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_year ON rag_chunks(year)`);
    } catch (e) {
      console.warn('RAG table creation:', e.message);
    }
  }

  async _seedConstitution() {
    try {
      const { seedConstitution } = await import('./seed-constitution.js');
      const result = await seedConstitution(this);
      console.log('📜 Constitution seeding:', result.message);
    } catch (e) {
      console.warn('Constitution seeding:', e.message);
    }
  }

  async _autoLinkReferences() {
    try {
      const hasRefs = await this.queryOne('SELECT COUNT(*) as c FROM citation_references');
      if (Number(hasRefs?.c || 0) > 0) return;
      const citations = await this.query("SELECT id, full_text, description, citation FROM citations WHERE full_text IS NOT NULL AND full_text != '' LIMIT 500");
      for (const c of citations) {
        const text = (c.full_text || '') + ' ' + (c.description || '');
        const matches = text.match(/\d{4}\s+(PLD|SCMR|PCrLJ|CLC|MLD|YLR|PTD|CLD)\s+\d+/g);
        if (!matches) continue;
        for (const m of matches) {
          const target = await this.queryOne('SELECT id FROM citations WHERE citation=? AND id!=?', [m, c.id]);
          if (target) {
            try {
              await this.run(
                "INSERT INTO citation_references (id, citation_id, referenced_citation_id, reference_type, context) VALUES (gen_random_uuid(),?,?,?,?) ON CONFLICT (citation_id, referenced_citation_id, reference_type) DO NOTHING",
                [c.id, target.id, 'cites', text.slice(0, 300)]
              );
            } catch {}
          }
        }
      }
    } catch (e) {
      console.warn('Auto-link references:', e.message);
    }
  }

  async queryOne(sqlText, params = []) {
    const rows = await this.query(sqlText, params);
    return rows[0] ?? null;
  }

  async close() {
    this.supabase = null;
  }
}
