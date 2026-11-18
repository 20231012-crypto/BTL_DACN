import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';

const schema = 'antam';
const previousSchema = 'minhan';
const tables = new Set([
  'nguoi_dung',
  'khach_hang',
  'nhan_vien',
  'quan_tri_vien',
  'vai_tro',
  'nguoi_dung_vai_tro',
  'quyen',
  'quyen_vai_tro',
  'phan_quyen',
  'ma_otp',
  'nhat_ky_hoat_dong',
  'danh_muc',
  'nha_san_xuat',
  'thuoc',
  'dia_chi_giao_hang',
  'gio_hang',
  'chi_tiet_gio_hang',
  'khuyen_mai',
  'don_hang',
  'chi_tiet_don_hang',
  'don_thuoc',
  'giao_dich_thanh_toan',
  'yeu_cau_huy_hoan',
  'danh_gia',
  'nha_cung_cap',
  'phieu_nhap_kho',
  'lo_thuoc',
  'lich_su_ton_kho',
  'cuoc_hoi_thoai',
  'tin_nhan',
  'yeu_cau_ho_tro',
  'tri_thuc_chatbot',
  'quy_tac_an_toan',
  'tu_khoa_canh_bao',
  'sessions',
  'settings',
  'stock_allocations',
  'order_status_history',
  'google_accounts',
  'oauth_states',
  'upload_intents',
]);
const identityTables = new Set(
  [...tables].filter(
    (table) =>
      ![
        'khach_hang',
        'nhan_vien',
        'quan_tri_vien',
        'nguoi_dung_vai_tro',
        'quyen_vai_tro',
        'phan_quyen',
        'sessions',
        'settings',
        'google_accounts',
        'oauth_states',
        'upload_intents',
      ].includes(table),
  ),
);

// The services use parameterized SQL shared with SQLite. These are the three dialect differences.
export function postgresSql(statement, activeSchema = schema) {
  const ignoreDuplicates = /^\s*INSERT OR IGNORE INTO /i.test(statement);
  let parameter = 0;
  const sql = statement
    .replace(/^\s*INSERT OR IGNORE INTO /i, 'INSERT INTO ')
    .replace(/\bMAX\(0,used_count-1\)/gi, 'GREATEST(0,used_count-1)')
    .replace(
      /\bdate\(([a-z_.]+),'\+7 hours'\)/gi,
      "to_char($1::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM-DD')",
    )
    .replace(
      /\bdate\('now'\)/gi,
      "to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC','YYYY-MM-DD')",
    )
    .replace(
      /\b(FROM|JOIN|INTO|UPDATE)\s+([a-z_][a-z0-9_]*)\b/gi,
      (match, keyword, table) =>
        tables.has(table) ? `${keyword} ${activeSchema}.${table}` : match,
    )
    .replace(/\?/g, () => `$${++parameter}`);
  return ignoreDuplicates ? `${sql} ON CONFLICT DO NOTHING` : sql;
}

const numericTypes = {
  getTypeParser(oid, format) {
    if (format !== 'binary' && (oid === 20 || oid === 1700)) return Number;
    return pg.types.getTypeParser(oid, format);
  },
};

function connectionOptions(connectionString) {
  const url = new URL(connectionString);
  if (!['postgresql:', 'postgres:'].includes(url.protocol))
    throw new Error('DATABASE_URL phải là URL PostgreSQL.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  for (const key of [
    'sslmode',
    'sslrootcert',
    'sslcert',
    'sslkey',
    'uselibpqcompat',
  ])
    url.searchParams.delete(key);
  const ca = process.env.DATABASE_CA_CERT?.replaceAll('\\n', '\n');
  return {
    connectionString: url.href,
    ssl: local ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max: 4,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 8000,
    allowExitOnIdle: true,
    types: numericTypes,
  };
}

