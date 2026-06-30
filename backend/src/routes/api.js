import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { run, query, queryOne } from '../db/adapter.js';
import { auth, optionalAuth } from '../middleware/auth.js';
import { toPublic } from './auth.js';
import {
  validate, messageSchema, connectionRequestSchema, invoiceSchema, timeEntrySchema,
  journalSchema, journalUpdateSchema, adminVerifySchema, userUpdateSchema,
  firmRegisterSchema,
} from '../middleware/validate.js';
import bcrypt from 'bcryptjs';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const apiRouter = Router();
apiRouter.use((req, res, next) => {
  if (req.path === '/firms' || req.path === '/firms/register') return optionalAuth(req, res, next);
  auth(req, res, next);
});

function safeJson(v, def) {
  try { return v ? JSON.parse(v) : def; } catch { return def; }
}

// ── USERS ─────────────────────────────────────────────────
// Static routes must come BEFORE parameterized /:id
apiRouter.get('/users/search', asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email) throw new AppError('Email query param required', 400);
  const u = await queryOne('SELECT * FROM users WHERE email=?', [email]);
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json(toPublic(u));
}));

apiRouter.get('/users/all', asyncHandler(async (req, res) => {
  const rows = await query('SELECT id,name,email,phone,city,avatar,role,firm_id FROM users WHERE id != ? ORDER BY name', [req.user.id]);
  res.json(rows);
}));

apiRouter.get('/users/lawyers', asyncHandler(async (_req, res) => {
  const rows = await query(`SELECT * FROM users WHERE role = 'lawyer' AND is_verified = 1`);
  res.json(rows.map(toPublic));
}));

apiRouter.get('/users/clients', asyncHandler(async (req, res) => {
  if (!['lawyer', 'firm_admin'].includes(req.user.role)) throw new AppError('Only lawyers can browse clients', 403);
  const rows = await query(`SELECT id,name,email,phone,city,avatar,role FROM users WHERE role = 'client' ORDER BY name`);
  res.json(rows);
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

  const { name, phone, address, city, avatar, bio } = req.body;
  await run('UPDATE users SET name=?,phone=?,address=?,city=?,avatar=?,bio=? WHERE id=?',
    [name||u.name, phone??u.phone, address??u.address, city??u.city, avatar??u.avatar, bio??u.bio, req.params.id]);

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
  // Return ALL messages for the user (for sidebar computation)
  const rows = await query(
    `SELECT * FROM messages WHERE sender_id=? OR receiver_id=? ORDER BY created_at DESC`,
    [id, id]
  );
  res.json(rows);
}));

apiRouter.post('/messages', validate(messageSchema), asyncHandler(async (req, res) => {
  const { receiverId, content, caseId, attachments, shareData, groupId } = req.body;
  const id = uuid();
  await run('INSERT INTO messages (id,sender_id,receiver_id,content,case_id,attachments,share_data,group_id) VALUES (?,?,?,?,?,?,?,?)',
    [id, req.user.id, receiverId||null, content, caseId||null, attachments||'[]', shareData||null, groupId||null]);
  res.status(201).json(await queryOne('SELECT * FROM messages WHERE id = ?', [id]));
}));

apiRouter.patch('/messages/:id/read', asyncHandler(async (req, res) => {
  await run('UPDATE messages SET is_read=1 WHERE id=? AND receiver_id=?', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

// ── CONNECTION REQUESTS ─────────────────────────────────────
apiRouter.get('/requests', asyncHandler(async (req, res) => {
  const { id } = req.user;
  const sent = await query('SELECT r.*, u.name as receiver_name, u.avatar as receiver_avatar FROM connection_requests r JOIN users u ON u.id=r.receiver_id WHERE r.sender_id=? ORDER BY r.created_at DESC', [id]);
  const received = await query('SELECT r.*, u.name as sender_name, u.avatar as sender_avatar FROM connection_requests r JOIN users u ON u.id=r.sender_id WHERE r.receiver_id=? ORDER BY r.created_at DESC', [id]);
  res.json({ sent, received });
}));

apiRouter.post('/requests', validate(connectionRequestSchema), asyncHandler(async (req, res) => {
  const { receiverId, message } = req.body;
  const { id } = req.user;
  if (id === receiverId) throw new AppError('Cannot send request to yourself', 400);
  const existing = await queryOne('SELECT id FROM connection_requests WHERE ((sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)) AND status=?', [id, receiverId, receiverId, id, 'pending']);
  if (existing) throw new AppError('Request already pending', 409);
  const conn = await queryOne('SELECT id FROM connections WHERE (user1_id=? AND user2_id=?) OR (user1_id=? AND user2_id=?)', [id, receiverId, receiverId, id]);
  if (conn) throw new AppError('Already connected', 409);
  const reqId = uuid();
  await run('INSERT INTO connection_requests (id,sender_id,receiver_id,status,message) VALUES (?,?,?,?,?)', [reqId, id, receiverId, 'pending', message||'']);
  res.status(201).json(await queryOne('SELECT * FROM connection_requests WHERE id = ?', [reqId]));
}));

apiRouter.patch('/requests/:id', asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'declined'].includes(status)) throw new AppError('Invalid status', 400);
  const request = await queryOne('SELECT * FROM connection_requests WHERE id=? AND receiver_id=?', [req.params.id, req.user.id]);
  if (!request) throw new AppError('Request not found', 404);
  if (request.status !== 'pending') throw new AppError('Request already processed', 400);
  if (status === 'accepted') {
    const connId = uuid();
    await run('INSERT INTO connections (id,user1_id,user2_id) VALUES (?,?,?)', [connId, request.sender_id, request.receiver_id]);
  }
  await run('UPDATE connection_requests SET status=?, updated_at=? WHERE id=?', [status, new Date().toISOString(), req.params.id]);
  res.json(await queryOne('SELECT * FROM connection_requests WHERE id = ?', [req.params.id]));
}));

