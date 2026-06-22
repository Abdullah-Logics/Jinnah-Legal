let handler;

export default async function api(req, res) {
  if (!handler) {
    const { createApp } = await import('../backend/src/app.js');
    handler = await createApp();
  }
  return handler(req, res);
}
