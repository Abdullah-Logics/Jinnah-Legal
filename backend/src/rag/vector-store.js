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
    this.supabase = null;
    this.queryFn = null;
    this.runFn = null;
    this.ready = false;
  }

  init(supabaseClient, queryFn, runFn) {
    this.supabase = supabaseClient;
    this.queryFn = queryFn;
    this.runFn = runFn;
    if (supabaseClient) {
      this.ready = true;
      console.log('pgvector store initialized (via Supabase REST API)');
    }
    return this.ready;
  }

  async addBatch(chunks) {
    if (!this.ready || chunks.length === 0) return false;
    const rows = chunks.map(c => ({
      id: c.id,
      source_type: c.sourceType,
      source_id: c.sourceId || '',
      title: c.title || '',
      chunk_text: c.chunkText,
      citation: c.citation || '',
      court: c.court || '',
      year: c.year || 0,
      category: c.category || '',
      keywords: c.keywords || '',
      article: c.article || '',
      metadata: JSON.stringify(c.metadata || {}),
      embedding: c.embedding.slice(0, DIMENSION),
    }));
    const { error } = await this.supabase
      .from('rag_chunks')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });
    if (error) {
      console.error('pgvector batch insert error:', error.message);
      throw error;
    }
    return true;
  }

  async search(queryEmbedding, { limit = 20, filters = {} } = {}) {
    if (!this.ready) return [];
    const emb = queryEmbedding.slice(0, DIMENSION);
    let query = this.supabase
      .from('rag_chunks')
      .select('id, source_type, source_id, title, chunk_text, citation, court, year, category, keywords, article, metadata')
      .limit(limit);

    if (filters.sourceType) query = query.eq('source_type', filters.sourceType);
    if (filters.court) query = query.ilike('court', `%${filters.court}%`);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.yearFrom) query = query.gte('year', filters.yearFrom);
    if (filters.yearTo) query = query.lte('year', filters.yearTo);

    const { data, error } = await query;
    if (error) {
      console.error('pgvector search fetch error:', error.message);
      return [];
    }

    const scored = (data || []).map(r => {
      const score = 0;
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
        metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {}),
        score,
      };
    });

    if (scored.length === 0) return scored;

    const embeddings = await this._fetchEmbeddings(scored.map(r => r.id));
    const embMap = new Map(embeddings);

    let normEmb = 0;
    for (let i = 0; i < emb.length; i++) normEmb += emb[i] * emb[i];
    normEmb = Math.sqrt(normEmb);
    if (normEmb === 0) return scored;

    for (const r of scored) {
      const vec = embMap.get(r.id);
      if (vec) {
        let dot = 0, norm = 0;
        for (let i = 0; i < emb.length; i++) {
          dot += emb[i] * (vec[i] || 0);
          norm += (vec[i] || 0) * (vec[i] || 0);
        }
        norm = Math.sqrt(norm);
        r.score = norm === 0 ? 0 : dot / (normEmb * norm);
      } else {
        r.score = 0;
      }
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async _fetchEmbeddings(ids) {
    if (!ids.length) return [];
    const chunkSize = 100;
    const results = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
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
    await this.supabase.from('rag_chunks').delete().neq('id', '');
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
