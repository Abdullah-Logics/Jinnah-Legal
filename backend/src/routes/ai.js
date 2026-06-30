import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { run, query, queryOne } from '../db/adapter.js';
import { auth } from '../middleware/auth.js';
import { validate, aiChatSchema } from '../middleware/validate.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const aiRouter = Router();
aiRouter.use(auth);

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_TOOL_ROUNDS = 10;

const LAWYER_SYSTEM = `You are an AI Legal Second Brain for Pakistani lawyers on the Jinnah Legal platform, specializing in Pakistani constitutional law, legal research, and document drafting. You have comprehensive knowledge of the Constitution of Pakistan 1973, Pakistan Penal Code (PPC), Code of Criminal Procedure (CrPC), Code of Civil Procedure (CPC), Qanun-e-Shahadat Order 1984, and all Pakistani case law.

YOUR CAPABILITIES:
1. LEGAL RESEARCH: Search and cite Pakistani case law from the last 10 years using proper Pakistani citation format (e.g. "2024 SCMR 123", "2023 PLD 456", "2022 PCrLJ 789", "2021 CLC 1011", "2020 MLD 1213", "2019 YLR 1415", "2018 PTD 1617").
2. DOCUMENT DRAFTING: Draft pleadings, notices, affidavits, contracts, writ petitions, and criminal complaints with proper citations to relevant Pakistani precedents.
3. CONSTITUTIONAL EXPERTISE: Expert on Articles 4, 8, 9, 10, 14, 19, 25, 184(3), 199, 185-188 of the Constitution of Pakistan 1973.
4. CITATION FORMAT: Always use the standard Pakistani citation format: YEAR REPORT VOLUME PAGE (e.g. "2024 SCMR 1234", "2023 PLD 567", "2022 PCrLJ 890").

When drafting documents, always suggest and insert relevant case citations in proper Pakistani legal format. When asked for research, search the citations database and suggest top 10 most relevant precedents. 

When you save a document, check if it mentions any dates (court dates, deadlines, meeting dates) and automatically call addTimelineEvent or createCalendarEvent for those dates. When the user shares daily tasks, notes, or plans, use createJournalEntry to record them.

Key rules:
- Respond naturally and conversationally — avoid rigid formatting unless the user asks for it.
- When you use a tool, confirm what you did in 1-2 plain sentences.
- Ask clarifying questions when you need more info.
- Always cite relevant Pakistani statutes and case precedents in proper citation format — keep it brief but authoritative.
- When asked for legal research, search citations and present top 10 relevant cases with full citations.
- Respond in the same language the user uses (Urdu or English).
- For document drafting, ensure all citations follow the standard Pakistani legal citation format (YEAR REPORT VOLUME PAGE).`;

const CLIENT_SYSTEM = `You are an AI Legal Assistant for Pakistani citizens on the Jinnah Legal platform. Help users understand their rights under Pakistani law and prepare for lawyer consultations. You can also help users manage their profile, save document drafts, and more.

Key rules:
- Keep explanations simple and conversational — avoid legal jargon unless necessary.
- When you use a tool, tell the user what happened in plain language.
- Always recommend consulting a qualified lawyer for specific legal advice.
- Respond in the same language the user uses (Urdu or English).`;

