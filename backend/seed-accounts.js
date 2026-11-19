import { existsSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { openDatabase } from './repositories/database.js';
import { openPostgres } from './repositories/postgres.js';
import { seedDatabase } from './repositories/seed.js';
import { passwordValid } from './services/auth.js';

// Tạo hoặc đặt lại ba tài khoản dùng để vận hành và trình diễn: quản trị viên,
// dược sĩ và khách hàng demo. Chạy lại nhiều lần an toàn: tài khoản đã có sẽ
// được đặt lại mật khẩu, kích hoạt lại và gán đúng vai trò.
// Mật khẩu lấy từ biến môi trường SEED_*_PASSWORD hoặc được sinh ngẫu nhiên và
// chỉ in ra màn hình một lần, không ghi vào mã nguồn.
for (const file of ['.env', '.env.local'])
  if (existsSync(file)) process.loadEnvFile(file);

const ACCOUNTS = [
  {
    key: 'admin',
    label: 'Quản trị viên',
    name: 'Quản trị An Tâm',
    email: 'admin@antam.vn',
    role: 'admin',
    profileTable: 'quan_tri_vien',
    profile: {},
  },
  {
    key: 'pharmacist',
    label: 'Dược sĩ',
    name: 'Dược sĩ Trần Thanh Hà',
    email: 'duocsi@antam.vn',
    role: 'staff',
    profileTable: 'nhan_vien',
    profile: { job_title: 'pharmacist' },
  },
  {
    key: 'customer',
    label: 'Khách demo',
    name: 'Khách demo An Tâm',
    email: 'khach@antam.vn',
    role: 'customer',
    profileTable: 'khach_hang',
    profile: {},
  },
];

const alphabet = {
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  lower: 'abcdefghijkmnpqrstuvwxyz',
  digit: '23456789',
};
const pick = (chars) => chars[randomInt(chars.length)];
function generatePassword() {
  const all = Object.values(alphabet).join('');
  const chars = [
    pick(alphabet.upper),
    pick(alphabet.lower),
    pick(alphabet.digit),
    ...Array.from({ length: 9 }, () => pick(all)),
  ];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return `${chars.join('')}@1`;
}

const store = process.env.DATABASE_URL
  ? openPostgres(process.env.DATABASE_URL)
  : openDatabase(process.env.DATABASE_PATH);
const target = process.env.DATABASE_URL
  ? `PostgreSQL ${new URL(process.env.DATABASE_URL).hostname}`
  : `SQLite ${process.env.DATABASE_PATH || 'backend/storage/pharmacy.sqlite'}`;

try {
  await seedDatabase(store, { demoData: false });
  const results = [];
  for (const account of ACCOUNTS) {
    const provided = process.env[`SEED_${account.key.toUpperCase()}_PASSWORD`];
    const password = provided || generatePassword();
    if (!passwordValid(password))
      throw new Error(
        `Mật khẩu SEED_${account.key.toUpperCase()}_PASSWORD cần tối thiểu 8 ký tự có chữ hoa, chữ thường và số.`,
      );
    const hash = bcrypt.hashSync(password, 12);
    const state = await store.transaction(async () => {
      const role = await store.one('SELECT id FROM vai_tro WHERE name=?', account.role);
      const existing = await store.one(
        'SELECT id FROM nguoi_dung WHERE email=?',
        account.email,
      );
      let id = existing?.id;
      if (id) {
        await store.update(
          'nguoi_dung',
          { name: account.name, password_hash: hash, active: 1, verified: 1 },
          id,
        );
        // Đăng xuất mọi phiên cũ vì mật khẩu đã được đặt lại.
        await store.run('DELETE FROM sessions WHERE user_id=?', id);
        await store.run('DELETE FROM nguoi_dung_vai_tro WHERE user_id=?', id);
      } else {
        id = await store.insert('nguoi_dung', {
          name: account.name,
          email: account.email,
          password_hash: hash,
          active: 1,
          verified: 1,
        });
      }
      await store.run(
        'INSERT OR IGNORE INTO nguoi_dung_vai_tro(user_id,role_id) VALUES(?,?)',
        id,
        role.id,
      );
      if (!(await store.one(`SELECT id FROM ${account.profileTable} WHERE id=?`, id)))
        await store.insert(account.profileTable, { id, ...account.profile });
      else if (account.profile.job_title)
        await store.update(account.profileTable, account.profile, id);
      return existing ? 'đặt lại' : 'tạo mới';
    });
    // Đọc lại từ cơ sở dữ liệu để chắc chắn tài khoản đăng nhập được, không chỉ "ghi thành công".
    const saved = await store.one(
      'SELECT password_hash,active,verified FROM nguoi_dung WHERE email=?',
      account.email,
    );
    const verified = Boolean(
      saved?.active &&
        saved?.verified &&
        bcrypt.compareSync(password, saved.password_hash),
    );
    if (!verified)
      throw new Error(`Đã ghi ${account.email} nhưng đọc lại không khớp mật khẩu.`);
    results.push({ ...account, password, state, generated: !provided });
  }
  console.log(`\nCơ sở dữ liệu: ${target}\n`);
  for (const r of results)
    console.log(
      `${r.label.padEnd(14)} ${r.email.padEnd(18)} mật khẩu: ${r.password}  (${r.state}${r.generated ? ', ngẫu nhiên' : ''})`,
    );
  console.log('\nHãy đổi mật khẩu sau lần đăng nhập đầu tiên.');
} catch (error) {
  const code = error.code || error.cause?.code || '';
  console.error(`\nKHÔNG tạo được tài khoản trên ${target}.`);
  console.error(`Lỗi: ${error.message}${code ? ` (${code})` : ''}`);
  if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY/.test(code) || /certificate/i.test(error.message))
    console.error(
      'Gợi ý: Supabase dùng chứng chỉ CA riêng. Tải "SSL certificate" ở Project Settings > Database, rồi chạy kèm DATABASE_CA_CERT="$(cat đường-dẫn/tệp.crt)".',
    );
  else if (code === '28P01' || /password authentication/i.test(error.message))
    console.error(
      'Gợi ý: sai mật khẩu cơ sở dữ liệu. Thay [YOUR-DATABASE-PASSWORD] trong chuỗi kết nối bằng mật khẩu thật (ký tự đặc biệt cần mã hóa dạng %XX).',
    );
  else if (['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'].includes(code))
    console.error('Gợi ý: không kết nối được tới máy chủ cơ sở dữ liệu, kiểm tra lại host, cổng và mạng.');
  else if (/relation .* does not exist|schema/i.test(error.message))
    console.error('Gợi ý: cơ sở dữ liệu này chưa có bảng của dự án; có thể đang trỏ nhầm dự án Supabase.');
  process.exitCode = 1;
} finally {
  await store.close();
}
