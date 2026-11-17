try { await import('dotenv/config'); } catch {}
import { getAdapter, closeAdapter } from '../src/db/adapter.js';
import { migrateLegalIntegrity } from '../src/db/migrate-legal-integrity.js';

const adapter = await getAdapter();
try {
  const result = await migrateLegalIntegrity(adapter, { cleanup: true });
  console.log('Legal integrity cleanup complete:', result);
} finally {
  await closeAdapter();
}
