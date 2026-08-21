import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuid } from 'uuid';
import { hybridSearch, buildRAGContext } from './search.js';
import { run, query, queryOne } from '../db/adapter.js';

const queryMany = (sql, params) => query(sql, params);
import {
  PROMPT_VERSION,
  AGENT_SYSTEM,
  CLIENT_AGENT_SYSTEM,
  citationRepairPrompt,
} from './prompts.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_ROUNDS = 15;

// Broad Pakistani reporter pattern used for post-generation citation audit.
const CITATION_PATTERN = /\b\d{4}\s*(?:SCMR|PLD|PCr?\.?\s?LJ|CLC|MLD|YLR|PTD|CLD|SCC|PLC|PLJ|NLR|CLR|TLC|SHC|CRM|SCP|LHC|PHC|FSC|PTCL|SLJ|TAX)\s+\d{1,6}\b/gi;

const TOOL_DECLARATIONS = [
  {
    name: 'searchLegalDatabase',
    description: 'Search the Pakistani legal database of court cases and Constitution. Returns hybrid semantic+keyword ranked results. Use when you need additional or more specific authorities.',
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
    name: 'listMyCases', description: 'List all cases you are handling (lawyer) or your cases (client).',
    parameters: { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'active', 'closed', 'won', 'lost'] } }, required: [] },
  },
  {
    name: 'getCaseDetails', description: 'Get full details of a specific case.',
    parameters: { type: 'object', properties: { caseId: { type: 'string' } }, required: ['caseId'] },
  },
  {
    name: 'listMyClients', description: 'List all clients you are connected to (lawyer only).',
    parameters: { type: 'object', properties: {}, required: [] },
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

function normalizeCitation(c) {
  return c.replace(/\s+/g, ' ').trim();
}

// Portable (SQLite + Postgres) helpers — no ILIKE / regexp_replace here.
const compactKey = (s) => String(s).replace(/[^a-z0-9]/gi, '').toLowerCase();

export async function validateCitations(responseText) {
  const found = (responseText.match(CITATION_PATTERN) || []).map(normalizeCitation);
  if (found.length === 0) return { valid: true, invalid: [], verified: [], message: 'No citations to validate' };

  const unique = [...new Set(found)];
  const invalid = [];
  const verified = [];

  for (const citation of unique) {
    try {
      // Exact match after whitespace normalization (works on both dialects).
      const exists = await queryOne(
        'SELECT id, title FROM citations WHERE LOWER(REPLACE(citation, \' \', \'\')) = ? LIMIT 1',
        [compactKey(citation)]
      );
      if (exists) {
        verified.push({ citation, title: exists.title, id: exists.id });
        continue;
      }
      // Fuzzy rescue: candidates sharing the year prefix, compact-compared in JS.
      const year = citation.match(/^\d{4}/)?.[0];
      let rescued = null;
      if (year) {
        const candidates = await queryMany(
          'SELECT id, citation, title FROM citations WHERE citation LIKE ? LIMIT 400',
          [`${year}%`]
        );
        rescued = candidates.find(c => compactKey(c.citation) === compactKey(citation)) || null;
      }
      if (rescued) {
        verified.push({ citation: rescued.citation, title: rescued.title, id: rescued.id });
        invalid.push({ citation, closestMatch: rescued.citation, resolvableTo: rescued.citation });
      } else {
        const prefix = year
          ? await queryOne('SELECT citation, title FROM citations WHERE citation LIKE ? LIMIT 1', [`${year}%`])
          : null;
        invalid.push({ citation, closestMatch: prefix?.citation || null });
      }
    } catch {
      invalid.push({ citation, closestMatch: null });
    }
  }

  return {
    valid: invalid.length === 0,
    invalid,
    verified,
    message: invalid.length > 0
      ? `Found ${invalid.length} citations not in database.`
      : `All ${verified.length} citations verified in database.`,
  };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function isTransient(err) {
  const status = err?.status;
  if ([429, 500, 502, 503, 504].includes(status)) return true;
  return /overload|unavailable|timeout|fetch failed|network/i.test(err?.message || '');
}

async function sendMessageWithRetry(chat, message, { attempts = 3 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await chat.sendMessage(message);
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || i === attempts - 1) break;
      const m = (err.message || '').match(/retry\s+in\s+([\d.]+)\s*s/i);
      await sleep(m ? parseFloat(m[1]) * 1000 + 500 : 2500 * (i + 1));
    }
  }
  throw lastErr;
}

