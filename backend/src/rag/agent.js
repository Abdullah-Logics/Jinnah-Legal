import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuid } from 'uuid';
import { hybridSearch, buildRAGContext } from './search.js';
import { run, query, queryOne } from '../db/adapter.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_ROUNDS = 15;

const CITATION_PATTERN = /(?:\d{4}\s+(?:SCMR|PLD|PCrLJ|CLC|MLD|YLR|PTD|CLD|CrPC)\s+\d+)/gi;

const AGENT_SYSTEM = `You are Jinnah Legal AI — an advanced RAG (Retrieval-Augmented Generation) system for Pakistani law.

CRITICAL RULES — YOU MUST FOLLOW THESE:

1. ONLY cite cases that were PROVIDED in the search results above. NEVER invent or hallucinate case names, citations, or legal principles.
2. If the search results are insufficient, say "I could not find specific case law on this in our database" rather than making up cases.
3. Every citation you use must be EXACTLY as it appears in the search results — citation format, year, court, title must all match.
4. Do NOT combine details from multiple cases into a single fictional case.
5. Do NOT extrapolate beyond what the search results tell you.
6. If you are unsure, clearly state:"This information is based on the available case summaries. For complete judgments, please consult the full case text."
7. Use proper Pakistani citation format exactly as shown in search results.
8. Reference Constitution articles as "Article X of the Constitution of Pakistan, 1973" only when they appear in search results.

You have access to a comprehensive database of 16,000+ Pakistani court cases and the Constitution of Pakistan 1973.

RESEARCH WORKFLOW:
1. Review the search results already provided to you
2. Synthesize findings into a well-cited response
3. If search results are missing something important, use searchLegalDatabase tool to find more
4. Always cite your sources with EXACT citations from the search results

TOOL USAGE:
- Use searchLegalDatabase as your PRIMARY research tool
- Use searchConstitution for specific constitutional questions
- Use other tools for case management as needed`;

const CLIENT_AGENT_SYSTEM = `You are Jinnah Legal AI — an AI legal assistant for Pakistani citizens.

CRITICAL RULES:
1. ONLY cite cases that were PROVIDED in the search results. NEVER invent cases or citations.
2. If search results don't have an answer, say so honestly.
3. Explain legal concepts simply. Recommend consulting a qualified lawyer for specific advice.
4. Every case citation must match EXACTLY what appears in the search results.`;

const TOOL_DECLARATIONS = [
  {
    name: 'searchLegalDatabase',
    description: 'Search the Pakistani legal database of 16,000+ cases and Constitution. Returns semantically ranked results. Use when you need additional cases beyond what was already provided.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Detailed search query' },
        sourceType: { type: 'string', enum: ['case', 'constitution'], description: 'Filter by source' },
        category: { type: 'string', description: 'Filter by category' },
        court: { type: 'string', description: 'Filter by court' },
        yearFrom: { type: 'number', description: 'From year' },
        yearTo: { type: 'number', description: 'To year' },
      },
      required: ['query'],
    },
  },
  {
    name: 'searchConstitution',
    description: 'Search the Constitution of Pakistan 1973 for specific articles.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords' },
        article: { type: 'string', description: 'Article number (e.g., "25")' },
        category: { type: 'string', description: 'Category filter' },
      },
      required: [],
    },
  },
  {
    name: 'createCalendarEvent', description: 'Schedule a court date.',
    parameters: { type: 'object', properties: { caseId: { type: 'string' }, date: { type: 'string' }, court: { type: 'string' }, notes: { type: 'string' } }, required: ['caseId', 'date', 'court'] },
  },
  {
    name: 'saveDocument', description: 'Save a document as a draft.',
    parameters: { type: 'object', properties: { name: { type: 'string' }, content: { type: 'string' }, caseId: { type: 'string' } }, required: ['name', 'content'] },
  },
  {
    name: 'createCase', description: 'Create a new legal case.',
    parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, clientId: { type: 'string' }, type: { type: 'string' } }, required: ['title', 'clientId'] },
  },
  {
    name: 'createJournalEntry', description: 'Add a journal entry.',
    parameters: { type: 'object', properties: { date: { type: 'string' }, notes: { type: 'string' }, todos: { type: 'string' }, plans: { type: 'string' } }, required: ['date'] },
  },
  {
    name: 'addTimelineEvent', description: 'Add event to case timeline.',
    parameters: { type: 'object', properties: { caseId: { type: 'string' }, date: { type: 'string' }, event: { type: 'string' }, description: { type: 'string' } }, required: ['caseId', 'date', 'event'] },
  },
  {
    name: 'searchCitations', description: 'Search case citations by keyword.',
    parameters: { type: 'object', properties: { query: { type: 'string' }, category: { type: 'string' }, year: { type: 'number' }, court: { type: 'string' } }, required: ['query'] },
  },
];

