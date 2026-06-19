import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { run, query, queryOne } from '../db/adapter.js';
import { signToken } from '../middleware/auth.js';
import { validate, loginSchema, registerSchema } from '../middleware/validate.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const authRouter = Router();

export function toPublic(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    avatar: u.avatar || null,
    phone: u.phone || null,
    address: u.address || null,
    city: u.city || null,
    firmId: u.firm_id || null,
    coordinates: u.lat ? { lat: u.lat, lng: u.lng } : undefined,
    subscriptionPlan: u.subscription_plan || 'free',
    isVerified: !!(u.is_verified || u.is_verified === 1),
    verificationStatus: u.verification_status || 'pending',
    isFirmAdmin: !!(u.is_firm_admin || u.is_firm_admin === 1),
    credentials: u.bar_number ? {
      barNumber: u.bar_number,
      licenseNumber: u.license_number,
      specialization: u.specialization ? u.specialization.split(',').map(s => s.trim()).filter(Boolean) : [],
      experience: u.experience,
      education: u.education,
    } : undefined,
    createdAt: u.created_at,
  };
}

authRouter.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new AppError('Invalid credentials', 401);
  }

  res.json({ token: signToken(user), user: toPublic(user) });
}));

authRouter.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const { email, password, name, role, phone, city, specialization, barNumber, licenseNumber, experience, education, firmId, subscriptionPlan } = req.body;

  const exists = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (exists) {
    throw new AppError('Email already registered', 409);
  }

  const id = uuid();
  const hash = await bcrypt.hash(password, 10);
  const isVerified = 1;
  const verStatus = 'approved';

  const plan = ['free','student','starter','pro','firm'].includes(subscriptionPlan) ? subscriptionPlan : (role === 'lawyer' ? 'starter' : 'free');

  await run(
    `INSERT INTO users (id,email,password_hash,name,role,phone,city,firm_id,subscription_plan,
      is_verified,verification_status,specialization,bar_number,license_number,experience,education)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, email, hash, name, role, phone||null, city||null, firmId||null, plan, isVerified, verStatus,
     specialization||null, barNumber||null, licenseNumber||null, experience||null, education||null]
  );

  const user = await queryOne('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) {
    throw new AppError('Failed to create user', 500);
  }
  res.status(201).json({ token: signToken(user), user: toPublic(user) });
}));

authRouter.get('/me', asyncHandler(async (req, res) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) {
    throw new AppError('No token provided', 401);
  }
  try {
    const payload = JSON.parse(Buffer.from(h.slice(7).split('.')[1], 'base64').toString());
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [payload.id]);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    res.json({ user: toPublic(user) });
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
}));
