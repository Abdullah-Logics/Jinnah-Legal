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

  size() { return this.vectors.length; }
}

class PgVectorStore {
  constructor() {
    this.queryFn = null;
    this.runFn = null;
    this.ready = false;
  }

  async init(queryFn, runFn) {
    this.queryFn = queryFn;
    this.runFn = runFn;
    try {
      await runFn(`CREATE EXTENSION IF NOT EXISTS vector`);
      await runFn(`
        CREATE TABLE IF NOT EXISTS rag_chunks (
          id TEXT PRIMARY KEY,
          source_type TEXT NOT NULL,
          source_id TEXT,
          title TEXT DEFAULT '',
          chunk_text TEXT NOT NULL,
          citation TEXT DEFAULT '',
          court TEXT DEFAULT '',
          year INTEGER DEFAULT 0,
          category TEXT DEFAULT '',
          keywords TEXT DEFAULT '',
          article TEXT DEFAULT '',
          metadata TEXT DEFAULT '{}',
          embedding vector(${DIMENSION}),
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      try {
        await runFn(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding ON rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`);
      } catch {
        try {
          await runFn(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding ON rag_chunks USING hnsw (embedding vector_cosine_ops)`);
        } catch (e) {
          console.warn('Vector index creation warning:', e.message);
        }
      }
      await runFn(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_type ON rag_chunks(source_type)`);
      await runFn(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_court ON rag_chunks(court)`);
      await runFn(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_year ON rag_chunks(year)`);
      this.ready = true;
      console.log('pgvector store initialized');
    } catch (err) {
      console.warn('pgvector not available, using in-memory fallback:', err.message);
      this.ready = false;
    }
  }

  async addBatch(chunks) {
    if (!this.ready) return false;
    for (const c of chunks) {
      const embStr = `[${c.embedding.slice(0, DIMENSION).join(',')}]`;
      await this.runFn(
        `INSERT INTO rag_chunks (id, source_type, source_id, title, chunk_text, citation, court, year, category, keywords, article, metadata, embedding)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?::vector)
         ON CONFLICT (id) DO UPDATE SET chunk_text=EXCLUDED.chunk_text, embedding=EXCLUDED.embedding, title=EXCLUDED.title`,
        [c.id, c.sourceType, c.sourceId || '', c.title || '', c.chunkText, c.citation || '', c.court || '', c.year || 0, c.category || '', c.keywords || '', c.article || '', JSON.stringify(c.metadata || {}), embStr]
      );
    }
    return true;
  }

  async search(queryEmbedding, { limit = 20, filters = {} } = {}) {
    if (!this.ready) return [];
    const embStr = `[${queryEmbedding.slice(0, DIMENSION).join(',')}]`;
    let sql = `SELECT id, source_type, source_id, title, chunk_text, citation, court, year, category, keywords, article, metadata,
               1 - (embedding <=> ?::vector) as score
               FROM rag_chunks WHERE 1=1`;
    const params = [embStr];

    if (filters.sourceType) {
      sql += ` AND source_type = ?`;
      params.push(filters.sourceType);
    }
    if (filters.court) {
      sql += ` AND court ILIKE ?`;
      params.push(`%${filters.court}%`);
    }
    if (filters.category) {
      sql += ` AND category = ?`;
      params.push(filters.category);
    }
    if (filters.yearFrom) {
      sql += ` AND year >= ?`;
      params.push(filters.yearFrom);
    }
    if (filters.yearTo) {
      sql += ` AND year <= ?`;
      params.push(filters.yearTo);
    }

    sql += ` ORDER BY embedding <=> ?::vector LIMIT ?`;
    params.push(embStr, limit);

    try {
      const rows = await this.queryFn(sql, params);
      return (rows || []).map(r => ({
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
        metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
        score: r.score,
      }));
    } catch (err) {
      console.error('pgvector search error:', err.message);
      return [];
    }
  }

  async count() {
    if (!this.ready) return 0;
    try {
      const rows = await this.queryFn('SELECT COUNT(*) as c FROM rag_chunks');
      return Number(rows?.[0]?.c || 0);
    } catch { return 0; }
  }

  async clear() {
    if (!this.ready) return;
    await this.runFn('DELETE FROM rag_chunks');
  }
}

const pgStore = new PgVectorStore();
const memStore = new InMemoryVectorStore();
let usePg = false;

export async function initVectorStore(queryFn, runFn) {
  await pgStore.init(queryFn, runFn);
  usePg = pgStore.ready;
  return usePg ? 'pgvector' : 'in-memory';
}

export function addToMemory(id, embedding, metadata) {
  memStore.add(id, embedding, metadata);
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

export async function getChunkCount() {
  if (usePg) return pgStore.count();
  return memStore.size();
}

export async function clearAllChunks() {
  if (usePg) await pgStore.clear();
  memStore.clear();
}

export function isPgReady() { return usePg; }
