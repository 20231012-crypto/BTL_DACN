import { readFile } from 'node:fs/promises';

const migrations = new URL('../../supabase/migrations/', import.meta.url);

export async function initializePostgresSchema(store) {
  const [initial, rename, returnGoods, orderFulfillment] = await Promise.all([
    readFile(new URL('20261118000100_minhan.sql', migrations), 'utf8'),
    readFile(new URL('20261118180033_rename_schema_to_antam.sql', migrations), 'utf8'),
    readFile(new URL('20261119000100_hang_tra_ve.sql', migrations), 'utf8'),
    readFile(new URL('20261119000200_order_fulfillment_fields.sql', migrations), 'utf8'),
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
    await store.migrate(orderFulfillment);
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
    if (!(await exists())) {
      const returnGoods = await readFile(
        new URL('20261119000100_hang_tra_ve.sql', migrations),
        'utf8',
      );
      await store.transaction(async () => {
        // Kiểm tra lại trong giao dịch có khóa để hai phiên khởi động cùng lúc không tạo trùng.
        if (!(await exists())) await store.migrate(returnGoods);
      });
    }

    const col = await store.one(
      "SELECT COUNT(*)::int AS cnt FROM information_schema.columns WHERE table_schema='antam' AND table_name='don_hang' AND column_name='shipping_carrier'",
    );
    if (col && col.cnt === 0) {
      const orderFulfillment = await readFile(
        new URL('20261119000200_order_fulfillment_fields.sql', migrations),
        'utf8',
      );
      await store.transaction(async () => {
        await store.migrate(orderFulfillment);
      });
    }
  } catch (error) {
    console.error('Chưa áp dụng được migration:', error.code || 'CONFIG');
  }
}
