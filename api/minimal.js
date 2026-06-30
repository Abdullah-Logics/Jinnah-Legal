import { createApp } from '../backend/src/app.js';

let app;

export default async function handler(req, res) {
  try {
    if (!app) {
      console.log('[minimal] Creating app...');
      const start = Date.now();
      app = await createApp();
      console.log('[minimal] App created in', Date.now() - start, 'ms');
    }
    return app(req, res);
  } catch (err) {
    console.error('[minimal] Error:', err);
    res.status(500).json({ error: err.message, stack: err.stack?.split('\n').slice(0, 5).join('\n') });
  }
}
