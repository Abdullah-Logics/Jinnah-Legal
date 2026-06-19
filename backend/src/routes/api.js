import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { run, query, queryOne } from '../db/adapter.js';
import { auth } from '../middleware/auth.js';
import { toPublic } from './auth.js';
import {
  validate, messageSchema, invoiceSchema, timeEntrySchema,
  journalSchema, journalUpdateSchema, adminVerifySchema, userUpdateSchema,
  firmRegisterSchema,
} from '../middleware/validate.js';
import bcrypt from 'bcryptjs';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const apiRouter = Router();
apiRouter.use(auth);

function safeJson(v, def) {
  try { return v ? JSON.parse(v) : def; } catch { return def; }
}

// ── USERS ─────────────────────────────────────────────────
apiRouter.get('/users/lawyers', asyncHandler(async (_req, res) => {
  const rows = await query(`SELECT * FROM users WHERE role = 'lawyer' AND is_verified = 1`);
  res.json(rows.map(toPublic));
}));

apiRouter.get('/users/:id', asyncHandler(async (req, res) => {
  const u = await queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!u) throw new AppError('User not found', 404);
  res.json(toPublic(u));
}));

apiRouter.patch('/users/:id', validate(userUpdateSchema), asyncHandler(async (req, res) => {
  if (req.user.id !== req.params.id && !['admin','firm_admin'].includes(req.user.role)) {
    throw new AppError('Forbidden', 403);
  }
  const u = await queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!u) throw new AppError('User not found', 404);

  const { name, phone, address, city, avatar } = req.body;
  await run('UPDATE users SET name=?,phone=?,address=?,city=?,avatar=? WHERE id=?',
    [name||u.name, phone??u.phone, address??u.address, city??u.city, avatar??u.avatar, req.params.id]);

  res.json(toPublic(await queryOne('SELECT * FROM users WHERE id = ?', [req.params.id])));
}));

// ── MESSAGES ──────────────────────────────────────────────
apiRouter.get('/messages', asyncHandler(async (req, res) => {
  const { id } = req.user;
  if (req.query.with) {
    const other = req.query.with;
    const rows = await query(
      `SELECT * FROM messages WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?) ORDER BY created_at ASC`,
      [id, other, other, id]
    );
    return res.json(rows);
  }
  const rows = await query(
    `SELECT DISTINCT CASE WHEN sender_id=? THEN receiver_id ELSE sender_id END as partner_id, MAX(created_at) as last_at
     FROM messages WHERE sender_id=? OR receiver_id=? GROUP BY CASE WHEN sender_id=? THEN receiver_id ELSE sender_id END ORDER BY last_at DESC`,
    [id, id, id, id]
  );
  res.json(rows);
}));

apiRouter.post('/messages', validate(messageSchema), asyncHandler(async (req, res) => {
  const { receiverId, content, caseId } = req.body;
  const id = uuid();
  await run('INSERT INTO messages (id,sender_id,receiver_id,content,case_id) VALUES (?,?,?,?,?)',
    [id, req.user.id, receiverId, content, caseId||null]);
  res.status(201).json(await queryOne('SELECT * FROM messages WHERE id = ?', [id]));
}));

apiRouter.patch('/messages/:id/read', asyncHandler(async (req, res) => {
  await run('UPDATE messages SET is_read=1 WHERE id=? AND receiver_id=?', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

// ── INVOICES ──────────────────────────────────────────────
apiRouter.get('/invoices', asyncHandler(async (req, res) => {
  const { id, role } = req.user;
  let rows;
  if (role === 'lawyer') {
    rows = await query('SELECT * FROM invoices WHERE lawyer_id=? ORDER BY created_at DESC', [id]);
  } else if (role === 'client') {
    rows = await query('SELECT * FROM invoices WHERE client_id=? ORDER BY created_at DESC', [id]);
  } else {
    rows = await query('SELECT * FROM invoices ORDER BY created_at DESC');
  }
  res.json(rows);
}));

apiRouter.post('/invoices', validate(invoiceSchema), asyncHandler(async (req, res) => {
  const { caseId, clientId, lawyerId, amount, hours, description, dueDate } = req.body;
  const id = uuid();
  await run('INSERT INTO invoices (id,case_id,client_id,lawyer_id,amount,hours,description,due_date) VALUES (?,?,?,?,?,?,?,?)',
    [id, caseId, clientId, lawyerId, amount, hours||null, description, dueDate||null]);
  res.status(201).json(await queryOne('SELECT * FROM invoices WHERE id = ?', [id]));
}));

apiRouter.patch('/invoices/:id', asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'paid', 'overdue'].includes(status)) {
    throw new AppError('Invalid invoice status', 400);
  }
  await run('UPDATE invoices SET status=? WHERE id=?', [status, req.params.id]);
  const updated = await queryOne('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  if (!updated) throw new AppError('Invoice not found', 404);
  res.json(updated);
}));

// ── TIME TRACKING ─────────────────────────────────────────
apiRouter.get('/time-entries', asyncHandler(async (req, res) => {
  res.json(await query('SELECT * FROM time_entries WHERE lawyer_id=? ORDER BY date DESC', [req.user.id]));
}));

apiRouter.post('/time-entries', validate(timeEntrySchema), asyncHandler(async (req, res) => {
  const { caseId, hours, description, date, rate } = req.body;
  const id = uuid();
  await run('INSERT INTO time_entries (id,lawyer_id,case_id,hours,description,date,rate) VALUES (?,?,?,?,?,?,?)',
    [id, req.user.id, caseId, hours, description, date, rate]);
  res.status(201).json(await queryOne('SELECT * FROM time_entries WHERE id = ?', [id]));
}));

// ── JOURNAL ───────────────────────────────────────────────
apiRouter.get('/journal', asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM journal_entries WHERE user_id=? ORDER BY date DESC', [req.user.id]);
  res.json(rows.map(j => ({ ...j, todos: safeJson(j.todos, []) })));
}));