export function openPostgres(connectionString) {
  const pool = new pg.Pool(connectionOptions(connectionString));
  pool.on('error', (error) =>
    console.error('PostgreSQL pool error:', error.code || 'connection'),
  );
  const context = new AsyncLocalStorage();
  let renamed = false;
  const selectSchema = async (executor) => {
    if (!renamed) {
      const { rows } = await executor.query(
        'SELECT to_regnamespace($1) IS NOT NULL AS renamed',
        [schema],
      );
      renamed ||= rows[0].renamed;
    }
    return renamed ? schema : previousSchema;
  };
  const queue = (transaction, statement, params) => {
    const result = transaction.tail.then(() =>
      transaction.client.query(statement, params),
    );
    transaction.tail = result.catch(() => {});
    return result;
  };
  const query = async (sql, params = []) => {
    const statement = (name) =>
      postgresSql(typeof sql === 'function' ? sql(name) : sql, name);
    const transaction = context.getStore();
    if (transaction)
      return queue(transaction, statement(transaction.schema), params);
    const activeSchema = await selectSchema(pool);
    try {
      return await pool.query(statement(activeSchema), params);
    } catch (error) {
      // A statement that could not resolve its relation has no changes to replay.
      if (
        activeSchema === previousSchema &&
        error.code === '42P01' &&
        (await selectSchema(pool)) === schema
      ) {
        return pool.query(statement(schema), params);
      }
      throw error;
    }
  };
  const one = async (sql, ...params) => (await query(sql, params)).rows[0];
  const all = async (sql, ...params) => (await query(sql, params)).rows;
  const run = async (sql, ...params) => ({
    changes: (await query(sql, params)).rowCount,
  });
  const identifier = (name) => {
    if (!/^[a-z_][a-z0-9_]*$/.test(name))
      throw new Error('Tên cột không hợp lệ.');
    return `"${name}"`;
  };
  const insert = async (table, values) => {
    if (!tables.has(table)) throw new Error('Bảng không tồn tại.');
    const columns = Object.keys(values);
    const id = identityTables.has(table) ? ' RETURNING id' : '';
    const row = await one(
      `INSERT INTO ${table} (${columns.map(identifier).join(',')}) VALUES (${columns.map(() => '?').join(',')})${id}`,
      ...Object.values(values),
    );
    return row?.id ?? values.id ?? 0;
  };
  const update = (table, values, id, idField = 'id') => {
    if (!tables.has(table)) throw new Error('Bảng không tồn tại.');
    const columns = Object.keys(values);
    if (!columns.length) return;
    return run(
      `UPDATE ${table} SET ${columns.map((key) => `${identifier(key)}=?`).join(',')} WHERE ${identifier(idField)}=?`,
      ...Object.values(values),
      id,
    );
  };
  const transaction = async (work) => {
    if (context.getStore()) return work();
    const client = await pool.connect();
    const state = { client, tail: Promise.resolve() };
    try {
      await client.query('BEGIN');
      // Match SQLite's single-writer behavior for stock reservations and order/payment state.
      await client.query('SELECT pg_advisory_xact_lock(1040354273)');
      state.schema = await selectSchema(client);
      const result = await context.run(state, work);
      await state.tail;
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await state.tail;
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  };
  return {
    kind: 'postgres',
    one,
    all,
    run,
    insert,
    update,
    transaction,
    migrate: (sql) => {
      const transaction = context.getStore();
      return transaction ? queue(transaction, sql) : pool.query(sql);
    },
    columns: (table) =>
      all(
        (name) => `SELECT column_name AS name FROM information_schema.columns WHERE table_schema='${name}' AND table_name=?`,
        table,
      ),
    deferConstraints: () => query('SET CONSTRAINTS ALL DEFERRED'),
    foreignKeyViolations: async () => {
      await query('SET CONSTRAINTS ALL IMMEDIATE');
      return [];
    },
    resetSequences: async () => {
      for (const table of identityTables) {
        await query(
          (name) => `SELECT setval(pg_get_serial_sequence('${name}.${table}','id'), COALESCE(MAX(id),1), MAX(id) IS NOT NULL) FROM ${table}`,
        );
      }
    },
    close: () => pool.end(),
  };
}
