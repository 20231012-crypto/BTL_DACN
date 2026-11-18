import { DatabaseSync } from 'node:sqlite';
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
  };
  for (const [table, additions] of Object.entries(migrations)) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    for (const [column, definition] of Object.entries(additions)) {
      if (!columns.some((field) => field.name === column))
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }
  const one = (sql, ...params) => db.prepare(sql).get(...params);
  const all = (sql, ...params) => db.prepare(sql).all(...params);
  const run = (sql, ...params) => db.prepare(sql).run(...params);
  const insert = (table, values) => {
    const keys = Object.keys(values);
    return Number(
      run(
        `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
        ...Object.values(values),
      ).lastInsertRowid,
    );
  };
  const update = (table, values, id, idField = 'id') => {
    const keys = Object.keys(values);
    if (keys.length)
      run(
        `UPDATE ${table} SET ${keys.map((k) => `${k}=?`).join(',')} WHERE ${idField}=?`,
        ...Object.values(values),
        id,
      );
  };
  const transaction = (fn) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };
  return {
    db,
    one,
    all,
    run,
    insert,
    update,
    transaction,
    close: () => db.close(),
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
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const daysFromNow = (days) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
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
