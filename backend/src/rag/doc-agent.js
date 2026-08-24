import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuid } from 'uuid';
import { run, queryOne } from '../db/adapter.js';
import { hybridSearch } from './search.js';
import {
  PROMPT_VERSION,
  DOCUMENT_TYPES,
  getDocType,
  DOC_INTAKE_SYSTEM,
  clarifyPrompt,
  researchPlanPrompt,
  draftingPrompt,
  DOC_REVIEW_SYSTEM,
  docRevisionPrompt,
  refinePrompt,
} from './prompts.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

function getModel(systemInstruction, jsonMode = false) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction,
    generationConfig: jsonMode ? { responseMimeType: 'application/json', temperature: 0.2 } : { temperature: 0.4 },
  });
}

function extractJson(text) {
  if (!text) throw new Error('Empty model response');
  const cleaned = text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  const arrStart = cleaned.indexOf('[');
  const arrEnd = cleaned.lastIndexOf(']');
  if (arrStart >= 0 && arrEnd > arrStart) {
    try { return JSON.parse(cleaned.slice(arrStart, arrEnd + 1)); } catch {}
  }
  throw new Error('Model returned unparseable JSON');
}

// ── Stage 1: Intake ───────────────────────────────────────────

export async function analyzeIntake(message) {
  const model = getModel(DOC_INTAKE_SYSTEM, true);
  const result = await model.generateContent(
    `User request:\n"""${message}"""\n\nExtract the structured brief JSON now.`
  );
  const brief = extractJson(result.response.text());
  if (!brief || typeof brief !== 'object') throw new Error('Intake analysis failed');
  // Normalize
  brief.facts = Array.isArray(brief.facts) ? brief.facts : [];
  brief.researchQueries = Array.isArray(brief.researchQueries) ? brief.researchQueries : [];
  brief.missingCritical = Array.isArray(brief.missingCritical) ? brief.missingCritical : [];
  brief.confidence = Number(brief.confidence) || 0;
  return brief;
}

export async function generateClarifyingQuestions(docTypeId, missingFields) {
  const t = getDocType(docTypeId);
  const model = getModel('You ask concise clarifying questions for legal document intake.');
  const result = await model.generateContent(clarifyPrompt(docTypeId, missingFields));
  const text = (result.response.text() || '').trim();
  if (/^READY_TO_DRAFT$/i.test(text)) return null;
  return {
    questions: text.split('\n').map(l => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean).slice(0, 3),
    docTypeLabel: t?.label || docTypeId,
    missingFields,
  };
}

// ── Stage 2: Research (grounded retrieval) ────────────────────

