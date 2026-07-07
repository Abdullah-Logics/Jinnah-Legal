import { Router } from 'express';
import { query, queryOne } from '../db/adapter.js';
import { auth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const PART_ORDER = `CASE part WHEN 'I' THEN 1 WHEN 'II' THEN 2 WHEN 'III' THEN 3 WHEN 'IV' THEN 4 WHEN 'V' THEN 5 WHEN 'VI' THEN 6 WHEN 'VII' THEN 7 WHEN 'VIII' THEN 8 WHEN 'IX' THEN 9 WHEN 'X' THEN 10 WHEN 'XI' THEN 11 WHEN 'XII' THEN 12 ELSE 13 END`;

export const constitutionRouter = Router();
constitutionRouter.use(auth);

constitutionRouter.get('/', asyncHandler(async (req, res) => {
  let { search, category, part, chapter, limit, offset } = req.query;
  limit = limit ? Number(limit) : 300;
  offset = offset ? Number(offset) : 0;

  let sql = 'SELECT id, part, part_title, chapter, chapter_title, article, title, content, category FROM constitution WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as c FROM constitution WHERE 1=1';
  const params = [];
  const countParams = [];

  if (search) {
    const p = `%${search}%`;
    sql += ' AND (title ILIKE ? OR content ILIKE ? OR article ILIKE ?)';
    countSql += ' AND (title ILIKE ? OR content ILIKE ? OR article ILIKE ?)';
    params.push(p, p, p);
    countParams.push(p, p, p);
  }
  if (category) { sql += ' AND category=?'; params.push(category); countSql += ' AND category=?'; countParams.push(category); }
  if (part) { sql += ' AND part=?'; params.push(part); countSql += ' AND part=?'; countParams.push(part); }
  if (chapter) { sql += ' AND chapter=?'; params.push(chapter); countSql += ' AND chapter=?'; countParams.push(chapter); }

  sql += ` ORDER BY CAST(article AS INTEGER) ASC, ${PART_ORDER} ASC`;
  if (limit > 0) { sql += ' LIMIT ?'; params.push(limit); }
  if (offset > 0) { sql += ' OFFSET ?'; params.push(offset); }

  const rows = await query(sql, params);
  const total = (await queryOne(countSql, countParams))?.c || 0;
  res.json({ rows, total });
}));

constitutionRouter.get('/structure', asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT DISTINCT part, part_title FROM constitution ORDER BY ${PART_ORDER} ASC`
  );
  const parts = [];
  for (const p of rows) {
    const chapters = await query(
      `SELECT DISTINCT chapter, chapter_title FROM constitution WHERE part=? AND chapter != '' ORDER BY CAST(chapter AS INTEGER) ASC`,
      [p.part]
    );
    const count = await queryOne('SELECT COUNT(*) as c FROM constitution WHERE part=?', [p.part]);
    parts.push({ ...p, chapters, articleCount: Number(count?.c || 0) });
  }
  res.json(parts);
}));

constitutionRouter.get('/categories', asyncHandler(async (req, res) => {
  const rows = await query('SELECT DISTINCT category, COUNT(*) as count FROM constitution GROUP BY category ORDER BY category ASC');
  res.json(rows);
}));

constitutionRouter.get('/:id', asyncHandler(async (req, res) => {
  const row = await queryOne('SELECT * FROM constitution WHERE id=?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Article not found' });
  res.json(row);
}));

constitutionRouter.get('/article/:articleNo', asyncHandler(async (req, res) => {
  const row = await queryOne('SELECT * FROM constitution WHERE article=?', [req.params.articleNo]);
  if (!row) return res.status(404).json({ error: 'Article not found' });
  res.json(row);
}));
