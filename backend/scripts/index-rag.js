#!/usr/bin/env node
import 'dotenv/config';
import { getAdapter } from './src/db/adapter.js';
import { indexAll } from './src/rag/indexer.js';

async function main() {
  console.log('=== Jinnah Legal RAG Indexer ===');
  console.log('Connecting to database...');

  const adapter = await getAdapter();
  const queryFn = (sql, params) => adapter.query(sql, params);

  console.log('Starting full indexing of cases + constitution...');
  const result = await indexAll(queryFn);

  console.log('\n=== Indexing Complete ===');
  console.log(`Total chunks: ${result.total}`);
  console.log(`  Cases: ${result.cases}`);
  console.log(`  Constitution: ${result.constitution}`);
  console.log(`  Time: ${result.elapsed}s`);
  console.log(`  Mode: ${result.mode}`);

  process.exit(0);
}

main().catch(err => {
  console.error('Indexing failed:', err);
  process.exit(1);
});