apiRouter.get('/connections', asyncHandler(async (req, res) => {
  const { id } = req.user;
  const rows = await query(
    `SELECT c.*, u.name as connected_name, u.avatar as connected_avatar, u.role as connected_role
     FROM connections c JOIN users u ON (u.id=c.user1_id OR u.id=c.user2_id)
     WHERE (c.user1_id=? OR c.user2_id=?) AND u.id!=? ORDER BY c.created_at DESC`,
    [id, id, id]
  );
  res.json(rows);
}));

// ── WEEKLY REPORT ─────────────────────────────────────────
apiRouter.get('/weekly-report', asyncHandler(async (req, res) => {
  const { id, role } = req.user;
  const { caseId, weekStart, weekEnd } = req.query;
  const todayStr = weekStart || new Date().toISOString().split('T')[0];
  const endStr = weekEnd || new Date(Date.now() + 7 * 864e5).toISOString().split('T')[0];

  // Get cases
  let cases;
  if (caseId) {
    const c = await queryOne('SELECT * FROM cases WHERE id = ?', [caseId]);
    if (!c) throw new AppError('Case not found', 404);
    if (role === 'lawyer' && c.lawyer_id !== id) throw new AppError('Unauthorized', 403);
    if (role === 'client' && c.client_id !== id) throw new AppError('Unauthorized', 403);
    cases = [c];
  } else if (role === 'lawyer') {
    cases = await query('SELECT * FROM cases WHERE lawyer_id = ?', [id]);
  } else if (role === 'client') {
    cases = await query('SELECT * FROM cases WHERE client_id = ?', [id]);
  } else {
    cases = await query('SELECT * FROM cases');
  }

  const report = { weekStart: todayStr, weekEnd: endStr, cases: [] };

  for (const c of cases) {
    const courtDates = safeJson(c.court_dates, []);
    const timeline = safeJson(c.timeline, []);
    const upcomingCourtDates = courtDates.filter(cd => cd.date >= todayStr && cd.date <= endStr);
    const upcomingTimeline = timeline.filter(t => t.date >= todayStr && t.date <= endStr);

    // Get related journal entries for this case
    let journalEntries = [];
    try {
      journalEntries = await query(
        `SELECT * FROM journal_entries WHERE user_id=? AND date>=? AND date<=? ORDER BY date`,
        [id, todayStr, endStr]
      );
    } catch {}

    if (upcomingCourtDates.length > 0 || upcomingTimeline.length > 0 || journalEntries.length > 0) {
      report.cases.push({
        id: c.id, title: c.title, status: c.status, type: c.type,
        courtDates: upcomingCourtDates,
        timeline: upcomingTimeline,
        journalEntries: journalEntries.map(j => ({
          id: j.id, date: j.date, notes: j.notes,
          todos: safeJson(j.todos, []),
        })),
      });
    }
  }

  res.json(report);
}));

// ── FIRM REQUESTS ─────────────────────────────────────────
apiRouter.post('/firms/requests', asyncHandler(async (req, res) => {
  const { firmId, type } = req.body;
  const { id, role } = req.user;
  if (role !== 'lawyer') throw new AppError('Only lawyers can send firm requests', 403);
  if (!['join', 'withdraw'].includes(type)) throw new AppError('Type must be join or withdraw', 400);
  const firm = await queryOne('SELECT * FROM firms WHERE id=?', [firmId]);
  if (!firm) throw new AppError('Firm not found', 404);
  if (type === 'join' && req.user.firm_id) throw new AppError('Already in a firm', 400);
  if (type === 'withdraw' && req.user.firm_id !== firmId) throw new AppError('Not a member of this firm', 400);
  const existing = await queryOne('SELECT id FROM firm_requests WHERE lawyer_id=? AND firm_id=? AND status=?', [id, firmId, 'pending']);
  if (existing) throw new AppError('Request already pending', 409);
  const reqId = uuid();
  await run('INSERT INTO firm_requests (id,lawyer_id,firm_id,type) VALUES (?,?,?,?)', [reqId, id, firmId, type]);
  res.status(201).json(await queryOne('SELECT * FROM firm_requests WHERE id = ?', [reqId]));
}));

