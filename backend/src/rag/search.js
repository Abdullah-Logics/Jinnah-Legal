import { embedText } from './embedder.js';
import { vectorSearch, keywordSearch } from './vector-store.js';

// ── Pakistani legal query expansion ───────────────────────────
const LEGAL_SYNONYMS = {
  bail: ['interim bail', 'pre-arrest bail', 'post-arrest bail', 'section 497 CrPC', 'section 498 CrPC', 'gratuitous relief'],
  arrest: ['arrest without warrant', 'section 54 CrPC', 'illegal detention', 'habeas corpus'],
  murder: ['qatl-e-amd', 'section 302 PPC', 'qisas', 'diyat', 'intentional homicide'],
  'honor killing': ['siyah kari', 'section 311 PPC', 'fasad-fil-arz'],
  blasphemy: ['section 295-C PPC', 'section 295 PPC', 'defiling Quran', 'prophet Muhammad'],
  divorce: ['talaq', 'khula', 'dissolution of marriage', 'Muslim Family Laws Ordinance'],
  custody: ['guardianship', 'welfare of minor', 'Guardians and Wards Act', 'hzanat'],
  adoption: ['kafala', 'guardianship', 'child custody', 'Guardians and Wards Act', 'welfare of minor', 'orphans'],
  guardianship: ['custody of minor', 'Guardians and Wards Act', 'welfare principle', 'kafala'],
  maintenance: ['nafaqa', 'family court', 'MFLO'],
  dower: ['mahr', 'haq mehr', 'dowry'],
  inheritance: ['succession', 'wirasat', 'shares of heirs', 'Muslim personal law'],
  property: ['immovable property', 'title dispute', 'possession', 'specific performance', 'Transfer of Property Act'],
  fraud: ['cheating', 'section 420 PPC', 'criminal breach of trust', 'section 406 PPC'],
  corruption: ['NAB', 'accountability', 'misuse of authority', 'National Accountability Ordinance'],
  narcotics: ['drugs', 'CNSA', 'Control of Narcotic Substances Act', 'recovery of narcotics'],
  terrorism: ['ATA', 'Anti-Terrorism Act', 'military courts'],
  contempt: ['contempt of court', 'scandalizing court'],
  election: ['disqualification', 'Article 62', 'Article 63', 'Returning Officer', 'Elections Act'],
  'fundamental rights': ['fundamental freedoms', 'Articles 8 to 28', 'enforceable rights'],
  environment: ['right to clean environment', 'Article 9', 'climate change', 'public nuisance'],
  'due process': ['fair trial', 'Article 10-A', 'natural justice', 'audi alteram partem'],
  'double jeopardy': ['autrefois acquit', 'Article 13'],
  speech: ['freedom of expression', 'Article 19', 'reasonable restriction'],
  assembly: ['freedom of assembly', 'Article 16', 'public gathering'],
  association: ['freedom of association', 'Article 17'],
  information: ['right to information', 'Article 19-A'],
  education: ['right to education', 'Article 25-A'],
  'service termination': ['removal from service', 'departmental inquiry', 'Civil Servants Act', 'Service Tribunal'],
  contract: ['agreement', 'breach of contract', 'Contract Act 1872', 'damages'],
  banking: ['bank recovery', 'Banking Courts', 'Financial Institutions Recovery Ordinance'],
  tax: ['income tax', 'sales tax', 'FBR', 'taxation appeal', 'reference'],
  company: ['company law', 'winding up', 'Companies Act', 'oppression of minority'],
  'specific performance': ['contract enforcement', 'possessory decree'],
  limitation: ['limitation period', 'Limitation Act', 'condonation of delay'],
  injunction: ['stay order', 'temporary injunction', 'Order 39 CPC'],
  jurisdiction: ['pecuniary jurisdiction', 'territorial jurisdiction', 'subject matter jurisdiction'],
  writ: ['certiorari', 'mandamus', 'prohibition', 'quo warranto', 'judicial review'],
};

