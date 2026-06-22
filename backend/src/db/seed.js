import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function seedFromBackup(adapter) {
  // Check if data already exists
  const existing = await adapter.queryOne("SELECT COUNT(*) as count FROM users");
  if (existing && existing.count > 0) {
    console.log(`✅ PostgreSQL already has ${existing.count} users, skipping seed`);
    return;
  }

  const seedPath = resolve(__dirname, '../../seed/seed.json');
  let seedData;
  try {
    seedData = JSON.parse(readFileSync(seedPath, 'utf-8'));
  } catch {
    console.log('No seed.json found, skipping migration');
    return;
  }

  console.log('🌱 Seeding PostgreSQL from backup...');

  const tableOrder = [
    'users', 'firms', 'firm_requests', 'cases', 'messages',
    'connection_requests', 'connections', 'journal_entries',
    'invoices', 'time_entries', 'documents', 'ai_sessions', 'ai_chat_history'
  ];

  for (const table of tableOrder) {
    const rows = seedData[table];
    if (!rows || rows.length === 0) continue;

    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => '?').join(',');
    const colNames = cols.map(c => `"${c}"`).join(',');

    for (const row of rows) {
      try {
        await adapter.run(
          `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders})`,
          cols.map(c => row[c] ?? null)
        );
      } catch (err) {
        // Skip duplicates / constraint violations
        if (!err.message.includes('UNIQUE') && !err.message.includes('duplicate')) {
          console.error(`  ⚠️  ${table}: ${err.message}`);
        }
      }
    }
    console.log(`  ✅ ${table}: ${rows.length} rows`);
  }

  console.log('🎉 PostgreSQL seeded successfully');
}
