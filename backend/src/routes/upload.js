import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import { existsSync, mkdirSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { auth as requireAuth } from '../middleware/auth.js';
import { run, query, queryOne } from '../db/adapter.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

// Use memory storage (Vercel serverless has no persistent filesystem,
// and Render's disk storage isn't needed since we use data URIs)
const storage = multer.memoryStorage();
try {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch {
  // Vercel Lambda has read-only /var/task filesystem
}

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.xls', '.xlsx', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

const chatUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

export const uploadRouter = Router();
export { upload, chatUpload };

function dataUri(file) {
  const b64 = file.buffer.toString('base64');
  return `data:${file.mimetype || 'application/octet-stream'};base64,${b64}`;
}

uploadRouter.post('/public', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);
  const id = uuid();
  const fileUrl = dataUri(req.file);
  await run(
    'INSERT INTO documents (id,user_id,name,url,size) VALUES (?,?,?,?,?)',
    [id, null, req.file.originalname, fileUrl, req.file.size]
  );
  const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [id]);
  res.json(doc);
}));

uploadRouter.post('/', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new Error('No file uploaded');
  const id = uuid();
  const fileUrl = dataUri(req.file);
  await run(
    'INSERT INTO documents (id,user_id,name,url,size) VALUES (?,?,?,?,?)',
    [id, req.user.id, req.file.originalname, fileUrl, req.file.size]
  );
  const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [id]);
  res.json(doc);
}));

uploadRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json(await query('SELECT * FROM documents WHERE user_id=? ORDER BY created_at DESC', [req.user.id]));
}));

uploadRouter.post('/draft', requireAuth, asyncHandler(async (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) throw new AppError('Name and content are required', 400);
  const id = uuid();
  const buf = Buffer.from(content, 'utf-8');
  const fileUrl = `data:text/plain;base64,${buf.toString('base64')}`;
  await run(
    'INSERT INTO documents (id,user_id,name,url,size) VALUES (?,?,?,?,?)',
    [id, req.user.id, name + '.txt', fileUrl, buf.length]
  );
  const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [id]);
  res.json(doc);
}));

uploadRouter.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const doc = await queryOne('SELECT * FROM documents WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (!doc.url?.startsWith('data:')) {
    const filePath = path.join(UPLOAD_DIR, path.basename(doc.url));
    if (existsSync(filePath)) unlinkSync(filePath);
  }
  await run('DELETE FROM documents WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

uploadRouter.get('/:id/content', requireAuth, asyncHandler(async (req, res) => {
  const doc = await queryOne('SELECT * FROM documents WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.content) return res.json({ content: doc.content, doc });
  if (doc.url?.startsWith('data:')) {
    return res.json({ content: '', doc });
  }
  const filePath = path.join(UPLOAD_DIR, path.basename(doc.url));
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8');
    return res.json({ content, doc });
  }
  res.json({ content: '', doc });
}));

uploadRouter.post('/chat', requireAuth, chatUpload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'video/webm', 'video/mp4'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    throw new AppError('File type not allowed for chat. Allowed: images, PDF, DOC, TXT, audio, video.', 400);
  }
  res.json({
    name: req.file.originalname,
    url: dataUri(req.file),
    type: req.file.mimetype,
    size: req.file.size,
  });
}));

uploadRouter.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const doc = await queryOne('SELECT * FROM documents WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const { name, content, case_id } = req.body;
  if (name) await run('UPDATE documents SET name=? WHERE id=?', [name, req.params.id]);
  if (content !== undefined) await run('UPDATE documents SET content=? WHERE id=?', [content, req.params.id]);
  if (case_id !== undefined) await run('UPDATE documents SET case_id=? WHERE id=?', [case_id, req.params.id]);
  await run('UPDATE documents SET updated_at=? WHERE id=?', [new Date().toISOString(), req.params.id]);
  const updated = await queryOne('SELECT * FROM documents WHERE id=?', [req.params.id]);
  res.json(updated);
}));
