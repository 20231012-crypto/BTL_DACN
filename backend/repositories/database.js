import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
export function openDatabase(
  dbPath = path.join(root, 'backend/storage/pharmacy.sqlite'),
) {
  if (dbPath !== ':memory:')
    mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(
    'PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;',
  );
  db.exec(readFileSync(path.join(root, 'database/schema.sqlite.sql'), 'utf8'));
  const migrations = {
    don_hang: {
      shipping_carrier: "TEXT NOT NULL DEFAULT ''",
      tracking_code: "TEXT NOT NULL DEFAULT ''",
      internal_note: "TEXT NOT NULL DEFAULT ''",
    },
    giao_dich_thanh_toan: { provider_reference: 'TEXT', expires_at: 'TEXT' },
    don_thuoc: { approved_product_ids: 'TEXT' },
    yeu_cau_huy_hoan: {
      evidence_storage_name: 'TEXT',
      evidence_mime_type: 'TEXT',
    },
    tri_thuc_chatbot: {
      source: 'TEXT',
      reviewed_at: 'TEXT',
      reviewed_by: 'INTEGER REFERENCES nguoi_dung(id)',
    },
    tin_nhan: {
      products_json: 'TEXT',
    },
    nguoi_dung: {
      birth_date: 'TEXT',
      gender: 'TEXT',
    },
  };
  for (const [table, additions] of Object.entries(migrations)) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    for (const [column, definition] of Object.entries(additions)) {
      if (!columns.some((field) => field.name === column))
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }
  // Keep unrelated requests outside the SQLite transaction while its callback awaits queries.
  const context = new AsyncLocalStorage();
  let queue = Promise.resolve();
  const enqueue = (work) => {
    const result = queue.then(work);
    queue = result.catch(() => {});
    return result;
  };
  const execute = (work) => (context.getStore() ? work() : enqueue(work));
  const one = (sql, ...params) => execute(() => db.prepare(sql).get(...params));
  const all = (sql, ...params) => execute(() => db.prepare(sql).all(...params));
  const run = (sql, ...params) => execute(() => db.prepare(sql).run(...params));
  const insert = async (table, values) => {
    const keys = Object.keys(values);
    return Number(
      (
        await run(
          `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
          ...Object.values(values),
        )
      ).lastInsertRowid,
    );
  };
  const update = async (table, values, id, idField = 'id') => {
    const keys = Object.keys(values);
    if (keys.length)
      return run(
        `UPDATE ${table} SET ${keys.map((k) => `${k}=?`).join(',')} WHERE ${idField}=?`,
        ...Object.values(values),
        id,
      );
  };
  const transaction = (fn) => {
    if (context.getStore()) return fn();
    return enqueue(async () => {
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = await context.run(true, fn);
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    });
  };
  return {
    db,
    kind: 'sqlite',
    one,
    all,
    run,
    insert,
    update,
    transaction,
    columns: (table) => all(`PRAGMA table_info(${table})`),
    deferConstraints: () =>
      execute(() => db.exec('PRAGMA defer_foreign_keys=ON')),
    foreignKeyViolations: () => all('PRAGMA foreign_key_check'),
    resetSequences: async () => {},
    close: () => enqueue(() => db.close()),
  };
}
export const camel = (object) =>
  Object.fromEntries(
    Object.entries(object).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, x) => x.toUpperCase()),
      v,
    ]),
  );
export const now = () => new Date().toISOString();
const vnDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
export const today = () => vnDateFormat.format(new Date());
export const daysFromNow = (days) =>
  vnDateFormat.format(new Date(Date.now() + days * 86400000));
export const normalize = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
export const slugify = (s) =>
  normalize(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
