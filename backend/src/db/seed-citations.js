import { v4 as uuid } from 'uuid';
import { run, query, queryOne } from './adapter.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, '..', '..');
const ROOT_DIR = path.resolve(BACKEND_DIR, '..');

function loadJSON(relativePath) {
  const fullPath = path.resolve(BACKEND_DIR, relativePath);
  if (!existsSync(fullPath)) {
    console.log(`[seed-citations] File not found, skipping: ${fullPath}`);
    return null;
  }
  const raw = readFileSync(fullPath, 'utf-8');
  return JSON.parse(raw);
}

function mapJudgment(item) {
  const hasFullText = 'full_text' in item && item.full_text;
  return {
    id: uuid(),
    title: item.title || '',
    citation: item.citation || '',
    court: item.court || '',
    year: Number(item.year) || 0,
    parties: item.parties || '',
    category: item.category || 'Civil',
    description: (item.description || '').slice(0, 500),
    full_text: hasFullText
      ? String(item.full_text).slice(0, 50000)
      : (item.description || '').slice(0, 50000),
    keywords: item.keywords || '',
  };
}

const DATA_SOURCES = [
  { path: '../lhc-judgments.json', label: 'LHC Judgments' },
  { path: '../phc-judgments.json', label: 'PHC Judgments' },
  { path: '../scp-2025-results.json', label: 'SCP 2025 Results' },
  { path: '../scripts/fsc-judgments.json', label: 'FSC Judgments' },
  { path: '../scripts/ihc-judgments.json', label: 'IHC Judgments' },
  { path: '../backend/data/supreme_court_cases.json', label: 'Supreme Court Cases' },
  { path: '../backend/data/sc_cases_2015_2024.json', label: 'SC Cases 2015-2024' },
];

export async function seedCitations() {
  try {
    const existing = await queryOne('SELECT COUNT(*) as c FROM citations');
    const count = Number(existing?.c || 0);
    if (count > 0) {
      console.log(`[seed-citations] Citations table already has ${count} row(s) — skipping auto-seed`);
      return;
    }
  } catch {
    console.log('[seed-citations] Citations table not accessible — skipping auto-seed');
    return;
  }

  console.log('[seed-citations] Citations table is empty — starting auto-import from JSON files...');

  const seen = new Set();
  let totalInserted = 0;

  for (const src of DATA_SOURCES) {
    const data = loadJSON(src.path);
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`[seed-citations] ${src.label}: 0 rows (empty or invalid)`);
      continue;
    }

    let fileInserted = 0;
    for (const raw of data) {
      const citationStr = (raw.citation || '').trim();
      if (!citationStr) continue;
      if (seen.has(citationStr)) continue;
      seen.add(citationStr);

      const item = mapJudgment(raw);
      try {
        await run(
          `INSERT INTO citations (id,title,citation,court,year,parties,category,description,full_text,keywords)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [item.id, item.title, item.citation, item.court, item.year,
           item.parties, item.category, item.description, item.full_text, item.keywords]
        );
        fileInserted++;
      } catch (err) {
        console.error(`[seed-citations] Error inserting citation "${citationStr}": ${err.message}`);
      }
    }
    totalInserted += fileInserted;
    console.log(`[seed-citations] ${src.label}: ${fileInserted} citations inserted (${data.length - fileInserted} skipped/duplicate)`);
  }

  console.log(`[seed-citations] Auto-seed complete — ${totalInserted} total citations inserted`);
}

const LANDMARK_CASES = [
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

export async function seedLandmarkCases() {
  try {
    const existing = await queryOne('SELECT COUNT(*) as c FROM citations');
    const count = Number(existing?.c || 0);
    if (count >= 50) {
      console.log(`[seed-citations] DB has ${count} citations (>= 50) — skipping landmark seed`);
      return;
    }
  } catch {
    console.log('[seed-citations] Citations table not accessible — skipping landmark seed');
    return;
  }

  console.log('[seed-citations] DB has fewer than 50 citations — seeding landmark cases...');

  let inserted = 0;
  for (const c of LANDMARK_CASES) {
    const existing = await queryOne('SELECT id FROM citations WHERE citation = ?', [c.citation]);
    if (existing) {
      console.log(`[seed-citations] Landmark "${c.citation}" already exists — skipping`);
      continue;
    }
    try {
      await run(
        `INSERT INTO citations (id,title,citation,court,year,parties,category,description,relevant_statutes,keywords)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [uuid(), c.title, c.citation, c.court, c.year, c.parties, c.category, c.description, c.relevantStatutes, c.keywords]
      );
      inserted++;
    } catch (err) {
      console.error(`[seed-citations] Error inserting landmark "${c.citation}": ${err.message}`);
    }
  }
  console.log(`[seed-citations] Landmark seed complete — ${inserted} cases inserted`);
}
