// Test each import from app.js individually
const results = [];

async function testImport(name, importFn) {
  try {
    await importFn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
  }
}

// Run all import tests
const modules = [
  ['express', () => import('express')],
  ['cors', () => import('cors')],
  ['helmet', () => import('helmet')],
  ['morgan', () => import('morgan')],
  ['compression', () => import('compression')],
  ['express-rate-limit', () => import('express-rate-limit')],
  ['path', () => import('path')],
  ['url', () => import('url')],
  ['fs', () => import('fs')],

  // Backend modules
  ['./db/adapter', () => import('../backend/src/db/adapter.js')],
  ['./config/env', () => import('../backend/src/config/env.js')],
  ['./middleware/errorHandler', () => import('../backend/src/middleware/errorHandler.js')],
  ['./routes/auth', () => import('../backend/src/routes/auth.js')],
  ['./routes/cases', () => import('../backend/src/routes/cases.js')],
  ['./routes/api', () => import('../backend/src/routes/api.js')],
  ['./routes/ai', () => import('../backend/src/routes/ai.js')],
  ['./routes/upload', () => import('../backend/src/routes/upload.js')],
  ['./routes/reports', () => import('../backend/src/routes/reports.js')],
  ['./routes/admin', () => import('../backend/src/routes/admin.js')],
  ['./routes/groups', () => import('../backend/src/routes/groups.js')],
  ['./routes/call-logs', () => import('../backend/src/routes/call-logs.js')],
  ['./routes/citations', () => import('../backend/src/routes/citations.js')],
];

await Promise.all(modules.map(([name, fn]) => testImport(name, fn)));

export default async function handler(req, res) {
  const failed = results.filter(r => !r.ok);
  res.json({
    total: results.length,
    passed: results.filter(r => r.ok).length,
    failed: failed.length,
    first_failure: failed.length > 0 ? failed[0] : null,
    results,
  });
}
