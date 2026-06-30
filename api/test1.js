// Test 1: Just basic imports
import 'dotenv/config';
export default async function handler(req, res) {
  res.json({ step: 1, message: 'dotenv/config loaded' });
}