function extractText(response) {
  try { return response?.text() || ''; } catch { return ''; }
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

  const initialSearch = await hybridSearch(message, { limit: 10, maxWaitMs: 6000 });
  const initialContext = buildRAGContext(initialSearch);
  const hasGrounding = initialSearch.count > 0;

  const groundedMessage = hasGrounding
    ? `User Question: ${message}\n\nDATABASE RESULTS:\n${initialContext}\n\nIf the question relates to legal research or case law, answer from the database results above (cite them). For case management questions (listing cases, client info, documents), use your available tools instead.`
    : `User Question: ${message}\n\nNo relevant results found in the legal database. Search the database using searchLegalDatabase tool to find relevant cases. If no results exist after searching, honestly tell the user.`;

  const chat = model.startChat({ history: geminiHistory });
  let responseText = '';
  let currentMessage = groundedMessage;
  const toolTrace = [];
  const sourcePool = new Map();

  const collectSources = results => {
    for (const r of results || []) {
      const key = r.citation || r.id;
      if (!sourcePool.has(key)) {
        sourcePool.set(key, {
          id: r.sourceId || r.id,
          title: r.title,
          citation: r.citation || (r.article ? `Article ${r.article}` : ''),
          court: r.court,
          year: r.year,
          category: r.category,
          sourceType: r.sourceType,
          score: Number((r.score || 0).toFixed(4)),
        });
      }
    }
  };
  collectSources(initialSearch.results);

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let result;
    try {
      result = await sendMessageWithRetry(chat, currentMessage);
    } catch (err) {
      console.error('agentChat sendMessage failed:', err.message);
      // Graceful degradation: never throw — answer from what we have.
      const pool = [...sourcePool.values()].sort((a, b) => b.score - a.score);
      responseText = pool.length
        ? `I retrieved the following authorities for your question, but the AI service is temporarily unavailable to write a full analysis. Please try again shortly.\n\nRelevant authorities found:\n${pool.slice(0, 5).map(s => `- ${s.title ? `"${s.title}", ` : ''}${s.citation}${s.court ? ` (${s.court})` : ''}`).join('\n')}`
        : 'The AI service is temporarily unavailable. Please try again in a few moments — your question was received but could not be processed right now.';
      break;
    }
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      responseText = extractText(response);
      break;
    }

    const toolResponses = [];
    for (const call of functionCalls) {
      const fnResult = await executeAgentTool(call.name, call.args, userId);
      if (call.name === 'searchLegalDatabase') collectSources(fnResult._results);
      toolTrace.push({ round, tool: call.name, args: call.args, resultKeys: Object.keys(fnResult) });
      toolResponses.push({
        functionResponse: { name: call.name, response: fnResult },
      });
    }
    currentMessage = toolResponses;
  }

  // Loop ended without plain text (e.g. model kept calling tools until MAX_ROUNDS)
  if (!responseText) {
    const pool = [...sourcePool.values()].sort((a, b) => b.score - a.score);
    if (pool.length) {
      try {
        const summaryMsg = `Based ONLY on these sources, write your final cited answer now (no more tool calls):\n${pool.slice(0, 8).map(s => `[${s.citation || s.id}] ${s.title}`).join('\n')}`;
        const finalResult = await sendMessageWithRetry(chat, summaryMsg, { attempts: 2 });
        responseText = extractText(finalResult.response);
      } catch {}
    }
  }

  if (!responseText) {
    responseText = 'I have completed the research. Please let me know if you need more details on any specific aspect.';
  }  // ── Citation audit + one self-repair round ────────────────────
  let validation = await validateCitations(responseText);
  let repaired = false;
  if (!validation.valid && validation.invalid.some(i => i.closestMatch)) {
    try {
      const repairChat = model.startChat({ history: [...geminiHistory] });
      const fixResult = await repairChat.sendMessage(
        citationRepairPrompt(responseText, validation.invalid, null)
      );
      const fixedText = fixResult.response.text();
      const revalidation = await validateCitations(fixedText);
      if (revalidation.valid || revalidation.invalid.length < validation.invalid.length) {
        responseText = fixedText;
        validation = revalidation;
        repaired = true;
      }
    } catch (e) {
      console.warn('Citation repair round failed:', e.message);
    }
  }

  let finalResponse = responseText;
  if (!validation.valid) {
    const warning = `\n\n─── VERIFICATION NOTE ───\nThe following citations could not be verified in the case database: ${validation.invalid.map(i => i.citation).join(', ')}. ${validation.invalid.some(i => i.closestMatch) ? 'Closest matches: ' + validation.invalid.filter(i => i.closestMatch).map(i => `${i.citation} → ${i.closestMatch}`).join('; ') + '. ' : ''}Please verify against official law reports before relying on them.`;
    finalResponse = responseText + warning;
  }

  return {
    responseText: finalResponse,
    validated: { ...validation, repaired },
    sources: [...sourcePool.values()].sort((a, b) => b.score - a.score),
    toolTrace,
    sessionId,
    grounded: hasGrounding,
    promptVersion: PROMPT_VERSION,
  };
}