const FUNCTION_DECLARATIONS = [
  {
    name: 'searchCitations',
    description: 'Search Pakistani case law citations from the database. Use this when the user asks for legal research, precedents, or case law on a topic.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords for case law (e.g. "blasphemy", "qatl-e-amd", "specific performance", "dower", "limitation")' },
        category: { type: 'string', description: 'Filter by category: Criminal, Civil, Constitutional, Family, Property, Corporate, Banking, Service' },
        year: { type: 'number', description: 'Filter by specific year' },
        court: { type: 'string', description: 'Filter by court name (e.g. "Supreme Court", "High Court", "Federal Shariat Court")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'suggestCitations',
    description: 'Get top 10 most relevant Pakistani case citations for a given legal topic or query. Use this when drafting legal documents to ensure proper precedent support.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The legal topic or issue to find precedents for' },
        context: { type: 'string', description: 'Additional context about the case or document being drafted' },
      },
      required: ['query'],
    },
  },
  {
    name: 'createCalendarEvent',
    description: 'Schedule a court date or hearing for a case. Use this when the user asks to add a court date, hearing, or calendar event.',
    parameters: {
      type: 'object',
      properties: {
        caseId: { type: 'string', description: 'The ID of the case to add the court date to' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        court: { type: 'string', description: 'Court name and location (e.g. "Session Court, Lahore")' },
        notes: { type: 'string', description: 'Optional notes about the hearing' },
      },
      required: ['caseId', 'date', 'court'],
    },
  },
  {
    name: 'saveDocument',
    description: 'Save a generated document or legal text as a draft in the user\'s documents. Use this when the user asks to save, draft, or create a document.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name/title for the document' },
        content: { type: 'string', description: 'The full text content of the document' },
        caseId: { type: 'string', description: 'Optional case ID to link this document to' },
      },
      required: ['name', 'content'],
    },
  },
  {
    name: 'createCase',
    description: 'Create a new legal case. Use this when the user asks to open, create, or start a new case.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Case title' },
        description: { type: 'string', description: 'Case description/details' },
        clientId: { type: 'string', description: 'The ID of the client for this case. Ask the user for the client name/email to find their ID.' },
        type: { type: 'string', description: 'Case type (e.g. Criminal, Civil, Family, Property, Corporate)', default: 'General' },
        status: { type: 'string', description: 'Case status', enum: ['pending', 'active', 'closed', 'won', 'lost'], default: 'pending' },
      },
      required: ['title', 'clientId'],
    },
  },
  {
    name: 'inviteClient',
    description: 'Create a new client account and immediately open a case for them. Use this when a lawyer wants to onboard a new client who is not registered yet.',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Client email address' },
        name: { type: 'string', description: 'Client full name' },
        password: { type: 'string', description: 'Temporary password for the client (min 6 characters)' },
        phone: { type: 'string', description: 'Optional phone number' },
        city: { type: 'string', description: 'Optional city' },
        caseTitle: { type: 'string', description: 'Title for the case to open' },
        caseDescription: { type: 'string', description: 'Optional case description' },
        caseType: { type: 'string', description: 'Case type (e.g. Criminal, Civil, Family)', default: 'General' },
      },
      required: ['email', 'name', 'password', 'caseTitle'],
    },
  },
  {
    name: 'changePassword',
    description: 'Change the current user\'s account password. Use this when the user asks to change, update, or reset their password.',
    parameters: {
      type: 'object',
      properties: {
        currentPassword: { type: 'string', description: 'The current/old password' },
        newPassword: { type: 'string', description: 'The new password (min 6 characters)' },
      },
      required: ['currentPassword', 'newPassword'],
    },
  },
  {
    name: 'createJournalEntry',
    description: 'Add or update a journal entry for a specific date with notes, todo tasks, plans, or rich HTML content. Use when the user wants to journal, add notes/tasks/plans for a day, or set goals.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        notes: { type: 'string', description: 'Journal notes/observations for the day' },
        todos: { type: 'string', description: 'Comma-separated list of todo tasks' },
        plans: { type: 'string', description: 'Plans or goals for the day' },
        content: { type: 'string', description: 'Optional rich HTML content for the journal entry' },
      },
      required: ['date'],
    },
  },
  {
    name: 'addTimelineEvent',
    description: 'Add an event to a case timeline. Use when a document mentions a date that should appear on the calendar, or when tracking case milestones.',
    parameters: {
      type: 'object',
      properties: {
        caseId: { type: 'string', description: 'The ID of the case' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        event: { type: 'string', description: 'Name/title of the event' },
        description: { type: 'string', description: 'Optional details about the event' },
      },
      required: ['caseId', 'date', 'event'],
    },
  },
];