const FULL_CITATION_RE = /\b\d{4}\s*(?:SCMR|PLD|PCr?\.?\s?LJ|CLC|MLD|YLR|PTD|CLD|SCC|PLC|PLJ|NLR|CLR|TLC|SHC|CRM|SCP|LHC|PHC|FSC|PTCL|SLJ|TAX)\s+\d{1,6}\b/gi;
const ARTICLE_RE = /\barticle\s+(\d{1,3}[A-Z]?)\b/gi;

const COURT_WEIGHTS = [
  [/supreme court|scmr\b/i, 1.0],
  [/federal shariat/i, 0.82],
  [/high court|shc\b|lhc\b|phc\b|bhc\b|ihc\b/i, 0.85],
];

function expandQuery(query) {
  const lower = (query || '').toLowerCase();
  const additions = new Set();
  for (const [key, syns] of Object.entries(LEGAL_SYNONYMS)) {
    const words = key.split(' ');
    if (words.every(w => lower.includes(w))) {
      for (const s of syns) additions.add(s);
    }
  }
  return [...additions].slice(0, 6);
}

function detectCitations(query) {
  if (!query) return [];
  const matches = query.match(FULL_CITATION_RE) || [];
  return [...new Set(matches.map(m => m.replace(/\s+/g, ' ').trim()))];
}

function detectArticles(query) {
  if (!query) return [];
  const out = [];
  for (const m of (query.matchAll(ARTICLE_RE))) out.push(m[1]);
  return [...new Set(out)];
}

function courtWeight(court) {
  if (!court) return 0.6;
  for (const [re, w] of COURT_WEIGHTS) if (re.test(court)) return w;
  return 0.6;
}

function recencyBoost(year) {
  const y = Number(year) || 0;
  if (!y) return 0;
  const now = new Date().getFullYear();
  const frac = Math.max(0, Math.min(1, (y - 1973) / Math.max(1, now - 1973)));
  return frac * 0.06;
}

/** Reciprocal-rank-fusion score across result lists. */
function rrfScore(lists, id, k = 60) {
  let s = 0;
  for (const list of lists) {
    const idx = list.findIndex(r => r.id === id);
    if (idx >= 0) s += 1 / (k + idx + 1);
  }
  return s;
}

export async function semanticSearch(query, options = {}) {
  const { limit = 20, sourceType, court, category, yearFrom, yearTo } = options;
  const embedding = await embedText(query, { taskType: 'RETRIEVAL_QUERY' });
  if (!embedding || embedding.every(v => v === 0)) return [];

  const filters = {};
  if (sourceType) filters.sourceType = sourceType;
  if (court) filters.court = court;
  if (filters.court && /supreme/i.test(court)) filters.court = 'Supreme Court';
  if (category) filters.category = category;
  if (yearFrom) filters.yearFrom = yearFrom;
  if (yearTo) filters.yearTo = yearTo;

  return vectorSearch(embedding, { limit, filters });
}

/**
 * True hybrid retrieval:
 *   1. query expansion (Pakistani legal synonyms)
 *   2. parallel semantic (pgvector ANN) + lexical (Postgres FTS) searches
 *   3. direct fetches for any explicitly cited cases / articles
 *   4. reciprocal-rank fusion + weighted reranking
 *   5. per-case diversity cap so one case doesn't flood results
 */
