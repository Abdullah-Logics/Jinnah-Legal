import { v4 as uuid } from 'uuid';

export function chunkCase(c) {
  const parts = [];
  if (c.title) parts.push(`Case: ${c.title}`);
  if (c.parties) parts.push(`Parties: ${c.parties}`);
  if (c.citation) parts.push(`Citation: ${c.citation}`);
  if (c.court) parts.push(`Court: ${c.court}`);
  if (c.year) parts.push(`Year: ${c.year}`);
  if (c.category) parts.push(`Category: ${c.category}`);
  if (c.description) parts.push(`Description: ${c.description}`);
  if (c.keywords) parts.push(`Keywords: ${c.keywords}`);
  if (c.relevant_statutes) parts.push(`Relevant Statutes: ${c.relevant_statutes}`);

  const text = parts.join('\n');
  if (!text.trim()) return null;

  return {
    id: `case-${c.id || uuid()}`,
    sourceType: 'case',
    sourceId: c.id || '',
    title: c.title || '',
    chunkText: text,
    citation: c.citation || '',
    court: c.court || '',
    year: c.year || 0,
    category: c.category || '',
    keywords: c.keywords || '',
    metadata: {
      parties: c.parties || '',
      relevantStatutes: c.relevant_statutes || '',
      description: c.description || '',
    },
  };
}

export function chunkConstitutionArticle(a) {
  const parts = [];
  parts.push(`Constitution of Pakistan 1973`);
  if (a.part) parts.push(`Part ${a.part}: ${a.part_title || ''}`);
  if (a.chapter) parts.push(`Chapter ${a.chapter}: ${a.chapter_title || ''}`);
  if (a.article) parts.push(`Article ${a.article}`);
  if (a.title) parts.push(`Title: ${a.title}`);
  if (a.content) parts.push(`Content: ${a.content}`);
  if (a.category) parts.push(`Category: ${a.category}`);

  const text = parts.join('\n');
  if (!text.trim()) return null;

  return {
    id: `const-${a.id || a.article || uuid()}`,
    sourceType: 'constitution',
    sourceId: a.id || '',
    title: `Article ${a.article}: ${a.title || ''}`,
    chunkText: text,
    citation: `Article ${a.article} of the Constitution of Pakistan, 1973`,
    court: 'Constitution of Pakistan',
    year: 1973,
    category: a.category || 'Constitutional',
    article: a.article || '',
    keywords: `constitution article ${a.article} ${a.title || ''}`,
    metadata: {
      part: a.part || '',
      partTitle: a.part_title || '',
      chapter: a.chapter || '',
      chapterTitle: a.chapter_title || '',
    },
  };
}

export function chunkLegalTopic(topic) {
  return {
    id: `topic-${uuid()}`,
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
  };
}
