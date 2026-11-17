try { await import('dotenv/config'); } catch {}
import { getAdapter, closeAdapter } from '../src/db/adapter.js';
import { migrateLegalIntegrity } from '../src/db/migrate-legal-integrity.js';
import { seedVerifiedCases } from '../src/db/seed-verified-cases.js';

const adapter = await getAdapter();
try {
  await migrateLegalIntegrity(adapter);
  const result = await seedVerifiedCases(adapter);
  console.log('Verified landmark cases seeded:', result);
} finally {
  await closeAdapter();
}
