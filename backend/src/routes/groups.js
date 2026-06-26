import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { run, query, queryOne } from '../db/adapter.js';
import { auth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const groupsRouter = Router();
groupsRouter.use(auth);

groupsRouter.post('/', asyncHandler(async (req, res) => {
  const { name, type, caseId, memberIds } = req.body;
  if (!name) throw new AppError('Group name required', 400);
  const groupType = type || 'group';
  if (!['group', 'case_group', 'general'].includes(groupType)) throw new AppError('Invalid group type', 400);
  if (groupType === 'case_group' && !caseId) throw new AppError('caseId required for case groups', 400);
  const id = uuid();
  await run(
    'INSERT INTO groups_table (id, name, type, case_id, created_by) VALUES (?,?,?,?,?)',
    [id, name, groupType, caseId || null, req.user.id]
  );
  const memberId = uuid();
  await run(
    'INSERT INTO group_members (id, group_id, user_id, role) VALUES (?,?,?,?)',
    [memberId, id, req.user.id, 'admin']
  );
  if (memberIds && Array.isArray(memberIds)) {
    for (const uid of memberIds) {
      if (uid === req.user.id) continue;
      const user = await queryOne('SELECT id FROM users WHERE id=?', [uid]);
      if (!user) continue;
      const gmid = uuid();
      await run(
        'INSERT INTO group_members (id, group_id, user_id, role) VALUES (?,?,?,?)',
        [gmid, id, uid, 'member']
      );
    }
  }
  res.status(201).json({ id, name, type: groupType });
}));

groupsRouter.get('/', asyncHandler(async (req, res) => {
  const groups = await query(
    `SELECT g.*,
      (SELECT name FROM users WHERE id=g.created_by) as created_by_name,
      (SELECT COUNT(*) FROM group_members WHERE group_id=g.id) as member_count
    FROM groups_table g
    WHERE g.id IN (SELECT group_id FROM group_members WHERE user_id=?)
    ORDER BY g.created_at DESC`,
    [req.user.id]
  );
  res.json(groups);
}));

groupsRouter.get('/:id', asyncHandler(async (req, res) => {
  const group = await queryOne(
    `SELECT g.*,
      (SELECT name FROM users WHERE id=g.created_by) as created_by_name
    FROM groups_table g WHERE g.id=?`,
    [req.params.id]
  );
  if (!group) throw new AppError('Group not found', 404);
  const isMember = await queryOne(
    'SELECT id FROM group_members WHERE group_id=? AND user_id=?',
    [req.params.id, req.user.id]
  );
  if (!isMember) throw new AppError('Not a member of this group', 403);
  const members = await query(
    `SELECT gm.*, u.name, u.email, u.role, u.avatar
    FROM group_members gm JOIN users u ON u.id=gm.user_id
    WHERE gm.group_id=? ORDER BY gm.joined_at ASC`,
    [req.params.id]
  );
  const messages = await query(
    `SELECT m.*,
      (SELECT name FROM users WHERE id=m.sender_id) as sender_name
    FROM messages m
    WHERE m.group_id=? ORDER BY m.created_at ASC`,
    [req.params.id]
  );
  res.json({ ...group, members, messages });
}));

groupsRouter.post('/:id/members', asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  if (!userIds || !Array.isArray(userIds)) throw new AppError('userIds array required', 400);
  const membership = await queryOne(
    'SELECT role FROM group_members WHERE group_id=? AND user_id=?',
    [req.params.id, req.user.id]
  );
  if (!membership || membership.role !== 'admin') throw new AppError('Only group admin can add members', 403);
  for (const uid of userIds) {
    const exists = await queryOne(
      'SELECT id FROM group_members WHERE group_id=? AND user_id=?',
      [req.params.id, uid]
    );
    if (exists) continue;
    const user = await queryOne('SELECT id FROM users WHERE id=?', [uid]);
    if (!user) continue;
    const gmid = uuid();
    await run(
      'INSERT INTO group_members (id, group_id, user_id, role) VALUES (?,?,?,?)',
      [gmid, req.params.id, uid, 'member']
    );
  }
  const members = await query(
    `SELECT gm.*, u.name, u.email, u.role, u.avatar
    FROM group_members gm JOIN users u ON u.id=gm.user_id
    WHERE gm.group_id=? ORDER BY gm.joined_at ASC`,
    [req.params.id]
  );
  res.json(members);
}));

groupsRouter.delete('/:groupId/members/:userId', asyncHandler(async (req, res) => {
  const membership = await queryOne(
    'SELECT role FROM group_members WHERE group_id=? AND user_id=?',
    [req.params.groupId, req.user.id]
  );
  if (!membership || membership.role !== 'admin') throw new AppError('Only group admin can remove members', 403);
  if (req.user.id === req.params.userId) throw new AppError('Cannot remove yourself as admin', 400);
  await run(
    'DELETE FROM group_members WHERE group_id=? AND user_id=?',
    [req.params.groupId, req.params.userId]
  );
  res.json({ ok: true });
}));

groupsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const membership = await queryOne(
    'SELECT role FROM group_members WHERE group_id=? AND user_id=?',
    [req.params.id, req.user.id]
  );
  if (!membership || membership.role !== 'admin') throw new AppError('Only group admin can update', 403);
  const { name, avatar } = req.body;
  if (name) await run('UPDATE groups_table SET name=? WHERE id=?', [name, req.params.id]);
  if (avatar !== undefined) await run('UPDATE groups_table SET avatar=? WHERE id=?', [avatar, req.params.id]);
  res.json({ ok: true });
}));
