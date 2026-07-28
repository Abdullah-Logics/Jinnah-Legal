import { embedBatch } from './embedder.js';
import { chunkCase, chunkConstitutionArticle } from './chunker.js';
import { addToMemory, addBatchToPg, clearAllChunks, isPgReady } from './vector-store.js';

const BATCH_SIZE = 50;

export async function indexAllCases(queryFn) {
  console.log('Starting case indexing...');
  const startTime = Date.now();
  let total = 0;

  const countRow = await queryFn('SELECT COUNT(*) as c FROM citations');
  const totalCases = Number(countRow?.[0]?.c || 0);
  console.log(`Found ${totalCases} cases to index`);

  let offset = 0;
  const limit = 500;

  while (true) {
    const rows = await queryFn(
      `SELECT id, title, citation, court, year, parties, category, description, keywords, relevant_statutes, full_text
       FROM citations ORDER BY created_at ASC LIMIT ${limit} OFFSET ${offset}`
    );
    if (!rows || rows.length === 0) break;

    const chunks = rows.map(chunkCase).filter(Boolean);
    if (chunks.length === 0) { offset += limit; continue; }

    const texts = chunks.map(c => c.chunkText);
    const embeddings = await embedBatch(texts);

    if (isPgReady()) {
      const pgChunks = chunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
      for (let i = 0; i < pgChunks.length; i += BATCH_SIZE) {
        await addBatchToPg(pgChunks.slice(i, i + BATCH_SIZE));
      }
    } else {
      chunks.forEach((c, i) => addToMemory(c.id, embeddings[i], {
        sourceType: c.sourceType, sourceId: c.sourceId, title: c.title,
        citation: c.citation, court: c.court, year: c.year, category: c.category,
        keywords: c.keywords, article: c.article, metadata: c.metadata,
      }));
    }

    total += chunks.length;
    console.log(`Indexed ${total}/${totalCases} cases...`);
    offset += limit;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Case indexing complete: ${total} chunks in ${elapsed}s`);
  return { total, elapsed, mode: isPgReady() ? 'pgvector' : 'in-memory' };
}

export async function indexConstitution(queryFn) {
  console.log('Starting constitution indexing...');
  const startTime = Date.now();

  const rows = await queryFn('SELECT id, part, part_title, chapter, chapter_title, article, title, content, category FROM constitution ORDER BY CAST(regexp_replace(article, \'[^0-9]\', \'\', \'g\') AS INTEGER) ASC, article ASC');
  if (!rows || rows.length === 0) return { total: 0, elapsed: 0 };

  const chunks = rows.map(chunkConstitutionArticle).filter(Boolean);
  console.log(`Embedding ${chunks.length} constitution articles...`);

  const texts = chunks.map(c => c.chunkText);
  const embeddings = await embedBatch(texts);

  if (isPgReady()) {
    const pgChunks = chunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
    for (let i = 0; i < pgChunks.length; i += BATCH_SIZE) {
      await addBatchToPg(pgChunks.slice(i, i + BATCH_SIZE));
    }
  } else {
    chunks.forEach((c, i) => addToMemory(c.id, embeddings[i], {
      sourceType: c.sourceType, sourceId: c.sourceId, title: c.title,
      citation: c.citation, court: c.court, year: c.year, category: c.category,
      keywords: c.keywords, article: c.article, metadata: c.metadata,
    }));
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Constitution indexing complete: ${chunks.length} articles in ${elapsed}s`);
  return { total: chunks.length, elapsed, mode: isPgReady() ? 'pgvector' : 'in-memory' };
}

export async function indexAll(queryFn) {
  console.log('=== Starting full RAG indexing ===');
  const startTime = Date.now();
  await clearAllChunks();

  const constitution = await indexConstitution(queryFn);
  const cases = await indexAllCases(queryFn);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total = constitution.total + cases.total;
  console.log(`=== Full indexing complete: ${total} chunks in ${elapsed}s ===`);

  return {
    total,
    cases: cases.total,
    constitution: constitution.total,
    elapsed,
    mode: isPgReady() ? 'pgvector' : 'in-memory',
  };
}

export async function getIndexStatus(queryFn) {
  let count = 0;
  let mode = isPgReady() ? 'pgvector' : 'in-memory';

  if (isPgReady()) {
    try {
      const rows = await queryFn('SELECT COUNT(*) as c FROM rag_chunks');
      count = Number(rows?.[0]?.c || 0);
    } catch { count = 0; }
  }

  let citationCount = 0;
  try {
    const rows = await queryFn('SELECT COUNT(*) as c FROM citations');
    citationCount = Number(rows?.[0]?.c || 0);
  } catch {}

  let constitutionCount = 0;
  try {
    const rows = await queryFn('SELECT COUNT(*) as c FROM constitution');
    constitutionCount = Number(rows?.[0]?.c || 0);
  } catch {}

  return { indexed: count, mode, citations: citationCount, constitution: constitutionCount };
}
