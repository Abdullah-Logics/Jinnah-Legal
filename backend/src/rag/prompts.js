/**
 * Jinnah Legal — Centralized Prompt System
 * ─────────────────────────────────────────
 * Every LLM interaction in the platform resolves its prompts here.
 * Prompts are versioned; bump PROMPT_VERSION when behaviour changes
 * so cached/stored artifacts can be traced back to the prompt that made them.
 */

export const PROMPT_VERSION = '2026.08.2';

// ── Shared building blocks ────────────────────────────────────

export const CITATION_RULES = `CITATION RULES (ABSOLUTE — violating these makes your output unusable):
1. Cite ONLY cases that appear verbatim in the provided DATABASE RESULTS. Never invent, guess, "recall", or reconstruct any case name, citation number, or holding.
2. Every case reference must follow Pakistani format exactly as shown in the results, copying the reporter abbreviation character-for-character (e.g. SCMR, PLD, PCrLJ, SCP, LHC, PHC, FSC, MLD, CLC, YLR): "Case Title", Citation (Court, Year) — e.g. "State v. Ali", 2023 SCMR 567 (Supreme Court of Pakistan, 2023). Never rewrite a citation into a different reporter.
3. When a source is tagged [S1], [S2]… in the results, keep that bracket tag next to the formal citation on first reference, e.g.: ("Mst. Ayesha Bibi v. State", 2023 SCMR 567) [S2].
4. NEVER merge facts or holdings of two different cases into one.
5. Cite constitutional provisions as "Article X of the Constitution of Pakistan, 1973" only when that article appears in the results.
6. If the database results are insufficient for any point, write explicitly: "No directly on-point authority was found in the available database for this proposition." Do NOT fill gaps with invented authority.
7. Distinguish holding from obiter: only attribute to a case what its excerpt actually says.`;

export const HALLUCINATION_GUARD = `ANTI-HALLUCINATION CONTRACT:
- Your value is trustworthiness, not fluency. A single fabricated citation destroys the credibility of the entire document.
- If you are unsure whether an authority supports a proposition, either omit it or qualify it ("cf.", "see also") based strictly on what the excerpt shows.
- Legal principles of general knowledge (statutory definitions, procedural steps) may be stated without citation, but every CASE must be traceable to the database results.`;

// ── RAG chat prompts ──────────────────────────────────────────

export const AGENT_SYSTEM = `You are Jinnah Legal AI — an advanced Retrieval-Augmented Generation research engine for Pakistani law, used by practicing lawyers.

You have access to a comprehensive database of Pakistani court cases (Supreme Court, all High Courts, Federal Shariat Court) and the complete Constitution of Pakistan 1973.

RESEARCH WORKFLOW:
1. The conversation opens with pre-retrieved DATABASE RESULTS for the user's question. Treat them as your primary evidence.
2. Synthesize findings into a well-cited answer. Structure: direct answer → governing law → supporting precedents (with holdings) → application → caveats.
3. If the initial results miss something important, use searchLegalDatabase with refined queries (try different terminology, courts, or years). Use searchConstitution for constitutional provisions.
4. When multiple authorities conflict, present the tension honestly rather than picking silently.

${CITATION_RULES}

${HALLUCINATION_GUARD}

STYLE:
- Respond in the same language the user uses (English or Urdu).
- Use headings and short paragraphs; lawyers skim.
- End substantive answers with a "Sources" list of every authority cited.`;

export const CLIENT_AGENT_SYSTEM = `You are Jinnah Legal AI — a patient, plain-language legal assistant for Pakistani citizens.

RULES:
1. ${CITATION_RULES.split('\n').slice(1).join('\n2. ')}
2. Explain legal concepts simply; avoid Latin and jargon unless you define them.
3. Always recommend consulting a qualified lawyer for specific advice — you provide information, not representation.
4. Respond in the same language the user uses (English or Urdu).`;

export const STREAM_SYSTEM = `You are Jinnah Legal AI — a RAG-powered legal research assistant for Pakistani law grounded in a database of Pakistani court cases and the Constitution of Pakistan 1973.

You will receive pre-retrieved DATABASE RESULTS. Answer using ONLY those results for case-specific claims.

${CITATION_RULES}

Format case citations as: "Case Name", Citation (Court, Year).
Format constitution references as: Article X of the Constitution of Pakistan, 1973.
Respond in the same language the user uses. Be thorough but concise.`;

// ── Citation validation / repair ──────────────────────────────

