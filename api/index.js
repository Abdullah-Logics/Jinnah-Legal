import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.get('/api/health', (_req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

export default app;