export async function hybridSearch(query, options = {}) {
  const {
    limit = 10,
    sourceType,
    category,
    court,
    yearFrom,
    yearTo,
    perCase = 2,
    expansion = true,
  } = options;

  const filters = {};
  if (sourceType) filters.sourceType = sourceType;
  if (court) filters.court = court;
  if (category) filters.category = category;
  if (yearFrom) filters.yearFrom = yearFrom;
  if (yearTo) filters.yearTo = yearTo;

  const citedCases = detectCitations(query);
  const citedArticles = detectArticles(query);
  const synonyms = expansion ? expandQuery(query) : [];
  const expandedQuery = [query, ...synonyms].join(' ');

  const semanticLimit = Math.min(Math.max(limit * 3, 24), 100);
  const keywordLimit = Math.min(Math.max(limit * 2, 16), 80);

  const tasks = [
    semanticSearch(expandedQuery, { ...options, limit: semanticLimit }),
    keywordSearch(query, { limit: keywordLimit, filters }),
  ];
  if (synonyms.length) {
    tasks.push(keywordSearch(synonyms.join(' OR '), { limit: keywordLimit, filters }));
  }

  // Direct lookups for citations mentioned verbatim in the question
  for (const cit of citedCases.slice(0, 4)) {
    tasks.push(keywordSearch(cit, { limit: 6, filters: {} }));
  }
  // Constitution articles referenced by number
  for (const art of citedArticles.slice(0, 4)) {
    tasks.push(keywordSearch(`Article ${art}`, { limit: 4, filters: { sourceType: 'constitution' } }));
  }

  const settled = await Promise.allSettled(tasks);
  const semanticResults = settled[0].status === 'fulfilled' ? settled[0].value : [];
  const lexicalLists = settled.slice(1).map(s => (s.status === 'fulfilled' ? s.value : []));

  // ── Fuse ─────────────────────────────────────────────────────
  const pool = new Map();
  for (const r of semanticResults) pool.set(r.id, { ...r, _sem: r.score || 0, _lex: 0 });
  for (const list of lexicalLists) {
    for (const r of list) {
      const existing = pool.get(r.id);
      if (existing) existing._lex = Math.max(existing._lex, r.score || 0);
      else pool.set(r.id, { ...r, _sem: r.score || 0, _lex: r.score || 0, _semMissing: true });
    }
  }

  // Near-noise gate: drop weak semantic-only hits (no lexical corroboration)
  const NOISE_FLOOR = 0.25;
  for (const [id, r] of pool) {
    if (!r._semMissing && r._sem < NOISE_FLOOR && r._lex === 0 && !citedCases.length && !citedArticles.length) {
      pool.delete(id);
    }
  }

  const maxLex = Math.max(0.0001, ...[...pool.values()].map(r => r._lex));
  const rrfLists = [semanticResults, ...lexicalLists];

  let fused = [...pool.values()].map(r => {
    const rrf = rrfScore(rrfLists, r.id);                       // ~0.008..0.03
    const lexNorm = r._lex / maxLex;                            // 0..1
    const sem = r._semMissing ? 0 : r._sem;                     // 0..1

    let score = 0.55 * sem + 0.20 * lexNorm + rrf * 0.9;
    score += courtWeight(r.court) * 0.08;
    score += recencyBoost(r.year);

    const kind = r.metadata?.chunkKind;
    if (kind === 'holding') score += 0.04;
    if (kind === 'summary') score += 0.02;

    // Verbatim citation hit from the user's own query is decisive
    if (citedCases.length && r.citation && citedCases.some(c =>
      r.citation.replace(/\s+/g, ' ').toLowerCase().includes(c.toLowerCase()) ||
      c.toLowerCase().includes(r.citation.replace(/\s+/g, ' ').toLowerCase())
    )) score += 0.5;

    // Flatten metadata so callers get identical shape for pgvector & memory modes
    const meta = r.metadata || {};
    const flat = {
      id: r.id,
      sourceType: meta.sourceType || r.sourceType || '',
      sourceId: meta.sourceId || r.sourceId || null,
      title: meta.title || r.title || '',
      citation: meta.citation || r.citation || '',
      court: meta.court || r.court || '',
      year: meta.year ?? r.year ?? null,
      category: meta.category || r.category || '',
      keywords: meta.keywords || r.keywords || '',
      article: meta.article || r.article || null,
      chunkKind: kind,
      chunkIndex: meta.chunkIndex ?? null,
      chunkTotal: meta.chunkTotal ?? null,
      chunkText: r.chunkText || meta.chunkText || '',
      snippet: (r.chunkText || meta.chunkText || '').slice(0, 300),
      score: Math.min(1, Math.max(0, score)),
      _rrf: rrf,
      metadata: meta,
    };
    return flat;
  });

  fused.sort((a, b) => b.score - a.score);

  // ── Per-case diversity: keep best `perCase` chunks per source case ──
  // Constitution articles get a hard share cap so they can't crowd out
  // case law unless the user explicitly asked about the Constitution.
  const constitutionCap = citedArticles.length || /constitution|article\s*\d+/i.test(query) ? Infinity : 3;
  const seenPerCase = new Map();
  let constitutionCount = 0;
  const diversified = [];
  for (const r of fused) {
    if ((r.sourceType || '') === 'constitution') {
      if (constitutionCount >= constitutionCap) continue;
      constitutionCount++;
    }
    const key = r.sourceId || r.citation || r.id;
    const n = seenPerCase.get(key) || 0;
    if (n >= perCase) continue;
    seenPerCase.set(key, n + 1);
    diversified.push(r);
    if (diversified.length >= limit) break;
  }

  // If diversity starved us (e.g. many chunks of few cases), backfill
  if (diversified.length < limit) {
    for (const r of fused) {
      if (!diversified.includes(r)) diversified.push(r);
      if (diversified.length >= limit) break;
    }
  }

  const results = diversified.slice(0, limit);
  return {
    query,
    expandedQuery: synonyms.length ? expandedQuery : undefined,
    detectedCitations: citedCases,
    results,
    context: buildRAGContext({ results }),
    count: results.length,
  };
}

