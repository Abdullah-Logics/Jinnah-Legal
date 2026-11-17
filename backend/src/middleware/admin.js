import { queryOne } from '../db/adapter.js';
import { AppError } from './errorHandler.js';

export async function resolveDbUser(req) {
  const user = await queryOne('SELECT id, role, is_firm_admin FROM users WHERE id=?', [req.user.id]);
  if (!user) throw new AppError('User not found', 404);
  return user;
}

export async function requirePlatformAdmin(req, _res, next) {
  try {
    const user = await resolveDbUser(req);
    if (user.role !== 'admin') throw new AppError('Admin access required', 403);
    req.dbUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAdmin(req, _res, next) {
  try {
    const user = await resolveDbUser(req);
    if (!['admin', 'firm_admin'].includes(user.role)) throw new AppError('Admin access required', 403);
    req.dbUser = user;
    next();
  } catch (err) {
    next(err);
  }
}
