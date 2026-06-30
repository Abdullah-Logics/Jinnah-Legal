// Test 3: Import all the top-level deps of app.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
export default async function handler(req, res) {
  res.json({ step: 3, message: 'all express deps loaded' });
}
