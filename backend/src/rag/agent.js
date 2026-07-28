import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuid } from 'uuid';
import { hybridSearch, buildRAGContext } from './search.js';
import { run, query, queryOne } from '../db/adapter.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_ROUNDS = 15;

const AGENT_SYSTEM = `You are Jinnah Legal AI — an advanced agentic RAG (Retrieval-Augmented Generation) system for Pakistani law.

You have access to a comprehensive database of 16,000+ Pakistani court cases from all major courts (Supreme Court, Lahore High Court, Sindh High Court, Peshawar High Court, Islamabad High Court, Federal Shariat Court) AND the complete Constitution of Pakistan 1973.

YOUR CORE CAPABILITIES:
1. **Legal Research with Sources**: When asked any legal question, ALWAYS use the searchLegalDatabase tool first to retrieve relevant cases and constitutional provisions from the database. Then synthesize the results with proper citations.
2. **Constitutional Analysis**: Search constitutional provisions and analyze them in context of the user's question. Reference specific Articles with their exact text.
3. **Case Law Analysis**: Find, analyze, and compare relevant case precedents. Use proper Pakistani citation format (e.g., "2024 SCMR 123", "2023 PLD 456").
4. **Multi-Step Research**: For complex questions, break them down and search multiple angles. You can call multiple tools in sequence to build a comprehensive answer.
5. **Document Drafting**: Draft legal documents with proper citations to relevant case law and constitutional provisions.
6. **Case Management**: Create cases, add court dates, save documents, create journal entries.

RESEARCH WORKFLOW:
1. Analyze the user's question
2. Identify key legal concepts, issues, and areas of law
3. Use searchLegalDatabase to find relevant cases and constitutional provisions
4. If initial results are insufficient, try alternative search terms or focus on specific aspects
5. Synthesize all findings into a comprehensive, well-cited response
6. Always cite your sources with proper Pakistani legal citation format

IMPORTANT RULES:
- ALWAYS cite sources when making legal claims
- Use proper Pakistani citation format: YEAR REPORT VOLUME PAGE (e.g., "2024 SCMR 123", "2023 PLD 456")
- Reference Constitution articles as "Article X of the Constitution of Pakistan, 1973"
- Respond in the same language the user uses (Urdu or English)
- Be thorough but concise
- When unsure, state the limitations and recommend consulting a qualified lawyer
- For complex research, use multiple search queries to cover different aspects

TOOL USAGE:
- Use searchLegalDatabase as your PRIMARY research tool
- Use searchConstitution for specific constitutional questions
- Use other tools for case management as needed
- You can call multiple tools in parallel or sequentially`;

const CLIENT_AGENT_SYSTEM = `You are Jinnah Legal AI — an AI legal assistant for Pakistani citizens. You help people understand their legal rights and the Pakistani legal system.

You have access to the Constitution of Pakistan 1973 and 16,000+ court cases. Use searchLegalDatabase to find relevant cases and constitutional provisions for any legal question.

RULES:
- Explain legal concepts in simple, clear language
- Always reference the specific Article of the Constitution for rights questions
- Recommend consulting a qualified lawyer for specific legal advice
- Respond in the same language the user uses (Urdu or English)`;

const TOOL_DECLARATIONS = [
  {
    name: 'searchLegalDatabase',
    description: 'Search the comprehensive Pakistani legal database containing 16,000+ court cases and the complete Constitution of Pakistan 1973. This is your PRIMARY research tool. Returns semantically ranked results with case citations, constitutional provisions, and relevance scores.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Detailed search query in English. Include legal concepts, relevant statutes, and factual issues for best results.' },
        sourceType: { type: 'string', description: 'Filter by source: "case" for case law only, "constitution" for constitutional provisions only, or leave empty for all sources.' },
        category: { type: 'string', description: 'Filter by category: Criminal, Civil, Constitutional, Family, Property, Corporate, Banking, Service' },
        court: { type: 'string', description: 'Filter by court: Supreme Court, Lahore High Court, Sindh High Court, Peshawar High Court, Islamabad High Court, Federal Shariat Court' },
        yearFrom: { type: 'number', description: 'Filter cases from this year onwards' },
        yearTo: { type: 'number', description: 'Filter cases up to this year' },
      },
      required: ['query'],
    },
  },
  {
    name: 'searchConstitution',
    description: 'Search the Constitution of Pakistan 1973 for specific articles, provisions, or topics. Returns articles with their full text, part, and chapter information.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords for constitutional provisions' },
        article: { type: 'string', description: 'Specific article number (e.g., "25", "184(3)")' },
        category: { type: 'string', description: 'Filter by category: Fundamental, Constitutional, Islamic, Criminal, Property, Corporate, Family, Service' },
      },
      required: [],
    },
  },
  {
    name: 'createCalendarEvent',
    description: 'Schedule a court date or hearing for a case.',
    parameters: {
      type: 'object',
      properties: {
        caseId: { type: 'string', description: 'The ID of the case' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        court: { type: 'string', description: 'Court name and location' },
        notes: { type: 'string', description: 'Optional notes about the hearing' },
      },
      required: ['caseId', 'date', 'court'],
    },
  },
  {
    name: 'saveDocument',
    description: 'Save a generated document or legal text as a draft.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Document name/title' },
        content: { type: 'string', description: 'The full text content of the document' },
        caseId: { type: 'string', description: 'Optional case ID to link to' },
      },
      required: ['name', 'content'],
    },
  },
  {
    name: 'createCase',
    description: 'Create a new legal case.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Case title' },
        description: { type: 'string', description: 'Case description' },
        clientId: { type: 'string', description: 'Client ID' },
        type: { type: 'string', description: 'Case type', default: 'General' },
      },
      required: ['title', 'clientId'],
    },
  },
  {
    name: 'createJournalEntry',
    description: 'Add a journal entry for a specific date.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        notes: { type: 'string', description: 'Journal notes' },
        todos: { type: 'string', description: 'Comma-separated todo tasks' },
        plans: { type: 'string', description: 'Plans or goals' },
      },
      required: ['date'],
    },
  },
  {
    name: 'addTimelineEvent',
    description: 'Add an event to a case timeline.',
    parameters: {
      type: 'object',
      properties: {
        caseId: { type: 'string', description: 'Case ID' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        event: { type: 'string', description: 'Event name/title' },
        description: { type: 'string', description: 'Event details' },
      },
      required: ['caseId', 'date', 'event'],
    },
  },
  {
    name: 'searchCitations',
    description: 'Search case law citations using keyword matching (complements the semantic searchLegalDatabase tool for precise citation lookups).',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords' },
        category: { type: 'string', description: 'Category filter' },
        year: { type: 'number', description: 'Year filter' },
        court: { type: 'string', description: 'Court filter' },
      },
      required: ['query'],
    },
  },
];

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

  const chat = model.startChat({ history: geminiHistory });
  let responseText = '';
  let currentMessage = message;
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

  return { responseText, toolTrace, sessionId };
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
