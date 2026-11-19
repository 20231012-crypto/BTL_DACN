import { readFile } from 'node:fs/promises';

const migrations = new URL('../../supabase/migrations/', import.meta.url);

export async function initializePostgresSchema(store) {
  const [initial, rename, returnGoods] = await Promise.all([
    readFile(new URL('20261118000100_minhan.sql', migrations), 'utf8'),
    readFile(new URL('20261118180033_rename_schema_to_antam.sql', migrations), 'utf8'),
    readFile(new URL('20261119000100_hang_tra_ve.sql', migrations), 'utf8'),
  ]);

  await store.transaction(async () => {
    const { present } = await store.one(
      "SELECT to_regnamespace('antam') IS NOT NULL AS present",
    );
    if (!present) {
      // The initial migration has its own transaction when run directly.
      await store.migrate(initial.replace(/^(BEGIN|COMMIT);\r?$/gm, ''));
    }
    await store.migrate(rename);
    await store.migrate(returnGoods);
  });
}

// Áp dụng các migration nhỏ còn thiếu khi ứng dụng khởi động (an toàn khi chạy nhiều lần).
// Trên Vercel không có bước chạy `npm run db:setup` sau mỗi lần cập nhật mã, nên bảng mới
// được tạo tại đây; nếu không đủ quyền thì ghi log và để ứng dụng tiếp tục chạy.
export async function applyPendingMigrations(store) {
  try {
    const exists = async () =>
      (await store.one("SELECT to_regclass('antam.hang_tra_ve') IS NOT NULL AS present"))
        .present;
    if (await exists()) return;
    const returnGoods = await readFile(
      new URL('20261119000100_hang_tra_ve.sql', migrations),
      'utf8',
    );
    await store.transaction(async () => {
      // Kiểm tra lại trong giao dịch có khóa để hai phiên khởi động cùng lúc không tạo trùng.
      if (!(await exists())) await store.migrate(returnGoods);
    });
  } catch (error) {
    console.error('Chưa áp dụng được migration hang_tra_ve:', error.code || 'CONFIG');
  }
}
