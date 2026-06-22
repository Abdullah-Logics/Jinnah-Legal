let handler;

export default async function api(req, res) {
  if (!handler) {
    try {
      const { createApp } = await import('../backend/src/app.js');
      handler = await createApp();
    } catch (err) {
      console.error('Init failed:', err);
      res.status(500).json({ error: 'Init failed', message: err.message });
      return;
    }
  }
  return handler(req, res);
}
