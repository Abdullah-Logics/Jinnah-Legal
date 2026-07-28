import { embedText } from './embedder.js';
import { vectorSearch } from './vector-store.js';

export async function semanticSearch(query, options = {}) {
  const { limit = 20, sourceType, court, category, yearFrom, yearTo } = options;
  const embedding = await embedText(query);
  if (!embedding || embedding.every(v => v === 0)) return [];

  const filters = {};
  if (sourceType) filters.sourceType = sourceType;
  if (court) filters.court = court;
  if (category) filters.category = category;
  if (yearFrom) filters.yearFrom = yearFrom;
  if (yearTo) filters.yearTo = yearTo;

  return vectorSearch(embedding, { limit, filters });
}

export async function hybridSearch(query, options = {}) {
  const semanticResults = await semanticSearch(query, { limit: options.limit || 10, ...options });

  const formatted = semanticResults.map(r => {
    const score = (r.score || 0).toFixed(3);
    return `[${score}] ${r.sourceType === 'constitution' ? `Article ${r.article}` : r.citation || 'Case'}: ${r.title}\n${r.chunkText}`;
  });

  return {
    query,
    results: semanticResults,
    context: formatted.join('\n\n---\n\n'),
    count: semanticResults.length,
  };
}

export function buildRAGContext(searchResults) {
  if (!searchResults.results || searchResults.results.length === 0) {
    return 'No relevant results found in the legal database.';
  }

  const caseResults = searchResults.results.filter(r => r.sourceType === 'case');
  const constResults = searchResults.results.filter(r => r.sourceType === 'constitution');

  const parts = [];

  if (caseResults.length > 0) {
    parts.push('RELEVANT CASE LAW:');
    caseResults.forEach((r, i) => {
      const score = (r.score * 100).toFixed(1);
      parts.push(`[${i + 1}] ${r.citation || 'No citation'} - ${r.title} (${r.court}, ${r.year})`);
      if (r.metadata?.description) parts.push(`    ${r.metadata.description}`);
      if (r.keywords) parts.push(`    Keywords: ${r.keywords}`);
      parts.push(`    Relevance: ${score}%`);
      parts.push('');
    });
  }

  if (constResults.length > 0) {
    parts.push('RELEVANT CONSTITUTIONAL PROVISIONS:');
    constResults.forEach((r, i) => {
      parts.push(`[${i + 1}] Article ${r.article}: ${r.title}`);
      const chunkParts = r.chunkText.split('\n');
      const contentLine = chunkParts.find(l => l.startsWith('Content:'));
      if (contentLine) parts.push(`    ${contentLine.replace('Content: ', '')}`);
      parts.push(`    Category: ${r.category}`);
      parts.push('');
    });
  }

  return parts.join('\n');
}