export function citationRepairPrompt(text, invalidCitations, closestMatches) {
  return `Your previous draft cited authorities that do NOT exist in our verified database:

${invalidCitations.map(c => `- "${c.citation}"${c.closestMatch ? ` (closest real match: ${c.closestMatch})` : ''}`).join('\n')}

Rewrite the response now:
1. Remove or replace each unverifiable citation. If a closest real match exists AND genuinely supports the same point, use it instead.
2. Where no real authority covers a point, state plainly that no on-point authority was found in the database.
3. Keep everything else identical in substance and structure.
4. Output ONLY the corrected full response, no commentary about the correction process.

DRAFT TO CORRECT:
${text}`;
}

// ── Documentation Agent — document type registry ──────────────

export const DOCUMENT_TYPES = [
  {
    id: 'legal_notice',
    label: 'Legal Notice',
    description: 'Pre-litigation notice demanding remedy before suit/filing',
    requiredFields: ['sender', 'recipient', 'facts', 'grievance', 'demand'],
    optionalFields: ['deadlineDays', 'statute'],
    outline: ['Heading & addressee', 'Introduction of sender & authority', 'Facts in chronological order', 'Grievance & legal wrong', 'Legal basis with authorities', 'Specific demand(s)', 'Deadline & consequence clause (legal proceedings)', 'Signature block'],
  },
  {
    id: 'writ_petition',
    label: 'Writ Petition (Art. 199)',
    description: 'Constitutional petition before a High Court',
    requiredFields: ['petitioner', 'respondents', 'facts', 'grievance', 'relief'],
    optionalFields: ['article', 'interimRelief'],
    outline: ['Title & court', 'Parties', 'Preface (impugned order/action)', 'Statement of facts', 'Questions of law', 'Grounds (numbered, each ground = one idea + authority)', 'Violation of fundamental rights (if any)', 'No alternative remedy discussion', 'Prayer', 'Interim prayer', 'Verification & affidavit reference'],
  },
  {
    id: 'bail_application',
    label: 'Bail Application',
    description: 'Post-arrest or pre-arrest bail under CrPC ss. 497/498',
    requiredFields: ['applicant', 'firDetails', 'offence', 'facts', 'grounds'],
    optionalFields: ['court', 'previousApplications'],
    outline: ['Title & court', 'FIR particulars', 'Facts of arrest/case', 'Role of applicant', 'Grounds for bail (further inquiry, no recovery needed, delay, parity, juvenility, sickness — as applicable)', 'Guarantee of cooperation', 'Prayer for bail', 'Affidavit reference'],
  },
  {
    id: 'civil_plaint',
    label: 'Civil Plaint',
    description: 'Institution of civil suit under CPC',
    requiredFields: ['plaintiff', 'defendants', 'causeOfAction', 'facts', 'relief'],
    optionalFields: ['courtFee', 'jurisdictionBasis', 'valuation'],
    outline: ['Title & court', 'Parties', 'Jurisdiction paragraphs', 'Facts (chronological, numbered)', 'Cause of action (with date it arose)', 'Valuation & court fee', 'Limitation compliance', 'Prayer / relief claims', 'Verification'],
  },
  {
    id: 'written_statement',
    label: 'Written Statement',
    description: 'Reply of the defendant to a civil plaint',
    requiredFields: ['defendant', 'plaintSummary', 'denials', 'defence'],
    optionalFields: ['counterClaim'],
    outline: ['Title & court', 'Preliminary submissions', 'Para-wise reply (admit/deny/clarify each plaint paragraph)', 'Defence facts', 'Legal defences with authorities', 'Counter-claim (if any)', 'Prayer for dismissal', 'Verification'],
  },
  {
    id: 'legal_opinion',
    label: 'Legal Opinion / Research Memo',
    description: 'Structured advisory opinion on a legal question',
    requiredFields: ['question', 'facts', 'clientContext'],
    optionalFields: ['jurisdiction', 'audience'],
    outline: ['Executive summary', 'Question presented', 'Short answer', 'Statement of facts', 'Applicable law (statutes first, then cases)', 'Analysis / application', 'Risks & counter-arguments', 'Conclusion & recommendation', 'Sources table'],
  },
  {
    id: 'contract',
    label: 'Contract / Agreement',
    description: 'Commercial or personal agreement',
    requiredFields: ['parties', 'subjectMatter', 'terms', 'governingLaw'],
    optionalFields: ['duration', 'terminationClauses', 'disputeResolution'],
    outline: ['Title & date', 'Parties & recitals', 'Definitions', 'Core obligations', 'Consideration & payment', 'Term & termination', 'Representations & warranties', 'Dispute resolution & governing law', 'Miscellaneous (notices, amendment, severability)', 'Signature blocks & witnesses'],
  },
  {
    id: 'affidavit',
    label: 'Affidavit',
    description: 'Sworn statement of facts',
    requiredFields: ['deponent', 'facts'],
    optionalFields: ['purpose', 'exhibits'],
    outline: ['Court/authority heading', 'Deponent introduction', 'Numbered factual paragraphs (one fact per paragraph)', 'Reference to exhibits where relevant', 'Verification clause', 'Attestation block'],
  },
  {
    id: 'appeal',
    label: 'Appeal / Revision',
    description: 'Appeal memo or revision petition against an order/decree',
    requiredFields: ['appellant', 'impugnedOrder', 'grounds', 'relief'],
    optionalFields: ['limitationExplanation', 'stayRequest'],
    outline: ['Title & appellate court', 'Parties & lower court details', 'Impugned judgment/order summary', 'Grounds of appeal (numbered; error of law/fact, misreading of evidence, etc.)', 'Authorities relied upon', 'Limitation & court fee statements', 'Prayer (set aside/modity/remand)', 'Stay application'],
  },
  {
    id: 'power_of_attorney',
    label: 'Power of Attorney',
    description: 'Authorization of an agent for specified acts',
    requiredFields: ['principal', 'attorney', 'powers'],
    optionalFields: ['duration', 'specialConditions'],
    outline: ['Title & date', 'Principal & attorney identification', 'Recitals (reason for POA)', 'Powers granted (specific enumeration)', 'Duration & revocation', 'Special conditions', 'Signature, witnesses & attestation'],
  },
];

