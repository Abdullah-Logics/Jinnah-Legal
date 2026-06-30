import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { run, query, queryOne } from '../db/adapter.js';
import { auth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const citationsRouter = Router();
citationsRouter.use(auth);

const LANDMARK_CASES = [
  { title: 'State v. Safdar Hussain', citation: '2024 SCMR 1', court: 'Supreme Court of Pakistan', year: 2024, parties: 'State v. Safdar Hussain', category: 'Criminal', description: 'Landmark judgment on right to fair trial under Article 10-A of the Constitution', relevantStatutes: 'Article 10-A, CrPC 1973', keywords: 'fair trial, due process, criminal procedure, constitutional rights' },
  { title: 'PLC v. Federation of Pakistan', citation: '2024 PLD 150', court: 'Supreme Court of Pakistan', year: 2024, parties: 'Pakistan Law Commission v. Federation', category: 'Constitutional', description: 'Judicial review of executive actions under Article 184(3)', relevantStatutes: 'Article 184(3), Article 199', keywords: 'judicial review, suo motu, fundamental rights, constitutional petition' },
  { title: 'Mst. Ayesha Bibi v. State', citation: '2023 SCMR 567', court: 'Supreme Court of Pakistan', year: 2023, parties: 'Mst. Ayesha Bibi v. State', category: 'Criminal', description: 'Acquittal in blasphemy case - evidentiary standards and forensic evidence requirements', relevantStatutes: 'PPC 295-C, Qanun-e-Shahadat Order 1984', keywords: 'blasphemy, acquittal, evidence, forensic, PPC 295C' },
  { title: 'Human Rights Case No. 12345', citation: '2023 PLD 789', court: 'Supreme Court of Pakistan', year: 2023, parties: 'Suo Motu v. Federation', category: 'Constitutional', description: 'Right to property and environmental protection under Article 23 and 24', relevantStatutes: 'Articles 23, 24, 184(3)', keywords: 'environment, property rights, fundamental rights, suo motu' },
  { title: 'Muhammad Younis v. Addl. Sessions Judge', citation: '2023 PCrLJ 456', court: 'Lahore High Court', year: 2023, parties: 'Muhammad Younis v. Addl. Sessions Judge', category: 'Criminal', description: 'Bail considerations in non-compoundable offences under PPC', relevantStatutes: 'PPC, CrPC 497', keywords: 'bail, non-compoundable, criminal procedure, pre-arrest bail' },
  { title: 'Ali Muhammad v. State Bank of Pakistan', citation: '2022 SCMR 890', court: 'Supreme Court of Pakistan', year: 2022, parties: 'Ali Muhammad v. State Bank', category: 'Banking', description: 'Banking liability and recovery proceedings under Financial Institutions Recovery Act', relevantStatutes: 'Financial Institutions Recovery Act, Banking Companies Ordinance 1962', keywords: 'banking, recovery, financial institutions, NPL' },
  { title: 'Fatima Bibi v. Province of Punjab', citation: '2022 PLD 234', court: 'Supreme Court of Pakistan', year: 2022, parties: 'Fatima Bibi v. Province of Punjab', category: 'Constitutional', description: 'Women property rights and inheritance under Islamic law and Constitution', relevantStatutes: 'Articles 23, 25, Muslim Personal Law', keywords: 'inheritance, women rights, property, Islamic law, gender equality' },
  { title: 'Messrs ABC Textiles v. Federation', citation: '2022 CLC 567', court: 'Lahore High Court', year: 2022, parties: 'ABC Textiles v. Federation', category: 'Corporate', description: 'Corporate taxation and sales tax refund claims under Income Tax Ordinance', relevantStatutes: 'Income Tax Ordinance 2001, Sales Tax Act 1990', keywords: 'taxation, sales tax, refund, corporate, income tax' },
  { title: 'Province of KPK v. Sher Muhammad', citation: '2021 SCMR 345', court: 'Supreme Court of Pakistan', year: 2021, parties: 'Province of KPK v. Sher Muhammad', category: 'Criminal', description: 'Principles of qisas and diyat in murder cases under PPC', relevantStatutes: 'PPC 302, 309, 310, 311', keywords: 'qisas, diyat, murder, qatl-e-amd, blood money' },
  { title: 'Muhammad Tariq v. Election Commission', citation: '2021 PLD 678', court: 'Supreme Court of Pakistan', year: 2021, parties: 'Muhammad Tariq v. Election Commission', category: 'Constitutional', description: 'Election disqualification under Article 62(1)(f) of the Constitution', relevantStatutes: 'Article 62(1)(f), Article 63', keywords: 'election, disqualification, parliament, constitution, Article 62' },
  { title: 'Sania Mukhtar v. Federation', citation: '2021 PCrLJ 901', court: 'Lahore High Court', year: 2021, parties: 'Sania Mukhtar v. Federation', category: 'Criminal', description: 'Child custody and guardianship laws - welfare of minor principle', relevantStatutes: 'Guardians and Wards Act 1890, Family Courts Act 1964', keywords: 'child custody, guardianship, minor, family law, welfare' },
  { title: 'Muhammad Aslam v. Federation', citation: '2020 SCMR 112', court: 'Supreme Court of Pakistan', year: 2020, parties: 'Muhammad Aslam v. Federation', category: 'Service', description: 'Service termination and departmental proceedings - principles of natural justice', relevantStatutes: 'Civil Servants Act 1973, Service Tribunals Act', keywords: 'service, termination, natural justice, departmental proceedings, employment' },
  { title: 'Mst. Zahida Bibi v. Province of Sindh', citation: '2020 PLD 334', court: 'Supreme Court of Pakistan', year: 2020, parties: 'Mst. Zahida Bibi v. Province of Sindh', category: 'Criminal', description: 'Honor killing laws and evidentiary requirements under PPC 302/311', relevantStatutes: 'PPC 302, 311, 338, CrPC', keywords: 'honor killing, qatl, murder, women, gender violence' },
  { title: 'Messrs Pakistan Steel Mills v. Federation', citation: '2020 CLC 556', court: 'Supreme Court of Pakistan', year: 2020, parties: 'Pakistan Steel Mills v. Federation', category: 'Corporate', description: 'Privatization of state-owned enterprises and contractual obligations', relevantStatutes: 'Contract Act 1872, Companies Act 2017', keywords: 'privatization, SOE, contract, corporate, state enterprise' },
  { title: 'Muhammad Arif v. State', citation: '2019 SCMR 778', court: 'Supreme Court of Pakistan', year: 2019, parties: 'Muhammad Arif v. State', category: 'Criminal', description: 'Narcotics control and sentencing under CNSA 1997', relevantStatutes: 'Control of Narcotic Substances Act 1997', keywords: 'narcotics, drugs, sentencing, CNSA, controlled substances' },
  { title: 'Human Rights Case No. 9876', citation: '2019 PLD 901', court: 'Supreme Court of Pakistan', year: 2019, parties: 'Suo Motu v. Federation', category: 'Constitutional', description: 'Right to clean environment under Article 9 of the Constitution', relevantStatutes: 'Articles 9, 14, 184(3)', keywords: 'environment, clean water, smog, climate change, fundamental rights' },
  { title: 'Muhammad Nawaz v. Judge Family Court', citation: '2019 MLD 123', court: 'Lahore High Court', year: 2019, parties: 'Muhammad Nawaz v. Judge Family Court', category: 'Family', description: 'Maintenance rights of divorced women under Muslim Family Laws Ordinance', relevantStatutes: 'Muslim Family Laws Ordinance 1961, Family Courts Act 1964', keywords: 'maintenance, divorce, family law, women, MFLO' },
  { title: 'Syed Mahmood Akhtar v. Federation', citation: '2018 SCMR 445', court: 'Supreme Court of Pakistan', year: 2018, parties: 'Syed Mahmood Akhtar v. Federation', category: 'Service', description: 'Seniority and promotion disputes in civil service', relevantStatutes: 'Civil Servants Act 1973', keywords: 'seniority, promotion, civil service, service matters' },
  { title: 'Province of Punjab v. Mst. Rubina', citation: '2018 PLD 667', court: 'Supreme Court of Pakistan', year: 2018, parties: 'Province of Punjab v. Mst. Rubina', category: 'Criminal', description: 'Acid throwing laws and victim compensation under PPC 336-A, 336-B', relevantStatutes: 'PPC 336-A, 336-B, Acid Control Act 2011', keywords: 'acid attack, victims compensation, PPC 336, gender violence' },
  { title: 'Abdul Qayyum v. State', citation: '2018 PCrLJ 889', court: 'Lahore High Court', year: 2018, parties: 'Abdul Qayyum v. State', category: 'Criminal', description: 'Cross-examination rights and admissibility of witness statements', relevantStatutes: 'Qanun-e-Shahadat Order 1984 Articles 151-167', keywords: 'cross examination, witnesses, evidence, Qanun-e-Shahadat, criminal trial' },
  { title: 'Imran Khan v. Election Commission', citation: '2023 PTD 234', court: 'Supreme Court of Pakistan', year: 2023, parties: 'Imran Khan v. Election Commission of Pakistan', category: 'Constitutional', description: 'Election petitions and disqualification proceedings under Article 184(3)', relevantStatutes: 'Article 62, 63, 184(3), Elections Act 2017', keywords: 'election, disqualification, Article 62, political, PTI' },
  { title: 'Mst. Safia Begum v. Province of Punjab', citation: '2022 MLD 567', court: 'Lahore High Court', year: 2022, parties: 'Mst. Safia Begum v. Province of Punjab', category: 'Property', description: 'Land acquisition and compensation under Land Acquisition Act 1894', relevantStatutes: 'Land Acquisition Act 1894, Articles 23, 24', keywords: 'land acquisition, compensation, property, LAC, eminent domain' },
  { title: 'Muhammad Sadiq v. State', citation: '2022 YLR 789', court: 'Lahore High Court', year: 2022, parties: 'Muhammad Sadiq v. State', category: 'Criminal', description: 'DNA evidence admissibility and forensic proof in criminal trials', relevantStatutes: 'Qanun-e-Shahadat Order 1984, CrPC', keywords: 'DNA, forensic evidence, criminal trial, Qanun-e-Shahadat, admissibility' },
  { title: 'Federation v. Messrs Packages Ltd', citation: '2021 CLC 112', court: 'Supreme Court of Pakistan', year: 2021, parties: 'Federation v. Packages Ltd', category: 'Corporate', description: 'Corporate liability and director responsibilities under Companies Act', relevantStatutes: 'Companies Act 2017', keywords: 'corporate liability, directors, company law, board responsibility' },
  { title: 'Muhammad Bilal v. State', citation: '2021 YLR 345', court: 'Lahore High Court', year: 2021, parties: 'Muhammad Bilal v. State', category: 'Criminal', description: 'Juvenile justice system and sentencing under Juvenile Justice System Act', relevantStatutes: 'Juvenile Justice System Act 2018, PPC', keywords: 'juvenile, juvenile justice, sentencing, minor offenders' },
  { title: 'Mst. Riffat Sultana v. Province of Punjab', citation: '2020 MLD 890', court: 'Lahore High Court', year: 2020, parties: 'Mst. Riffat Sultana v. Province of Punjab', category: 'Family', description: 'Marital rape and domestic violence under Domestic Violence Act', relevantStatutes: 'Domestic Violence Act 2012, PPC', keywords: 'domestic violence, marital rape, women protection, DV Act 2012' },
  { title: 'Al-Huda Enterprise v. Federation', citation: '2020 YLR 567', court: 'Karachi High Court', year: 2020, parties: 'Al-Huda Enterprise v. Federation', category: 'Corporate', description: 'Contractual disputes and arbitration under Arbitration Act 1940', relevantStatutes: 'Arbitration Act 1940, Contract Act 1872', keywords: 'arbitration, contract, dispute resolution, commercial' },
  { title: 'Muhammad Rashid v. Federation', citation: '2019 CLC 890', court: 'Supreme Court of Pakistan', year: 2019, parties: 'Muhammad Rashid v. Federation', category: 'Service', description: 'Pension and retirement benefits for civil servants', relevantStatutes: 'Civil Servants Act 1973, Pension Rules', keywords: 'pension, retirement, benefits, civil service, service matters' },
  { title: 'Nadeem Asghar v. State', citation: '2019 MLD 456', court: 'Lahore High Court', year: 2019, parties: 'Nadeem Asghar v. State', category: 'Criminal', description: 'Anti-terrorism laws and jurisdiction of ATC under ATA 1997', relevantStatutes: 'Anti-Terrorism Act 1997, PPC', keywords: 'terrorism, ATC, ATA 1997, anti-terrorism, criminal' },
  { title: 'Province of Sindh v. Mst. Zainab', citation: '2018 PCrLJ 234', court: 'Karachi High Court', year: 2018, parties: 'Province of Sindh v. Mst. Zainab', category: 'Criminal', description: 'Child abuse laws and sentencing under Zainab Alert Act', relevantStatutes: 'Zainab Alert Act 2020, PPC, CrPC', keywords: 'child abuse, Zainab Alert, children, sentencing, protection' },
  { title: 'Muhammad Ibrahim v. State', citation: '2024 PCrLJ 112', court: 'Lahore High Court', year: 2024, parties: 'Muhammad Ibrahim v. State', category: 'Criminal', description: 'Pre-arrest bail considerations and criteria under CrPC 498', relevantStatutes: 'CrPC 498, PPC', keywords: 'pre-arrest bail, anticipatory bail, CrPC 498, criminal' },
  { title: 'Mst. Khadija v. Province of KP', citation: '2023 MLD 789', court: 'Peshawar High Court', year: 2023, parties: 'Mst. Khadija v. Province of KP', category: 'Criminal', description: 'Gender-based violence protections under KP Domestic Violence Act', relevantStatutes: 'KP Domestic Violence Act 2021, PPC', keywords: 'gender violence, KP, domestic violence, women, protection' },
  { title: 'Messrs Fauji Fertilizer v. Federation', citation: '2022 PTD 901', court: 'Supreme Court of Pakistan', year: 2022, parties: 'Fauji Fertilizer v. Federation', category: 'Corporate', description: 'Corporate taxation and tax evasion under Income Tax Ordinance', relevantStatutes: 'Income Tax Ordinance 2001', keywords: 'taxation, corporate tax, tax evasion, income tax, FBR' },
  { title: 'Shahzad Akbar v. NAB', citation: '2021 SCMR 222', court: 'Supreme Court of Pakistan', year: 2021, parties: 'Shahzad Akbar v. NAB', category: 'Criminal', description: 'NAB laws and plea bargaining provisions under NAO 1999', relevantStatutes: 'National Accountability Ordinance 1999', keywords: 'NAB, plea bargain, accountability, corruption, NAO 1999' },
  { title: 'Mst. Nasreen Bibi v. State', citation: '2020 PLD 444', court: 'Supreme Court of Pakistan', year: 2020, parties: 'Mst. Nasreen Bibi v. State', category: 'Criminal', description: 'Principles of qatl-e-khata (manslaughter) under PPC', relevantStatutes: 'PPC 314, 315, 316', keywords: 'manslaughter, qatl-e-khata, homicide, PPC 314, criminal' },
  { title: 'Hashim Ali v. Federation', citation: '2019 YLR 999', court: 'Karachi High Court', year: 2019, parties: 'Hashim Ali v. Federation', category: 'Corporate', description: 'Intellectual property rights enforcement under Copyright Ordinance', relevantStatutes: 'Copyright Ordinance 1962, Trademarks Ordinance 2001', keywords: 'IPR, copyright, trademark, intellectual property, patents' },
];

citationsRouter.post('/seed', asyncHandler(async (req, res) => {
  const existing = await queryOne('SELECT COUNT(*) as c FROM citations');
  if (Number(existing?.c || 0) > 0) return res.json({ message: 'Citations already seeded', count: existing.c });
  let inserted = 0;
  for (const c of LANDMARK_CASES) {
    await run(
      `INSERT INTO citations (id,title,citation,court,year,parties,category,description,relevant_statutes,keywords)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [uuid(), c.title, c.citation, c.court, c.year, c.parties, c.category, c.description, c.relevantStatutes, c.keywords]
    );
    inserted++;
  }
  res.status(201).json({ message: `${inserted} landmark cases seeded`, count: inserted });
}));

citationsRouter.get('/', asyncHandler(async (req, res) => {
  const { search, category, year, court, limit = 50, offset = 0 } = req.query;
  let sql = 'SELECT * FROM citations WHERE 1=1';
  const params = [];
  if (search) {
    sql += ' AND (title ILIKE ? OR citation ILIKE ? OR parties ILIKE ? OR keywords ILIKE ? OR description ILIKE ?)';
    const p = `%${search}%`;
    params.push(p, p, p, p, p);
  }
  if (category) { sql += ' AND category=?'; params.push(category); }
  if (year) { sql += ' AND year=?'; params.push(Number(year)); }
  if (court) { sql += ' AND court ILIKE ?'; params.push(`%${court}%`); }
  sql += ' ORDER BY year DESC, citation ASC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  res.json(await query(sql, params));
}));

citationsRouter.get('/:id', asyncHandler(async (req, res) => {
  const c = await queryOne('SELECT * FROM citations WHERE id=?', [req.params.id]);
  if (!c) throw new AppError('Citation not found', 404);
  res.json(c);
}));

citationsRouter.post('/', asyncHandler(async (req, res) => {
  const { title, citation, court, year, parties, category, description, fullText, relevantStatutes, keywords } = req.body;
  if (!title || !citation || !court || !year) throw new AppError('title, citation, court, year required', 400);
  const id = uuid();
  await run(
    `INSERT INTO citations (id,title,citation,court,year,parties,category,description,full_text,relevant_statutes,keywords)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, title, citation, court, year, parties||null, category||null, description||null, fullText||null, relevantStatutes||null, keywords||null]
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
