import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { run, query, queryOne } from '../db/adapter.js';
import { auth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { z } from 'zod';

function sanitize(v) {
  if (typeof v !== 'string') return v;
  return v.replace(/[<>"'&]/g, '').trim();
}

export const citationsRouter = Router();
citationsRouter.use(auth);

/* ─── Seed: Landmark + Bulk Cases ───────────────────────────── */

citationsRouter.post('/seed', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT COUNT(*) as c FROM citations');
  if (Number(existing?.c || 0) > 20) return res.json({ message: 'Already seeded', count: existing.c });

  // Landmark Pakistani cases (cross-court)
  const milestones = [
    { title: 'PLC v. Federation of Pakistan', citation: '2024 PLD 150', court: 'Supreme Court of Pakistan', year: 2024, parties: 'Pakistan Law Commission v. Federation', category: 'Constitutional', description: 'Judicial review of executive actions under Article 184(3)', relevantStatutes: 'Article 184(3), Article 199', keywords: 'judicial review, suo motu, fundamental rights, constitutional petition' },
    { title: 'State v. Safdar Hussain', citation: '2024 SCMR 1', court: 'Supreme Court of Pakistan', year: 2024, parties: 'State v. Safdar Hussain', category: 'Criminal', description: 'Landmark judgment on right to fair trial under Article 10-A of the Constitution', relevantStatutes: 'Article 10-A, CrPC 1973', keywords: 'fair trial, due process, criminal procedure, constitutional rights' },
    { title: 'Mst. Ayesha Bibi v. State', citation: '2023 SCMR 567', court: 'Supreme Court of Pakistan', year: 2023, parties: 'Mst. Ayesha Bibi v. State', category: 'Criminal', description: 'Acquittal in blasphemy case — evidentiary standards and forensic evidence requirements', relevantStatutes: 'PPC 295-C, Qanun-e-Shahadat Order 1984', keywords: 'blasphemy, acquittal, evidence, forensic, PPC 295C' },
    { title: 'Imran Khan v. Election Commission', citation: '2023 PTD 234', court: 'Supreme Court of Pakistan', year: 2023, parties: 'Imran Khan v. Election Commission', category: 'Constitutional', description: 'Election petitions and disqualification under Article 184(3)', relevantStatutes: 'Article 62, 63, 184(3), Elections Act 2017', keywords: 'election, disqualification, Article 62, political, PTI' },
    { title: 'Human Rights Case No. 12345', citation: '2023 PLD 789', court: 'Supreme Court of Pakistan', year: 2023, parties: 'Suo Motu v. Federation', category: 'Constitutional', description: 'Right to property and environmental protection under Article 23 and 24', relevantStatutes: 'Articles 23, 24, 184(3)', keywords: 'environment, property rights, fundamental rights, suo motu' },
    { title: 'Muhammad Younis v. Addl. Sessions Judge', citation: '2023 PCrLJ 456', court: 'Lahore High Court', year: 2023, parties: 'Muhammad Younis v. Addl. Sessions Judge', category: 'Criminal', description: 'Bail considerations in non-compoundable offences under PPC', relevantStatutes: 'PPC, CrPC 497', keywords: 'bail, non-compoundable, criminal procedure, pre-arrest bail' },
    { title: 'Mst. Khadija v. Province of KP', citation: '2023 MLD 789', court: 'Peshawar High Court', year: 2023, parties: 'Mst. Khadija v. Province of KP', category: 'Criminal', description: 'Gender-based violence protections under KP Domestic Violence Act', relevantStatutes: 'KP Domestic Violence Act 2021, PPC', keywords: 'gender violence, KP, domestic violence, women, protection' },
    { title: 'Fatima Bibi v. Province of Punjab', citation: '2022 PLD 234', court: 'Supreme Court of Pakistan', year: 2022, parties: 'Fatima Bibi v. Province of Punjab', category: 'Constitutional', description: 'Women property rights and inheritance under Islamic law and Constitution', relevantStatutes: 'Articles 23, 25, Muslim Personal Law', keywords: 'inheritance, women rights, property, Islamic law, gender equality' },
    { title: 'Ali Muhammad v. State Bank of Pakistan', citation: '2022 SCMR 890', court: 'Supreme Court of Pakistan', year: 2022, parties: 'Ali Muhammad v. State Bank', category: 'Banking', description: 'Banking liability and recovery under Financial Institutions Recovery Act', relevantStatutes: 'Financial Institutions Recovery Act, Banking Companies Ordinance 1962', keywords: 'banking, recovery, financial institutions, NPL' },
    { title: 'Messrs ABC Textiles v. Federation', citation: '2022 CLC 567', court: 'Lahore High Court', year: 2022, parties: 'ABC Textiles v. Federation', category: 'Corporate', description: 'Corporate taxation and sales tax refund claims', relevantStatutes: 'Income Tax Ordinance 2001, Sales Tax Act 1990', keywords: 'taxation, sales tax, refund, corporate, income tax' },
    { title: 'Province of KPK v. Sher Muhammad', citation: '2021 SCMR 345', court: 'Supreme Court of Pakistan', year: 2021, parties: 'Province of KPK v. Sher Muhammad', category: 'Criminal', description: 'Principles of qisas and diyat in murder cases under PPC', relevantStatutes: 'PPC 302, 309, 310, 311', keywords: 'qisas, diyat, murder, qatl-e-amd, blood money' },
    { title: 'Shahzad Akbar v. NAB', citation: '2021 SCMR 222', court: 'Supreme Court of Pakistan', year: 2021, parties: 'Shahzad Akbar v. NAB', category: 'Criminal', description: 'NAB laws and plea bargaining provisions under NAO 1999', relevantStatutes: 'National Accountability Ordinance 1999', keywords: 'NAB, plea bargain, accountability, corruption, NAO 1999' },
    { title: 'Muhammad Tariq v. Election Commission', citation: '2021 PLD 678', court: 'Supreme Court of Pakistan', year: 2021, parties: 'Muhammad Tariq v. Election Commission', category: 'Constitutional', description: 'Election disqualification under Article 62(1)(f)', relevantStatutes: 'Article 62(1)(f), Article 63', keywords: 'election, disqualification, parliament, constitution, Article 62' },
    { title: 'Sania Mukhtar v. Federation', citation: '2021 PCrLJ 901', court: 'Lahore High Court', year: 2021, parties: 'Sania Mukhtar v. Federation', category: 'Criminal', description: 'Child custody and guardianship laws - welfare of minor', relevantStatutes: 'Guardians and Wards Act 1890, Family Courts Act 1964', keywords: 'child custody, guardianship, minor, family law, welfare' },
    { title: 'Mst. Nasreen Bibi v. State', citation: '2020 PLD 444', court: 'Supreme Court of Pakistan', year: 2020, parties: 'Mst. Nasreen Bibi v. State', category: 'Criminal', description: 'Principles of qatl-e-khata (manslaughter) under PPC', relevantStatutes: 'PPC 314, 315, 316', keywords: 'manslaughter, qatl-e-khata, homicide, PPC 314, criminal' },
    { title: 'Mst. Zahida Bibi v. Province of Sindh', citation: '2020 PLD 334', court: 'Supreme Court of Pakistan', year: 2020, parties: 'Mst. Zahida Bibi v. Province of Sindh', category: 'Criminal', description: 'Honor killing laws and evidentiary requirements under PPC 302/311', relevantStatutes: 'PPC 302, 311, 338, CrPC', keywords: 'honor killing, qatl, murder, women, gender violence' },
    { title: 'Muhammad Aslam v. Federation', citation: '2020 SCMR 112', court: 'Supreme Court of Pakistan', year: 2020, parties: 'Muhammad Aslam v. Federation', category: 'Service', description: 'Service termination and principles of natural justice', relevantStatutes: 'Civil Servants Act 1973, Service Tribunals Act', keywords: 'service, termination, natural justice, departmental proceedings, employment' },
    { title: 'Al-Huda Enterprise v. Federation', citation: '2020 YLR 567', court: 'Sindh High Court', year: 2020, parties: 'Al-Huda Enterprise v. Federation', category: 'Corporate', description: 'Contractual disputes and arbitration under Arbitration Act 1940', relevantStatutes: 'Arbitration Act 1940, Contract Act 1872', keywords: 'arbitration, contract, dispute resolution, commercial' },
    { title: 'Muhammad Arif v. State', citation: '2019 SCMR 778', court: 'Supreme Court of Pakistan', year: 2019, parties: 'Muhammad Arif v. State', category: 'Criminal', description: 'Narcotics control and sentencing under CNSA 1997', relevantStatutes: 'Control of Narcotic Substances Act 1997', keywords: 'narcotics, drugs, sentencing, CNSA, controlled substances' },
    { title: 'Human Rights Case No. 9876', citation: '2019 PLD 901', court: 'Supreme Court of Pakistan', year: 2019, parties: 'Suo Motu v. Federation', category: 'Constitutional', description: 'Right to clean environment under Article 9', relevantStatutes: 'Articles 9, 14, 184(3)', keywords: 'environment, clean water, smog, climate change, fundamental rights' },
  ];

  let inserted = 0;
  for (const c of milestones) {
    await run(
      `INSERT INTO citations (id,title,citation,court,year,parties,category,description,relevant_statutes,keywords)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [uuid(), c.title, c.citation, c.court, c.year, c.parties, c.category, c.description, c.relevantStatutes, c.keywords]
    );
    inserted++;
  }
  res.status(201).json({ message: `${inserted} landmark cases seeded`, count: inserted });
}));

/* ─── Seed: Expand with Additional Courts ──────────────────── */

citationsRouter.post('/seed-expand', asyncHandler(async (req, res) => {
  const { seedExpand } = await import('../db/seed-expand.js');
  const result = await seedExpand();
  res.json(result || { message: 'Expansion complete' });
}));

/* ─── Bulk Import from External Dataset ─────────────────────── */

citationsRouter.post('/bulk', asyncHandler(async (req, res) => {
  const { cases } = req.body;
  if (!Array.isArray(cases) || cases.length === 0) throw new AppError('cases array required', 400);
  let imported = 0;
  for (const c of cases) {
    if (!c.title || !c.year || !c.court) continue;
    await run(
      `INSERT INTO citations (id,title,citation,court,year,parties,category,description,full_text,relevant_statutes,keywords)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        uuid(), c.title, c.citation || '', c.court, c.year, c.parties || '',
        c.category || 'Civil', (c.description || '').slice(0, 500),
        (c.full_text || '').slice(0, 50000), c.relevantStatutes || '', c.keywords || ''
      ]
    );
    imported++;
  }
  res.status(201).json({ message: `${imported} cases imported`, count: imported });
}));

