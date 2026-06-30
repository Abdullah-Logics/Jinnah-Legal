// Import all the modules that app.js imports (one by one)
try { await import('dotenv/config'); } catch {}
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { getAdapter, closeAdapter } from '../backend/src/db/adapter.js';
import { validateEnv, getCorsOrigin } from '../backend/src/config/env.js';
import { errorHandler, notFound } from '../backend/src/middleware/errorHandler.js';
import { authRouter } from '../backend/src/routes/auth.js';
import { casesRouter } from '../backend/src/routes/cases.js';
import { apiRouter } from '../backend/src/routes/api.js';
import { aiRouter } from '../backend/src/routes/ai.js';
import { uploadRouter } from '../backend/src/routes/upload.js';
import { reportsRouter } from '../backend/src/routes/reports.js';
import { adminRouter } from '../backend/src/routes/admin.js';
import { groupsRouter } from '../backend/src/routes/groups.js';
import { callLogsRouter } from '../backend/src/routes/call-logs.js';
import { citationsRouter } from '../backend/src/routes/citations.js';

export default async function handler(req, res) {
  res.json({ ok: true, message: 'all imports loaded' });
}
