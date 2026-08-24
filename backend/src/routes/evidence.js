import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { run, query, queryOne } from '../db/adapter.js';
import { auth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import multer from 'multer';

export const evidenceRouter = Router();
evidenceRouter.use(auth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

function dataUri(file) {
  const b64 = file.buffer.toString('base64');
  return `data:${file.mimetype || 'application/octet-stream'};base64,${b64}`;
}

/* ─── Upload evidence ──────────────────────────────────────── */
evidenceRouter.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('File required', 400);
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/tiff',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/csv', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'audio/mpeg', 'audio/wav', 'audio/webm', 'video/mp4', 'video/webm'];
  if (!allowed.includes(req.file.mimetype)) {
    throw new AppError(`Unsupported file type: ${req.file.mimetype}. Allowed: PDF, images, DOC, XLS, text, audio, video.`, 400);
  }
  const id = uuid();
  const caseId = req.body.case_id || null;
  const category = req.body.category || 'general';
  const description = req.body.description || '';
  const metadata = req.body.metadata || '{}';
  await run(
    `INSERT INTO evidence (id, user_id, case_id, name, type, file_url, file_size, category, description, metadata)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, req.user.id, caseId, req.file.originalname, req.file.mimetype.split('/')[0],
     dataUri(req.file), req.file.size, category, description, metadata]
  );
  const ev = await queryOne('SELECT * FROM evidence WHERE id=?', [id]);
  res.status(201).json(ev);
}));

/* ─── List evidence ─────────────────────────────────────────── */
evidenceRouter.get('/', asyncHandler(async (req, res) => {
  const { case_id, category, status } = req.query;
  let sql = 'SELECT * FROM evidence WHERE user_id=?';
  const params = [req.user.id];
  if (case_id) { sql += ' AND case_id=?'; params.push(case_id); }
  if (category) { sql += ' AND category=?'; params.push(category); }
  if (status) { sql += ' AND status=?'; params.push(status); }
  sql += ' ORDER BY created_at DESC';
  res.json(await query(sql, params));
}));

/* ─── Get single evidence ───────────────────────────────────── */
evidenceRouter.get('/:id', asyncHandler(async (req, res) => {
  const ev = await queryOne('SELECT * FROM evidence WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!ev) throw new AppError('Evidence not found', 404);
  const analyses = await query('SELECT * FROM evidence_analysis WHERE evidence_id=? ORDER BY created_at DESC', [ev.id]);
  res.json({ ...ev, analyses });
}));

/* ─── Delete evidence ───────────────────────────────────────── */
evidenceRouter.delete('/:id', asyncHandler(async (req, res) => {
  await run('DELETE FROM evidence WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

/* ─── AI Analyze evidence ────────────────────────────────────── */
evidenceRouter.post('/:id/analyze', asyncHandler(async (req, res) => {
  const ev = await queryOne('SELECT * FROM evidence WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!ev) throw new AppError('Evidence not found', 404);

  const hasAnalysis = await queryOne('SELECT id FROM evidence_analysis WHERE evidence_id=?', [ev.id]);
  if (hasAnalysis) {
    return res.json(await queryOne('SELECT * FROM evidence_analysis WHERE id=?', [hasAnalysis.id]));
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) throw new AppError('AI service not configured', 503);

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite' });

  const mimeToExt = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp', 'image/tiff': 'tiff',
    'text/plain': 'txt', 'text/csv': 'csv',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };

  let analysisResult;

  if (ev.type === 'image' && ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'].includes(ev.file_url?.split(';')[0]?.split(':')[1] || '')) {
    const parts = [{ text: `Analyze this evidence file: "${ev.name}". Category: ${ev.category}. Description: ${ev.description || 'N/A'}` }];
    const base64Data = ev.file_url.split(',')[1];
    parts.push({
      inlineData: { mimeType: ev.file_url.split(';')[0].split(':')[1], data: base64Data },
    });
    const result = await model.generateContent(parts);
    const text = result.response.text();
    analysisResult = parseAnalysis(text, ev);
  } else {
    const prompt = `You are a forensic evidence analyst. Analyze this evidence item:

Title: ${ev.name}
Type: ${ev.type}
Category: ${ev.category}
Description: ${ev.description || 'N/A'}
File size: ${ev.file_size} bytes

Provide a detailed analysis in this exact JSON format (return ONLY valid JSON, no markdown):
{
  "summary": "2-3 sentence analysis of what this evidence contains and its relevance",
  "facts": ["Fact 1 extracted from evidence", "Fact 2 extracted from evidence"],
  "contradictions": ["Any internal inconsistencies or issues found, or empty array if none"],
  "authenticity_assessment": "Assessment of evidence authenticity based on available information",
  "confidence_score": 0.0-1.0,
  "authenticity_score": 0.0-1.0,
  "consistency_score": 0.0-1.0,
  "tags": ["tag1", "tag2"],
  "recommendations": ["Recommendation for handling this evidence"]
}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    analysisResult = parseAnalysis(text, ev);
  }

  const id = uuid();
  await run(
    `INSERT INTO evidence_analysis (id, evidence_id, user_id, analysis_type, result, summary, facts, contradictions, confidence_score, authenticity_score, consistency_score, tags)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, ev.id, req.user.id, 'full', JSON.stringify(analysisResult), analysisResult.summary,
     JSON.stringify(analysisResult.facts || []), JSON.stringify(analysisResult.contradictions || []),
     analysisResult.confidence_score || 0, analysisResult.authenticity_score || 0,
     analysisResult.consistency_score || 0, JSON.stringify(analysisResult.tags || [])]
  );
  await run('UPDATE evidence SET status=? WHERE id=?', ['analyzed', ev.id]);

  const analysis = await queryOne('SELECT * FROM evidence_analysis WHERE id=?', [id]);
  res.json(analysis);
}));

/* ─── Re-analyze evidence ───────────────────────────────────── */
evidenceRouter.post('/:id/reanalyze', asyncHandler(async (req, res) => {
  await run('DELETE FROM evidence_analysis WHERE evidence_id=?', [req.params.id]);
  await run("UPDATE evidence SET status='pending' WHERE id=?", [req.params.id]);
  const { default: app } = await import('../app.js');
  const { Router } = await import('express');
  res.redirect(307, `/api/evidence/${req.params.id}/analyze`);
}));

function parseAnalysis(text, ev) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return {
      summary: text.slice(0, 500),
      facts: [],
      contradictions: [],
      authenticity_assessment: 'Analysis completed',
      confidence_score: 0.5,
      authenticity_score: 0.5,
      consistency_score: 0.5,
      tags: [ev.category],
      recommendations: ['Review evidence manually'],
    };
  } catch {
    return {
      summary: text.slice(0, 500) || 'Analysis completed',
      facts: [],
      contradictions: [],
      authenticity_assessment: 'Analysis completed',
      confidence_score: 0.5,
      authenticity_score: 0.5,
      consistency_score: 0.5,
      tags: [ev.category],
      recommendations: ['Review evidence manually'],
    };
  }
}

/* ─── Update evidence metadata ──────────────────────────────── */
evidenceRouter.patch('/:id', asyncHandler(async (req, res) => {
  const ev = await queryOne('SELECT * FROM evidence WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!ev) throw new AppError('Evidence not found', 404);
  const { name, description, category, case_id, metadata } = req.body;
  if (name) await run('UPDATE evidence SET name=? WHERE id=?', [name, req.params.id]);
  if (description !== undefined) await run('UPDATE evidence SET description=? WHERE id=?', [description, req.params.id]);
  if (category) await run('UPDATE evidence SET category=? WHERE id=?', [category, req.params.id]);
  if (case_id !== undefined) await run('UPDATE evidence SET case_id=? WHERE id=?', [case_id, req.params.id]);
  if (metadata) await run('UPDATE evidence SET metadata=? WHERE id=?', [JSON.stringify(metadata), req.params.id]);
  await run("UPDATE evidence SET updated_at=NOW() WHERE id=?", [req.params.id]);
  res.json(await queryOne('SELECT * FROM evidence WHERE id=?', [req.params.id]));
}));