/* ─── Search / List (cross-DB compatible) ─────────────────── */

function isPostgres() {
  return !!(process.env.DATABASE_URL && !process.env.SUPABASE_URL);
}

function isSupabaseJs() {
  return !!(process.env.SUPABASE_URL || (process.env.DATABASE_URL && process.env.SUPABASE_ANON_KEY));
}

function likeQuery(cols) {
  return cols.map(c => `LOWER(${c}) LIKE LOWER(?)`).join(' OR ');
}

const searchQuerySchema = z.object({
  search: z.string().max(200).optional(),
  category: z.string().max(50).optional(),
  year_from: z.coerce.number().int().min(1900).max(2100).optional(),
  year_to: z.coerce.number().int().min(1900).max(2100).optional(),
  court: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(0).max(1000).optional().default(50),
  offset: z.coerce.number().int().min(0).max(10000).optional().default(0),
  mode: z.enum(['fts', 'fuzzy', 'basic']).optional().default('fts'),
});

citationsRouter.get('/', asyncHandler(async (req, res) => {
  let parsed;
  try {
    parsed = searchQuerySchema.parse(req.query);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const details = err.issues.map(e => ({ field: e.path.join('.'), message: e.message }));
      throw new AppError('Invalid search parameters', 400, details);
    }
    throw err;
  }
  let { search, category, year_from, year_to, court, limit, offset, mode } = parsed;
  search = search ? sanitize(search) : search;
  category = category ? sanitize(category) : category;
  court = court ? sanitize(court) : court;
  const pg = isPostgres();

  let sql, countSql;
  const params = [];
  const countParams = [];

  const pgDirect = pg && !isSupabaseJs();
  if (search) {
    const searchCols = ['title','citation','parties','keywords','description','full_text','relevant_statutes'];
    const p = `%${search}%`;
    if (pgDirect && mode === 'fts') {
      sql = `SELECT id, title, citation, court, year, parties, category, description, relevant_statutes, keywords, created_at,
             ts_rank(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(keywords,'') || ' ' || coalesce(full_text,'') || ' ' || coalesce(parties,'') || ' ' || coalesce(relevant_statutes,'') || ' ' || coalesce(citation,'')), plainto_tsquery('english',?)) as rank
             FROM citations
             WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(keywords,'') || ' ' || coalesce(full_text,'') || ' ' || coalesce(parties,'') || ' ' || coalesce(relevant_statutes,'') || ' ' || coalesce(citation,'')) @@ plainto_tsquery('english',?)`;
      params.push(search, search);
      countSql = `SELECT COUNT(*) as c FROM citations WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(keywords,'') || ' ' || coalesce(full_text,'') || ' ' || coalesce(parties,'') || ' ' || coalesce(relevant_statutes,'') || ' ' || coalesce(citation,'')) @@ plainto_tsquery('english',?)`;
      countParams.push(search);
    } else if (pgDirect && mode === 'fuzzy') {
      sql = `SELECT id, title, citation, court, year, parties, category, description, relevant_statutes, keywords, created_at,
             similarity(title, ?) as sim
             FROM citations
             WHERE title % ? OR description % ? OR keywords % ? OR parties % ? OR citation % ?
             ORDER BY similarity(title, ?) DESC, year DESC, citation ASC`;
      const s = search;
      params.push(s, s, s, s, s, s, s);
      countSql = `SELECT COUNT(*) as c FROM citations WHERE title % ? OR description % ? OR keywords % ? OR parties % ? OR citation % ?`;
      countParams.push(s, s, s, s, s);
    } else {
      sql = `SELECT id, title, citation, court, year, parties, category, description, relevant_statutes, keywords, created_at FROM citations
             WHERE ${likeQuery(searchCols)}`;
      params.push(p, p, p, p, p, p, p);
      countSql = `SELECT COUNT(*) as c FROM citations WHERE ${likeQuery(searchCols)}`;
      countParams.push(p, p, p, p, p, p, p);
    }
  } else {
    sql = 'SELECT id, title, citation, court, year, parties, category, description, relevant_statutes, keywords, created_at FROM citations WHERE 1=1';
    countSql = 'SELECT COUNT(*) as c FROM citations WHERE 1=1';
  }

  if (category) { sql += ' AND category=?'; params.push(category); countSql += ' AND category=?'; countParams.push(category); }
  if (year_from) { sql += ' AND year>=?'; params.push(Number(year_from)); countSql += ' AND year>=?'; countParams.push(Number(year_from)); }
  if (year_to) { sql += ' AND year<=?'; params.push(Number(year_to)); countSql += ' AND year<=?'; countParams.push(Number(year_to)); }
  if (court) { sql += ` AND LOWER(court) LIKE LOWER(?)`; params.push(`%${court}%`); countSql += ` AND LOWER(court) LIKE LOWER(?)`; countParams.push(`%${court}%`); }

  if (pgDirect && mode === 'fts' && search) sql += ' ORDER BY rank DESC';
  else if (!(pgDirect && mode === 'fuzzy')) sql += ' ORDER BY year DESC, citation ASC';

  if (limit > 0) { sql += ' LIMIT ?'; params.push(limit); }
  if (offset > 0) { sql += ' OFFSET ?'; params.push(offset); }

  const rows = await query(sql, params);
  const total = (await queryOne(countSql, countParams))?.c || 0;

  res.json({ rows, total, mode });
}));

