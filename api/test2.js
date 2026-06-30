// Test 2: Import express
import 'dotenv/config';
import express from 'express';
export default async function handler(req, res) {
  res.json({ step: 2, message: 'express loaded' });
}
