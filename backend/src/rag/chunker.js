import { v4 as uuid } from 'uuid';

const CHUNK_SIZE = 1400;      // target characters per full-text chunk
const CHUNK_OVERLAP = 220;    // overlap between consecutive chunks
const MIN_CHUNK = 120;        // discard tiny trailing fragments

/**
 * Sentence-aware window splitter. Keeps chunks aligned to sentence
 * boundaries so retrieved passages read coherently and holdings are
 * not cut mid-thought.
 */
export function splitText(text, { size = CHUNK_SIZE, overlap = CHUNK_OVERLAP, min = MIN_CHUNK } = {}) {
  const clean = (text || '').replace(/\r/g, '').trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const sentences = clean.match(/[^.!?;।]+[.!?;।]*\s*/g) || [clean];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    // Hard-split pathological oversized sentences
    if (sentence.length > size) {
      if (current.trim()) { chunks.push(current.trim()); current = ''; }
      for (let i = 0; i < sentence.length; i += size - overlap) {
        const piece = sentence.slice(i, i + size);
        if (piece.trim().length >= min) chunks.push(piece.trim());
      }
      continue;
    }
    if ((current + sentence).length > size && current.trim()) {
      chunks.push(current.trim());
      // start next chunk with tail overlap of previous one
      const tail = current.slice(Math.max(0, current.length - overlap));
      current = tail + sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim().length >= min) chunks.push(current.trim());

  return chunks;
}

function caseHeader(c) {
  const parts = [];
  if (c.title) parts.push(`Case: ${c.title}`);
  if (c.parties) parts.push(`Parties: ${c.parties}`);
  if (c.citation) parts.push(`Citation: ${c.citation}`);
  if (c.court) parts.push(`Court: ${c.court}`);
  if (c.year) parts.push(`Year: ${c.year}`);
  if (c.category) parts.push(`Category: ${c.category}`);
  return parts.join('\n');
}

function caseMeta(c) {
  return {
    parties: c.parties || '',
    relevantStatutes: c.relevant_statutes || '',
    description: c.description || '',
    pdfUrl: c.pdf_url || '',
    sourceRef: c.source_ref || '',
  };
}

function baseChunk(c, id, chunkText, extra = {}) {
  return {
    id,
    sourceType: 'case',
    sourceId: c.id || '',
    title: c.title || '',
    chunkText,
    citation: c.citation || '',
    court: c.court || '',
    year: Number(c.year) || 0,
    category: c.category || '',
    keywords: c.keywords || '',
    metadata: { ...caseMeta(c), ...extra },
  };
}

/**
 * Chunk a case into multiple retrieval units:
 *  - `{id}-s`   summary chunk (metadata: title, parties, citation, description, keywords, statutes)
 *  - `{id}-h`   holding chunk(s) built from "held that ..." passages when detectable
 *  - `{id}-1..N` overlapping full-text windows, each carrying the case header
 * Returns [] only when the case has no usable content at all.
 */
export function chunkCase(c) {
  const chunks = [];

  // ── Summary / catalog chunk ────────────────────────────────
  const parts = [];
  const header = caseHeader(c);
  if (header) parts.push(header);
  if (c.description) parts.push(`Description: ${c.description}`);
  if (c.keywords) parts.push(`Keywords: ${c.keywords}`);
  if (c.relevant_statutes) parts.push(`Relevant Statutes: ${c.relevant_statutes}`);

  const hasFullText = !!(c.full_text && c.full_text.trim());
  if (!parts.join('\n').trim() && !hasFullText) return chunks;

  chunks.push(baseChunk(c, `case-${c.id || uuid()}-s`, parts.join('\n'), { chunkKind: 'summary' }));

  // ── Holding chunk(s): Pakistani judgments mark holdings explicitly ──
  if (hasFullText) {
    const holdingMatches = [...c.full_text.matchAll(/\b(?:it\s+is\s+held|he\s+held|she\s+held|they\s+held|their\s+Lordships?\s+held|held\s+that)\b/gi)];
    const seen = new Set();
    let hIdx = 0;
    for (const m of holdingMatches.slice(0, 5)) {
      const start = Math.max(0, m.index - 100);
      const snippet = c.full_text.slice(start, Math.min(c.full_text.length, m.index + 900)).replace(/\s+/g, ' ').trim();
      const key = snippet.slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      chunks.push(baseChunk(
        c,
        `case-${c.id || uuid()}-h${hIdx++}`,
        `${header}\nHolding excerpt:\n${snippet}`,
        { chunkKind: 'holding' }
      ));
    }

    // ── Full-text windows ────────────────────────────────────
    const windows = splitText(c.full_text);
    windows.forEach((w, i) => {
      chunks.push(baseChunk(
        c,
        `case-${c.id || uuid()}-${i + 1}`,
        `${header}\nExcerpt (${i + 1}/${windows.length}):\n${w}`,
        { chunkKind: 'fulltext', chunkIndex: i + 1, chunkTotal: windows.length }
      ));
    });
  }

  return chunks;
}

export function chunkConstitutionArticle(a) {
  const headerParts = ['Constitution of Pakistan 1973'];
  if (a.part) headerParts.push(`Part ${a.part}: ${a.part_title || ''}`);
  if (a.chapter) headerParts.push(`Chapter ${a.chapter}: ${a.chapter_title || ''}`);
  if (a.article) headerParts.push(`Article ${a.article}`);
  if (a.title) headerParts.push(`Title: ${a.title}`);
  const header = headerParts.join('\n');

  const body = a.content || '';
  if (!body.trim() && !a.title) return [];

  const windows = splitText(body, { size: CHUNK_SIZE * 1.4 });
  const chunks = windows.map((w, i) => ({
    id: `const-${a.id || a.article || uuid()}${windows.length > 1 ? `-${i + 1}` : ''}`,
    sourceType: 'constitution',
    sourceId: a.id || '',
    title: `Article ${a.article}: ${a.title || ''}`,
    chunkText: `${header}\nContent: ${w}`,
    citation: `Article ${a.article} of the Constitution of Pakistan, 1973`,
    court: 'Constitution of Pakistan',
    year: 1973,
    category: a.category || 'Constitutional',
    article: a.article || '',
    keywords: `constitution article ${a.article} ${a.title || ''} ${a.part_title || ''}`,
    metadata: {
      part: a.part || '',
      partTitle: a.part_title || '',
      chapter: a.chapter || '',
      chapterTitle: a.chapter_title || '',
      chunkKind: 'constitution',
      chunkIndex: i + 1,
      chunkTotal: windows.length,
    },
  }));
  return chunks;
}

export function chunkLegalTopic(topic) {
  return [{
    id: `topic-${topic.id || uuid()}`,
    sourceType: 'topic',
    sourceId: topic.id || uuid(),
    title: topic.title || '',
    chunkText: `${topic.title || ''}\n${topic.content || ''}`,
    citation: topic.citation || '',
    court: topic.court || '',
    year: topic.year || 0,
    category: topic.category || '',
    keywords: topic.keywords || '',
    metadata: { type: 'legal-topic' },
  }];
}
