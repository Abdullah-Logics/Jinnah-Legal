import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { run, query, queryOne } from '../db/adapter.js';
import { auth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const adminRouter = Router();
adminRouter.use(auth);

async function requireAdmin(req) {
  const user = await queryOne('SELECT * FROM users WHERE id=?', [req.user.id]);
  if (!user || user.role !== 'admin') throw new AppError('Admin access required', 403);
  return user;
}

adminRouter.get('/dashboard', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  const totalUsers = (await queryOne('SELECT COUNT(*) as c FROM users'))?.c || 0;
  const totalLawyers = (await queryOne("SELECT COUNT(*) as c FROM users WHERE role='lawyer'"))?.c || 0;
  const totalClients = (await queryOne("SELECT COUNT(*) as c FROM users WHERE role='client'"))?.c || 0;
  const pendingReports = (await queryOne("SELECT COUNT(*) as c FROM reports WHERE status='pending'"))?.c || 0;
  const activeBlocks = (await queryOne('SELECT COUNT(*) as c FROM blocks WHERE unblocked_at IS NULL'))?.c || 0;
  const totalCases = (await queryOne('SELECT COUNT(*) as c FROM cases'))?.c || 0;
  res.json({ totalUsers, totalLawyers, totalClients, pendingReports, activeBlocks, totalCases });
}));

adminRouter.get('/users', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  const { role, search, page = 1, limit = 20 } = req.query;
  let sql = 'SELECT id, email, name, role, phone, city, is_verified, verification_status, created_at FROM users WHERE 1=1';
  const params = [];
  if (role) { sql += ' AND role=?'; params.push(role); }
  if (search) { sql += ' AND (name ILIKE ? OR email ILIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));
  const users = await query(sql, params);
  const count = (await queryOne('SELECT COUNT(*) as c FROM users'))?.c || 0;
  res.json({ users, total: count, page: Number(page), limit: Number(limit) });
}));

adminRouter.get('/messages/:userId', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  const { userId } = req.params;
  const targetUser = await queryOne('SELECT id, name, email FROM users WHERE id=?', [userId]);
  if (!targetUser) throw new AppError('User not found', 404);
  const messages = await query(
    `SELECT m.*, 
      (SELECT name FROM users WHERE id=m.sender_id) as sender_name,
      (SELECT name FROM users WHERE id=m.receiver_id) as receiver_name
    FROM messages m 
    WHERE m.sender_id=? OR m.receiver_id=?
    ORDER BY m.created_at ASC`,
    [userId, userId]
  );
  res.json({ user: targetUser, messages });
}));

adminRouter.get('/messages', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  const { page = 1, limit = 50, userId } = req.query;
  let sql = `SELECT m.*,
    (SELECT name FROM users WHERE id=m.sender_id) as sender_name,
    (SELECT name FROM users WHERE id=m.receiver_id) as receiver_name,
    (SELECT email FROM users WHERE id=m.sender_id) as sender_email,
    (SELECT email FROM users WHERE id=m.receiver_id) as receiver_email
    FROM messages m WHERE 1=1`;
  const params = [];
  if (userId) { sql += ' AND (m.sender_id=? OR m.receiver_id=?)'; params.push(userId, userId); }
  sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), (Number(page) - 1) * Number(limit));
  const messages = await query(sql, params);
  const count = (await queryOne('SELECT COUNT(*) as c FROM messages'))?.c || 0;
  res.json({ messages, total: count });
}));

adminRouter.post('/block', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  const { userId, reason } = req.body;
  if (!userId) throw new AppError('userId required', 400);
  const target = await queryOne('SELECT * FROM users WHERE id=?', [userId]);
  if (!target) throw new AppError('User not found', 404);
  const existing = await queryOne('SELECT id FROM blocks WHERE user_id=? AND unblocked_at IS NULL', [userId]);
  if (existing) throw new AppError('User already blocked', 409);
  const id = uuid();
  await run(
    'INSERT INTO blocks (id, user_id, email, phone, blocked_by, reason, type) VALUES (?,?,?,?,?,?,?)',
    [id, userId, target.email, target.phone || '', req.user.id, reason || 'Violated terms of service', 'user']
  );
  res.status(201).json({ id, message: 'User blocked' });
}));

adminRouter.post('/unblock/:blockId', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  const block = await queryOne('SELECT * FROM blocks WHERE id=?', [req.params.blockId]);
  if (!block) throw new AppError('Block record not found', 404);
  if (block.unblocked_at) throw new AppError('User already unblocked', 400);
  await run('UPDATE blocks SET unblocked_by=?, unblocked_at=NOW() WHERE id=?', [req.user.id, req.params.blockId]);
  res.json({ ok: true, message: 'User unblocked' });
}));

adminRouter.get('/blocks', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  const { active } = req.query;
  let sql = `SELECT b.*,
    (SELECT name FROM users WHERE id=b.user_id) as user_name,
    (SELECT email FROM users WHERE id=b.user_id) as user_email,
    (SELECT name FROM users WHERE id=b.blocked_by) as blocked_by_name
    FROM blocks b`;
  const params = [];
  if (active === 'true' || active === '1') { sql += ' WHERE b.unblocked_at IS NULL'; }
  sql += ' ORDER BY b.created_at DESC';
  const blocks = await query(sql, params);
  res.json(blocks);
}));

adminRouter.get('/reports', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  const { status } = req.query;
  let sql = `SELECT r.*,
    (SELECT name FROM users WHERE id=r.reporter_id) as reporter_name,
    (SELECT name FROM users WHERE id=r.reported_id) as reported_name,
    (SELECT email FROM users WHERE id=r.reported_id) as reported_email
    FROM reports r`;
  const params = [];
  if (status) { sql += ' WHERE r.status=?'; params.push(status); }
  sql += ' ORDER BY r.created_at DESC';
  res.json(await query(sql, params));
}));

adminRouter.post('/warn/:userId', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  const { userId } = req.params;
  const { message } = req.body;
  const target = await queryOne('SELECT id, name, email FROM users WHERE id=?', [userId]);
  if (!target) throw new AppError('User not found', 404);
  const msgId = uuid();
  await run(
    'INSERT INTO messages (id, sender_id, receiver_id, content) VALUES (?,?,?,?)',
    [msgId, req.user.id, userId, `⚠️ WARNING from Platform Admin: ${message || 'Please review our terms of service.'}`]
  );
  res.json({ ok: true, message: 'Warning sent' });
}));
