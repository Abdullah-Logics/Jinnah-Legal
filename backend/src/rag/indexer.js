import { embedBatch, getResolvedModel } from './embedder.js';
import { chunkCase, chunkConstitutionArticle } from './chunker.js';
import {
  addToMemory, addBatchToPg, clearAllChunks, isPgReady, getExistingChunkIds,
} from './vector-store.js';

const BATCH_SIZE = 40;

async function persistChunks(chunks, embeddings) {
  if (isPgReady()) {
    const pgChunks = chunks
      .map((c, i) => ({ ...c, embedding: embeddings[i] }))
      .filter(c => c.embedding && c.embedding.some(v => v !== 0));
    for (let i = 0; i < pgChunks.length; i += BATCH_SIZE) {
      await addBatchToPg(pgChunks.slice(i, i + BATCH_SIZE));
    }
    return pgChunks.length;
  }
  chunks.forEach((c, i) => {
    const emb = embeddings[i];
    if (!emb || emb.every(v => v === 0)) return;
    addToMemory(c.id, emb, {
      sourceType: c.sourceType, sourceId: c.sourceId, title: c.title,
      citation: c.citation, court: c.court, year: c.year, category: c.category,
      keywords: c.keywords, article: c.article, metadata: c.metadata,
      chunkText: c.chunkText,
    });
  });
  return chunks.length;
}

// Embed + persist in small slices so progress lands incrementally and a
// crash mid-run never loses more than one slice of work.
const EMBED_SLICE = 100;

async function embedAndPersist(chunks, { log, label = '' } = {}) {
  // Skip chunks already stored (idempotent resume after restarts/redeploys)
  const existing = await getExistingChunkIds(chunks.map(c => c.id));
  const fresh = existing.size ? chunks.filter(c => !existing.has(c.id)) : chunks;
  if (existing.size && log) log(`  ${label}: skipping ${existing.size} already-indexed chunks`);
  if (fresh.length === 0) return 0;

  let stored = 0;
  for (let i = 0; i < fresh.length; i += EMBED_SLICE) {
    const slice = fresh.slice(i, i + EMBED_SLICE);
    const embeddings = await embedBatch(slice.map(c => c.chunkText), { taskType: 'RETRIEVAL_DOCUMENT' });
    stored += await persistChunks(slice, embeddings);
    if (log) log(`  ${label}: persisted ${stored}/${fresh.length} new chunks`);
  }
  return stored;
}

export async function indexAllCases(queryFn, { log = console.log } = {}) {
  log('Starting case indexing...');
  const startTime = Date.now();
  let total = 0;
  let offset = 0;
  const limit = 300;

  const countRow = await queryFn('SELECT COUNT(*) as c FROM citations');
  const totalCases = Number(countRow?.[0]?.c || countRow?.c || 0);
  log(`Found ${totalCases} cases to index`);

  while (true) {
    const rows = await queryFn(
      `SELECT id, title, citation, court, year, parties, category, description, keywords, relevant_statutes, full_text, pdf_url, metadata
       FROM citations ORDER BY created_at ASC LIMIT ${limit} OFFSET ${offset}`
    );
    if (!rows || rows.length === 0) break;

    // Multi-chunk expansion: each case may produce summary + holding + N full-text chunks
    const chunks = rows.flatMap(chunkCase).filter(Boolean);
    if (chunks.length > 0) {
      total += await embedAndPersist(chunks, {
        log,
        label: `cases ${offset + 1}-${offset + rows.length}`,
      });
      log(`Progress: ${Math.min(offset + rows.length, totalCases)}/${totalCases} cases, ${total} chunks stored`);
    }
    offset += limit;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`Case indexing complete: ${total} chunks in ${elapsed}s`);
  return { total, elapsed, mode: isPgReady() ? 'pgvector' : 'in-memory' };
}

export async function indexConstitution(queryFn, { log = console.log } = {}) {
  log('Starting constitution indexing...');
  const startTime = Date.now();

  const rows = await queryFn(
    "SELECT id, part, part_title, chapter, chapter_title, article, title, content, category FROM constitution ORDER BY CAST(regexp_replace(article, '[^0-9]', '', 'g') AS INTEGER) ASC, article ASC"
  );
  if (!rows || rows.length === 0) return { total: 0, elapsed: 0 };

  const chunks = rows.flatMap(chunkConstitutionArticle).filter(Boolean);
  log(`Embedding ${chunks.length} constitution chunks...`);
  const stored = await embedAndPersist(chunks, { log, label: 'constitution' });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`Constitution indexing complete: ${stored} chunks in ${elapsed}s`);
  return { total: stored, elapsed, mode: isPgReady() ? 'pgvector' : 'in-memory' };
}

export async function indexAll(queryFn, { log = console.log } = {}) {
  log('=== Starting full RAG indexing ===');
  const startTime = Date.now();
  await clearAllChunks();

  const constitution = await indexConstitution(queryFn, { log });
  const cases = await indexAllCases(queryFn, { log });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total = constitution.total + cases.total;
  log(`=== Full indexing complete: ${total} chunks in ${elapsed}s ===`);

  return {
    total,
    cases: cases.total,
    constitution: constitution.total,
    elapsed,
    mode: isPgReady() ? 'pgvector' : 'in-memory',
  };
}

/** Incremental re-index of one case (after edit/create). */
export async function indexSingleCase(caseId, queryFn) {
  const row = await queryFn(
    `SELECT id, title, citation, court, year, parties, category, description, keywords, relevant_statutes, full_text, pdf_url, metadata
     FROM citations WHERE id = '${String(caseId).replace(/'/g, "''")}'`
  );
  if (!row || row.length === 0) return { indexed: 0 };
  const chunks = chunkCase(row[0]).filter(Boolean);
  if (chunks.length === 0) return { indexed: 0 };
  const embeddings = await embedBatch(chunks.map(c => c.chunkText), { taskType: 'RETRIEVAL_DOCUMENT' });
  const stored = await persistChunks(chunks, embeddings);
  return { indexed: stored };
}

export async function getIndexStatus(queryFn) {
  let count = 0;
  let mode = isPgReady() ? 'pgvector' : 'in-memory';

  if (isPgReady()) {
    try {
      const rows = await queryFn('SELECT COUNT(*) as c FROM rag_chunks');
      count = Number(rows?.[0]?.c || rows?.c || 0);
    } catch { count = 0; }
  }

  let citationCount = 0;
  try {
    const rows = await queryFn('SELECT COUNT(*) as c FROM citations');
    citationCount = Number(rows?.[0]?.c || rows?.c || 0);
  } catch {}

  let constitutionCount = 0;
  try {
    const rows = await queryFn('SELECT COUNT(*) as c FROM constitution');
    constitutionCount = Number(rows?.[0]?.c || rows?.c || 0);
  } catch {}

  let fullTextCount = 0;
  try {
    const rows = await queryFn("SELECT COUNT(*) as c FROM citations WHERE full_text IS NOT NULL AND full_text != ''");
    fullTextCount = Number(rows?.[0]?.c || rows?.c || 0);
  } catch {}

  return {
    indexed: count,
    mode,
    citations: citationCount,
    constitution: constitutionCount,
    withFullText: fullTextCount,
    embeddingModel: getResolvedModel(),
  };
}
