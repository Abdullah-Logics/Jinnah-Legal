import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { run, query } from '../db/adapter.js';
import { auth } from '../middleware/auth.js';
import { validate, aiChatSchema } from '../middleware/validate.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const aiRouter = Router();
aiRouter.use(auth);

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const LAWYER_SYSTEM = `You are an AI Legal Second Brain for Pakistani lawyers on the Jinnah Legal platform.
Help with: legal research under Pakistani law, drafting legal notices, case strategy, PPC/CPC/CRPC, and court procedure.
Cite relevant Pakistani statutes and superior court precedents. Be structured and actionable.
Respond in the same language the lawyer uses (Urdu or English).`;

const CLIENT_SYSTEM = `You are an AI Legal Assistant for Pakistani citizens on the Jinnah Legal platform.
Help users understand their rights under Pakistani law and prepare for lawyer consultations.
Keep explanations simple. Always recommend consulting a qualified lawyer for specific advice.
Respond in the same language the user uses (Urdu or English).`;

aiRouter.post('/chat', validate(aiChatSchema), asyncHandler(async (req, res) => {
  const { message, history = [] } = req.body;
  const isLawyer = ['lawyer', 'firm_admin'].includes(req.user.role);

  if (!process.env.GEMINI_API_KEY) {
    throw new AppError('AI service not configured. Set GEMINI_API_KEY in .env', 503);
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: isLawyer ? LAWYER_SYSTEM : CLIENT_SYSTEM,
    });

    const geminiHistory = history.map(h => ({
      role: h.role === 'ai' || h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(message);
    const text = result.response.text();

    await run('INSERT INTO ai_chat_history (id,user_id,role,content) VALUES (?,?,?,?)', [uuid(), req.user.id, 'user', message]);
    await run('INSERT INTO ai_chat_history (id,user_id,role,content) VALUES (?,?,?,?)', [uuid(), req.user.id, 'assistant', text]);

    res.json({ response: text, model: MODEL, tokensUsed: result.response.usageMetadata?.totalTokenCount || 0 });
  } catch (err) {
    console.error('Gemini error:', err.message);
    throw new AppError('AI service unavailable. Please try again later.', 503, err.message);
  }
}));

aiRouter.get('/history', asyncHandler(async (req, res) => {
  res.json(await query('SELECT * FROM ai_chat_history WHERE user_id=? ORDER BY created_at ASC LIMIT 100', [req.user.id]));
}));
