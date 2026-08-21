import { DIMENSION } from './embedder.js';

class InMemoryVectorStore {
  constructor() {
    this.vectors = [];
    this.indexed = false;
  }

  add(id, embedding, metadata) {
    this.vectors.push({ id, embedding, metadata });
  }

  clear() {
    this.vectors = [];
  }

  cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  search(queryEmbedding, { limit = 20, filters = {} } = {}) {
    const scored = this.vectors
      .map(v => {
        let pass = true;
        for (const [key, value] of Object.entries(filters)) {
          if (value && v.metadata[key] !== value) { pass = false; break; }
        }
        if (!pass) return null;
        return { ...v, score: this.cosineSimilarity(queryEmbedding, v.embedding) };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return scored;
  }

  keywordSearch(_queryText, _options) {
    // Lexical search not supported in memory mode; hybrid falls back to semantic-only.
    return [];
  }

  size() { return this.vectors.length; }
}

const MATCH_FN = 'match_rag_chunks';
const FTS_FN = 'search_rag_chunks_fts';

class PgVectorStore {
  constructor() {
    this.supabase = null;
    this.queryFn = null;
    this.runFn = null;
    this.ready = false;
    this.rpcReady = false;
  }

  init(supabaseClient, queryFn, runFn) {
    this.supabase = supabaseClient;
    this.queryFn = queryFn;
    this.runFn = runFn;
    if (supabaseClient) {
      this.ready = true;
      console.log('pgvector store initialized (via Supabase REST API)');
      // Install/refresh server-side search functions in background.
      this._ensureFunctions().then(ok => {
        this.rpcReady = ok;
        console.log(`pgvector RPC search functions: ${ok ? 'ready' : 'unavailable (fallback mode)'}`);
      }).catch(() => { this.rpcReady = false; });
    }
    return this.ready;
  }

  async _exec(sql) {
    const { data, error } = await this.supabase.rpc('exec_sql', { query_text: sql });
    if (error) throw new Error(error.message);
    if (data && typeof data === 'object' && !Array.isArray(data) && data._error) {
      throw new Error(data._error);
    }
    return data;
  }

  async _ensureFunctions() {
    try {
      await this._exec(`
        CREATE OR REPLACE FUNCTION ${MATCH_FN}(
          query_embedding vector(${DIMENSION}),
          match_count int DEFAULT 10,
          filter_source text DEFAULT NULL,
          filter_court text DEFAULT NULL,
          filter_category text DEFAULT NULL,
          filter_year_from int DEFAULT NULL,
          filter_year_to int DEFAULT NULL,
          min_score float DEFAULT 0.0
        ) RETURNS TABLE (
          id text, source_type text, source_id text, title text, chunk_text text,
          citation text, court text, year int, category text, keywords text,
          article text, metadata text, score float
        ) LANGUAGE sql STABLE AS $$
          SELECT c.id, c.source_type, c.source_id, c.title, c.chunk_text,
                 c.citation, c.court, c.year, c.category, c.keywords,
                 c.article, c.metadata,
                 1 - (c.embedding <=> query_embedding) AS score
          FROM rag_chunks c
          WHERE (filter_source IS NULL OR c.source_type = filter_source)
            AND (filter_court IS NULL OR c.court ILIKE '%' || filter_court || '%')
            AND (filter_category IS NULL OR c.category = filter_category)
            AND (filter_year_from IS NULL OR c.year >= filter_year_from)
            AND (filter_year_to IS NULL OR c.year <= filter_year_to)
            AND 1 - (c.embedding <=> query_embedding) > min_score
          ORDER BY c.embedding <=> query_embedding ASC
          LIMIT LEAST(match_count, 100);
        $$;
      `);
      await this._exec(`
        CREATE OR REPLACE FUNCTION ${FTS_FN}(
          query_text text,
          match_count int DEFAULT 10,
          filter_source text DEFAULT NULL,
          filter_court text DEFAULT NULL,
          filter_category text DEFAULT NULL,
          filter_year_from int DEFAULT NULL,
          filter_year_to int DEFAULT NULL
        ) RETURNS TABLE (
          id text, source_type text, source_id text, title text, chunk_text text,
          citation text, court text, year int, category text, keywords text,
          article text, metadata text, score float
        ) LANGUAGE plpgsql STABLE AS $$
        DECLARE
          tsq tsquery;
        BEGIN
          BEGIN
            tsq := websearch_to_tsquery('english', query_text);
          EXCEPTION WHEN OTHERS THEN
            tsq := to_tsquery('english', 'noposiblematch');
          END;

          RETURN QUERY
          SELECT c.id, c.source_type, c.source_id, c.title, c.chunk_text,
                 c.citation, c.court, c.year, c.category, c.keywords,
                 c.article, c.metadata,
                 GREATEST(
                   ts_rank(c.fts, tsq),
                   CASE WHEN c.citation ILIKE '%' || query_text || '%' THEN 0.99 ELSE 0 END,
                   CASE WHEN c.title ILIKE '%' || query_text || '%' THEN 0.9 ELSE 0 END
                 )::float AS score
          FROM rag_chunks c
          WHERE (filter_source IS NULL OR c.source_type = filter_source)
            AND (filter_court IS NULL OR c.court ILIKE '%' || filter_court || '%')
            AND (filter_category IS NULL OR c.category = filter_category)
            AND (filter_year_from IS NULL OR c.year >= filter_year_from)
            AND (filter_year_to IS NULL OR c.year <= filter_year_to)
            AND (
              c.fts @@ tsq
              OR c.citation ILIKE '%' || query_text || '%'
              OR c.title ILIKE '%' || query_text || '%'
              OR c.keywords ILIKE '%' || query_text || '%'
            )
          ORDER BY score DESC
          LIMIT LEAST(match_count, 100);
        END;
        $$;
      `);
      // Generated FTS column backing the lexical leg (fast, always in sync).
      try {
        await this._exec(`ALTER TABLE rag_chunks ADD COLUMN IF NOT EXISTS fts tsvector GENERATED ALWAYS AS (
          to_tsvector('english', coalesce(title,'') || ' ' || coalesce(citation,'') || ' ' || coalesce(keywords,'') || ' ' || coalesce(chunk_text,''))
        ) STORED`);
      } catch {}
      try {
        await this._exec(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_fts ON rag_chunks USING GIN(fts)`);
      } catch {}
      return true;
    } catch (e) {
      console.warn('RAG search function install failed:', e.message);
      return false;
    }
  }

  addBatch(chunks) {
    if (!this.ready || chunks.length === 0) return Promise.resolve(false);
    const rows = chunks.map(c => ({
      id: c.id,
      source_type: c.sourceType,
      source_id: c.sourceId || '',
      title: c.title || '',
      chunk_text: c.chunkText,
      citation: c.citation || '',
      court: c.court || '',
      year: Number(c.year) || 0,
      category: c.category || '',
      keywords: c.keywords || '',
      article: c.article || '',
      metadata: JSON.stringify(c.metadata || {}),
      embedding: (c.embedding || new Array(DIMENSION).fill(0)).slice(0, DIMENSION),
    }));
    return this.supabase
      .from('rag_chunks')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: false })
      .then(({ error }) => {
        if (error) {
          console.error('pgvector batch insert error:', error.message);
          throw error;
        }
        return true;
      });
  }

  rowToResult(r) {
    let meta = r.metadata ?? {};
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch { meta = {}; }
    }
    return {
      id: r.id,
      sourceType: r.source_type,
      sourceId: r.source_id,
      title: r.title,
      chunkText: r.chunk_text,
      citation: r.citation,
      court: r.court,
      year: r.year,
      category: r.category,
      keywords: r.keywords,
      article: r.article,
      metadata: meta || {},
      score: Number(r.score) || 0,
    };
  }

  buildFilterArgs(filters) {
    return {
      filter_source: filters.sourceType || null,
      filter_court: filters.court || null,
      filter_category: filters.category || null,
      filter_year_from: filters.yearFrom ? Number(filters.yearFrom) : null,
      filter_year_to: filters.yearTo ? Number(filters.yearTo) : null,
    };
  }

  /**
   * True ANN vector search executed inside Postgres (uses the HNSW index).
   * Falls back to fetch-and-score only when RPC functions are unavailable.
   */
  async search(queryEmbedding, { limit = 20, filters = {}, minScore = 0 } = {}) {
    if (!this.ready) return [];
    const emb = queryEmbedding.slice(0, DIMENSION);

    if (this.rpcReady) {
      try {
        const { data, error } = await this.supabase.rpc(MATCH_FN, {
          query_embedding: emb,
          match_count: Math.min(limit, 100),
          min_score: minScore,
          ...this.buildFilterArgs(filters),
        });
        if (error) throw new Error(error.message);
        return (data || []).map(r => this.rowToResult(r));
      } catch (e) {
        console.warn(`${MATCH_FN} RPC failed (${e.message}); using fallback scan`);
        this.rpcReady = false;
      }
    }
    return this._fallbackScan(emb, { limit, filters });
  }

  /** Correct-but-heavy fallback: pull candidate embeddings, score in Node. */
  async _fallbackScan(emb, { limit, filters }) {
    const CANDIDATE_CAP = 2000;
    let query = this.supabase
      .from('rag_chunks')
      .select('id, source_type, source_id, title, chunk_text, citation, court, year, category, keywords, article, metadata')
      .limit(CANDIDATE_CAP);

    if (filters.sourceType) query = query.eq('source_type', filters.sourceType);
    if (filters.court) query = query.ilike('court', `%${filters.court}%`);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.yearFrom) query = query.gte('year', filters.yearFrom);
    if (filters.yearTo) query = query.lte('year', filters.yearTo);

    const { data, error } = await query;
    if (error) {
      console.error('pgvector fallback fetch error:', error.message);
      return [];
    }

    const candidates = (data || []).map(r => ({ ...this.rowToResult(r), score: 0 }));
    if (candidates.length === 0) return [];

    const embeddings = await this._fetchEmbeddings(candidates.map(r => r.id));
    const embMap = new Map(embeddings);

    let normEmb = 0;
    for (let i = 0; i < emb.length; i++) normEmb += emb[i] * emb[i];
    normEmb = Math.sqrt(normEmb);
    if (normEmb === 0) return [];

    for (const r of candidates) {
      const vec = embMap.get(r.id);
      if (vec) {
        let dot = 0, norm = 0;
        for (let i = 0; i < emb.length; i++) {
          dot += emb[i] * (vec[i] || 0);
          norm += (vec[i] || 0) * (vec[i] || 0);
        }
        norm = Math.sqrt(norm);
        r.score = norm === 0 ? 0 : dot / (normEmb * norm);
      }
    }
    return candidates.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Lexical (keyword) search leg of hybrid retrieval.
   * Uses Postgres FTS RPC when available, ILIKE otherwise.
   */
  async keywordSearch(queryText, { limit = 20, filters = {} } = {}) {
    if (!this.ready || !queryText) return [];

    if (this.rpcReady) {
      try {
        const { data, error } = await this.supabase.rpc(FTS_FN, {
          query_text: String(queryText).slice(0, 500),
          match_count: Math.min(limit, 100),
          ...this.buildFilterArgs(filters),
        });
        if (error) throw new Error(error.message);
        return (data || []).map(r => this.rowToResult(r));
      } catch (e) {
        console.warn(`${FTS_FN} RPC failed (${e.message}); using ILIKE fallback`);
      }
    }

    // ILIKE fallback across identity + content columns
    const p = `%${queryText.replace(/[%_]/g, '').slice(0, 120)}%`;
    let q = this.supabase
      .from('rag_chunks')
      .select('id, source_type, source_id, title, chunk_text, citation, court, year, category, keywords, article, metadata')
      .or(`citation.ilike.${p},title.ilike.${p},keywords.ilike.${p},chunk_text.ilike.${p}`)
      .limit(limit);

    if (filters.sourceType) q = q.eq('source_type', filters.sourceType);
    if (filters.court) q = q.ilike('court', `%${filters.court}%`);
    if (filters.category) q = q.eq('category', filters.category);
    if (filters.yearFrom) q = q.gte('year', filters.yearFrom);
    if (filters.yearTo) q = q.lte('year', filters.yearTo);

    const { data, error } = await q;
    if (error) return [];
    return (data || []).map(r => ({ ...this.rowToResult(r), score: 0.5 }));
  }

  async getByIds(ids) {
    if (!this.ready || !ids?.length) return [];
    const out = [];
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { data, error } = await this.supabase
        .from('rag_chunks')
        .select('id, source_type, source_id, title, chunk_text, citation, court, year, category, keywords, article, metadata')
        .in('id', chunk);
      if (!error && data) out.push(...data.map(r => this.rowToResult(r)));
    }
    return out;
  }

  async getBySourceId(sourceId) {
    if (!this.ready || !sourceId) return [];
    const { data, error } = await this.supabase
      .from('rag_chunks')
      .select('id, source_type, source_id, title, chunk_text, citation, court, year, category, keywords, article, metadata')
      .eq('source_id', sourceId);
    if (error) return [];
    return (data || []).map(r => this.rowToResult(r));
  }

  async _fetchEmbeddings(ids) {
    if (!ids.length) return [];
    const results = [];
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      try {
        const { data, error } = await this.supabase
          .from('rag_chunks')
          .select('id, embedding')
          .in('id', chunk);
        if (!error && data) results.push(...data.map(r => [r.id, r.embedding]));
      } catch {}
    }
    return results;
  }

  async count() {
    if (!this.ready) return 0;
    const { count, error } = await this.supabase
      .from('rag_chunks')
      .select('id', { count: 'exact', head: true });
    if (error) return 0;
    return count || 0;
  }

  async clear() {
    if (!this.ready) return;
    // Prefer server-side TRUNCATE via exec_sql (no REST payload).
    try {
      await this._exec('TRUNCATE TABLE rag_chunks');
      return;
    } catch {}
    // Fallback: REST delete without .select() so no row payloads come back.
    const { error } = await this.supabase.from('rag_chunks').delete().neq('id', '__none__');
    if (error) console.error('rag_chunks clear failed:', error.message);
  }
}

const pgStore = new PgVectorStore();
const memStore = new InMemoryVectorStore();
let usePg = false;

export function initVectorStore(supabaseClient, queryFn, runFn) {
  const pgReady = pgStore.init(supabaseClient, queryFn, runFn);
  usePg = pgReady;
  return usePg ? 'pgvector' : 'in-memory';
}

export function addToMemory(id, embedding, data) {
  // Accept either a chunk object ({id, title, …, metadata:{chunkKind,…}})
  // or a plain metadata object; normalizes to the same flat shape pgvector returns.
  const { metadata, ...rest } = data || {};
  const meta = Object.keys(rest).length
    ? { ...rest, ...(metadata || {}) }
    : (metadata || {});
  memStore.add(id, embedding, meta);
}

export function clearMemory() {
  memStore.clear();
}

export async function addBatchToPg(chunks) {
  return pgStore.addBatch(chunks);
}

export async function vectorSearch(queryEmbedding, options = {}) {
  if (usePg) {
    return pgStore.search(queryEmbedding, options);
  }
  return memStore.search(queryEmbedding, options);
}

export async function keywordSearch(queryText, options = {}) {
  if (usePg) return pgStore.keywordSearch(queryText, options);
  return memStore.keywordSearch(queryText, options);
}

export async function getChunksByIds(ids) {
  if (usePg) return pgStore.getByIds(ids);
  return memStore.vectors.filter(v => ids.includes(v.id)).map(v => ({ ...v.metadata, id: v.id, chunkText: v.metadata?.chunkText || '', score: 0 }));
}

export async function getChunksBySourceId(sourceId) {
  if (usePg) return pgStore.getBySourceId(sourceId);
  return memStore.vectors.filter(v => v.metadata?.sourceId === sourceId).map(v => ({ ...v.metadata, id: v.id, chunkText: v.metadata?.chunkText || '', score: 0 }));
}

export async function getChunkCount() {
  if (usePg) return pgStore.count();
  return memStore.size();
}

// Resume support: which of these chunk ids are already stored?
export async function getExistingChunkIds(ids) {
  if (!ids || ids.length === 0) return new Set();
  const found = new Set();
  if (usePg && pgStore.queryFn) {
    // Batched to keep each RPC small enough for PostgREST/exec_sql limits.
    const BATCH = 400;
    for (let i = 0; i < ids.length; i += BATCH) {
      const list = ids.slice(i, i + BATCH)
        .map(id => `'${String(id).replace(/'/g, "''")}'`)
        .join(',');
      try {
        const rows = await pgStore.queryFn(`SELECT id FROM rag_chunks WHERE id IN (${list})`);
        for (const r of rows || []) found.add(r.id);
      } catch (e) {
        console.warn('getExistingChunkIds batch failed:', e.message);
      }
    }
    return found;
  }
  return new Set(memStore.vectors.filter(v => ids.includes(v.id)).map(v => v.id));
}

export async function clearAllChunks() {
  if (usePg) await pgStore.clear();
  memStore.clear();
}

export function isPgReady() { return usePg; }
export function isRpcReady() { return usePg && pgStore.rpcReady; }