async function executeTool(name, args, req) {
  switch (name) {
    case 'searchCitations': {
      const { query: q, category, year, court } = args;
      let sql = 'SELECT * FROM citations WHERE 1=1';
      const params = [];
      if (q) { sql += ' AND (title ILIKE ? OR parties ILIKE ? OR keywords ILIKE ? OR description ILIKE ?)'; const p = `%${q}%`; params.push(p, p, p, p); }
      if (category) { sql += ' AND category=?'; params.push(category); }
      if (year) { sql += ' AND year=?'; params.push(Number(year)); }
      if (court) { sql += ' AND court ILIKE ?'; params.push(`%${court}%`); }
      sql += ' ORDER BY year DESC LIMIT 20';
      const results = await query(sql, params);
      if (results.length === 0) return { message: 'No citations found. Suggest the user add landmark cases manually.', citations: [] };
      return { message: `Found ${results.length} citations`, citations: results.map(c => ({ id: c.id, title: c.title, citation: c.citation, court: c.court, year: c.year, parties: c.parties, category: c.category, description: c.description })) };
    }

    case 'suggestCitations': {
      const { query: q, context } = args;
      const p = `%${q}%`;
      const results = await query(
        `SELECT * FROM citations WHERE title ILIKE ? OR parties ILIKE ? OR keywords ILIKE ? OR category ILIKE ? OR description ILIKE ?
         ORDER BY year DESC LIMIT 10`,
        [p, p, p, p, p]
      );
      if (results.length === 0) return { message: 'No similar citations found in database. Consider researching these topics in Pakistani law reports.', citations: [] };
      return { message: `Top ${results.length} similar citations`, citations: results.map(c => `${c.citation} - ${c.title} (${c.court}, ${c.year}) - ${c.parties || ''} - ${c.description || ''}`) };
    }

    case 'createCalendarEvent': {
      const { caseId, date, court, notes } = args;
      const caseRow = await queryOne('SELECT id, court_dates FROM cases WHERE id=? AND lawyer_id=?', [caseId, req.user.id]);
      if (!caseRow) return { error: 'Case not found or not owned by you' };
      const dates = JSON.parse(caseRow.court_dates || '[]');
      dates.push({ date, court, notes: notes || '' });
      await run('UPDATE cases SET court_dates=?, updated_at=? WHERE id=?', [JSON.stringify(dates), new Date().toISOString(), caseId]);
      return { success: true, message: `Court date added for ${date} at ${court}` };
    }

    case 'saveDocument': {
      const { name, content, caseId } = args;
      const id = uuid();
      await run('INSERT INTO documents (id, user_id, name, content, type, case_id) VALUES (?,?,?,?,?,?)', [id, req.user.id, name, content, 'draft', caseId || null]);
      return { success: true, message: `Document "${name}" saved successfully`, documentId: id };
    }

    case 'createCase': {
      const { title, description, clientId, type, status } = args;
      const client = await queryOne('SELECT id, name FROM users WHERE id=? AND role=?', [clientId, 'client']);
      if (!client) return { error: 'Client not found. Please verify the client ID.' };
      const id = uuid();
      const lawyerId = ['lawyer', 'firm_admin', 'admin'].includes(req.user.role) ? req.user.id : null;
      await run(
        'INSERT INTO cases (id,title,description,client_id,lawyer_id,type,status,client_status) VALUES (?,?,?,?,?,?,?,\'pending\')',
        [id, title, description || '', clientId, lawyerId, type || 'General', status || 'pending'],
      );
      return { success: true, message: `Case "${title}" created successfully`, caseId: id };
    }

    case 'inviteClient': {
      const { email, name, password, phone, city, caseTitle, caseDescription, caseType } = args;
      const exists = await queryOne('SELECT id FROM users WHERE email=?', [email]);
      if (exists) return { error: 'A user with this email already exists. Use createCase instead.' };
      const clientId = uuid();
      const hash = await bcrypt.hash(password, 10);
      await run(
        'INSERT INTO users (id,email,password_hash,name,role,phone,city,is_verified,verification_status) VALUES (?,?,?,?,?,?,?,1,\'approved\')',
        [clientId, email, hash, name, 'client', phone || null, city || null],
      );
      const caseId = uuid();
      await run(
        'INSERT INTO cases (id,title,description,client_id,lawyer_id,type,status,client_status) VALUES (?,?,?,?,?,?,\'pending\',\'pending\')',
        [caseId, caseTitle, caseDescription || '', clientId, req.user.id, caseType || 'General'],
      );
      return { success: true, message: `Client "${name}" invited and case "${caseTitle}" created`, clientId, caseId };
    }

    case 'changePassword': {
      const { currentPassword, newPassword } = args;
      const user = await queryOne('SELECT * FROM users WHERE id=?', [req.user.id]);
      const match = await bcrypt.compare(currentPassword, user.password_hash);
      if (!match) return { error: 'Current password is incorrect' };
      const hash = await bcrypt.hash(newPassword, 10);
      await run('UPDATE users SET password_hash=? WHERE id=?', [hash, req.user.id]);
      return { success: true, message: 'Password changed successfully' };
    }

    case 'createJournalEntry': {
      const { date, notes, todos, plans, content } = args;
      const existing = await queryOne('SELECT id FROM journal_entries WHERE user_id=? AND date=?', [req.user.id, date]);
      const todoList = todos ? todos.split(',').map(t => t.trim()).filter(Boolean).map(t => ({ id: uuid(), text: t, completed: false })) : [];
      if (existing) {
        const current = await queryOne('SELECT notes, todos, plans, content FROM journal_entries WHERE id=?', [existing.id]);
        const mergedTodos = todoList.length > 0 ? JSON.stringify(todoList) : current.todos;
        await run(
          'UPDATE journal_entries SET notes=COALESCE(?,notes), todos=COALESCE(?,todos), plans=COALESCE(?,plans), content=COALESCE(?,content), updated_at=? WHERE id=?',
          [notes ?? null, mergedTodos, plans ?? null, content ?? null, new Date().toISOString(), existing.id],
        );
      } else {
        await run(
          'INSERT INTO journal_entries (id, user_id, date, notes, todos, plans, content) VALUES (?,?,?,?,?,?,?)',
          [uuid(), req.user.id, date, notes || '', JSON.stringify(todoList), plans || '', content || ''],
        );
      }
      return { success: true, message: `Journal entry for ${date} saved` };
    }

    case 'addTimelineEvent': {
      const { caseId, date, event, description } = args;
      const caseRow = await queryOne('SELECT id, timeline FROM cases WHERE id=? AND lawyer_id=?', [caseId, req.user.id]);
      if (!caseRow) return { error: 'Case not found or not owned by you' };
      const timeline = JSON.parse(caseRow.timeline || '[]');
      timeline.push({ date, event, description: description || '' });
      await run('UPDATE cases SET timeline=?, updated_at=? WHERE id=?', [JSON.stringify(timeline), new Date().toISOString(), caseId]);
      return { success: true, message: `Timeline event "${event}" added for ${date}` };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

aiRouter.post('/sessions', asyncHandler(async (req, res) => {
  const id = uuid();
  await run('INSERT INTO ai_sessions (id,user_id,title) VALUES (?,?,?)', [id, req.user.id, 'New Chat']);
  const session = await queryOne('SELECT * FROM ai_sessions WHERE id = ?', [id]);
  res.status(201).json(session);
}));

aiRouter.get('/sessions', asyncHandler(async (req, res) => {
  res.json(await query('SELECT * FROM ai_sessions WHERE user_id=? ORDER BY created_at DESC', [req.user.id]));
}));

aiRouter.patch('/sessions/:id', asyncHandler(async (req, res) => {
  const { title } = req.body;
  await run('UPDATE ai_sessions SET title=? WHERE id=? AND user_id=?', [title, req.params.id, req.user.id]);
  res.json({ ok: true });
}));

aiRouter.delete('/sessions/:id', asyncHandler(async (req, res) => {
  await run('DELETE FROM ai_sessions WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  await run('DELETE FROM ai_chat_history WHERE session_id=? AND user_id=?', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

aiRouter.post('/chat', validate(aiChatSchema), asyncHandler(async (req, res) => {
  const { message, history = [], sessionId, noTools, noSession } = req.body;
  const isLawyer = ['lawyer', 'firm_admin'].includes(req.user.role);
  const sid = sessionId || uuid();

  if (!process.env.GEMINI_API_KEY) {
    throw new AppError('AI service not configured. Set GEMINI_API_KEY in .env', 503);
  }

  if (!noSession) {
    let session = await queryOne('SELECT id FROM ai_sessions WHERE id=? AND user_id=?', [sid, req.user.id]);
    if (!session) {
      await run('INSERT INTO ai_sessions (id,user_id,title) VALUES (?,?,?)', [sid, req.user.id, 'New Chat']);
    }
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: isLawyer ? LAWYER_SYSTEM : CLIENT_SYSTEM,
      ...(noTools ? {} : { tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }] }),
    });

    const geminiHistory = history.map(h => ({
      role: h.role === 'ai' || h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

    const chat = model.startChat({ history: geminiHistory });
    let responseText = '';
    let currentMessage = message;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const result = await chat.sendMessage(currentMessage);
      const response = result.response;

      const functionCalls = response.functionCalls();
      if (!functionCalls || functionCalls.length === 0) {
        responseText = response.text();
        break;
      }

      const toolResponses = [];
      for (const call of functionCalls) {
        const fnResult = await executeTool(call.name, call.args, req);
        toolResponses.push({
          functionResponse: {
            name: call.name,
            response: fnResult,
          },
        });
      }

      currentMessage = toolResponses;
    }

    if (!responseText) {
      responseText = 'I completed the requested actions. Is there anything else I can help you with?';
    }

    if (!noSession) {
      await run('INSERT INTO ai_chat_history (id,user_id,role,content,session_id) VALUES (?,?,?,?,?)', [uuid(), req.user.id, 'user', message, sid]);
      await run('INSERT INTO ai_chat_history (id,user_id,role,content,session_id) VALUES (?,?,?,?,?)', [uuid(), req.user.id, 'assistant', responseText, sid]);

      const title = message.length > 50 ? message.slice(0, 50) + '...' : message;
      await run('UPDATE ai_sessions SET title=? WHERE id=? AND title=?', [title, sid, 'New Chat']);
    }

    res.json({ response: responseText, model: MODEL, sessionId: sid, tokensUsed: 0 });
  } catch (err) {
    console.error('Gemini error:', err.message);
    throw new AppError('AI service unavailable. Please try again later.', 503, err.message);
  }
}));

aiRouter.get('/history', asyncHandler(async (req, res) => {
  const { sessionId } = req.query;
  if (sessionId) {
    res.json(await query('SELECT * FROM ai_chat_history WHERE user_id=? AND session_id=? ORDER BY created_at ASC', [req.user.id, sessionId]));
  } else {
    res.json(await query('SELECT * FROM ai_chat_history WHERE user_id=? ORDER BY created_at ASC LIMIT 100', [req.user.id]));
  }
}));