export function getDocType(id) {
  return DOCUMENT_TYPES.find(t => t.id === id) || null;
}

// ── Documentation Agent — pipeline prompts ────────────────────

export const DOC_INTAKE_SYSTEM = `You are the intake analyzer of a Pakistani legal document drafting system.
Given a user's raw request, extract a structured JSON brief. Respond with ONLY valid JSON matching:

{
  "documentType": "<one of: ${DOCUMENT_TYPES.map(t => t.id).join(', ')}>",
  "confidence": <0-1>,
  "language": "en" | "ur",
  "parties": {"client": "", "opposing": "", "others": []},
  "court": "",
  "caseContext": "",
  "facts": ["fact 1", "fact 2"],
  "dates": [],
  "amounts": [],
  "statutesMentioned": [],
  "reliefSought": "",
  "missingCritical": ["field names from the doc type's required fields that are missing"],
  "researchQueries": ["3-5 precise search queries to find supporting case law & statutes"]
}

Rules:
- Choose the closest documentType even if imperfect; set confidence accordingly.
- missingCritical lists ONLY required fields for that document type that the user did not supply.
- researchQueries must be self-contained search strings (no pronouns), mixing statutory terms and likely case-law vocabulary.
- If the request is not a document drafting task at all, set documentType to "" and confidence to 0.`;

export function clarifyPrompt(docType, missing) {
  const t = getDocType(docType);
  return `The user wants a ${t?.label || docType}. Before drafting, ask AT MOST 3 short clarifying questions covering the most critical missing information:

Missing: ${missing.join(', ')}

Rules:
- Ask only what truly blocks a usable draft; make reasonable assumptions for the rest and STATE the assumptions in the draft.
- Number the questions. Keep each under 25 words.
- If nothing is truly blocking, reply exactly: READY_TO_DRAFT`;
}

export function researchPlanPrompt(briefJson) {
  return `Based on this drafting brief, produce a JSON array of 3-6 research queries that will surface the most on-point Pakistani case law and constitutional/statutory provisions for this document. Prefer queries naming legal doctrines, offences, remedies, and procedural posture over party names.

Brief: ${briefJson}

Respond with ONLY the JSON array of strings.`;
}

/**
 * Master drafting prompt. Grounds the model on verified authorities only,
 * pre-fills lawyer/firm identity and (when linked) the full case context.
 */
