import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { auth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { run, query, queryOne } from '../db/adapter.js';
import { hybridSearch, buildRAGContext, semanticSearch } from '../rag/search.js';
import { agentChat, validateCitations } from '../rag/agent.js';
import { indexAll, getIndexStatus, indexConstitution, indexAllCases } from '../rag/indexer.js';
import { streamRAGResponse } from '../rag/stream.js';
import { PROMPT_VERSION } from '../rag/prompts.js';

export const ragRouter = Router();
ragRouter.use(auth);

let indexing = false;
let lastIndexError = null;

ragRouter.get('/status', asyncHandler(async (req, res) => {
  const status = await getIndexStatus(query);
  res.json({ ...status, promptVersion: PROMPT_VERSION, lastIndexError });
}));

ragRouter.post('/index', asyncHandler(async (req, res) => {
  if (indexing) throw new AppError('Indexing already in progress', 409);
  indexing = true;
  res.json({ success: true, status: 'started', message: 'Indexing started in background' });
  try {
    await indexAll(query);
  } catch (err) {
    lastIndexError = `full: ${err.message}`;
    console.error('Full index error:', err.message);
  } finally {
    indexing = false;
  }
}));

ragRouter.post('/index/constitution', asyncHandler(async (req, res) => {
  if (indexing) throw new AppError('Indexing already in progress', 409);
  indexing = true;
  res.json({ success: true, status: 'started', message: 'Constitution indexing started in background' });
  try {
    await indexConstitution(query);
  } catch (err) {
    lastIndexError = `constitution: ${err.message}`;
    console.error('Constitution index error:', err.message);
  } finally {
    indexing = false;
  }
}));

ragRouter.post('/index/cases', asyncHandler(async (req, res) => {
  if (indexing) throw new AppError('Indexing already in progress', 409);
  indexing = true;
  res.json({ success: true, status: 'started', message: 'Cases indexing started in background' });
  try {
    await indexAllCases(query);
  } catch (err) {
    lastIndexError = `cases: ${err.message}`;
    console.error('Cases index error:', err.message);
  } finally {
    indexing = false;
  }
}));

ragRouter.post('/search', asyncHandler(async (req, res) => {
  const { q, sourceType, category, court, yearFrom, yearTo, limit, perCase } = req.body;
  if (!q) throw new AppError('Query required', 400);
  const results = await hybridSearch(q, {
    limit: Math.min(limit || 20, 50),
    perCase: Math.min(perCase || 2, 5),
    sourceType, category, court, yearFrom, yearTo,
  });
  res.json({
    query: q,
    expandedQuery: results.expandedQuery,
    detectedCitations: results.detectedCitations,
    results: results.results.map(r => ({
      id: r.id,
      sourceId: r.sourceId,
      sourceType: r.sourceType,
      title: r.title,
      citation: r.citation || (r.article ? `Article ${r.article}` : ''),
      court: r.court,
      year: r.year,
      category: r.category,
      keywords: r.keywords,
      chunkText: r.chunkText,
      chunkKind: r.metadata?.chunkKind || '',
      score: r.score,
    })),
    count: results.count,
    context: results.context,
  });
}));

// Standalone citation verifier — check any text's citations against the DB
ragRouter.post('/verify-citations', asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) throw new AppError('text required', 400);
  const validation = await validateCitations(String(text).slice(0, 50000));
  res.json(validation);
}));

ragRouter.post('/ask', asyncHandler(async (req, res) => {
  const { message, history = [], sessionId } = req.body;
  if (!message) throw new AppError('Message required', 400);

  const result = await agentChat({
    message,
    history,
    userId: req.user.id,
    userRole: req.user.role,
    sessionId: sessionId || uuid(),
  });

  const sid = sessionId || uuid();
  try {
    const session = await queryOne('SELECT id FROM ai_sessions WHERE id=? AND user_id=?', [sid, req.user.id]);
    if (!session) {
      await run('INSERT INTO ai_sessions (id,user_id,title) VALUES (?,?,?)', [sid, req.user.id, message.length > 50 ? message.slice(0, 50) + '...' : message]);
    }
    await run('INSERT INTO ai_chat_history (id,user_id,role,content,session_id) VALUES (?,?,?,?,?)', [uuid(), req.user.id, 'user', message, sid]);
    await run('INSERT INTO ai_chat_history (id,user_id,role,content,session_id) VALUES (?,?,?,?,?)', [uuid(), req.user.id, 'assistant', result.responseText, sid]);
  } catch {}

  res.json({
    response: result.responseText,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    sessionId: sid,
    toolTrace: result.toolTrace,
    // Always arrays so the frontend can map safely:
    sources: Array.isArray(result.sources) ? result.sources : [],
    validation: {
      valid: result.validated?.valid ?? true,
      repaired: !!result.validated?.repaired,
      verifiedCount: result.validated?.verified?.length || 0,
      invalid: result.validated?.invalid || [],
    },
    grounded: result.grounded,
    promptVersion: result.promptVersion,
  });
}));

ragRouter.post('/stream', asyncHandler(async (req, res) => {
  const { q, sourceType, category, court, yearFrom, yearTo, history } = req.body;
  if (!q) throw new AppError('Query required', 400);
  await streamRAGResponse(q, res, { sourceType, category, court, yearFrom, yearTo, history });
}));
