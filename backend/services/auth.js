import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import nodemailer from 'nodemailer';
import { installGoogleAuth } from '../integrations/google.js';
import { now, camel } from '../repositories/database.js';
import {
  assert,
  text,
  hash,
  randomToken,
  publicUser,
  audit,
  getSettings,
} from './shared.js';
export const passwordValid = (p) =>
  typeof p === 'string' &&
  p.length >= 8 &&
  Buffer.byteLength(p, 'utf8') <= 72 &&
  /[A-Z]/.test(p) &&
  /[a-z]/.test(p) &&
  /\d/.test(p);
export function installAuth(app, d, options) {
  const demo = options.demo;
  const sessionCookie = 'antam_session';
  const login = (res, userId) => {
    const token = randomToken(),
      expires = new Date(Date.now() + 7 * 86400000);
    d.insert('sessions', {
      token_hash: hash(token),
      user_id: userId,
      expires_at: expires.toISOString(),
    });
    res.cookie(sessionCookie, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: options.secureCookies,
      maxAge: 7 * 86400000,
      path: '/',
    });
    return publicUser(d, userId);
  };
  app.use('/api', (req, res, next) => {
    const token = req.cookies?.[sessionCookie];
    if (token) {
      const s = d.one(
        'SELECT * FROM sessions WHERE token_hash=? AND expires_at>?',
        hash(token),
        now(),
      );
      if (s) {
        const u = publicUser(d, s.user_id);
        if (u?.active && u.verified) req.user = u;
      }
    }
    next();
  });
  const auth = (req, res, next) => {
    assert(req.user, 401, 'Vui lòng đăng nhập để tiếp tục.');
    next();
  };
  const permission = (code) => (req, res, next) => {
    assert(req.user, 401, 'Vui lòng đăng nhập.');
    assert(
      req.user.permissions.includes(code),
      403,
      'Bạn không có quyền thực hiện thao tác này.',
    );
    next();
  };
  const admin = (req, res, next) => {
    assert(req.user, 401, 'Vui lòng đăng nhập.');
    assert(
      req.user.role === 'admin',
      403,
      'Chỉ quản trị viên được thực hiện thao tác này.',
    );
    next();
  };
  const sendOtp = async (user, purpose) => {
    if (!demo) {
      assert(
        process.env.SMTP_HOST && process.env.SMTP_FROM,
        503,
        'Dịch vụ gửi mã xác thực chưa được cấu hình.',
      );
      assert(user.email, 400, 'Tài khoản cần email để nhận mã xác thực.');
    }
    const code = String(randomInt(100000, 1000000)),
      ttl = getSettings(d).otpTtlMinutes;
    d.run(
      'UPDATE ma_otp SET consumed=1 WHERE user_id=? AND purpose=?',
      user.id,
      purpose,
    );
    d.insert('ma_otp', {
      user_id: user.id,
      code_hash: hash(code),
      purpose,
      expires_at: new Date(Date.now() + Number(ttl) * 60000).toISOString(),
    });
    if (demo) return code;
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      requireTLS: process.env.SMTP_SECURE !== 'true',
      connectionTimeout: 10000,
      socketTimeout: 15000,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
    const activationPath =
      purpose === 'verify'
        ? `\nMở trang xác thực: ${options.origin}/verify?email=${encodeURIComponent(user.email)}${user.invited ? '&invite=1' : ''}`
        : '';
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: user.email,
      subject: 'Mã xác thực Nhà thuốc An Tâm',
      text: `Mã xác thực của bạn: ${code}. Hết hạn sau ${ttl} phút. Không chia sẻ mã với người khác.${activationPath}`,
    });
    return null;
  };
  const checkOtp = (user, purpose, code) => {
    const otp = d.one(
      'SELECT * FROM ma_otp WHERE user_id=? AND purpose=? AND consumed=0 ORDER BY id DESC LIMIT 1',
      user.id,
      purpose,
    );
    assert(
      otp && otp.expires_at > now() && otp.attempts < 5,
      400,
      'Mã xác thực đã hết hạn hoặc bị khóa. Vui lòng yêu cầu mã mới.',
    );
    d.run('UPDATE ma_otp SET attempts=attempts+1 WHERE id=?', otp.id);
    assert(
      hash(text(code, 10)) === otp.code_hash,
      400,
      'Mã xác thực không đúng.',
    );
    d.update('ma_otp', { consumed: 1 }, otp.id);
  };
  app.get('/api/auth/me', (req, res) => res.json({ data: req.user || null }));
  app.post('/api/auth/login', (req, res) => {
    const identifier = text(
      req.body.email || req.body.phone,
      100,
    ).toLowerCase();
    const user = d.one(
      'SELECT * FROM nguoi_dung WHERE lower(email)=? OR phone=?',
      identifier,
      identifier,
    );
    assert(
      user &&
        bcrypt.compareSync(String(req.body.password || ''), user.password_hash),
      401,
      'Email/số điện thoại hoặc mật khẩu không đúng.',
    );
    assert(
      user.active,
      403,
      'Tài khoản đã bị khóa. Vui lòng liên hệ nhà thuốc.',
    );
    assert(
      user.verified,
      403,
      'Tài khoản chưa xác thực OTP. Vui lòng xác thực trước khi đăng nhập.',
    );
    audit(d, user.id, 'auth.login', 'user', user.id);
    res.json({ data: login(res, user.id) });
  });
  app.post('/api/auth/register', async (req, res) => {
    const name = text(req.body.name, 100),
      email = text(req.body.email, 100).toLowerCase() || null,
      phone = text(req.body.phone, 15) || null,
      password = req.body.password;
    assert(name.length >= 2, 400, 'Vui lòng nhập họ tên (ít nhất 2 ký tự).');
    assert(email || phone, 400, 'Cần email hoặc số điện thoại để đăng ký.');
    assert(demo || email, 400, 'Vui lòng nhập email để nhận mã xác thực.');
    assert(
      demo || (process.env.SMTP_HOST && process.env.SMTP_FROM),
      503,
      'Dịch vụ gửi mã xác thực chưa được cấu hình.',
    );
    assert(
      !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      400,
      'Email không hợp lệ.',
    );
    assert(
      !phone || /^0[0-9]{9}$/.test(phone),
      400,
      'Số điện thoại không hợp lệ.',
    );
    assert(
      passwordValid(password),
      400,
      'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số.',
    );
    assert(
      !d.one(
        'SELECT id FROM nguoi_dung WHERE (email IS NOT NULL AND email=?) OR (phone IS NOT NULL AND phone=?)',
        email,
        phone,
      ),
      409,
      'Email hoặc số điện thoại đã được sử dụng.',
    );
    const id = d.transaction(() => {
      const uid = d.insert('nguoi_dung', {
        name,
        email,
        phone,
        password_hash: bcrypt.hashSync(password, 10),
        verified: 0,
      });
      d.insert('khach_hang', { id: uid });
      d.insert('nguoi_dung_vai_tro', {
        user_id: uid,
        role_id: d.one("SELECT id FROM vai_tro WHERE name='customer'").id,
      });
      d.insert('gio_hang', { user_id: uid });
      return uid;
    });
    const code = await sendOtp(
      { ...d.one('SELECT * FROM nguoi_dung WHERE id=?', id) },
      'verify',
    );
    audit(d, id, 'auth.register', 'user', id);
    res.status(201).json({
      data: {
        email: email || phone,
        requiresVerification: true,
        message: demo
          ? 'Mã xác thực được hiển thị trong chế độ demo.'
          : 'Mã xác thực đã được gửi.',
        ...(code ? { demoCode: code } : {}),
      },
    });
  });
  app.post('/api/auth/verify', (req, res) => {
    const key = text(req.body.email || req.body.phone, 100).toLowerCase();
    const u = d.one(
      'SELECT * FROM nguoi_dung WHERE email=? OR phone=?',
      key,
      key,
    );
    assert(u && u.active, 400, 'Tài khoản không hợp lệ.');
    assert(!u.verified, 400, 'Tài khoản đã được xác thực.');
    const password = req.body.password;
    if (password !== undefined)
      assert(
        passwordValid(password),
        400,
        'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số.',
      );
    checkOtp(u, 'verify', req.body.code);
    const values = { verified: 1, updated_at: now() };
    if (password !== undefined)
      values.password_hash = bcrypt.hashSync(password, 10);
    d.update('nguoi_dung', values, u.id);
    res.json({ data: login(res, u.id) });
  });
  app.post('/api/auth/resend-otp', async (req, res) => {
    const key = text(req.body.email, 100).toLowerCase(),
      u = d.one('SELECT * FROM nguoi_dung WHERE email=? OR phone=?', key, key);
    assert(
      u && !u.verified && u.active,
      400,
      'Không thể gửi lại mã cho tài khoản này.',
    );
    const code = await sendOtp(u, 'verify');
    res.json({
      data: {
        message: 'Đã tạo mã xác thực mới.',
        ...(code ? { demoCode: code } : {}),
      },
    });
  });
  app.post('/api/auth/forgot-password', async (req, res) => {
    const key = text(req.body.email || req.body.phone, 100).toLowerCase(),
      u = d.one('SELECT * FROM nguoi_dung WHERE email=? OR phone=?', key, key);
    let code = null;
    if (u?.active && u.verified) code = await sendOtp(u, 'reset');
    res.json({
      data: {
        message: 'Nếu tài khoản tồn tại, mã đặt lại mật khẩu đã được gửi.',
        email: key,
        ...(demo && code ? { demoCode: code } : {}),
      },
    });
  });
  app.post('/api/auth/reset-password', (req, res) => {
    const key = text(req.body.email || req.body.phone, 100).toLowerCase(),
      u = d.one('SELECT * FROM nguoi_dung WHERE email=? OR phone=?', key, key);
    assert(
      u && u.active && u.verified,
      400,
      'Mã xác thực hoặc tài khoản không hợp lệ.',
    );
    assert(
      passwordValid(req.body.password),
      400,
      'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số.',
    );
    checkOtp(u, 'reset', req.body.code);
    d.update(
      'nguoi_dung',
      {
        password_hash: bcrypt.hashSync(req.body.password, 10),
        updated_at: now(),
      },
      u.id,
    );
    d.run('DELETE FROM sessions WHERE user_id=?', u.id);
    audit(d, u.id, 'auth.reset_password', 'user', u.id);
    res.json({ data: { message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập.' } });
  });
  app.post('/api/auth/logout', (req, res) => {
    if (req.cookies?.[sessionCookie])
      d.run(
        'DELETE FROM sessions WHERE token_hash=?',
        hash(req.cookies[sessionCookie]),
      );
    res.clearCookie(sessionCookie, { path: '/' });
    res.json({ data: { message: 'Đã đăng xuất.' } });
  });
  app.get('/api/profile', auth, (req, res) => res.json({ data: req.user }));
  app.patch('/api/profile', auth, (req, res) => {
    const values = { updated_at: now() };
    if (req.body.name !== undefined) {
      assert(text(req.body.name, 100).length >= 2, 400, 'Họ tên quá ngắn.');
      values.name = text(req.body.name, 100);
    }
    if (req.body.phone !== undefined) {
      assert(
        /^0[0-9]{9}$/.test(req.body.phone),
        400,
        'Số điện thoại không hợp lệ.',
      );
      assert(
        !d.one(
          'SELECT id FROM nguoi_dung WHERE phone=? AND id!=?',
          req.body.phone,
          req.user.id,
        ),
        409,
        'Số điện thoại đã được sử dụng.',
      );
      values.phone = req.body.phone;
    }
    d.update('nguoi_dung', values, req.user.id);
    audit(d, req.user.id, 'profile.update', 'user', req.user.id);
    res.json({ data: publicUser(d, req.user.id) });
  });
  app.post('/api/profile/password', auth, (req, res) => {
    const u = d.one('SELECT * FROM nguoi_dung WHERE id=?', req.user.id);
    assert(
      bcrypt.compareSync(
        String(req.body.currentPassword || ''),
        u.password_hash,
      ),
      400,
      'Mật khẩu hiện tại không đúng.',
    );
    assert(
      passwordValid(req.body.newPassword || req.body.password),
      400,
      'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số.',
    );
    assert(
      !bcrypt.compareSync(
        req.body.newPassword || req.body.password,
        u.password_hash,
      ),
      400,
      'Mật khẩu mới phải khác mật khẩu hiện tại.',
    );
    d.update(
      'nguoi_dung',
      {
        password_hash: bcrypt.hashSync(
          req.body.newPassword || req.body.password,
          10,
        ),
        updated_at: now(),
      },
      u.id,
    );
    d.run('DELETE FROM sessions WHERE user_id=?', u.id);
    res.json({ data: { message: 'Đã đổi mật khẩu. Vui lòng đăng nhập lại.' } });
  });
  app.get('/api/addresses', auth, (req, res) =>
    res.json({
      data: d
        .all(
          'SELECT * FROM dia_chi_giao_hang WHERE user_id=? ORDER BY is_default DESC,id',
          req.user.id,
        )
        .map((x) => ({ ...camel(x), isDefault: !!x.is_default })),
    }),
  );
  const addressValues = (b) => {
    assert(text(b.recipient, 100).length >= 2, 400, 'Cần tên người nhận.');
    assert(
      /^0[0-9]{9}$/.test(String(b.phone || '')),
      400,
      'Số điện thoại người nhận không hợp lệ.',
    );
    assert(
      text(b.line1, 255) &&
        text(b.city, 100) &&
        text(b.ward, 100) &&
        text(b.district, 100),
      400,
      'Vui lòng nhập đủ địa chỉ, phường/xã, quận/huyện và tỉnh/thành phố.',
    );
    return {
      recipient: text(b.recipient, 100),
      phone: text(b.phone, 15),
      line1: text(b.line1, 255),
      ward: text(b.ward, 100),
      district: text(b.district, 100),
      city: text(b.city, 100),
      is_default: b.isDefault ? 1 : 0,
    };
  };
  app.post('/api/addresses', auth, (req, res) => {
    const count = d.one(
      'SELECT COUNT(*) n FROM dia_chi_giao_hang WHERE user_id=?',
      req.user.id,
    ).n;
    assert(count < 10, 400, 'Sổ địa chỉ tối đa 10 địa chỉ.');
    const values = addressValues(req.body);
    if (!count) values.is_default = 1;
    const id = d.transaction(() => {
      if (values.is_default)
        d.run(
          'UPDATE dia_chi_giao_hang SET is_default=0 WHERE user_id=?',
          req.user.id,
        );
      return d.insert('dia_chi_giao_hang', { user_id: req.user.id, ...values });
    });
    res.status(201).json({
      data: camel(d.one('SELECT * FROM dia_chi_giao_hang WHERE id=?', id)),
    });
  });
  app.patch('/api/addresses/:id', auth, (req, res) => {
    const old = d.one(
      'SELECT * FROM dia_chi_giao_hang WHERE id=? AND user_id=?',
      req.params.id,
      req.user.id,
    );
    assert(old, 404, 'Không tìm thấy địa chỉ.');
    const values = addressValues({ ...camel(old), ...req.body });
    if (old.is_default && !values.is_default) values.is_default = 1;
    d.transaction(() => {
      if (values.is_default)
        d.run(
          'UPDATE dia_chi_giao_hang SET is_default=0 WHERE user_id=?',
          req.user.id,
        );
      d.update('dia_chi_giao_hang', values, old.id);
    });
    res.json({
      data: camel(d.one('SELECT * FROM dia_chi_giao_hang WHERE id=?', old.id)),
    });
  });
  app.delete('/api/addresses/:id', auth, (req, res) => {
    const a = d.one(
      'SELECT * FROM dia_chi_giao_hang WHERE id=? AND user_id=?',
      req.params.id,
      req.user.id,
    );
    assert(a, 404, 'Không tìm thấy địa chỉ.');
    d.transaction(() => {
      d.run('DELETE FROM dia_chi_giao_hang WHERE id=?', a.id);
      if (a.is_default) {
        const first = d.one(
          'SELECT id FROM dia_chi_giao_hang WHERE user_id=? ORDER BY id LIMIT 1',
          req.user.id,
        );
        if (first) d.update('dia_chi_giao_hang', { is_default: 1 }, first.id);
      }
    });
    res.json({ data: { deleted: true } });
  });
  installGoogleAuth(app, d, options, login);
  return { auth, permission, admin, addressValues, sendOtp };
}
