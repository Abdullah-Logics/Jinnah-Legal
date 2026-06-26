import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { run, query, queryOne } from '../db/adapter.js';
import { auth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const callLogsRouter = Router();
callLogsRouter.use(auth);

callLogsRouter.post('/', asyncHandler(async (req, res) => {
  const { receiverId, type, status, duration, startedAt, endedAt } = req.body;
  if (!receiverId || !type || !status) throw new AppError('receiverId, type, status required', 400);
  if (!['audio', 'video'].includes(type)) throw new AppError('Invalid call type', 400);
  const receiver = await queryOne('SELECT id FROM users WHERE id=?', [receiverId]);
  if (!receiver) throw new AppError('Receiver not found', 404);
  const id = uuid();
  await run(
    `INSERT INTO call_logs (id, caller_id, receiver_id, type, status, duration, started_at, ended_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, req.user.id, receiverId, type, status, duration || 0, startedAt || null, endedAt || null]
  );
  res.status(201).json({ id });
}));

callLogsRouter.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const logs = await query(
    `SELECT cl.*,
      (SELECT name FROM users WHERE id=cl.caller_id) as caller_name,
      (SELECT name FROM users WHERE id=cl.receiver_id) as receiver_name,
      (SELECT avatar FROM users WHERE id=cl.caller_id) as caller_avatar,
      (SELECT avatar FROM users WHERE id=cl.receiver_id) as receiver_avatar
    FROM call_logs cl
    WHERE cl.caller_id=? OR cl.receiver_id=?
    ORDER BY cl.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.id, req.user.id, Number(limit), (Number(page) - 1) * Number(limit)]
  );
  const count = (await queryOne(
    'SELECT COUNT(*) as c FROM call_logs WHERE caller_id=? OR receiver_id=?',
    [req.user.id, req.user.id]
  ))?.c || 0;
  res.json({ logs, total: count, page: Number(page), limit: Number(limit) });
}));

callLogsRouter.get('/admin/:userId', asyncHandler(async (req, res) => {
  const admin = await queryOne('SELECT role FROM users WHERE id=?', [req.user.id]);
  if (!admin || admin.role !== 'admin') throw new AppError('Admin only', 403);
  const { userId } = req.params;
  const user = await queryOne('SELECT id, name FROM users WHERE id=?', [userId]);
  if (!user) throw new AppError('User not found', 404);
  const logs = await query(
    `SELECT cl.*,
      (SELECT name FROM users WHERE id=cl.caller_id) as caller_name,
      (SELECT name FROM users WHERE id=cl.receiver_id) as receiver_name
    FROM call_logs cl
    WHERE cl.caller_id=? OR cl.receiver_id=?
    ORDER BY cl.created_at DESC`,
    [userId, userId]
  );
  res.json({ user, logs });
}));
