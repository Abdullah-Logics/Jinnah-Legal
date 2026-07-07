import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { run, query, queryOne } from '../db/adapter.js';
import { auth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const reportsRouter = Router();
reportsRouter.use(auth);

const SEVERITY = {
  'Harassment or bullying': 4,
  'Fraud or scam': 5,
  'Fake profile or impersonation': 3,
  'Inappropriate behavior': 3,
  'Spam or solicitation': 2,
  'Misleading information': 2,
  'Abusive language': 3,
  'Sharing inappropriate content': 3,
  'Threats or intimidation': 5,
  'Privacy violation': 4,
  'Other': 1,
};

async function getRecommendation(reportedId, reason) {
  const prev = await queryOne(
    'SELECT COUNT(*) as c FROM reports WHERE reported_id=? AND status IN (\'pending\',\'resolved\')',
    [reportedId]
  );
  const prevCount = Number(prev?.c || 0);
  const severity = SEVERITY[reason] || 1;

  let action = 'review';
  if (severity >= 5 || prevCount >= 3) action = 'block';
  else if (severity >= 3 || prevCount >= 1) action = 'warn';
  else action = 'dismiss';

  return { prevReports: prevCount, severity, recommendedAction: action };
}

reportsRouter.post('/', asyncHandler(async (req, res) => {
  const { reportedId, reason, description } = req.body;
  if (!reportedId || !reason) throw new AppError('reportedId and reason required', 400);
  if (reportedId === req.user.id) throw new AppError('Cannot report yourself', 400);
  const target = await queryOne('SELECT id FROM users WHERE id=?', [reportedId]);
  if (!target) throw new AppError('User not found', 404);
  const id = uuid();
  await run(
    'INSERT INTO reports (id, reporter_id, reported_id, reason, description) VALUES (?,?,?,?,?)',
    [id, req.user.id, reportedId, reason, description || '']
  );
  res.status(201).json({ id });
}));

reportsRouter.get('/', asyncHandler(async (req, res) => {
  const { status } = req.query;
  const user = await queryOne('SELECT role FROM users WHERE id=?', [req.user.id]);
  if (!user || user.role !== 'admin') throw new AppError('Admin only', 403);
  let sql = `SELECT r.*,
    (SELECT name FROM users WHERE id=r.reporter_id::uuid) as reporter_name,
    (SELECT name FROM users WHERE id=r.reported_id::uuid) as reported_name,
    (SELECT email FROM users WHERE id=r.reported_id::uuid) as reported_email,
    (SELECT role FROM users WHERE id=r.reported_id::uuid) as reported_role,
    (SELECT created_at FROM users WHERE id=r.reported_id::uuid) as reported_joined
    FROM reports r`;
  const params = [];
  if (status) { sql += ' WHERE r.status=?'; params.push(status); }
  sql += ' ORDER BY r.created_at DESC';
  const rows = await query(sql, params);
  const enriched = await Promise.all(rows.map(async (r) => {
    const rec = await getRecommendation(r.reported_id, r.reason);
    return { ...r, ...rec };
  }));
  res.json(enriched);
}));

reportsRouter.patch('/:id/resolve', asyncHandler(async (req, res) => {
  const user = await queryOne('SELECT role FROM users WHERE id=?', [req.user.id]);
  if (!user || user.role !== 'admin') throw new AppError('Admin only', 403);
  const { action } = req.body;
  if (!['resolve', 'dismiss'].includes(action)) throw new AppError('Invalid action', 400);
  const report = await queryOne('SELECT * FROM reports WHERE id=?', [req.params.id]);
  if (!report) throw new AppError('Report not found', 404);
  const status = action === 'resolve' ? 'resolved' : 'dismissed';
  await run('UPDATE reports SET status=?, resolved_by=?, resolved_at=NOW() WHERE id=?',
    [status, req.user.id, req.params.id]);
  res.json({ ok: true, status });
}));

reportsRouter.post('/:id/warn', asyncHandler(async (req, res) => {
  const user = await queryOne('SELECT role FROM users WHERE id=?', [req.user.id]);
  if (!user || user.role !== 'admin') throw new AppError('Admin only', 403);
  const report = await queryOne('SELECT * FROM reports WHERE id=?', [req.params.id]);
  if (!report) throw new AppError('Report not found', 404);
  const target = await queryOne('SELECT * FROM users WHERE id=?', [report.reported_id]);
  if (!target) throw new AppError('Reported user not found', 404);
  const msgId = uuid();
  await run(
    'INSERT INTO messages (id, sender_id, receiver_id, content) VALUES (?,?,?,?)',
    [msgId, req.user.id, target.id, `⚠️ Warning: You have been reported for "${report.reason}". Please review our community guidelines. Further violations may result in account suspension.`]
  );
  await run('UPDATE reports SET status=?, resolved_by=?, resolved_at=NOW() WHERE id=?',
    ['resolved', req.user.id, req.params.id]);
  res.json({ ok: true, message: 'Warning sent to user' });
}));

reportsRouter.post('/:id/block', asyncHandler(async (req, res) => {
  const user = await queryOne('SELECT role FROM users WHERE id=?', [req.user.id]);
  if (!user || user.role !== 'admin') throw new AppError('Admin only', 403);
  const report = await queryOne('SELECT * FROM reports WHERE id=?', [req.params.id]);
  if (!report) throw new AppError('Report not found', 404);
  const target = await queryOne('SELECT * FROM users WHERE id=?', [report.reported_id]);
  if (!target) throw new AppError('Reported user not found', 404);
  const existing = await queryOne('SELECT id FROM blocks WHERE user_id=? AND unblocked_at IS NULL', [target.id]);
  if (existing) throw new AppError('User is already blocked', 409);
  const blockId = uuid();
  await run(
    'INSERT INTO blocks (id, user_id, email, phone, blocked_by, reason, type) VALUES (?,?,?,?,?,?,?)',
    [blockId, target.id, target.email, target.phone || '', req.user.id, report.reason, 'user']
  );
  await run('UPDATE reports SET status=?, resolved_by=?, resolved_at=NOW() WHERE id=?',
    ['resolved', req.user.id, req.params.id]);
  res.status(201).json({ id: blockId, message: 'User blocked' });
}));
