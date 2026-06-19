import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

let _adapter = null;

async function seedDefaultAdmin() {
  try {
    const exists = await queryOne("SELECT id FROM users WHERE email = 'viberider77@gmail.com'");
    if (!exists) {
      const id = uuid();
      const hash = await bcrypt.hash('admin123', 10);
      await _adapter.run(
        `INSERT INTO users (id,email,password_hash,name,role,is_verified,verification_status)
         VALUES (?,?,?,'Platform Admin','admin',1,'approved')`,
        [id, 'viberider77@gmail.com', hash]
      );
      console.log('✅ Default platform admin created (viberider77@gmail.com / admin123)');
    }
  } catch (err) {
    console.error('Failed to seed default admin:', err.message);
  }
}

export async function getAdapter() {
  if (_adapter) return _adapter;
  if (process.env.SUPABASE_URL || process.env.DATABASE_URL) {
    const { PostgresAdapter } = await import('./postgres.js');
    _adapter = new PostgresAdapter();
    await _adapter.connect();
  } else if (process.env.MSSQL_SERVER) {
    const { MssqlAdapter } = await import('./mssql.js');
    _adapter = new MssqlAdapter();
    await _adapter.connect();
  } else {
    const { SqliteAdapter } = await import('./sqlite.js');
    _adapter = new SqliteAdapter();
    await _adapter.connect();
  }
  await seedDefaultAdmin();
  return _adapter;
}

export async function getAdapterSafe() {
  try {
    return await getAdapter();
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
    throw err;
  }
}

export async function run(sql, params = []) {
  const a = await getAdapterSafe();
  return a.run(sql, params);
}

export async function query(sql, params = []) {
  const a = await getAdapterSafe();
  return a.query(sql, params);
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

export async function closeAdapter() {
  if (_adapter) {
    try {
      await _adapter.close();
      console.log('✅ Database connection closed');
    } catch (err) {
      console.error('Error closing database:', err.message);
    }
    _adapter = null;
  }
}
