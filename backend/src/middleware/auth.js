import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';

const SECRET = process.env.JWT_SECRET || 'jinnah-legal-dev-secret';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    SECRET,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
}

export function auth(req, _res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) {
    return next(new AppError('No authentication token provided', 401));
  }
  try {
    req.user = jwt.verify(h.slice(7), SECRET, { algorithms: ['HS256'] });
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}

export function optionalAuth(req, _res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return next();
  try {
    req.user = jwt.verify(h.slice(7), SECRET, { algorithms: ['HS256'] });
  } catch {}
  next();
}
