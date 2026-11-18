import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { openPostgres } from './repositories/postgres.js';
import { seedDatabase } from './repositories/seed.js';
import { supabaseStorage } from './services/attachments.js';

if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.DATABASE_URL) {
  console.error('Cần DATABASE_URL trong .env hoặc trong môi trường chạy lệnh.');
  process.exit(1);
}

const store = openPostgres(process.env.DATABASE_URL);
try {
  const source = new URL(
    '../supabase/migrations/20261118000100_minhan.sql',
    import.meta.url,
  );
  await store.migrate(await readFile(source, 'utf8'));
  await seedDatabase(store, { demoData: false });
  const storage = supabaseStorage();
  if (storage) await storage.setup();
  console.log(
    storage
      ? 'Đã khởi tạo PostgreSQL và bucket riêng tư.'
      : 'Đã khởi tạo PostgreSQL. Cấu hình Supabase Storage để dùng trên Vercel.',
  );
} catch (error) {
  console.error(
    'Khởi tạo chưa thành công. Kiểm tra cấu hình kết nối và quyền tạo schema minhan.',
    error.code || 'CONFIG',
  );
  process.exitCode = 1;
} finally {
  await store.close();
}
