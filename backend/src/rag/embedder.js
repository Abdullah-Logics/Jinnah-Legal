import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-embedding-2';
const DIMENSION = 768;
const BATCH_SIZE = 20;
const MAX_RETRIES = 3;

let genAI = null;

function getClient() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY required for embeddings');
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

export async function embedText(text) {
  const client = getClient();
  const model = client.getGenerativeModel({ model: MODEL });
  const cleaned = (text || '').replace(/\n+/g, ' ').trim().slice(0, 20000);
  if (!cleaned) return new Array(DIMENSION).fill(0);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.embedContent(cleaned);
      return result.embedding.values;
    } catch (err) {
      if (attempt < MAX_RETRIES - 1) {
        await sleep(1000 * (attempt + 1));
      } else {
        console.error('Embedding failed after retries:', err.message);
        return new Array(DIMENSION).fill(0);
      }
    }
  }
}

export async function embedBatch(texts) {
  const results = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const client = getClient();
    const model = client.getGenerativeModel({ model: MODEL });

    const cleaned = batch.map(t => (t || '').replace(/\n+/g, ' ').trim().slice(0, 20000));

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const promises = cleaned.map(t => model.embedContent(t));
        const batchResults = await Promise.all(promises);
        for (const r of batchResults) {
          results.push(r.embedding.values);
        }
        break;
      } catch (err) {
        if (attempt < MAX_RETRIES - 1) {
          await sleep(2000 * (attempt + 1));
        } else {
          console.error(`Batch embedding failed for batch starting at ${i}:`, err.message);
          for (let j = 0; j < batch.length; j++) {
            results.push(new Array(DIMENSION).fill(0));
          }
        }
      }
    }

    if (i + BATCH_SIZE < texts.length) {
      await sleep(200);
    }
  }
  return results;
}

export { DIMENSION };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