async function validateCitations(responseText) {
  const foundCitations = responseText.match(CITATION_PATTERN) || [];
  if (foundCitations.length === 0) return { valid: true, invalid: [], message: 'No citations to validate' };

  const unique = [...new Set(foundCitations)];
  const invalid = [];

  for (const citation of unique) {
    try {
      const exists = await queryOne(
        'SELECT id FROM citations WHERE citation ILIKE ?',
        [citation]
      );
      if (!exists) {
        const fuzzyExists = await queryOne(
          "SELECT citation FROM citations WHERE citation LIKE ?",
          [`%${citation.slice(0, 15)}%`]
        );
        invalid.push({
          citation,
          closestMatch: fuzzyExists?.citation || null,
        });
      }
    } catch { invalid.push({ citation, closestMatch: null }); }
  }

  return {
    valid: invalid.length === 0,
    invalid,
    message: invalid.length > 0
      ? `Found ${invalid.length} citations not in database.`
      : 'All citations verified in database.',
  };
}

export async function agentChat({ message, history = [], userId, userRole, sessionId }) {
  const isLawyer = ['lawyer', 'firm_admin'].includes(userRole);
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: isLawyer ? AGENT_SYSTEM : CLIENT_AGENT_SYSTEM,
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
  });

  const geminiHistory = history.map(h => ({
    role: h.role === 'ai' || h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }],
  }));

  const initialSearch = await hybridSearch(message, { limit: 10 });
  const initialContext = buildRAGContext(initialSearch);
  const hasGrounding = initialSearch.count > 0;

  const groundedMessage = hasGrounding
    ? `User Question: ${message}\n\nRELEVANT DATABASE RESULTS:\n${initialContext}\n\nUsing the above database results ONLY, answer the user's question. Cite only the cases listed above. If the database results lack sufficient information, state this clearly.`
    : `User Question: ${message}\n\nNo relevant results found in the legal database. Search the database using searchLegalDatabase tool to find relevant cases. If no results exist after searching, honestly tell the user.`;

  const chat = model.startChat({ history: geminiHistory });
  let responseText = '';
  let currentMessage = groundedMessage;
  const toolTrace = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const result = await chat.sendMessage(currentMessage);
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      responseText = response.text();
      break;
    }

    const toolResponses = [];
    for (const call of functionCalls) {
      const fnResult = await executeAgentTool(call.name, call.args, userId);
      toolTrace.push({ round, tool: call.name, args: call.args, resultKeys: Object.keys(fnResult) });
      toolResponses.push({
        functionResponse: { name: call.name, response: fnResult },
      });
    }
    currentMessage = toolResponses;
  }

  if (!responseText) {
    responseText = 'I have completed the research. Please let me know if you need more details on any specific aspect.';
  }

  const validation = await validateCitations(responseText);
  let finalResponse = responseText;

  if (!validation.valid) {
    const warning = `\n\n─── NOTE ───\nThe following citations could not be verified in the case database: ${validation.invalid.map(i => i.citation).join(', ')}. ${validation.invalid.some(i => i.closestMatch) ? 'The closest matches found were: ' + validation.invalid.filter(i => i.closestMatch).map(i => `${i.citation} → did you mean ${i.closestMatch}?`).join('; ') + '.' : ''} Please verify these against official law reports before use.`;
    finalResponse = responseText + warning;
  }

  return { responseText: finalResponse, validated: validation, toolTrace, sessionId, grounded: hasGrounding };
}

