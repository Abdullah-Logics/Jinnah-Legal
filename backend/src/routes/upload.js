import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { auth } from '../middleware/auth.js';
import { run, query, queryOne } from '../db/adapter.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.xls', '.xlsx', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

export const uploadRouter = Router();
uploadRouter.use(auth);

uploadRouter.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new Error('No file uploaded');
  const id = uuid();
  await run(
    'INSERT INTO documents (id,user_id,name,url,size) VALUES (?,?,?,?,?)',
    [id, req.user.id, req.file.originalname, `/uploads/${req.file.filename}`, req.file.size]
  );
  const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [id]);
  res.json(doc);
}));

uploadRouter.get('/', asyncHandler(async (req, res) => {
  res.json(await query('SELECT * FROM documents WHERE user_id=? ORDER BY created_at DESC', [req.user.id]));
}));

uploadRouter.post('/draft', asyncHandler(async (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) throw new AppError('Name and content are required', 400);
  const id = uuid();
  const filename = `${id}.txt`;
  writeFileSync(path.join(UPLOAD_DIR, filename), content, 'utf-8');
  await run(
    'INSERT INTO documents (id,user_id,name,url,size) VALUES (?,?,?,?,?)',
    [id, req.user.id, name + '.txt', `/uploads/${filename}`, Buffer.byteLength(content)]
  );
  const doc = await queryOne('SELECT * FROM documents WHERE id = ?', [id]);
  res.json(doc);
}));

uploadRouter.delete('/:id', asyncHandler(async (req, res) => {
  const doc = await queryOne('SELECT * FROM documents WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const filePath = path.join(UPLOAD_DIR, path.basename(doc.url));
  if (existsSync(filePath)) unlinkSync(filePath);
  await run('DELETE FROM documents WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));
