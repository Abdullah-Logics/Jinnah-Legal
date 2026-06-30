let dotenvLoaded = false;
try {
  await import('dotenv/config');
  dotenvLoaded = true;
} catch (e) {
  console.error('dotenv/config failed:', e.message);
}
export default async function handler(req, res) {
  res.json({ dotenvLoaded });
}
