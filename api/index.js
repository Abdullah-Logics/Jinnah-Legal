import { createApp } from '../backend/src/app.js';

let app;

export default async function handler(req, res) {
  try {
    if (!app) {
      app = await createApp();
    }
    return app(req, res);
  } catch (err) {
    console.error('[Vercel handler] Error:', err.message);
    console.error('[Vercel handler] Stack:', err.stack);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }
}
