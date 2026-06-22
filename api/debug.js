import express from 'express';

const app = express();
app.get('/api/debug', (req, res) => res.json({ works: true }));

export default app;
