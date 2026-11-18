import { existsSync } from 'node:fs';
import bcrypt from 'bcryptjs';
import { openDatabase } from './repositories/database.js';
import { seedDatabase } from './repositories/seed.js';
import { passwordValid } from './services/auth.js';

if (existsSync('.env')) process.loadEnvFile('.env');
const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.INITIAL_ADMIN_PASSWORD;
if (
  !email ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  !passwordValid(password) ||
  password === 'Demo@123'
) {
  console.error(
    'Cấu hình INITIAL_ADMIN_EMAIL và INITIAL_ADMIN_PASSWORD với mật khẩu riêng, tối thiểu 8 ký tự có hoa, thường và số.',
  );
  process.exit(1);
}

const store = openDatabase(process.env.DATABASE_PATH);
try {
  seedDatabase(store, { demoData: false });
  const role = store.one("SELECT id FROM vai_tro WHERE name='admin'");
  if (
    store.one('SELECT user_id FROM nguoi_dung_vai_tro WHERE role_id=?', role.id)
  ) {
    throw new Error(
      'Cơ sở dữ liệu đã có quản trị viên. Dùng mục Tài khoản để quản lý.',
    );
  }
  if (store.one('SELECT id FROM nguoi_dung WHERE email=?', email))
    throw new Error('Email đã có tài khoản trong cơ sở dữ liệu.');
  store.transaction(() => {
    const id = store.insert('nguoi_dung', {
      name: 'Quản trị An Tâm',
      email,
      password_hash: bcrypt.hashSync(password, 12),
      active: 1,
      verified: 1,
    });
    store.insert('quan_tri_vien', { id });
    store.insert('nguoi_dung_vai_tro', { user_id: id, role_id: role.id });
  });
  console.log(
    'Đã tạo quản trị viên đầu tiên. Xóa INITIAL_ADMIN_PASSWORD khỏi .env sau khi khởi tạo.',
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  store.close();
}
