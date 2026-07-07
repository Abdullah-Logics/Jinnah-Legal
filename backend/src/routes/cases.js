import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { run, query, queryOne } from '../db/adapter.js';
import { auth } from '../middleware/auth.js';
import { validate, caseCreateSchema, caseUpdateSchema, caseWithClientSchema, caseRespondSchema } from '../middleware/validate.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { toPublic } from './auth.js';

export const casesRouter = Router();
casesRouter.use(auth);

function parseCase(c) {
  if (!c) return null;
  return {
    id: c.id, title: c.title, description: c.description,
    clientId: c.client_id, lawyerId: c.lawyer_id,
    status: c.status, type: c.type,
    clientStatus: c.client_status || 'pending',
    timeline: safeJson(c.timeline, []),
    documents: safeJson(c.documents, []),
    courtDates: safeJson(c.court_dates, []),
    closeRequestedByLawyer: !!c.close_requested_by_lawyer,
    closeRequestedByClient: !!c.close_requested_by_client,
    createdAt: c.created_at, updatedAt: c.updated_at,
  };
}

function safeJson(v, def) {
  try { return v ? JSON.parse(v) : def; } catch { return def; }
}

casesRouter.get('/', asyncHandler(async (req, res) => {
  const { id, role } = req.user;
  let rows;
  if (role === 'lawyer') {
    rows = await query('SELECT * FROM cases WHERE lawyer_id = ? ORDER BY updated_at DESC', [id]);
  } else if (role === 'client') {
    rows = await query('SELECT * FROM cases WHERE client_id = ? ORDER BY updated_at DESC', [id]);
  } else {
    rows = await query('SELECT * FROM cases ORDER BY updated_at DESC');
  }
  res.json(rows.map(parseCase));
}));

casesRouter.get('/:id', asyncHandler(async (req, res) => {
  const c = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  if (!c) throw new AppError('Case not found', 404);
  res.json(parseCase(c));
}));

casesRouter.post('/', validate(caseCreateSchema), asyncHandler(async (req, res) => {
  const { title, description, clientId, lawyerId, type, status } = req.body;
  const id = uuid();
  await run(
    `INSERT INTO cases (id,title,description,client_id,lawyer_id,type,status,client_status) VALUES (?,?,?,?,?,?,?,'pending')`,
    [id, title, description, clientId, lawyerId, type, status]
  );
  const created = await queryOne('SELECT * FROM cases WHERE id = ?', [id]);
  if (!created) throw new AppError('Failed to create case', 500);
  res.status(201).json(parseCase(created));
}));

casesRouter.post('/with-client', validate(caseWithClientSchema), asyncHandler(async (req, res) => {
  const { email, password, name, phone, city, title, description, type, lawyerId } = req.body;
  const exists = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (exists) throw new AppError('A user with this email already exists', 409);
  const clientId = uuid();
  const hash = await bcrypt.hash(password, 10);
  await run(
    `INSERT INTO users (id,email,password_hash,name,role,phone,city,is_verified,verification_status)
     VALUES (?,?,?,?,'client',?,?,1,'approved')`,
    [clientId, email, hash, name, phone || null, city || null]
  );
  const caseId = uuid();
  await run(
    `INSERT INTO cases (id,title,description,client_id,lawyer_id,type,status,client_status) VALUES (?,?,?,?,?,?,'pending','pending')`,
    [caseId, title, description || '', clientId, lawyerId, type || 'General']
  );
  const created = await queryOne('SELECT * FROM cases WHERE id = ?', [caseId]);
  res.status(201).json({ client: toPublic({ id: clientId, email, name, role: 'client', phone, city }), case: parseCase(created) });
}));

casesRouter.patch('/:id/respond', validate(caseRespondSchema), asyncHandler(async (req, res) => {
  const c = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  if (!c) throw new AppError('Case not found', 404);
  if (c.client_id !== req.user.id) throw new AppError('Only the assigned client can respond', 403);
  if (c.client_status !== 'pending') throw new AppError('Case already responded to', 400);
  const { clientStatus } = req.body;
  await run('UPDATE cases SET client_status=?,updated_at=? WHERE id=?', [clientStatus, new Date().toISOString(), req.params.id]);
  if (clientStatus === 'approved') {
    await run("UPDATE cases SET status='active' WHERE id=?", [req.params.id]);
  }
  const updated = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  res.json(parseCase(updated));
}));

