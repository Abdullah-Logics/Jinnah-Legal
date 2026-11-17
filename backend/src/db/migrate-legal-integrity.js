import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const DATA_DIR = fileURLToPath(new URL('../../data/', import.meta.url));

const CITATION_COLUMNS = [
  ["verification_status", "TEXT DEFAULT 'unverified'"],
  ["source_url", "TEXT DEFAULT ''"],
  ["source_type", "TEXT DEFAULT ''"],
  ["content_hash", "TEXT DEFAULT ''"],
  ["verified_at", "TEXT DEFAULT ''"],
  ["verified_by", "TEXT DEFAULT ''"],
  ["pdf_url", "TEXT DEFAULT ''"],
  ["relevant_statutes", "TEXT DEFAULT ''"],
  ["metadata", "TEXT DEFAULT ''"],
];

const RAG_COLUMNS = [["trusted", "INTEGER DEFAULT 0"]];

const TABLES = [
  `CREATE TABLE IF NOT EXISTS legal_sources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    citation TEXT DEFAULT '',
    court TEXT DEFAULT '',
    year INTEGER DEFAULT 0,
    parties TEXT DEFAULT '',
    category TEXT DEFAULT '',
    description TEXT DEFAULT '',
    full_text TEXT DEFAULT '',
    source_url TEXT NOT NULL,
    source_type TEXT NOT NULL,
    content_hash TEXT DEFAULT '',
    status TEXT DEFAULT 'approved',
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS admin_audit_log (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details_encrypted TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS rag_chunks (
    id TEXT PRIMARY KEY,
    source_type TEXT DEFAULT '',
    source_id TEXT DEFAULT '',
    title TEXT DEFAULT '',
    chunk_text TEXT DEFAULT '',
    citation TEXT DEFAULT '',
    court TEXT DEFAULT '',
    year INTEGER DEFAULT 0,
    category TEXT DEFAULT '',
    keywords TEXT DEFAULT '',
    article TEXT DEFAULT '',
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS citation_cart (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT '',
    citation_id TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS legal_migration_state (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT '',
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
];

async function hasColumn(adapter, table, column) {
  try {
    if (adapter.constructor.name === 'SqliteAdapter') {
      const rows = await adapter.query(`PRAGMA table_info(${table})`);
      return rows.some(r => r.name === column);
    }
    const rows = await adapter.query(
      'SELECT column_name FROM information_schema.columns WHERE table_name=? AND column_name=?',
      [table, column]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function addColumns(adapter, table, columns) {
  for (const [name, definition] of columns) {
    if (await hasColumn(adapter, table, name)) continue;
    try {
      await adapter.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    } catch (err) {
      if (!/duplicate column|already exists/i.test(err.message)) throw err;
    }
  }
}

async function getState(adapter, key) {
  const rows = await adapter.query('SELECT value FROM legal_migration_state WHERE key=?', [key]);
  return rows[0]?.value || '';
}

async function setState(adapter, key, value) {
  await adapter.run('DELETE FROM legal_migration_state WHERE key=?', [key]);
  await adapter.run(
    'INSERT INTO legal_migration_state (key,value,updated_at) VALUES (?,?,?)',
    [key, value, new Date().toISOString()]
  );
}

export async function migrateLegalIntegrity(adapter, { cleanup = false } = {}) {
  for (const ddl of TABLES) {
    try { await adapter.run(ddl); } catch (err) {
      if (!/already exists/i.test(err.message)) throw err;
    }
  }

  await addColumns(adapter, 'citations', CITATION_COLUMNS);
  await addColumns(adapter, 'rag_chunks', RAG_COLUMNS);

  await adapter.run(
    "UPDATE citations SET verification_status='verified_source', source_type='existing_corpus' WHERE verification_status IS NULL OR verification_status=''"
  );

  if (!(await getState(adapter, 'legacy_corpus_verification:v1'))) {
    await adapter.run(
      "UPDATE citations SET verification_status='verified_source', source_type='existing_corpus' WHERE verification_status='unverified'"
    );
    await setState(adapter, 'legacy_corpus_verification:v1', JSON.stringify({
      completedAt: new Date().toISOString(),
    }));
  }

  let removedUnsourced = 0;

  if (cleanup && !(await getState(adapter, 'legacy_unsourced_cleanup:v1'))) {
    const unsourced = await adapter.query(
      "SELECT id, title, citation FROM citations WHERE full_text IS NULL OR TRIM(full_text) = ''"
    );

    if (unsourced.length) {
      mkdirSync(DATA_DIR, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      writeFileSync(
        join(DATA_DIR, `unsourced-cases-removed-${stamp}.json`),
        JSON.stringify(unsourced, null, 2)
      );
    }

    await adapter.run(
      "DELETE FROM rag_chunks WHERE source_id IN (SELECT CAST(id AS TEXT) FROM citations WHERE full_text IS NULL OR TRIM(full_text) = '')"
    );
    await adapter.run(
      "DELETE FROM citation_cart WHERE citation_id IN (SELECT CAST(id AS TEXT) FROM citations WHERE full_text IS NULL OR TRIM(full_text) = '')"
    );
    await adapter.run(
      "DELETE FROM citations WHERE full_text IS NULL OR TRIM(full_text) = ''"
    );

    removedUnsourced = unsourced.length;
    await setState(adapter, 'legacy_unsourced_cleanup:v1', JSON.stringify({
      removedUnsourced,
      completedAt: new Date().toISOString(),
    }));
  }

  await adapter.run(
    "UPDATE rag_chunks SET trusted=1 WHERE source_type='constitution' OR source_id IN (SELECT CAST(id AS TEXT) FROM citations WHERE verification_status IN ('verified_source','verified_admin'))"
  );
  await adapter.run(
    "UPDATE rag_chunks SET trusted=0 WHERE NOT (source_type='constitution' OR source_id IN (SELECT CAST(id AS TEXT) FROM citations WHERE verification_status IN ('verified_source','verified_admin')))"
  );

  return { migrated: true, removedUnsourced };
}
