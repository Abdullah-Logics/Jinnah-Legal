import { Router } from 'express';
import { queryOne, run } from '../db/adapter.js';
import { auth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const siteRouter = Router();

const SETTING_KEY = 'site_content';
let schemaReady = null;

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = run(
      `CREATE TABLE IF NOT EXISTS site_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )`
    ).catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

siteRouter.get('/content', asyncHandler(async (_req, res) => {
  await ensureSchema();
  const row = await queryOne(
    'SELECT setting_value, updated_at FROM site_settings WHERE setting_key=?',
    [SETTING_KEY]
  );
  let content = null;
  if (row?.setting_value) {
    try { content = JSON.parse(row.setting_value); } catch { content = null; }
  }
  res.set('Cache-Control', 'no-store');
  res.json({ content, updatedAt: row?.updated_at || null });
}));

siteRouter.put('/content', auth, asyncHandler(async (req, res) => {
  const user = await queryOne('SELECT role FROM users WHERE id=?', [req.user.id]);
  if (!user || user.role !== 'admin') throw new AppError('Admin access required', 403);

  const content = req.body?.content ?? req.body;
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    throw new AppError('A content object is required', 400);
  }

  const payload = JSON.stringify(content);
  if (payload.length > 300000) throw new AppError('Site content is too large (300 KB max)', 413);

  await ensureSchema();
  await run(
    `INSERT INTO site_settings (setting_key, setting_value, updated_at)
     VALUES (?,?,CURRENT_TIMESTAMP)
     ON CONFLICT (setting_key)
     DO UPDATE SET setting_value=EXCLUDED.setting_value, updated_at=CURRENT_TIMESTAMP`,
    [SETTING_KEY, payload]
  );

  res.json({ ok: true, updatedAt: new Date().toISOString() });
}));
