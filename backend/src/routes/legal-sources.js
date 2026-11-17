import { createHash } from 'crypto';
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { auth } from '../middleware/auth.js';
import { requirePlatformAdmin } from '../middleware/admin.js';
import { validate } from '../middleware/validate.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { run, query, queryOne } from '../db/adapter.js';
import { indexSingleCase } from '../rag/indexer.js';
import { encryptSensitive } from '../security/encryption.js';

const OFFICIAL_DOMAINS = [
  'supremecourt.gov.pk', 'lhc.gov.pk', 'phc.gov.pk', 'shc.gov.pk',
  'bhc.gov.pk', 'ihc.gov.pk', 'fsc.gov.pk', 'na.gov.pk', 'pakistancode.gov.pk',
];

const REPUTABLE_DOMAINS = [
  'supremecourt.gov.pk', 'pakistancode.gov.pk', 'pakistanlaw.com', 'law.com.pk',
];

const legalSourceSchema = z.object({
  title: z.string().min(1).max(500),
  citation: z.string().max(150).default(''),
  court: z.string().min(1).max(200),
  year: z.number().int().min(1900).max(2100),
  parties: z.string().max(500).default(''),
  category: z.string().max(100).default('Civil'),
  description: z.string().max(5000).default(''),
  fullText: z.string().min(50).max(200000),
  sourceUrl: z.string().url().max(2000),
  sourceType: z.enum(['official_court', 'reputable_reporter']),
  docketNumber: z.string().max(150).optional().default(''),
});

function hostnameMatches(hostname, allowed) {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return allowed.some(domain => host === domain || host.endsWith(`.${domain}`));
}

function assertTrustedSource(sourceUrl, sourceType) {
  let parsed;
  try { parsed = new URL(sourceUrl); } catch { throw new AppError('Invalid source URL', 400); }
  if (parsed.protocol !== 'https:') throw new AppError('Source URL must use HTTPS', 400);

  const extra = (process.env.LEGAL_SOURCE_DOMAINS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const allowed = sourceType === 'official_court'
    ? [...OFFICIAL_DOMAINS, ...extra]
    : [...REPUTABLE_DOMAINS, ...extra];

  if (!hostnameMatches(parsed.hostname, allowed)) {
    throw new AppError('Source domain is not on the trusted official/reputable allowlist', 400);
  }
  return parsed.hostname;
}

async function audit(adminId, action, details) {
  try {
    await run(
      'INSERT INTO admin_audit_log (id,admin_id,action,details_encrypted) VALUES (?,?,?,?)',
      [uuid(), adminId, action, encryptSensitive(JSON.stringify(details))]
    );
  } catch (err) {
    console.warn('Legal source audit failed:', err.message);
  }
}

export const legalSourcesRouter = Router();
legalSourcesRouter.use(auth);
legalSourcesRouter.use(requirePlatformAdmin);

legalSourcesRouter.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const rows = await query(
    `SELECT id, title, citation, court, year, source_url, source_type, status, created_by, created_at
     FROM legal_sources ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  res.json({ rows, total: rows.length });
}));

legalSourcesRouter.post('/', validate(legalSourceSchema), asyncHandler(async (req, res) => {
  const data = req.body;
  assertTrustedSource(data.sourceUrl, data.sourceType);

  const contentHash = createHash('sha256')
    .update(`${data.sourceUrl}\n${data.fullText}`)
    .digest('hex');

  const existing = await queryOne('SELECT id FROM legal_sources WHERE content_hash=?', [contentHash]);
  if (existing) throw new AppError('This exact source has already been ingested', 409);

  const id = uuid();
  await run(
    `INSERT INTO legal_sources
      (id,title,citation,court,year,parties,category,description,full_text,source_url,source_type,content_hash,status,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.title, data.citation, data.court, data.year, data.parties, data.category,
      data.description, data.fullText, data.sourceUrl, data.sourceType, contentHash,
      'approved', req.user.id]
  );

  await run(
    `INSERT INTO citations
      (id,title,citation,court,year,parties,category,description,full_text,keywords,source_url,source_type,verification_status,verified_at,verified_by,content_hash)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.title, data.citation, data.court, data.year, data.parties, data.category,
      data.description, data.fullText, data.description, data.sourceUrl, data.sourceType,
      'verified_admin', new Date().toISOString(), req.user.id, contentHash]
  );

  await audit(req.user.id, 'legal_source_ingest', {
    id, title: data.title, citation: data.citation, sourceUrl: data.sourceUrl, sourceType: data.sourceType,
  });

  setImmediate(() => {
    indexSingleCase(id, query).catch(err => console.warn('Legal source index failed:', err.message));
  });

  res.status(201).json({ id, status: 'approved', indexing: 'queued' });
}));

legalSourcesRouter.post('/:id/reindex', asyncHandler(async (req, res) => {
  const source = await queryOne('SELECT id FROM legal_sources WHERE id=?', [req.params.id]);
  if (!source) throw new AppError('Legal source not found', 404);
  const result = await indexSingleCase(req.params.id, query);
  await audit(req.user.id, 'legal_source_reindex', { id: req.params.id, indexed: result.indexed });
  res.json({ ok: true, ...result });
}));

legalSourcesRouter.delete('/:id', asyncHandler(async (req, res) => {
  const source = await queryOne('SELECT id, title FROM legal_sources WHERE id=?', [req.params.id]);
  if (!source) throw new AppError('Legal source not found', 404);
  await run('DELETE FROM rag_chunks WHERE source_id=?', [req.params.id]);
  await run('DELETE FROM citations WHERE id=?', [req.params.id]);
  await run('DELETE FROM legal_sources WHERE id=?', [req.params.id]);
  await audit(req.user.id, 'legal_source_delete', { id: req.params.id, title: source.title });
  res.json({ ok: true });
}));
