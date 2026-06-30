import dotenv from 'dotenv';
dotenv.config();
export default async function handler(req, res) {
  res.json({ ok: true, method: 'dotenv.config()' });
}
