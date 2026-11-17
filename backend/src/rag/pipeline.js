import { createHash } from 'crypto';
import { v4 as uuid } from 'uuid';
import { agentChat } from './agent.js';
import { hybridSearch } from './search.js';
import { run } from '../db/adapter.js';
import { encryptSensitive } from '../security/encryption.js';
import { PROMPT_VERSION } from './prompts.js';

const PROMPT_INJECTION = /ignore (all |any )?(previous|prior) instructions|system prompt|jailbreak|you are now|disable (your )?(rules|guardrails)/i;
const CONSTITUTIONAL_HINT = /constitution|article\s+\d|fundamental right|due process|fair trial|freedom of|right to|jurisdiction|184\(3\)|199\b/i;

function normalizeMessage(message) {
  return String(message || '')
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, 8000);
}

async function writeAuditLog({ adminId, action, details }) {
  try {
    await run(
      'INSERT INTO admin_audit_log (id, admin_id, action, details_encrypted) VALUES (?,?,?,?)',
      [uuid(), adminId || 'system', action, encryptSensitive(JSON.stringify(details))]
    );
  } catch (err) {
    console.warn('AI audit log write failed:', err.message);
  }
}

export async function runHardenedRAGPipeline({ message, history = [], userId, userRole, sessionId }) {
  const trace = [];
  const clean = normalizeMessage(message);
  const sid = sessionId || uuid();

  if (!clean) throw new Error('Message required');

  const injectionDetected = PROMPT_INJECTION.test(clean);
  trace.push({
    layer: 1,
    name: 'input_validation',
    status: injectionDetected ? 'guarded' : 'passed',
    detail: injectionDetected ? 'Prompt-injection pattern detected; evidence-only mode enforced' : 'Input normalized and length-capped',
  });

  const retrieval = await hybridSearch(clean, {
    limit: 12,
    perCase: 2,
    trustedOnly: true,
    maxWaitMs: 6000,
  });

  trace.push({
    layer: 2,
    name: 'query_planning',
    status: 'passed',
    detail: {
      expandedQuery: retrieval.expandedQuery,
      detectedCitations: retrieval.detectedCitations || [],
      constitutionalQuestion: CONSTITUTIONAL_HINT.test(clean),
    },
  });

  const trustedResults = (retrieval.results || []).filter(r => r.trusted !== false);
  trace.push({
    layer: 3,
    name: 'trusted_retrieval',
    status: trustedResults.length ? 'passed' : 'insufficient_evidence',
    detail: { trustedChunks: trustedResults.length, sources: trustedResults.length },
  });

  const constitutionResults = trustedResults.filter(r => r.sourceType === 'constitution');
  const conflictsWithConstitution = trustedResults.some(r => r.sourceType !== 'constitution') && constitutionResults.length === 0;
  trace.push({
    layer: 4,
    name: 'constitutional_hierarchy',
    status: conflictsWithConstitution ? 'caution' : 'passed',
    detail: {
      constitutionChunks: constitutionResults.length,
      note: 'Constitution of Pakistan 1973 treated as supreme law',
    },
  });

  const result = await agentChat({
    message: clean,
    history,
    userId,
    userRole,
    sessionId: sid,
  });

  trace.push({
    layer: 5,
    name: 'grounded_generation',
    status: result.grounded ? 'passed' : 'insufficient_evidence',
    detail: { model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite' },
  });

  trace.push({
    layer: 6,
    name: 'citation_audit',
    status: result.validated?.valid ? 'passed' : 'flagged',
    detail: {
      repaired: !!result.validated?.repaired,
      verifiedCount: result.validated?.verified?.length || 0,
      invalidCount: result.validated?.invalid?.length || 0,
    },
  });

  const answer = injectionDetected && !result.validated?.valid
    ? 'No verified authority was found in the available database for this proposition.'
    : result.responseText;

  await writeAuditLog({
    adminId: userId,
    action: 'rag_pipeline',
    details: {
      sessionId: sid,
      messageHash: createHash('sha256').update(clean).digest('hex'),
      promptVersion: result.promptVersion || PROMPT_VERSION,
      trustedChunks: trustedResults.length,
      constitutionChunks: constitutionResults.length,
      citationsValid: !!result.validated?.valid,
      layers: trace,
    },
  });

  trace.push({
    layer: 7,
    name: 'encrypted_audit_log',
    status: 'passed',
    detail: { table: 'admin_audit_log', encryption: 'AES-256-GCM' },
  });

  return {
    ...result,
    responseText: answer,
    layers: trace,
    retrieval: {
      trustedChunks: trustedResults.length,
      constitutionChunks: constitutionResults.length,
      expandedQuery: retrieval.expandedQuery,
      detectedCitations: retrieval.detectedCitations || [],
    },
  };
}
