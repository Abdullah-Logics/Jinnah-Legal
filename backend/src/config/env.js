import 'dotenv/config';

const REQUIRED_PROD = ['JWT_SECRET'];
const OPTIONAL = ['PORT', 'FRONTEND_URL', 'GEMINI_API_KEY', 'GEMINI_MODEL',
  'MSSQL_SERVER', 'MSSQL_DATABASE', 'MSSQL_USER', 'MSSQL_PASSWORD', 'MSSQL_PORT',
  'MSSQL_ENCRYPT', 'MSSQL_TRUST_CERT',
];

const defaults = {
  PORT: '3001',
  JWT_SECRET: 'jinnah-legal-dev-secret',
  FRONTEND_URL: 'http://localhost:5173',
  GEMINI_MODEL: 'gemini-2.5-flash',
  MSSQL_PORT: '1433',
  MSSQL_ENCRYPT: 'true',
  MSSQL_TRUST_CERT: 'false',
};

export function validateEnv() {
  const errors = [];
  const isProd = process.env.NODE_ENV === 'production';

  for (const key of isProd ? [...REQUIRED_PROD, ...OPTIONAL] : [...REQUIRED_PROD, ...OPTIONAL]) {
    if (!process.env[key] && !defaults[key]) {
      if (isProd && REQUIRED_PROD.includes(key)) {
        errors.push(`Missing required env var: ${key}`);
      }
      continue;
    }
    if (!process.env[key] && defaults[key]) {
      process.env[key] = defaults[key];
    }
  }

  if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'jinnah-legal-dev-secret' || process.env.JWT_SECRET === 'change-this-to-a-long-random-string-in-production')) {
    errors.push('JWT_SECRET must be a strong random string in production');
  }

  if (isProd && !process.env.FRONTEND_URL) {
    console.warn('FRONTEND_URL not set — using default CORS origins');
  }

  if (errors.length > 0) {
    console.error('\n⚠️  Environment Configuration Warnings:');
    errors.forEach(e => console.error(`   ${e}`));
    console.error('');
  }
}

export function getCorsOrigin() {
  const url = process.env.FRONTEND_URL || defaults.FRONTEND_URL;
  const origins = url.split(',').map(s => s.trim()).filter(Boolean);
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:5173', 'http://localhost:3001');
  }
  origins.push('https://ai-lawyer-blush.vercel.app', 'https://ai-lawyer.vercel.app');
  // CORS function: allow known origins + echo back request origin (handles preview deploys)
  return (origin, cb) => {
    if (!origin || origins.includes(origin)) return cb(null, true);
    return cb(null, origin);
  };
}