/* ─── Single Citation ───────────────────────────────────────── */

citationsRouter.get('/:id', asyncHandler(async (req, res) => {
  const c = await queryOne('SELECT * FROM citations WHERE id=?', [req.params.id]);
  if (!c) throw new AppError('Citation not found', 404);
  res.json(c);
}));

citationsRouter.post('/', asyncHandler(async (req, res) => {
  const { title, citation, court, year, parties, category, description, fullText, relevantStatutes, keywords } = req.body;
  if (!title || !court || !year) throw new AppError('title, court, year required', 400);
  const id = uuid();
  await run(
    `INSERT INTO citations (id,title,citation,court,year,parties,category,description,full_text,relevant_statutes,keywords)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, title, citation||'', court, year, parties||null, category||null, description||null, fullText||null, relevantStatutes||null, keywords||null]
  );
  const created = await queryOne('SELECT * FROM citations WHERE id=?', [id]);
  res.status(201).json(created);
}));

citationsRouter.put('/:id', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT * FROM citations WHERE id=?', [req.params.id]);
  if (!existing) throw new AppError('Citation not found', 404);
  const { title, citation, court, year, parties, category, description, fullText, relevantStatutes, keywords } = req.body;
  await run(
    `UPDATE citations SET title=?,citation=?,court=?,year=?,parties=?,category=?,description=?,full_text=?,relevant_statutes=?,keywords=? WHERE id=?`,
    [
      title ?? existing.title, citation ?? existing.citation, court ?? existing.court,
      year ?? existing.year, parties ?? existing.parties, category ?? existing.category,
      description ?? existing.description, fullText ?? existing.full_text,
      relevantStatutes ?? existing.relevant_statutes, keywords ?? existing.keywords,
      req.params.id
    ]
  );
  const updated = await queryOne('SELECT * FROM citations WHERE id=?', [req.params.id]);
  res.json(updated);
}));

citationsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await run('DELETE FROM citations WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

citationsRouter.post('/delete-by-year', asyncHandler(async (req, res) => {
  const { year } = req.body;
  if (!year) throw new AppError('year required', 400);
  await run('DELETE FROM citation_cart WHERE citation_id IN (SELECT id FROM citations WHERE year=?)', [year]);
  await run('DELETE FROM citations WHERE year=?', [year]);
  res.json({ ok: true, year });
}));

citationsRouter.post('/truncate', asyncHandler(async (req, res) => {
  await run('DELETE FROM citation_cart');
  await run('DELETE FROM citations');
  res.json({ ok: true });
}));

/* ─── Suggest Top 10 ────────────────────────────────────────── */

citationsRouter.get('/suggest/top', asyncHandler(async (req, res) => {
  const { query: q } = req.query;
  if (!q) throw new AppError('query required', 400);
  const p = `%${q}%`;
  const rows = await query(
    `SELECT * FROM citations WHERE LOWER(title) LIKE LOWER(?) OR LOWER(parties) LIKE LOWER(?) OR LOWER(keywords) LIKE LOWER(?) OR LOWER(category) LIKE LOWER(?)
     ORDER BY year DESC LIMIT 10`,
    [p, p, p, p]
  );
  res.json(rows);
}));

/* ─── Citation Cart ─────────────────────────────────────────── */

citationsRouter.get('/cart/list', asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT cc.id as cart_id, cc.notes, cc.created_at as added_at,
            c.id, c.title, c.citation, c.court, c.year, c.parties, c.category,
            c.description, c.relevant_statutes, c.keywords
     FROM citation_cart cc
     JOIN citations c ON c.id = cc.citation_id
     WHERE cc.user_id = ?
     ORDER BY cc.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}));

citationsRouter.post('/cart', asyncHandler(async (req, res) => {
  const { citationId, notes } = req.body;
  if (!citationId) throw new AppError('citationId required', 400);
  const existing = await queryOne('SELECT id FROM citation_cart WHERE user_id=? AND citation_id=?', [req.user.id, citationId]);
  if (existing) return res.json({ id: existing.id, message: 'Already in cart' });
  const id = uuid();
  await run('INSERT INTO citation_cart (id,user_id,citation_id,notes) VALUES (?,?,?,?)', [id, req.user.id, citationId, notes || null]);
  res.status(201).json({ id, message: 'Added to cart' });
}));

citationsRouter.delete('/cart/:cartId', asyncHandler(async (req, res) => {
  await run('DELETE FROM citation_cart WHERE id=? AND user_id=?', [req.params.cartId, req.user.id]);
  res.json({ ok: true });
}));

citationsRouter.delete('/cart', asyncHandler(async (req, res) => {
  await run('DELETE FROM citation_cart WHERE user_id=?', [req.user.id]);
  res.json({ ok: true });
}));

/* ─── Citation References ──────────────────────────────────── */

citationsRouter.get('/:id/references', asyncHandler(async (req, res) => {
  const citing = await query(
    `SELECT cr.id as ref_id, cr.reference_type, cr.context, cr.created_at,
            c.id, c.title, c.citation, c.court, c.year, c.category
     FROM citation_references cr
     JOIN citations c ON c.id = cr.referenced_citation_id
     WHERE cr.citation_id=?
     ORDER BY c.year DESC`,
    [req.params.id]
  );
  const citedBy = await query(
    `SELECT cr.id as ref_id, cr.reference_type, cr.context, cr.created_at,
            c.id, c.title, c.citation, c.court, c.year, c.category
     FROM citation_references cr
     JOIN citations c ON c.id = cr.citation_id
     WHERE cr.referenced_citation_id=?
     ORDER BY c.year DESC`,
    [req.params.id]
  );
  res.json({ citing, citedBy, total: citing.length + citedBy.length });
}));

citationsRouter.post('/:id/references', asyncHandler(async (req, res) => {
  const { referencedCitationId, referenceType, context } = req.body;
  if (!referencedCitationId) throw new AppError('referencedCitationId required', 400);
  const target = await queryOne('SELECT id FROM citations WHERE id=?', [referencedCitationId]);
  if (!target) throw new AppError('Referenced citation not found', 404);
  await run(
    `INSERT INTO citation_references (id, citation_id, referenced_citation_id, reference_type, context)
     VALUES (?,?,?,?,?) ON CONFLICT (citation_id, referenced_citation_id, reference_type) DO NOTHING`,
    [uuid(), req.params.id, referencedCitationId, referenceType || 'cites', context || null]
  );
  res.status(201).json({ ok: true });
}));

citationsRouter.delete('/references/:refId', asyncHandler(async (req, res) => {
  await run('DELETE FROM citation_references WHERE id=?', [req.params.refId]);
  res.json({ ok: true });
}));

citationsRouter.post('/auto-link', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT COUNT(*) as c FROM citation_references');
  if (Number(existing?.c || 0) > 0) {
    return res.json({ message: 'References already linked', count: Number(existing.c) });
  }
  const rows = await query("SELECT id, full_text, description, citation FROM citations WHERE full_text IS NOT NULL AND full_text != '' LIMIT 1000");
  let linked = 0;
  for (const c of rows) {
    const text = (c.full_text || '') + ' ' + (c.description || '');
    const matches = text.match(/\d{4}\s+(PLD|SCMR|PCrLJ|CLC|MLD|YLR|PTD|CLD)\s+\d+/g);
    if (!matches) continue;
    for (const m of [...new Set(matches)]) {
      const target = await queryOne('SELECT id FROM citations WHERE citation=? AND id!=?', [m, c.id]);
      if (target) {
        await run(
          `INSERT INTO citation_references (id, citation_id, referenced_citation_id, reference_type, context)
           VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING`,
          [uuid(), c.id, target.id, 'cites', text.slice(0, 300)]
        );
        linked++;
      }
    }
  }
  res.json({ message: `${linked} references auto-linked`, count: linked });
}));
