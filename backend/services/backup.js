import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';
import { now, today } from '../repositories/database.js';
import { assert, audit, fail, publicUser } from './shared.js';
import {
  validPrescriptionName,
  prescriptionMimes,
  imageMimes,
} from './attachments.js';
const tables = [
  'nguoi_dung',
  'khach_hang',
  'nhan_vien',
  'quan_tri_vien',
  'vai_tro',
  'nguoi_dung_vai_tro',
  'quyen',
  'quyen_vai_tro',
  'phan_quyen',
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
  'settings',
  'stock_allocations',
  'order_status_history',
  'google_accounts',
];
const format = 'antam-backup-v1';
const algorithm = 'aes-256-gcm';
const key = (passphrase, salt) =>
  scryptSync(passphrase, salt, 32, { N: 32768, maxmem: 64 * 1024 * 1024 });
function validatePassphrase(passphrase) {
  assert(
    typeof passphrase === 'string' &&
      passphrase.length >= 12 &&
      passphrase.length <= 256,
    400,
    'Cụm mật khẩu sao lưu cần từ 12 đến 256 ký tự.',
  );
}
function encrypt(data, passphrase) {
  validatePassphrase(passphrase);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key(passphrase, salt), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ]);
  return {
    format,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}
function decrypt(backup, passphrase) {
  validatePassphrase(passphrase);
  assert(
    backup?.format === format &&
      ['salt', 'iv', 'tag', 'ciphertext'].every(
        (field) => typeof backup[field] === 'string',
      ),
    400,
    'Tệp sao lưu không đúng định dạng.',
  );
  const salt = Buffer.from(backup.salt, 'base64');
  const iv = Buffer.from(backup.iv, 'base64');
  const tag = Buffer.from(backup.tag, 'base64');
  assert(
    salt.length === 16 && iv.length === 12 && tag.length === 16,
    400,
    'Tệp sao lưu không hợp lệ.',
  );
  try {
    const decipher = createDecipheriv(algorithm, key(passphrase, salt), iv);
    decipher.setAuthTag(tag);
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(backup.ciphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8'),
    );
  } catch {
    fail(400, 'Cụm mật khẩu không đúng hoặc tệp sao lưu đã bị hỏng.');
  }
}
export function installBackup(app, d, { admin, permission }) {
  const allowed = [admin, permission('backup')];
  app.post('/api/admin/backup', ...allowed, async (req, res) => {
    const backup = encrypt(
      {
        savedAt: now(),
        tables: Object.fromEntries(
          await Promise.all(
            tables.map(async (table) => [
              table,
              await d.all(`SELECT * FROM ${table}`),
            ]),
          ),
        ),
      },
      req.body.passphrase,
    );
    await audit(d, req.user.id, 'backup.export', 'database', '', {
      bytes: Buffer.byteLength(backup.ciphertext),
    });
    res.attachment(`antam-backup-${today()}.json`).json({ data: backup });
  });
  app.post('/api/admin/backup/restore', ...allowed, async (req, res) => {
    assert(
      req.body.confirm === 'RESTORE_ANTAM',
      400,
      'Nhập RESTORE_ANTAM để xác nhận phục hồi.',
    );
    const snapshot = decrypt(req.body.backup, req.body.passphrase)?.tables;
    assert(
      snapshot && tables.every((table) => Array.isArray(snapshot[table])),
      400,
      'Tệp sao lưu thiếu bảng dữ liệu.',
    );
    for (const table of tables) {
      const columns = new Set(
        (await d.columns(table)).map((column) => column.name),
      );
      assert(snapshot[table].length <= 100000, 400, 'Bản sao lưu quá lớn.');
      for (const row of snapshot[table]) {
        assert(
          row &&
            Object.keys(row).length > 0 &&
            Object.entries(row).every(
              ([column, value]) =>
                columns.has(column) &&
                (value === null ||
                  typeof value === 'string' ||
                  Number.isFinite(value)),
            ),
          400,
          `Dữ liệu bảng ${table} không hợp lệ.`,
        );
      }
    }
    assert(
      snapshot.don_thuoc.every(
        (rx) =>
          validPrescriptionName(rx.storage_name) &&
          prescriptionMimes.includes(rx.mime_type),
      ),
      400,
      'Tên tệp đơn thuốc không hợp lệ.',
    );
    assert(
      snapshot.yeu_cau_huy_hoan.every(
        (r) =>
          !r.evidence_storage_name ||
          (validPrescriptionName(r.evidence_storage_name) &&
            imageMimes.includes(r.evidence_mime_type)),
      ),
      400,
      'Tên tệp ảnh đổi trả không hợp lệ.',
    );
    await d.transaction(async () => {
      await d.deferConstraints();
      const transient = ['sessions', 'ma_otp', 'oauth_states'];
      if (d.kind === 'postgres') transient.push('upload_intents');
      for (const table of [...transient, ...tables.toReversed()])
        await d.run(`DELETE FROM ${table}`);
      for (const table of tables)
        for (const row of snapshot[table]) await d.insert(table, row);
      assert(
        !(await d.foreignKeyViolations()).length,
        400,
        'Bản sao lưu vi phạm quan hệ khóa ngoại.',
      );
      const ids = await d.all(
        'SELECT id FROM nguoi_dung WHERE active=1 AND verified=1',
      );
      assert(
        (
          await Promise.all(
            ids.map(async ({ id }) => {
              const user = await publicUser(d, id);
              return (
                user.role === 'admin' && user.permissions.includes('users')
              );
            }),
          )
        ).some(Boolean),
        400,
        'Bản sao lưu cần quản trị viên đang hoạt động và có quyền quản trị tài khoản.',
      );
      await audit(d, null, 'backup.restore', 'database', '');
      await d.resetSequences();
    });
    res.clearCookie('antam_session', { path: '/' });
    res.json({
      data: {
        message: 'Đã phục hồi dữ liệu. Vui lòng đăng nhập lại.',
        requiresLogin: true,
      },
    });
  });
}
