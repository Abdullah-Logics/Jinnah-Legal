let handler;

export default async function api(req, res) {
  if (!handler) {
    try {
      const { createApp } = await import('../backend/src/app.js');
      const app = await createApp();
      handler = app;
    } catch (err) {
      console.error('Init error:', err);
      res.status(500).json({ error: 'Init failed', message: err.message, stack: err.stack });
      return;
    }
  }
  return handler(req, res);
}
