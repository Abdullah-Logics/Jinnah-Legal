import { createApp } from '../backend/src/app.js';

let app;

export default async function handler(req, res) {
  try {
    if (!app) {
      app = await createApp();
    }
    return app(req, res);
  } catch (err) {
    console.error('Serverless handler error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
}
