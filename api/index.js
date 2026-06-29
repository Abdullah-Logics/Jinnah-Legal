import { createApp } from '../backend/src/app.js';

let app;

export default async function handler(req, res) {
  if (!app) {
    app = await createApp();
  }
  return app(req, res);
}
