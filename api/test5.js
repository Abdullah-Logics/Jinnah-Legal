// Test 5: Import app.js WITHOUT dotenv 
import { createApp } from '../backend/src/app.js';
export default async function handler(req, res) {
  res.json({ step: 5, message: 'app.js loaded without dotenv' });
}
