export default async function handler(req, res) {
  res.json({ ok: true, pid: process.pid, node: process.version, env: process.env.NODE_ENV });
}