apiRouter.post('/journal', validate(journalSchema), asyncHandler(async (req, res) => {
  const { date, notes, todos, plans } = req.body;
  const id = uuid();
  await run('INSERT INTO journal_entries (id,user_id,date,notes,todos,plans) VALUES (?,?,?,?,?,?)',
    [id, req.user.id, date, notes, JSON.stringify(todos), plans]);
  const entry = await queryOne('SELECT * FROM journal_entries WHERE id = ?', [id]);
  res.status(201).json({ ...entry, todos: safeJson(entry.todos, []) });
}));

apiRouter.patch('/journal/:id', validate(journalUpdateSchema), asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT * FROM journal_entries WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!existing) throw new AppError('Journal entry not found', 404);

  const { notes, todos, plans } = req.body;
  await run('UPDATE journal_entries SET notes=?,todos=?,plans=? WHERE id=? AND user_id=?',
    [notes??existing.notes, todos ? JSON.stringify(todos) : existing.todos, plans??existing.plans, req.params.id, req.user.id]);
  const entry = await queryOne('SELECT * FROM journal_entries WHERE id = ?', [req.params.id]);
  res.json({ ...entry, todos: safeJson(entry.todos, []) });
}));

// ── FIRMS ──────────────────────────────────────────────────
apiRouter.post('/firms/register', validate(firmRegisterSchema), asyncHandler(async (req, res) => {
  const { name, email, password, phone, city, address, description, registrationNumber, adminName, adminPhone, documentIds } = req.body;

  const exists = await queryOne('SELECT id FROM firms WHERE email = ?', [email]);
  if (exists) throw new AppError('A firm with this email already exists', 409);

  const firmId = uuid();
  const adminId = uuid();
  const hash = await bcrypt.hash(password, 10);

  await run(
    `INSERT INTO firms (id,name,email,phone,city,address,description,registration_number,admin_id)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [firmId, name, email, phone||null, city||null, address||null, description||null, registrationNumber||null, adminId]
  );

  await run(
    `INSERT INTO users (id,email,password_hash,name,role,phone,city,firm_id,verification_status,is_verified)
     VALUES (?,?,?,?,?,?,?,?,'pending',0)`,
    [adminId, email, hash, adminName || name, 'firm_admin', adminPhone||phone||null, city||null, firmId]
  );

  if (documentIds?.length) {
    const placeholders = documentIds.map(() => '?').join(',');
    const rows = await query(`SELECT id FROM documents WHERE id IN (${placeholders}) AND user_id IS NULL`, documentIds);
    if (rows.length !== documentIds.length) throw new AppError('One or more documents not found or already claimed', 400);
    for (const docId of documentIds) {
      await run('UPDATE documents SET user_id=? WHERE id=?', [adminId, docId]);
    }
  }

  const firm = await queryOne('SELECT * FROM firms WHERE id = ?', [firmId]);
  const admin = await queryOne('SELECT * FROM users WHERE id = ?', [adminId]);
  res.status(201).json({ firm, user: toPublic(admin) });
}));

apiRouter.get('/firms', asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role === 'admin') {
    res.json(await query('SELECT * FROM firms ORDER BY created_at DESC'));
  } else if (user.role === 'firm_admin') {
    const firm = await queryOne('SELECT * FROM firms WHERE admin_id = ?', [user.id]);
    res.json(firm ? [firm] : []);
  } else {
    res.json(await query("SELECT id,name,city FROM firms WHERE is_verified = 1 ORDER BY name"));
  }
}));

apiRouter.patch('/admin/make-firm-admin/:id', asyncHandler(async (req, res) => {
  if (req.user.role !== 'firm_admin') {
    throw new AppError('Only firm admin can promote lawyers', 403);
  }
  const firm = await queryOne('SELECT id FROM firms WHERE admin_id = ?', [req.user.id]);
  if (!firm) throw new AppError('No firm found for this admin', 404);

  const target = await queryOne('SELECT * FROM users WHERE id = ? AND firm_id = ?', [req.params.id, firm.id]);
  if (!target) throw new AppError('Lawyer not found in your firm', 404);

  await run('UPDATE users SET is_firm_admin = CASE WHEN is_firm_admin = 1 THEN 0 ELSE 1 END WHERE id = ?', [req.params.id]);

  res.json({ ok: true, isFirmAdmin: target.is_firm_admin === 1 ? 0 : 1 });
}));

// ── ADMIN ─────────────────────────────────────────────────
apiRouter.get('/admin/users', asyncHandler(async (req, res) => {
  if (!['admin','firm_admin'].includes(req.user.role)) {
    throw new AppError('Forbidden', 403);
  }
  let rows;
  if (req.user.role === 'firm_admin') {
    const firm = await queryOne('SELECT id FROM firms WHERE admin_id = ?', [req.user.id]);
    if (firm) {
      rows = await query('SELECT * FROM users WHERE firm_id = ? OR id = ? ORDER BY created_at DESC', [firm.id, req.user.id]);
    } else {
      rows = [];
    }
  } else {
    rows = await query('SELECT * FROM users ORDER BY created_at DESC');
  }
  res.json(rows.map(toPublic));
}));

apiRouter.patch('/admin/verify-lawyer/:id', validate(adminVerifySchema), asyncHandler(async (req, res) => {
  if (!['admin','firm_admin'].includes(req.user.role)) {
    throw new AppError('Forbidden', 403);
  }
  const { status } = req.body;
  const targetUser = await queryOne("SELECT * FROM users WHERE id = ? AND role='lawyer'", [req.params.id]);
  if (!targetUser) throw new AppError('Lawyer not found', 404);

  if (req.user.role === 'firm_admin') {
    const firm = await queryOne('SELECT id FROM firms WHERE admin_id = ?', [req.user.id]);
    if (!firm || targetUser.firm_id !== firm.id) {
      throw new AppError('You can only verify lawyers in your firm', 403);
    }
  }

  await run("UPDATE users SET verification_status=?,is_verified=? WHERE id=?",
    [status, status === 'approved' ? 1 : 0, req.params.id]);
  res.json({ ok: true });
}));

apiRouter.get('/admin/stats', asyncHandler(async (req, res) => {
  if (!['admin','firm_admin'].includes(req.user.role)) {
    throw new AppError('Forbidden', 403);
  }

  let firmId = null;
  if (req.user.role === 'firm_admin') {
    const firm = await queryOne('SELECT id FROM firms WHERE admin_id = ?', [req.user.id]);
    firmId = firm?.id || null;
  }

  const firmFilter = firmId ? 'AND firm_id = ?' : '';
  const firmParams = firmId ? [firmId] : [];
  const firmFilter2 = firmId ? 'WHERE firm_id = ?' : '';
  const firmParams2 = firmId ? [firmId] : [];

  const [users, lawyers, clients, cases, active, pending] = await Promise.all([
    firmId
      ? queryOne('SELECT COUNT(*) as c FROM users ' + firmFilter2, firmParams2)
      : queryOne('SELECT COUNT(*) as c FROM users'),
    queryOne("SELECT COUNT(*) as c FROM users WHERE role='lawyer' " + firmFilter, firmParams),
    queryOne("SELECT COUNT(*) as c FROM users WHERE role='client' " + firmFilter, firmParams),
    queryOne('SELECT COUNT(*) as c FROM cases' + (firmId ? ' WHERE lawyer_id IN (SELECT id FROM users WHERE firm_id=?)' : ''), firmParams2),
    queryOne("SELECT COUNT(*) as c FROM cases WHERE status='active'" + (firmId ? ' AND lawyer_id IN (SELECT id FROM users WHERE firm_id=?)' : ''), firmParams2),
    queryOne("SELECT COUNT(*) as c FROM users WHERE role='lawyer' AND verification_status='pending' " + firmFilter, firmParams),
  ]);
  res.json({
    totalUsers: users?.c || 0, totalLawyers: lawyers?.c || 0, totalClients: clients?.c || 0,
    totalCases: cases?.c || 0, activeCases: active?.c || 0, pendingVerification: pending?.c || 0,
  });
}));

apiRouter.patch('/admin/verify-firm/:id', validate(adminVerifySchema), asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new AppError('Only platform admin can verify firms', 403);
  }
  const { status } = req.body;
  await run("UPDATE firms SET verification_status=?,is_verified=? WHERE id=?",
    [status, status === 'approved' ? 1 : 0, req.params.id]);
  if (status === 'approved') {
    await run("UPDATE users SET verification_status='approved',is_verified=1 WHERE firm_id=? AND role='firm_admin'",
      [req.params.id]);
  }
  res.json({ ok: true });
}));