apiRouter.get('/firms/requests', asyncHandler(async (req, res) => {
  const { id, role } = req.user;
  let rows;
  if (role === 'lawyer') {
    rows = await query('SELECT fr.*, f.name as firm_name FROM firm_requests fr JOIN firms f ON f.id=fr.firm_id WHERE fr.lawyer_id=? ORDER BY fr.created_at DESC', [id]);
  } else if (role === 'firm_admin') {
    const firm = await queryOne('SELECT id FROM firms WHERE admin_id=?', [id]);
    if (!firm) return res.json([]);
    rows = await query('SELECT fr.*, u.name as lawyer_name, u.email as lawyer_email FROM firm_requests fr JOIN users u ON u.id=fr.lawyer_id WHERE fr.firm_id=? ORDER BY fr.created_at DESC', [firm.id]);
  } else {
    return res.json([]);
  }
  res.json(rows);
}));

apiRouter.patch('/firms/requests/:id', asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'declined'].includes(status)) throw new AppError('Invalid status', 400);
  const request = await queryOne('SELECT * FROM firm_requests WHERE id=?', [req.params.id]);
  if (!request) throw new AppError('Request not found', 404);
  if (request.status !== 'pending') throw new AppError('Request already processed', 400);
  const firm = await queryOne('SELECT * FROM firms WHERE id=?', [request.firm_id]);
  if (!firm || firm.admin_id !== req.user.id) throw new AppError('Not authorized', 403);
  if (status === 'approved') {
    if (request.type === 'join') {
      await run("UPDATE users SET firm_id=? WHERE id=?", [request.firm_id, request.lawyer_id]);
    } else if (request.type === 'withdraw') {
      await run("UPDATE users SET firm_id=NULL WHERE id=?", [request.lawyer_id]);
    }
  }
  await run('UPDATE firm_requests SET status=?, updated_at=? WHERE id=?', [status, new Date().toISOString(), req.params.id]);
  res.json(await queryOne('SELECT * FROM firm_requests WHERE id = ?', [req.params.id]));
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
  const { date, notes, todos, plans, content, sketch } = req.body;
  const id = uuid();
  await run('INSERT INTO journal_entries (id,user_id,date,notes,todos,plans,content,sketch) VALUES (?,?,?,?,?,?,?,?)',
    [id, req.user.id, date, notes, JSON.stringify(todos), plans, content || '', sketch || '']);
  const entry = await queryOne('SELECT * FROM journal_entries WHERE id = ?', [id]);
  res.status(201).json({ ...entry, todos: safeJson(entry.todos, []) });
}));

apiRouter.patch('/journal/:id', validate(journalUpdateSchema), asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT * FROM journal_entries WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!existing) throw new AppError('Journal entry not found', 404);

  const { notes, todos, plans, content, sketch } = req.body;
  await run('UPDATE journal_entries SET notes=?,todos=?,plans=?,content=?,sketch=? WHERE id=? AND user_id=?',
    [notes??existing.notes, todos ? JSON.stringify(todos) : existing.todos, plans??existing.plans, content ?? existing.content, sketch ?? existing.sketch, req.params.id, req.user.id]);
  const entry = await queryOne('SELECT * FROM journal_entries WHERE id = ?', [req.params.id]);
  res.json({ ...entry, todos: safeJson(entry.todos, []) });
}));

apiRouter.delete('/journal/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT * FROM journal_entries WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!existing) throw new AppError('Journal entry not found', 404);
  await run('DELETE FROM journal_entries WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  res.json({ success: true });
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
  if (!user) {
    return res.json(await query("SELECT id,name,city,is_verified FROM firms WHERE is_verified = 1 ORDER BY name"));
  }
  if (user.role === 'admin') {
    res.json(await query('SELECT * FROM firms ORDER BY created_at DESC'));
  } else if (user.role === 'firm_admin') {
    const firm = await queryOne('SELECT * FROM firms WHERE admin_id = ?', [user.id]);
    res.json(firm ? [firm] : []);
  } else {
    res.json(await query("SELECT id,name,city,is_verified FROM firms WHERE is_verified = 1 ORDER BY name"));
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