async function executeAgentTool(name, args, userId) {
  switch (name) {
    case 'searchLegalDatabase': {
      const { query: q, sourceType, category, court, yearFrom, yearTo } = args;
      const results = await hybridSearch(q, { limit: 10, sourceType, category, court, yearFrom, yearTo, maxWaitMs: 6000 });
      return {
        context: buildRAGContext(results),
        resultCount: results.count,
        hasCases: results.results.some(r => r.sourceType !== 'constitution'),
        hasConstitution: results.results.some(r => r.sourceType === 'constitution'),
        topResults: results.results.slice(0, 5).map(r => ({
          title: r.title,
          citation: r.citation || `Article ${r.article || ''}`.trim(),
          court: r.court,
          year: r.year,
          score: (r.score || 0).toFixed(3),
          sourceType: r.sourceType,
        })),
        _results: results.results,
      };
    }

    case 'searchConstitution': {
      const { query: q, article: art, category: cat } = args;
      let sql = 'SELECT id, part, part_title, chapter, chapter_title, article, title, content, category FROM constitution WHERE 1=1';
      const params = [];
      if (q) { const p = `%${q}%`; sql += ' AND (title ILIKE ? OR content ILIKE ?)'; params.push(p, p); }
      if (cat) { sql += ' AND category=?'; params.push(cat); }
      if (art) { sql += ' AND article=?'; params.push(art); }
      sql += " ORDER BY CAST(regexp_replace(article, '[^0-9]', '', 'g') AS INTEGER) ASC, article ASC LIMIT 15";
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

    case 'listMyCases': {
      const { status } = args;
      let sql = 'SELECT id, title, description, status, type, client_status, created_at, updated_at FROM cases WHERE lawyer_id=?';
      const params = [userId];
      if (status) { sql += ' AND status=?'; params.push(status); }
      sql += ' ORDER BY updated_at DESC LIMIT 50';
      const results = await query(sql, params);
      if (!results || results.length === 0) return { message: 'No cases found.', cases: [] };
      return {
        message: `Found ${results.length} cases`,
        cases: results.map(c => ({
          id: c.id, title: c.title, status: c.status, type: c.type || 'General',
          clientStatus: c.client_status, lastUpdated: c.updated_at,
        })),
      };
    }

    case 'getCaseDetails': {
      const { caseId } = args;
      const caseRow = await queryOne(
        'SELECT c.*, u.name as client_name, u.email as client_email, u.phone as client_phone FROM cases c LEFT JOIN users u ON c.client_id=u.id WHERE c.id=?',
        [caseId]
      );
      if (!caseRow) return { error: 'Case not found or not accessible' };
      const timeline = JSON.parse(caseRow.timeline || '[]');
      const courtDates = JSON.parse(caseRow.court_dates || '[]');
      const documents = JSON.parse(caseRow.documents || '[]');
      return {
        id: caseRow.id, title: caseRow.title, description: caseRow.description,
        status: caseRow.status, type: caseRow.type || 'General',
        clientStatus: caseRow.client_status,
        client: { name: caseRow.client_name, email: caseRow.client_email, phone: caseRow.client_phone },
        timeline: timeline.map(t => `${t.date}: ${t.event}${t.description ? ' - ' + t.description : ''}`),
        courtDates: courtDates.map(d => `${d.date}: ${d.court}${d.notes ? ' - ' + d.notes : ''}`),
        documentCount: documents.length,
        createdAt: caseRow.created_at,
        lastUpdated: caseRow.updated_at,
      };
    }

    case 'listMyClients': {
      const clients = await query(
        `SELECT DISTINCT u.id, u.name, u.email, u.phone, COUNT(c.id) as case_count
         FROM users u JOIN cases c ON (c.client_id=u.id)
         WHERE c.lawyer_id=? AND u.role='client'
         GROUP BY u.id ORDER BY u.name`,
        [userId]
      );
      if (!clients || clients.length === 0) return { message: 'No clients found.', clients: [] };
      return {
        message: `Found ${clients.length} clients`,
        clients: clients.map(cl => ({
          id: cl.id, name: cl.name, email: cl.email, phone: cl.phone || '',
          caseCount: cl.case_count,
        })),
      };
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
