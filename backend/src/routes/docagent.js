import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import {
  DOCUMENT_TYPES,
  PROMPT_VERSION,
  runDocumentationAgent,
  refineExistingDocument,
} from '../rag/doc-agent.js';

export const docAgentRouter = Router();
docAgentRouter.use(auth);

/**
 * GET /api/docagent/types
 * Registry of document types the agent can draft, with required fields.
 */
docAgentRouter.get('/types', (_req, res) => {
  res.json({
    promptVersion: PROMPT_VERSION,
    types: DOCUMENT_TYPES.map(t => ({
      id: t.id,
      label: t.label,
      description: t.description,
      requiredFields: t.requiredFields,
      optionalFields: t.optionalFields,
      outline: t.outline,
    })),
  });
});

/**
 * POST /api/docagent/create
 * body: { message, answers?: { brief, text, extraInstructions }, caseId?, saveAsDraft? }
 *
 * Full pipeline: intake → clarify → research+verify → draft → review → revise → persist.
 * When clarification is needed the response is:
 *   { ok:false, needsClarification:true, questions:[...], brief:{...} }
 * Re-submit with answers = { brief, text: "<user's answers>" } to continue.
 */
docAgentRouter.post('/create', asyncHandler(async (req, res) => {
  const { message, answers, caseId, saveAsDraft } = req.body;
  if (!message && !answers?.brief) throw new AppError('message or answers.brief required', 400);

  const result = await runDocumentationAgent({
    message: message || '',
    answers: answers || null,
    userId: req.user.id,
    saveAsDraft: saveAsDraft !== false,
    caseId: caseId || null,
  });

  res.json(result);
}));

/**
 * POST /api/docagent/refine
 * body: { currentDraft, instruction, authorities?: [{citation,...}] }
 */
docAgentRouter.post('/refine', asyncHandler(async (req, res) => {
  const { currentDraft, instruction, authorities } = req.body;
  if (!currentDraft) throw new AppError('currentDraft required', 400);
  if (!instruction) throw new AppError('instruction required', 400);

  const revised = await refineExistingDocument({
    currentDraft: String(currentDraft).slice(0, 60000),
    instruction: String(instruction).slice(0, 2000),
    authorities: Array.isArray(authorities) ? authorities : [],
  });

  res.json({ ok: true, draft: revised, promptVersion: PROMPT_VERSION });
}));