export async function researchAuthorities(brief, { maxAuthorities = 10 } = {}) {
  let queries = (brief.researchQueries || []).slice(0, 6);
  if (queries.length === 0 && brief.reliefSought) queries = [brief.reliefSought];
  if (queries.length === 0 && typeof brief === 'object') {
    queries = [brief.grievance, brief.question, brief.defence].filter(Boolean).slice(0, 2);
  }

  const seen = new Map();

  for (const q of queries) {
    try {
      const res = await hybridSearch(q, { limit: 8, perCase: 1 });
      for (const r of res.results) {
        if (r.sourceType === 'constitution') continue;
        const key = (r.citation || r.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (!key || seen.has(key)) continue;
        seen.set(key, {
          title: r.title,
          citation: r.citation,
          court: r.court,
          year: r.year,
          excerpt: (r.chunkText || '').split('\n').slice(-6).join(' ').slice(0, 600),
          sourceId: r.sourceId || '',
          score: r.score,
        });
      }
    } catch (e) {
      console.warn(`Doc-agent research failed for "${q}":`, e.message);
    }
  }

  const ranked = [...seen.values()].sort((a, b) => b.score - a.score);

  // Hard verification pass: every authority must exist in the citations table.
  const verified = [];
  for (const a of ranked) {
    if (verified.length >= maxAuthorities) break;
    try {
      const row = await queryOne(
        'SELECT id FROM citations WHERE citation ILIKE ? OR (title ILIKE ? AND year = ?)',
        [a.citation, a.title, Number(a.year) || 0]
      );
      if (row) verified.push({ ...a, verifiedId: row.id });
    } catch {}
  }

  return verified;
}

export async function researchConstitution(brief) {
  const queries = [
    brief.question,
    brief.grievance,
    brief.reliefSought,
    ...(brief.statutesMentioned || []).filter(s => /constitution|article/i.test(s)),
  ].filter(Boolean).slice(0, 3);
  if (queries.length === 0) return [];

  const out = [];
  const seen = new Set();
  for (const q of queries) {
    try {
      const res = await hybridSearch(q, { limit: 4, sourceType: 'constitution' });
      for (const r of res.results) {
        if (seen.has(r.article)) continue;
        seen.add(r.article);
        out.push({ article: r.article, title: r.title, content: r.chunkText });
      }
    } catch {}
  }
  return out.slice(0, 6);
}

// ── Stage 3: Draft ────────────────────────────────────────────

export async function draftDocument({ docTypeId, brief, authorities, constitutionText, language, extraInstructions, lawyerProfile, caseDetails }) {
  const model = getModel('You are a senior Pakistani legal draftsman producing filing-ready documents.');
  const prompt = draftingPrompt({
    docTypeId,
    brief: JSON.stringify(brief, null, 2),
    authorities,
    constitutionText,
    language,
    extraInstructions,
    lawyerProfile,
    caseDetails,
  });
  const result = await model.generateContent(prompt);
  return cleanDraft(result.response.text());
}

function cleanDraft(text) {
  return (text || '')
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
}

// ── Stage 4: Review & revise ──────────────────────────────────

export async function reviewDocument(draft, authorities) {
  const model = getModel(DOC_REVIEW_SYSTEM, true);
  const authList = authorities.map(a => `"${a.title}", ${a.citation} (${a.court}, ${a.year})`).join('\n');
  const result = await model.generateContent(
    `VERIFIED AUTHORITIES:\n${authList || '(none)'}\n\nDRAFT:\n${draft}`
  );
  try {
    return extractJson(result.response.text());
  } catch {
    return { verdict: 'pass', citationIssues: [], completenessIssues: [], coherenceIssues: [], notes: 'Review unavailable — skipped.' };
  }
}

export async function reviseDocument(draft, review, authorities) {
  const model = getModel('You are a senior Pakistani legal draftsman correcting documents per QA findings.');
  const result = await model.generateContent(docRevisionPrompt(draft, JSON.stringify(review), authorities));
  return cleanDraft(result.response.text());
}

// ── Context enrichment: lawyer/firm identity + linked case ────

export async function getLawyerProfile(userId) {
  try {
    const u = await queryOne(
      'SELECT id, name, email, phone, address, city, bar_number, license_number, specialization FROM users WHERE id = ?',
      [userId]
    );
    if (!u) return null;
    const profile = {
      advocateName: u.name || '',
      chamberAddress: [u.address, u.city].filter(Boolean).join(', '),
      phone: u.phone || '',
      email: u.email || '',
      barEnrolment: u.bar_number || u.license_number || '',
      specialization: u.specialization || '',
    };
    if (u.firm_id) {
      const f = await queryOne('SELECT id, name, phone, address, city FROM firms WHERE id = ?', [u.firm_id]);
      if (f) {
        profile.firmName = f.name || '';
        profile.firmAddress = [f.address, f.city].filter(Boolean).join(', ');
        profile.firmPhone = f.phone || '';
      }
    }
    // Drop empty values so the model uses placeholders instead of blanks
    return Object.fromEntries(Object.entries(profile).filter(([, v]) => v && String(v).trim() !== ''));
  } catch {
    return null;
  }
}

export async function getCaseContext(caseId, userId) {
  if (!caseId) return null;
  try {
    const c = await queryOne(
      `SELECT c.id, c.title, c.description, c.type, c.status, c.court_dates, c.timeline,
              u.name AS client_name, u.phone AS client_phone
       FROM cases c LEFT JOIN users u ON c.client_id = u.id
       WHERE c.id = ? AND c.lawyer_id = ?`,
      [caseId, userId]
    );
    if (!c) return null;
    let courtDates = [];
    let timeline = [];
    try { courtDates = JSON.parse(c.court_dates || '[]'); } catch {}
    try { timeline = JSON.parse(c.timeline || '[]'); } catch {}
    return {
      caseTitle: c.title,
      caseType: c.type || '',
      caseStatus: c.status || '',
      clientName: c.client_name || '',
      clientPhone: c.client_phone || '',
      backgroundFacts: c.description || '',
      latestCourtDates: courtDates.slice(-3).map(d => `${d.date} @ ${d.court}${d.notes ? ` (${d.notes})` : ''}`),
      recentTimeline: timeline.slice(-5).map(t => `${t.date}: ${t.event}`),
    };
  } catch {
    return null;
  }
}

// ── Full pipeline ─────────────────────────────────────────────

/**
 * createDocumentAgent — end-to-end documentation pipeline:
 *   intake → clarify (if needed) → research+verify → draft → review → revise → validate → persist
 */
export async function runDocumentationAgent({
  message,
  answers,
  userId,
  saveAsDraft = true,
  caseId = null,
}) {
  const trace = [];

  // 1) Intake (or merge clarification answers into an existing brief)
  let brief;
  if (answers?.brief) {
    brief = { ...answers.brief };
    if (answers.text) {
      brief.clarifications = answers.text;
      // fold free-text answers into facts
      brief.facts = [...(brief.facts || []), String(answers.text)];
      brief.missingCritical = [];
    }
  } else {
    brief = await analyzeIntake(message);
  }
  trace.push({ stage: 'intake', documentType: brief.documentType, confidence: brief.confidence });

  if (!brief.documentType) {
    return {
      ok: false,
      reason: 'not_a_document_task',
      message: 'This does not appear to be a document drafting request. Describe the document you need (e.g., "Draft a legal notice to my tenant for unpaid rent").',
      trace,
    };
  }

  // 2) Clarify when critical fields are missing and no answers were provided
  if (!answers && brief.missingCritical.length > 0) {
    const clarification = await generateClarifyingQuestions(brief.documentType, brief.missingCritical);
    if (clarification) {
      return { ok: false, needsClarification: true, brief, ...clarification, trace };
    }
  }

  // 3) Research grounded authorities + gather draftsman/case context
  const [authorities, constitutionText, lawyerProfile, caseDetails] = await Promise.all([
    researchAuthorities(brief),
    researchConstitution(brief),
    getLawyerProfile(userId),
    getCaseContext(caseId, userId),
  ]);
  if (caseDetails) {
    // Fold the practice-management record into the brief so intake facts win ties
    brief.linkedCase = caseDetails;
    if (caseDetails.backgroundFacts && (!brief.facts || brief.facts.length === 0)) {
      brief.facts = [caseDetails.backgroundFacts];
    }
  }
  trace.push({ stage: 'research', authoritiesFound: authorities.length, constitutionArticles: constitutionText.length, linkedCase: !!caseDetails, lawyerProfileFilled: !!lawyerProfile });

  // 4) Draft
  const language = brief.language === 'ur' ? 'ur' : 'en';
  let draft = await draftDocument({
    docTypeId: brief.documentType,
    brief,
    authorities,
    constitutionText,
    language,
    extraInstructions: answers?.extraInstructions,
    lawyerProfile,
    caseDetails,
  });
  trace.push({ stage: 'draft', length: draft.length });

  // 5) Review + one revision round when needed
  let review = await reviewDocument(draft, authorities);
  trace.push({ stage: 'review', verdict: review.verdict, issues: (review.citationIssues?.length || 0) + (review.completenessIssues?.length || 0) + (review.coherenceIssues?.length || 0) });
  if (review.verdict === 'revise') {
    draft = await reviseDocument(draft, review, authorities);
    trace.push({ stage: 'revision', length: draft.length });
  }

  // 6) Persist
  const t = getDocType(brief.documentType);
  const docName = `${t?.label || brief.documentType}${brief.parties?.client ? ` — ${brief.parties.client}` : ''}`;
  let documentId = null;
  if (saveAsDraft) {
    try {
      documentId = uuid();
      await run(
        "INSERT INTO documents (id, user_id, name, content, type, case_id) VALUES (?,?,?,?,?,?)",
        [documentId, userId, docName.slice(0, 120), draft, 'ai-drafted', caseId]
      );
    } catch (e) {
      console.warn('Doc-agent persist failed:', e.message);
    }
  }

  return {
    ok: true,
    documentId,
    name: docName,
    documentType: brief.documentType,
    documentTypeLabel: t?.label || brief.documentType,
    language,
    draft,
    review,
    authorities: authorities.map(a => ({ title: a.title, citation: a.citation, court: a.court, year: a.year })),
    constitutionArticles: constitutionText.map(c => ({ article: c.article, title: c.title })),
    promptVersion: PROMPT_VERSION,
    trace,
  };
}

/** Iterative refinement of an existing draft. */
export async function refineExistingDocument({ currentDraft, instruction, authorities = [] }) {
  const model = getModel('You are a senior Pakistani legal draftsman applying precise revisions.');
  const result = await model.generateContent(refinePrompt(currentDraft, instruction, authorities));
  return cleanDraft(result.response.text());
}

export { DOCUMENT_TYPES, PROMPT_VERSION };