/**
 * Build the grounded context block handed to the model.
 * Sources are numbered [S1..Sn]; the model is instructed to cite them
 * by their formal citation AND bracket id so responses are verifiable.
 */
export function buildRAGContext(searchResults) {
  const results = searchResults?.results || [];
  if (results.length === 0) {
    return 'No relevant results found in the legal database.';
  }

  const parts = [];
  const caseResults = results.filter(r => r.sourceType !== 'constitution');
  const constResults = results.filter(r => r.sourceType === 'constitution');
  let sid = 0;

  if (caseResults.length > 0) {
    parts.push('RELEVANT CASE LAW (verbatim database records):');
    for (const r of caseResults) {
      sid += 1;
      const tag = `[S${sid}]`;
      parts.push(`${tag} ${r.citation || 'No citation'} — "${r.title}" (${r.court || 'Court N/A'}, ${r.year || 'Year N/A'})`);
      if (r.metadata?.description) parts.push(`    Summary: ${String(r.metadata.description).slice(0, 400)}`);
      const excerpt = extractExcerpt(r.chunkText);
      if (excerpt) parts.push(`    Excerpt: ${excerpt}`);
      if (r.keywords) parts.push(`    Keywords: ${r.keywords}`);
      if (r.metadata?.relevantStatutes) parts.push(`    Statutes: ${r.metadata.relevantStatutes}`);
      parts.push(`    Relevance: ${(r.score * 100).toFixed(1)}% | Source ID: ${r.sourceId || r.id}`);
      parts.push('');
    }
  }

  if (constResults.length > 0) {
    parts.push('RELEVANT CONSTITUTIONAL PROVISIONS:');
    for (const r of constResults) {
      sid += 1;
      const tag = `[S${sid}]`;
      parts.push(`${tag} Article ${r.article}: ${r.title}`);
      const contentLine = extractExcerpt(r.chunkText, 'Content:');
      if (contentLine) parts.push(`    Text: ${contentLine}`);
      if (r.metadata?.partTitle) parts.push(`    Part ${r.metadata.part}: ${r.metadata.partTitle}`);
      parts.push(`    Relevance: ${(r.score * 100).toFixed(1)}%`);
      parts.push('');
    }
  }

  return parts.join('\n');
}

/** Pull the substantive body out of a stored chunk (skip identity header lines). */
function extractExcerpt(chunkText, prefix) {
  const lines = (chunkText || '').split('\n');
  if (prefix) {
    const line = lines.find(l => l.startsWith(prefix));
    return line ? line.slice(prefix.length).trim().slice(0, 1200) : '';
  }
  const bodyStart = lines.findIndex(l => l.startsWith('Excerpt') || l.startsWith('Holding'));
  const body = bodyStart >= 0 ? lines.slice(bodyStart).join(' ') : lines.join(' ');
  return body.replace(/^Excerpt \([^)]*\):\s*/, '').replace(/^Holding excerpt:\s*/, '').slice(0, 1200).trim();
}
