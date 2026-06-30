// Test 4: Import adapter module (tests seed-citations circular import + all DB deps)
import 'dotenv/config';
import { getAdapter } from '../backend/src/db/adapter.js';
export default async function handler(req, res) {
  res.json({ step: 4, message: 'adapter loaded', hasGetAdapter: typeof getAdapter === 'function' });
}