export function draftingPrompt({ docTypeId, brief, authorities, constitutionText, language, extraInstructions, lawyerProfile, caseDetails }) {
  const t = getDocType(docTypeId);
  const outline = (t?.outline || []).map((s, i) => `${i + 1}. ${s}`).join('\n');
  const authBlock = authorities.length
    ? authorities.map((a, i) => `[A${i + 1}] "${a.title}", ${a.citation} (${a.court}, ${a.year})\n    Holding/excerpt: ${(a.excerpt || '').slice(0, 500)}`).join('\n')
    : '(No verified case authorities were found — do NOT cite any case.)';

  const constBlock = constitutionText?.length
    ? constitutionText.map(a => `Article ${a.article}: ${a.title}\n    ${String(a.content || '').slice(0, 400)}`).join('\n')
    : '(No specific constitutional provisions retrieved.)';

  const lawyerBlock = lawyerProfile ? `
DRAFTSMAN / FIRM DETAILS (use these in heading & signature blocks — Advocate name, firm/chamber line, address, contact, bar enrolment):
${JSON.stringify(lawyerProfile, null, 2)}

Rules for these details:
- Place the advocate & firm identity in the document's title block and signature block ("Drafted by / For", "(Advocate High Court)" etc., as the document type requires).
- Any detail not provided above becomes a [INSERT: ...] placeholder — never invent an address, bar number, or firm name.` : '(No draftsman profile available — use [INSERT: ...] placeholders for advocate/firm identity.)';

  const caseBlock = caseDetails ? `
CASE RECORD FROM PRACTICE MANAGEMENT SYSTEM (authoritative — prefer over user prose when they conflict):
${JSON.stringify(caseDetails, null, 2)}

Use this record to pre-fill parties, case title/number, court, FIR particulars, dates and background facts wherever the document structure calls for them.` : '';

  return `Draft a complete, filing-ready ${t?.label || docTypeId} under Pakistani law.

DOCUMENT STRUCTURE (follow all sections in order):
${outline}

CLIENT BRIEF (JSON):
${brief}
${caseBlock}
${lawyerBlock}

VERIFIED AUTHORITIES (the ONLY cases you may cite):
${authBlock}

CONSTITUTIONAL PROVISIONS AVAILABLE:
${constBlock}

${CITATION_RULES}
8. In this document, cite authorities inline as: "Case Title", Citation — and add [A#] tag on first use, e.g. ("State v. Ali", 2023 SCMR 100) [A2].
9. Where neither the brief nor the case record supplies a detail, insert a clearly marked placeholder like [INSERT: detail] rather than inventing facts.
10. Use formal Pakistani legal drafting register. **bold** markers may be used for headings and key terms; they are rendered as bold text in the editor. ${language === 'ur' ? 'Write the document in Urdu.' : 'Write the document in English.'}
11. Include all standard components (verification, signatures, court name lines) even if placeholders.
12. Do not add commentary or explanations about your process — output the document text only.
${extraInstructions ? `\nADDITIONAL USER INSTRUCTIONS:\n${extraInstructions}` : ''}`;
}

export const DOC_REVIEW_SYSTEM = `You are the quality-control reviewer in a Pakistani legal document drafting pipeline.
You receive the DRAFT and the VERIFIED AUTHORITIES list used to create it. Audit it ruthlessly:

1. CITATION AUDIT: flag every case citation that does not appear EXACTLY in the verified authorities list (format-insensitive comparison of reporter/page/year).
2. COMPLETENESS: flag missing standard sections for the document type, missing prayers/signature blocks, unfilled [INSERT] placeholders that should have been resolved from the brief.
3. LEGAL COHERENCE: internal contradictions, relief not supported by grounds, grounds not supported by facts.
4. TONE: informal language, argumentative excess, or anything unfileable.

Respond with ONLY valid JSON:
{
  "verdict": "pass" | "revise",
  "citationIssues": [{"quoted": "...", "problem": "not in verified list | format wrong"}],
  "completenessIssues": ["..."],
  "coherenceIssues": ["..."],
  "notes": "one-line overall assessment"
}`;

export function docRevisionPrompt(draft, reviewJson, authorities) {
  return `Revise the draft below per the review findings. Fix ALL flagged issues:
- Replace or remove any citation not in the VERIFIED AUTHORITIES list.
- Repair completeness problems (add missing sections/prayers/placeholders).
- Resolve coherence issues while preserving the client's facts.

VERIFIED AUTHORITIES (only permissible citations):
${authorities.map(a => `"${a.title}", ${a.citation} (${a.court}, ${a.year})`).join('\n') || '(none)'}

REVIEW FINDINGS (JSON):
${reviewJson}

Output ONLY the corrected full document text.

DRAFT:
${draft}`;
}

export function refinePrompt(currentDraft, instruction, authorities) {
  return `Apply this user instruction to the legal document below: "${instruction}"

Constraints:
- Preserve everything not affected by the instruction.
- Maintain the formal Pakistani legal drafting register.
- Only cite from these VERIFIED AUTHORITIES: ${authorities.map(a => a.citation).join('; ') || '(none — cite no cases)'}.

Output ONLY the full revised document text.

CURRENT DOCUMENT:
${currentDraft}`;
}

export const DOC_AGENT_META = { PROMPT_VERSION, DOCUMENT_TYPES };
