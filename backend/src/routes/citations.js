import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { run, query, queryOne } from '../db/adapter.js';
import { auth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

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
    { title: 'Al-Huda Enterprise v. Federation', citation: '2020 YLR 567', court: 'Karachi High Court', year: 2020, parties: 'Al-Huda Enterprise v. Federation', category: 'Corporate', description: 'Contractual disputes and arbitration under Arbitration Act 1940', relevantStatutes: 'Arbitration Act 1940, Contract Act 1872', keywords: 'arbitration, contract, dispute resolution, commercial' },
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

/* ─── Search / List ─────────────────────────────────────────── */

citationsRouter.get('/', asyncHandler(async (req, res) => {
  const { search, category, year_from, year_to, court, limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT id, title, citation, court, year, parties, category, description, relevant_statutes, keywords, created_at FROM citations WHERE 1=1';
  const params = [];
  if (search) {
    sql += ' AND (title ILIKE ? OR citation ILIKE ? OR parties ILIKE ? OR keywords ILIKE ? OR description ILIKE ? OR full_text ILIKE ?)';
    const p = `%${search}%`;
    params.push(p, p, p, p, p, p);
  }
  if (category) { sql += ' AND category=?'; params.push(category); }
  if (year_from) { sql += ' AND year>=?'; params.push(Number(year_from)); }
  if (year_to) { sql += ' AND year<=?'; params.push(Number(year_to)); }
  if (court) { sql += ' AND court ILIKE ?'; params.push(`%${court}%`); }
  sql += ' ORDER BY year DESC, citation ASC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows = await query(sql, params);
  const total = (await queryOne(
    `SELECT COUNT(*) as c FROM citations WHERE 1=1${
      search ? ' AND (title ILIKE ? OR citation ILIKE ? OR parties ILIKE ? OR keywords ILIKE ? OR description ILIKE ? OR full_text ILIKE ?)' : ''
    }${category ? ' AND category=?' : ''}${year_from ? ' AND year>=?' : ''}${year_to ? ' AND year<=?' : ''}${court ? ' AND court ILIKE ?' : ''}`,
    (() => {
      const p = [];
      if (search) { const s = `%${search}%`; p.push(s, s, s, s, s, s); }
      if (category) p.push(category);
      if (year_from) p.push(Number(year_from));
      if (year_to) p.push(Number(year_to));
      if (court) p.push(`%${court}%`);
      return p;
    })()
  ))?.c || 0;

  res.json({ rows, total });
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

/* ─── Suggest Top 10 ────────────────────────────────────────── */

citationsRouter.get('/suggest/top', asyncHandler(async (req, res) => {
  const { query: q } = req.query;
  if (!q) throw new AppError('query required', 400);
  const p = `%${q}%`;
  const rows = await query(
    `SELECT * FROM citations WHERE title ILIKE ? OR parties ILIKE ? OR keywords ILIKE ? OR category ILIKE ?
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
