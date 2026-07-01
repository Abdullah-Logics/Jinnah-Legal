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
import { getAdapter, closeAdapter } from './db/adapter.js';
import { validateEnv, getCorsOrigin } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { casesRouter } from './routes/cases.js';
import { apiRouter } from './routes/api.js';
import { aiRouter } from './routes/ai.js';
import { uploadRouter } from './routes/upload.js';
import { reportsRouter } from './routes/reports.js';
import { adminRouter } from './routes/admin.js';
import { groupsRouter } from './routes/groups.js';
import { callLogsRouter } from './routes/call-logs.js';
import { citationsRouter } from './routes/citations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createApp() {
  validateEnv();

  await getAdapter();

  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  }));

  app.use(compression());

  if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
  } else {
    app.use(morgan('dev'));
  }

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 200 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api/', limiter);
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again later.' },
  });
  app.use('/api/auth/login', authLimiter);

  const corsOrigins = getCorsOrigin();
  app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use((_req, res, next) => {
    res.setTimeout(30000, () => {
      res.status(503).json({ error: 'Request timeout' });
    });
    next();
  });

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.get('/api/health', async (_req, res) => {
    let ipv6 = 'unknown';
    try {
      const { lookup } = await import('dns/promises');
      const { address } = await lookup('db.vqvygljfroqzkxyzpvlo.supabase.co', { family: 6 });
      ipv6 = address || 'none';
    } catch { ipv6 = 'unreachable'; }

    res.json({
      status: 'ok',
      db: process.env.SUPABASE_URL || process.env.DATABASE_URL ? 'postgres' : process.env.MSSQL_SERVER ? 'mssql' : 'sqlite',
      ai: process.env.GEMINI_API_KEY ? 'gemini' : 'unavailable',
      environment: process.env.NODE_ENV || 'development',
      supabase_ipv6: ipv6,
      rest_fallback: process.env.SUPABASE_PROJECT_REF && process.env.SUPABASE_MANAGEMENT_KEY ? 'available' : 'unavailable',
      anon_key_set: !!process.env.SUPABASE_ANON_KEY,
      service_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      time: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.use('/api/auth',      authRouter);
  app.use('/api/cases',     casesRouter);
  app.use('/api/ai',        aiRouter);
  app.use('/api/upload',    uploadRouter);
  app.use('/api/reports',   reportsRouter);
  app.use('/api/admin',     adminRouter);
  app.use('/api/groups',    groupsRouter);
  app.use('/api/call-logs', callLogsRouter);
  app.use('/api/citations', citationsRouter);
  app.use('/api',           apiRouter);

  if (!process.env.VERCEL) {
    app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
  }

  app.use('/api/*', notFound);

  const dist = path.join(__dirname, '../../dist');
  if (existsSync(dist)) {
    app.use(express.static(dist, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);

  return app;
}