// ── CLOSE CASE FLOW ─────────────────────────────────────────
casesRouter.patch('/:id/request-close', asyncHandler(async (req, res) => {
  const c = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  if (!c) throw new AppError('Case not found', 404);
  if (req.user.role === 'lawyer' && c.lawyer_id !== req.user.id) throw new AppError('Unauthorized', 403);
  if (req.user.role === 'client' && c.client_id !== req.user.id) throw new AppError('Unauthorized', 403);
  if (!['active', 'pending'].includes(c.status)) throw new AppError('Case cannot be closed from current status', 400);
  if (c.status === 'closed') throw new AppError('Case already closed', 400);
  const field = req.user.role === 'lawyer' ? 'close_requested_by_lawyer' : 'close_requested_by_client';
  await run(`UPDATE cases SET ${field}=1,updated_at=? WHERE id=?`, [new Date().toISOString(), req.params.id]);
  const updated = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  res.json(parseCase(updated));
}));

casesRouter.patch('/:id/confirm-close', asyncHandler(async (req, res) => {
  const c = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  if (!c) throw new AppError('Case not found', 404);
  if (req.user.role === 'lawyer' && c.lawyer_id !== req.user.id) throw new AppError('Unauthorized', 403);
  if (req.user.role === 'client' && c.client_id !== req.user.id) throw new AppError('Unauthorized', 403);
  if (!c.close_requested_by_lawyer && !c.close_requested_by_client) throw new AppError('No close request pending', 400);
  const field = req.user.role === 'lawyer' ? 'close_requested_by_lawyer' : 'close_requested_by_client';
  await run(`UPDATE cases SET ${field}=1,status='closed',updated_at=? WHERE id=?`, [new Date().toISOString(), req.params.id]);
  const updated = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  res.json(parseCase(updated));
}));

// ── REVIEWS ─────────────────────────────────────────────────
casesRouter.post('/:id/review', asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) throw new AppError('Rating must be 1-5', 400);
  const c = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  if (!c) throw new AppError('Case not found', 404);
  if (c.client_id !== req.user.id) throw new AppError('Only the client can leave a review', 403);
  if (c.status !== 'closed') throw new AppError('Case must be closed before reviewing', 400);
  const existing = await queryOne('SELECT id FROM reviews WHERE case_id=? AND client_id=?', [req.params.id, req.user.id]);
  if (existing) throw new AppError('Review already exists for this case', 409);
  const id = uuid();
  await run('INSERT INTO reviews (id,case_id,client_id,lawyer_id,rating,comment) VALUES (?,?,?,?,?,?)',
    [id, req.params.id, req.user.id, c.lawyer_id, rating, comment || '']);
  res.status(201).json(await queryOne('SELECT * FROM reviews WHERE id = ?', [id]));
}));

casesRouter.get('/:id/reviews', asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM reviews WHERE case_id=? ORDER BY created_at DESC', [req.params.id]);
  res.json(rows);
}));

casesRouter.get('/reviews/lawyer/:lawyerId', asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM reviews WHERE lawyer_id=? ORDER BY created_at DESC', [req.params.lawyerId]);
  const stats = await queryOne('SELECT COUNT(*) as count, ROUND(AVG(rating),1) as avg FROM reviews WHERE lawyer_id=?', [req.params.lawyerId]);
  res.json({ reviews: rows, stats: { count: stats?.count || 0, avg: Number(stats?.avg) || 0 } });
}));

casesRouter.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  if (!existing) throw new AppError('Case not found', 404);
  if (req.user.role === 'lawyer' && existing.lawyer_id !== req.user.id) {
    throw new AppError('Unauthorized to delete this case', 403);
  }
  await run('DELETE FROM cases WHERE id = ?', [req.params.id]);
  res.json({ ok: true, message: 'Case deleted' });
}));

casesRouter.patch('/:id', validate(caseUpdateSchema), asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  if (!existing) throw new AppError('Case not found', 404);
  const { title, description, status, type, timeline, documents, courtDates, lawyerId, closeRequestedByLawyer, closeRequestedByClient } = req.body;
  await run(
    `UPDATE cases SET title=?,description=?,status=?,type=?,timeline=?,documents=?,court_dates=?,lawyer_id=?,close_requested_by_lawyer=?,close_requested_by_client=?,updated_at=? WHERE id=?`,
    [
      title ?? existing.title, description ?? existing.description,
      status ?? existing.status, type ?? existing.type,
      timeline ? JSON.stringify(timeline) : existing.timeline,
      documents ? JSON.stringify(documents) : existing.documents,
      courtDates ? JSON.stringify(courtDates) : existing.court_dates,
      lawyerId ?? existing.lawyer_id,
      closeRequestedByLawyer != null ? (closeRequestedByLawyer ? 1 : 0) : existing.close_requested_by_lawyer,
      closeRequestedByClient != null ? (closeRequestedByClient ? 1 : 0) : existing.close_requested_by_client,
      new Date().toISOString(), req.params.id,
    ]
  );
  const updated = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  res.json(parseCase(updated));
}));
