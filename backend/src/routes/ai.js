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

const LAWYER_SYSTEM = `You are an AI Legal Second Brain for Pakistani lawyers on the Jinnah Legal platform. Help with legal research, drafting, strategy, and court procedure under Pakistani law (PPC, CPC, CRPC). You have tools to create cases, schedule hearings, save documents, change passwords, and invite clients.

Key rules:
- Respond naturally and conversationally — avoid rigid formatting or bullet-point lists unless the user asks for them.
- When you use a tool, confirm what you did in 1-2 plain sentences.
- Ask clarifying questions when you need more info (e.g. "Which case should I add the hearing to?").
- Cite relevant Pakistani statutes when helpful, but keep it brief.
- Respond in the same language the user uses (Urdu or English).`;

const CLIENT_SYSTEM = `You are an AI Legal Assistant for Pakistani citizens on the Jinnah Legal platform. Help users understand their rights under Pakistani law and prepare for lawyer consultations. You can also help users manage their profile, save document drafts, and more.

Key rules:
- Keep explanations simple and conversational — avoid legal jargon unless necessary.
- When you use a tool, tell the user what happened in plain language.
- Always recommend consulting a qualified lawyer for specific legal advice.
- Respond in the same language the user uses (Urdu or English).`;

const FUNCTION_DECLARATIONS = [
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
];

async function executeTool(name, args, req) {
  switch (name) {
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
  const { message, history = [], sessionId } = req.body;
  const isLawyer = ['lawyer', 'firm_admin'].includes(req.user.role);
  const sid = sessionId || uuid();

  if (!process.env.GEMINI_API_KEY) {
    throw new AppError('AI service not configured. Set GEMINI_API_KEY in .env', 503);
  }

  let session = await queryOne('SELECT id FROM ai_sessions WHERE id=? AND user_id=?', [sid, req.user.id]);
  if (!session) {
    await run('INSERT INTO ai_sessions (id,user_id,title) VALUES (?,?,?)', [sid, req.user.id, 'New Chat']);
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: isLawyer ? LAWYER_SYSTEM : CLIENT_SYSTEM,
      tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
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

    await run('INSERT INTO ai_chat_history (id,user_id,role,content,session_id) VALUES (?,?,?,?,?)', [uuid(), req.user.id, 'user', message, sid]);
    await run('INSERT INTO ai_chat_history (id,user_id,role,content,session_id) VALUES (?,?,?,?,?)', [uuid(), req.user.id, 'assistant', responseText, sid]);

    const title = message.length > 50 ? message.slice(0, 50) + '...' : message;
    await run('UPDATE ai_sessions SET title=? WHERE id=? AND title=?', [title, sid, 'New Chat']);

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