async function executeAgentTool(name, args, userId) {
  switch (name) {
    case 'searchLegalDatabase': {
      const { query: q, sourceType, category, court, yearFrom, yearTo } = args;
      const results = await hybridSearch(q, { limit: 10, sourceType, category, court, yearFrom, yearTo });
      return {
        context: buildRAGContext(results),
        resultCount: results.count,
        hasCases: results.results.some(r => r.sourceType === 'case'),
        hasConstitution: results.results.some(r => r.sourceType === 'constitution'),
        topResults: results.results.slice(0, 5).map(r => ({
          title: r.title,
          citation: r.citation || `Article ${r.article || ''}`.trim(),
          court: r.court,
          year: r.year,
          score: (r.score || 0).toFixed(3),
          sourceType: r.sourceType,
        })),
      };
    }

    case 'searchConstitution': {
      const { query: q, article: art, category: cat } = args;
      let sql = 'SELECT id, part, part_title, chapter, chapter_title, article, title, content, category FROM constitution WHERE 1=1';
      const params = [];
      if (q) { const p = `%${q}%`; sql += ' AND (title ILIKE ? OR content ILIKE ?)'; params.push(p, p); }
      if (cat) { sql += ' AND category=?'; params.push(cat); }
      if (art) { sql += ' AND article=?'; params.push(art); }
      sql += ' ORDER BY CAST(article AS INTEGER) ASC LIMIT 15';
      const results = await runQuery(sql, params);
      if (!results || results.length === 0) return { message: 'No constitutional provisions found.', articles: [] };
      return {
        message: `Found ${results.length} constitutional provisions`,
        articles: results.map(a => ({
          article: a.article, title: a.title,
          part: `Part ${a.part}: ${a.part_title}`,
          content: a.content, category: a.category,
        })),
      };
    }

    case 'searchCitations': {
      const { query: q, category, year, court } = args;
      let sql = `SELECT id, title, citation, court, year, parties, category, description, keywords FROM citations WHERE 1=1`;
      const params = [];
      if (q) {
        const p = `%${q}%`;
        sql += ` AND (title ILIKE ? OR description ILIKE ? OR keywords ILIKE ? OR parties ILIKE ? OR citation ILIKE ?)`;
        params.push(p, p, p, p, p);
      }
      if (category) { sql += ' AND category=?'; params.push(category); }
      if (year) { sql += ' AND year=?'; params.push(Number(year)); }
      if (court) { sql += ' AND court ILIKE ?'; params.push(`%${court}%`); }
      sql += ' ORDER BY year DESC LIMIT 20';
      const results = await runQuery(sql, params);
      return { message: `Found ${results?.length || 0} citations`, citations: (results || []).map(c => `${c.citation} - ${c.title} (${c.court}, ${c.year})`) };
    }

    case 'createCalendarEvent': {
      const { caseId, date, court, notes } = args;
      const caseRow = await queryOne('SELECT id, court_dates FROM cases WHERE id=?', [caseId]);
      if (!caseRow) return { error: 'Case not found' };
      const dates = JSON.parse(caseRow.court_dates || '[]');
      dates.push({ date, court, notes: notes || '' });
      await run('UPDATE cases SET court_dates=?, updated_at=? WHERE id=?', [JSON.stringify(dates), new Date().toISOString(), caseId]);
      return { success: true, message: `Court date added for ${date} at ${court}` };
    }

    case 'saveDocument': {
      const { name, content, caseId } = args;
      const id = uuid();
      await run('INSERT INTO documents (id, user_id, name, content, type, case_id) VALUES (?,?,?,?,?,?)', [id, userId, name, content, 'draft', caseId || null]);
      return { success: true, message: `Document "${name}" saved`, documentId: id };
    }

    case 'createCase': {
      const { title, description, clientId, type } = args;
      const id = uuid();
      await run('INSERT INTO cases (id,title,description,client_id,lawyer_id,type,status,client_status) VALUES (?,?,?,?,?,?,?,\'pending\')', [id, title, description || '', clientId, userId, type || 'General', 'pending']);
      return { success: true, message: `Case "${title}" created`, caseId: id };
    }

    case 'createJournalEntry': {
      const { date, notes, todos, plans } = args;
      const id = uuid();
      const todoList = todos ? todos.split(',').map(t => ({ id: uuid(), text: t.trim(), completed: false })) : [];
      const existing = await runQueryOne('SELECT id FROM journal_entries WHERE user_id=? AND date=?', [userId, date]);
      if (existing) {
        await run('UPDATE journal_entries SET notes=COALESCE(?,notes), plans=COALESCE(?,plans), updated_at=? WHERE id=?', [notes ?? null, plans ?? null, new Date().toISOString(), existing.id]);
      } else {
        await run('INSERT INTO journal_entries (id, user_id, date, notes, todos, plans) VALUES (?,?,?,?,?,?)', [id, userId, date, notes || '', JSON.stringify(todoList), plans || '']);
      }
      return { success: true, message: `Journal entry for ${date} saved` };
    }

    case 'addTimelineEvent': {
      const { caseId, date, event, description } = args;
      const caseRow = await queryOne('SELECT id, timeline FROM cases WHERE id=?', [caseId]);
      if (!caseRow) return { error: 'Case not found' };
      const timeline = JSON.parse(caseRow.timeline || '[]');
      timeline.push({ date, event, description: description || '' });
      await run('UPDATE cases SET timeline=?, updated_at=? WHERE id=?', [JSON.stringify(timeline), new Date().toISOString(), caseId]);
      return { success: true, message: `Timeline event "${event}" added` };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function runQuery(sql, params) {
  try {
    const { query: q } = await import('../db/adapter.js');
    return await q(sql, params);
  } catch { return []; }
}

async function runQueryOne(sql, params) {
  try {
    const { queryOne: q } = await import('../db/adapter.js');
    return await q(sql, params);
  } catch { return null; }
}
