import { GoogleGenerativeAI } from '@google/generative-ai';

// Embedding model chain — first configurable, then known-good fallbacks.
// All candidates must support 768-dim output (MRL for gemini-embedding-001,
// native for text-embedding-004). DIMENSION must match rag_chunks.embedding vector(768).
const MODEL_CANDIDATES = [
  process.env.GEMINI_EMBEDDING_MODEL,
  'gemini-embedding-001',
  'text-embedding-004',
].filter(Boolean);

const DIMENSION = 768;
const BATCH_SIZE = 20;
const MAX_RETRIES = 4;

// Adaptive pacing: after the first 429 we learn the free-tier budget
// (~100 embed requests/min) and space batches accordingly.
let paceMs = 400;
let rateLimited = false;

function extractRetryDelay(err) {
  const msg = err?.message || '';
  const m = msg.match(/retry\s+in\s+([\d.]+)\s*s/i);
  if (m) return Math.ceil(parseFloat(m[1]) * 1000) + 500;
  const structured = msg.match(/"quotaValue":(\d+)/);
  if (structured) return 65000; // per-minute bucket exhausted
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function pacedSleep() {
  await sleep(paceMs + Math.random() * 200);
}

let genAI = null;
let resolvedModel = null;

function getClient() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY required for embeddings');
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

function clean(text) {
  return (text || '').replace(/\s+/g, ' ').trim().slice(0, 8000);
}

function buildRequest(text, taskType) {
  const req = {
    content: { parts: [{ text }] },
    outputDimensionality: DIMENSION,
  };
  if (taskType) req.taskType = taskType;
  return req;
}

async function embedWithModel(modelName, text, taskType) {
  const client = getClient();
  const model = client.getGenerativeModel({ model: modelName });
  const result = await model.embedContent(buildRequest(text, taskType));
  const values = result?.embedding?.values;
  if (!values || values.length === 0) throw new Error('empty embedding');
  return values;
}

/**
 * Resolve a working embedding model once per process.
 * Tries candidates in order until one returns a usable vector.
 */
export async function resolveModel() {
  if (resolvedModel) return resolvedModel;
  let lastErr;
  for (const candidate of MODEL_CANDIDATES) {
    try {
      const probe = await embedWithModel(candidate, 'embedding model probe', undefined);
      // Accept any non-empty vector; we truncate/pad to DIMENSION below.
      if (probe && probe.length > 0) {
        resolvedModel = candidate;
        console.log(`Embedding model resolved: ${candidate} (${probe.length}d -> ${DIMENSION}d)`);
        return resolvedModel;
      }
    } catch (err) {
      lastErr = err;
      console.warn(`Embedding model "${candidate}" unavailable: ${err.message}`);
    }
  }
  throw lastErr || new Error('No embedding model available');
}

export function getResolvedModel() {
  return resolvedModel || MODEL_CANDIDATES[0];
}

function fitDimension(values) {
  if (values.length === DIMENSION) return values;
  if (values.length > DIMENSION) return values.slice(0, DIMENSION);
  return [...values, ...new Array(DIMENSION - values.length).fill(0)];
}

function l2Normalize(vec) {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (!norm) return vec;
  return vec.map(v => v / norm);
}

function isRateLimit(err) {
  return err?.status === 429 || /quota|too many requests/i.test(err?.message || '');
}

async function waitForQuota(err, attempt, maxWaitMs = Infinity) {
  const wait = Math.min(extractRetryDelay(err) ?? 25000 * Math.min(attempt + 1, 3), maxWaitMs);
  if (maxWaitMs !== Infinity && wait >= maxWaitMs) {
    throw Object.assign(new Error('Embedding quota exhausted (interactive timeout)'), { code: 'QUOTA_TIMEOUT' });
  }
  console.warn(`Embed rate limited; backing off ${Math.round(wait / 1000)}s`);
  await sleep(wait);
}

async function embedOnce(modelName, text, taskType) {
  const values = await embedWithModel(modelName, text, taskType);
  return l2Normalize(fitDimension(values));
}

export async function embedText(text, { taskType = 'RETRIEVAL_QUERY', maxWaitMs = Infinity } = {}) {
  const cleaned = clean(text);
  if (!cleaned) return new Array(DIMENSION).fill(0);

  await resolveModel();
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const v = await embedOnce(resolvedModel, cleaned, taskType);
      await pacedSleep();
      return v;
    } catch (err) {
      lastErr = err;
      if (err.code === 'QUOTA_TIMEOUT') break;
      if (isRateLimit(err)) { await waitForQuota(err, attempt, maxWaitMs); continue; }
      if (attempt < MAX_RETRIES) await sleep(800 * (attempt + 1));
    }
  }
  console.error('Embedding failed after retries:', lastErr?.message);
  return new Array(DIMENSION).fill(0);
}

export async function embedBatch(texts, { taskType = 'RETRIEVAL_DOCUMENT', onProgress } = {}) {
  const results = [];
  await resolveModel();
  // Free tier ≈ 100 embed items/min → a 20-item batch every ~13s stays safe.
  let interBatchPause = 600;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const requests = batch.map(t => buildRequest(clean(t), taskType));

    let done = false;
    for (let attempt = 0; attempt <= MAX_RETRIES && !done; attempt++) {
      try {
        const client = getClient();
        const model = client.getGenerativeModel({ model: resolvedModel });
        const { embeddings } = await model.batchEmbedContents({ requests });
        for (const e of embeddings || []) {
          const values = e?.values || [];
          results.push(values.length ? l2Normalize(fitDimension(values)) : new Array(DIMENSION).fill(0));
        }
        done = true;
      } catch (err) {
        if (isRateLimit(err)) {
          rateLimited = true;
          interBatchPause = 13000;
          await waitForQuota(err, attempt);
        } else if (attempt >= MAX_RETRIES) {
          done = true;
          // Last resort: embed items individually so one bad input doesn't kill the batch.
          console.warn(`Batch embedding failed at ${i}, falling back to single mode: ${err.message}`);
          for (const t of batch) results.push(await embedText(t, { taskType }));
        } else {
          await sleep(1500 * (attempt + 1));
        }
      }
    }

    if (typeof onProgress === 'function') onProgress(Math.min(i + BATCH_SIZE, texts.length), texts.length);
    if (i + BATCH_SIZE < texts.length) await sleep(interBatchPause);
  }
  return results;
}

export { DIMENSION };
