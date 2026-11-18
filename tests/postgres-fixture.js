import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

// Opt-in integration suite against a disposable PostgreSQL instance on this computer.
export async function createTestDatabase() {
  const connectionString = process.env.MINHAN_TEST_POSTGRES_URL;
  if (!connectionString) return null;
  const origin = new URL(connectionString);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname))
    throw new Error('Kiểm thử PostgreSQL chỉ nhận máy chủ loopback.');
  const name = `minhan_test_${randomBytes(6).toString('hex')}`;
  const admin = new pg.Pool({ connectionString, max: 1 });
  let created = false;
  const cleanup = async () => {
    try {
      if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    } finally {
      await admin.end();
    }
  };
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    origin.pathname = `/${name}`;
    const databaseUrl = origin.href;
    const target = new pg.Pool({ connectionString: databaseUrl });
    try {
      const sql = await readFile(
        new URL(
          '../supabase/migrations/20261118000100_minhan.sql',
          import.meta.url,
        ),
        'utf8',
      );
      await target.query(sql);
    } finally {
      await target.end();
    }
    return { databaseUrl, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
