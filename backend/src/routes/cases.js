import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { run, query, queryOne } from '../db/adapter.js';
import { auth } from '../middleware/auth.js';
import { validate, caseCreateSchema, caseUpdateSchema } from '../middleware/validate.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const casesRouter = Router();
casesRouter.use(auth);

function parseCase(c) {
  if (!c) return null;
  return {
    id: c.id, title: c.title, description: c.description,
    clientId: c.client_id, lawyerId: c.lawyer_id,
    status: c.status, type: c.type,
    timeline: safeJson(c.timeline, []),
    documents: safeJson(c.documents, []),
    courtDates: safeJson(c.court_dates, []),
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
  if (!c) {
    throw new AppError('Case not found', 404);
  }
  res.json(parseCase(c));
}));

casesRouter.post('/', validate(caseCreateSchema), asyncHandler(async (req, res) => {
  const { title, description, clientId, lawyerId, type, status } = req.body;
  const id = uuid();
  await run(
    `INSERT INTO cases (id,title,description,client_id,lawyer_id,type,status) VALUES (?,?,?,?,?,?,?)`,
    [id, title, description, clientId, lawyerId, type, status]
  );
  const created = await queryOne('SELECT * FROM cases WHERE id = ?', [id]);
  if (!created) throw new AppError('Failed to create case', 500);
  res.status(201).json(parseCase(created));
}));

casesRouter.patch('/:id', validate(caseUpdateSchema), asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  if (!existing) {
    throw new AppError('Case not found', 404);
  }

  const { title, description, status, type, timeline, documents, courtDates } = req.body;

  await run(
    `UPDATE cases SET title=?,description=?,status=?,type=?,timeline=?,documents=?,court_dates=?,updated_at=? WHERE id=?`,
    [
      title ?? existing.title, description ?? existing.description,
      status ?? existing.status, type ?? existing.type,
      timeline ? JSON.stringify(timeline) : existing.timeline,
      documents ? JSON.stringify(documents) : existing.documents,
      courtDates ? JSON.stringify(courtDates) : existing.court_dates,
      new Date().toISOString(), req.params.id,
    ]
  );
  const updated = await queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  res.json(parseCase(updated));
}));
