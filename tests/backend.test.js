import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHmac } from 'node:crypto';
import { createApp } from '../backend/app.js';
import { openPostgres, postgresSql } from '../backend/repositories/postgres.js';
import { initializePostgresSchema, applyPendingMigrations } from '../backend/repositories/postgres-migrations.js';
import { createTestDatabase } from './postgres-fixture.js';
import { resolveApiUrl } from '../api/index.js';
import {
  bankTransferConfig,
  buildVietQrPayload,
} from '../backend/services/bank-transfer.js';
async function fixture(t, options = {}) {
  const storage = mkdtempSync(path.join(os.tmpdir(), 'antam-test-'));
  const postgres = await createTestDatabase();
  const app = await createApp({
      dbPath: ':memory:',
      testing: true,
      storagePath: storage,
      databaseUrl: postgres?.databaseUrl,
      ...options,
    }).catch(async (error) => {
      await postgres?.cleanup();
      throw error;
    }),
    server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await app.locals.store.close();
    await postgres?.cleanup();
    rmSync(storage, { recursive: true, force: true });
  });
  const client = () => {
    let cookie = '';
    return async (route, method = 'GET', body, extra = {}) => {
      const form = body instanceof FormData;
      const response = await fetch(base + route, {
        method,
        redirect: 'manual',
        headers: {
          ...(body && !form ? { 'Content-Type': 'application/json' } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...extra,
        },
        ...(body
          ? {
              body: form ? body : JSON.stringify(body),
            }
          : {}),
      });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0];
      const content = response.headers.get('content-type') || '';
      const json = content.includes('application/json')
        ? await response.json()
        : await response.text();
      return {
        status: response.status,
        data: json?.data,
        body: json,
        headers: response.headers,
      };
    };
  };
  const login = async (email = 'khach@antam.vn') => {
    const c = client();
    const r = await c('/auth/login', 'POST', { email, password: 'Demo@123' });
    assert.equal(r.status, 200);
    return c;
  };
  return { app, d: app.locals.store, client, login };
}

test('Vercel rewrites preserve the path and business query parameters', () => {
  assert.equal(
    resolveApiUrl('/api/index?__antam_path=orders%2F1&payment=waiting'),
    '/api/orders/1?payment=waiting',
  );
  assert.equal(
    resolveApiUrl('/api/products?search=nuoc%20muoi'),
    '/api/products?search=nuoc+muoi',
  );
  assert.equal(
    resolveApiUrl('/api/index?__antam_path=..%2Fadmin'),
    '/api/index',
  );
});

test(
  'a running PostgreSQL store follows the schema rename and retains existing rows',
  { skip: !process.env.ANTAM_TEST_POSTGRES_URL },
  async () => {
    const database = await createTestDatabase();
    const migrator = openPostgres(database.databaseUrl);
    const running = openPostgres(database.databaseUrl);
    try {
      await migrator.migrate('ALTER SCHEMA antam RENAME TO minhan');
      const id = await running.insert('danh_muc', {
        name: 'Danh mục trước khi đổi schema',
        slug: 'danh-muc-cu',
      });
      const before = await running.one('SELECT * FROM danh_muc WHERE id=?', id);
      const oid = await running.one("SELECT 'minhan.danh_muc'::regclass::oid AS table_id");

      await initializePostgresSchema(migrator);
      await initializePostgresSchema(migrator);

      const after = await running.one('SELECT * FROM danh_muc WHERE id=?', id);
      assert.deepEqual(after, before);
      assert.deepEqual(
        await running.one("SELECT 'antam.danh_muc'::regclass::oid AS table_id"),
        oid,
      );
      assert.equal(
        (await running.one("SELECT to_regnamespace('minhan') IS NULL AS removed")).removed,
        true,
      );
    } finally {
      await running.close();
      await migrator.close();
      await database.cleanup();
    }
  },
);

test(
  'signed attachments are scoped to the uploader and consumed after use',
  { skip: !process.env.ANTAM_TEST_POSTGRES_URL },
  async (t) => {
    const uploads = new Set();
    const attachmentStorage = {
      async check() {},
      async signUpload(id) {
        uploads.add(id);
        return `https://storage.example.test/upload/${id}`;
      },
      async inspect(id, mime, size) {
        return uploads.has(id) && mime === 'application/pdf' && size === 128;
      },
      async signedRead(id) {
        return `https://storage.example.test/read/${id}`;
      },
      async remove(ids) {
        ids.forEach((id) => uploads.delete(id));
      },
    };
    const { login } = await fixture(t, { attachmentStorage });
    const customer = await login();
    const other = await login('huong@antam.vn');
    const intent = await customer('/uploads/intents', 'POST', {
      kind: 'prescription',
      fileName: 'don-mau.pdf',
      mimeType: 'application/pdf',
      size: 128,
    });
    assert.equal(intent.status, 201);
    assert.equal(
      (
        await other('/prescriptions', 'POST', {
          uploadId: intent.data.uploadId,
        })
      ).status,
      404,
    );
    const appointment = await customer('/prescriptions', 'POST', {
      uploadId: intent.data.uploadId,
    });
    assert.equal(appointment.status, 201);
    assert.equal(
      (
        await customer('/prescriptions', 'POST', {
          uploadId: intent.data.uploadId,
        })
      ).status,
      404,
    );
    const route = `/prescriptions/${appointment.data.id}/file`;
    assert.equal((await other(route)).status, 404);
    const link = await customer(route);
    assert.equal(link.status, 302);
    assert.equal(
      link.headers.get('location'),
      `https://storage.example.test/read/${intent.data.uploadId}`,
    );
  },
);
test('VNPay Sandbox updates an order only after a signed IPN for its exact amount', async (t) => {
  const vnpay = {
    merchant: 'ANTAMQA',
    secret: 'sandbox-test-fixture-only',
    returnUrl: 'http://localhost:3001/api/payments/vnpay/return',
  };
  const { d, login, client } = await fixture(t, { vnpay });
  const customer = await login();
  await add(customer, 1);
  const created = await order(customer, { paymentMethod: 'vnpay' });
  assert.equal(created.status, 201);
  const attempt = await customer(
    `/orders/${created.data.id}/vnpay`,
    'POST',
    {},
  );
  assert.equal(attempt.status, 200);
  const payment = new URL(attempt.data.url);
  assert.equal(payment.hostname, 'sandbox.vnpayment.vn');
  const reference = payment.searchParams.get('vnp_TxnRef');
  const params = {
    vnp_Amount: String(created.data.total * 100),
    vnp_ResponseCode: '00',
    vnp_TmnCode: vnpay.merchant,
    vnp_TransactionNo: '123456789',
    vnp_TransactionStatus: '00',
    vnp_TxnRef: reference,
  };
  const signed = (values) => {
    const payload = new URLSearchParams(
      Object.entries(values).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ).toString();
    return `${payload}&vnp_SecureHash=${createHmac('sha512', vnpay.secret).update(payload).digest('hex')}`;
  };
  const ipn = '/payments/vnpay/ipn';
  const callback = client();
  assert.equal(
    (await callback(`${ipn}?vnp_TxnRef=${reference}`)).body.RspCode,
    '97',
  );
  assert.equal(
    (await callback(`${ipn}?${signed({ ...params, vnp_Amount: '100' })}`)).body
      .RspCode,
    '04',
  );
  assert.equal(
    (await customer(`/orders/${created.data.id}`)).data.paymentStatus,
    'unpaid',
  );
  assert.equal((await callback(`${ipn}?${signed(params)}`)).body.RspCode, '00');
  assert.equal((await callback(`${ipn}?${signed(params)}`)).body.RspCode, '02');
  assert.equal(
    (await customer(`/orders/${created.data.id}`)).data.paymentStatus,
    'paid',
  );
  assert.equal(
    (
      await d.one(
        "SELECT COUNT(*) n FROM giao_dich_thanh_toan WHERE order_id=? AND status='success'",
        created.data.id,
      )
    ).n,
    1,
  );
});
test('partial prescription review allows only the approved items and restores reservations for excluded drugs', async (t) => {
  const { login } = await fixture(t);
  const customer = await login();
  const pharmacist = await login('duocsi@antam.vn');
  const [allowed, excluded] = (await customer('/products?prescription=true'))
    .data;
  await add(customer, allowed.id);
  await add(customer, excluded.id);
  const rx = await upload(customer);
  const created = (await order(customer, { prescriptionId: rx.id })).data;
  const decision = await pharmacist(`/admin/prescriptions/${rx.id}`, 'PATCH', {
    status: 'partial',
    productIds: [allowed.id],
    note: 'Đã đối chiếu một thuốc trong đơn.',
  });
  assert.equal(decision.status, 200);
  assert.equal(
    (
      await pharmacist(`/admin/orders/${created.id}/status`, 'PATCH', {
        status: 'confirmed',
      })
    ).status,
    409,
  );
  const adjusted = await customer(
    `/orders/${created.id}/rx-adjustment`,
    'POST',
    { mode: 'approved_only' },
  );
  assert.equal(adjusted.status, 200);
  assert.deepEqual(
    adjusted.data.items.map((item) => item.productId),
    [allowed.id],
  );
  assert.equal(adjusted.data.prescriptionStatus, 'approved');
  assert.equal(adjusted.data.subtotal, allowed.price);
  assert.equal(
    (await customer(`/products/${excluded.id}`)).data.stock,
    excluded.stock,
  );
});
test('encrypted backup rejects the wrong passphrase and restores data in a transaction', async (t) => {
  const { login, d } = await fixture(t);
  const admin = await login('admin@antam.vn');
  const passphrase = 'demo-fixture-restore-only';
  const backup = await admin('/admin/backup', 'POST', { passphrase });
  assert.equal(backup.status, 200);
  assert.equal(backup.data.format, 'antam-backup-v1');
  assert.equal(backup.data.tables, undefined);
  assert.ok(!JSON.stringify(backup.data).includes('khach@antam.vn'));
  await admin('/admin/categories', 'POST', {
    name: 'Danh mục tạo sau sao lưu',
    slug: 'after-backup',
  });
  const incorrect = await admin('/admin/backup/restore', 'POST', {
    confirm: 'RESTORE_ANTAM',
    passphrase: 'incorrect-passphrase',
    backup: backup.data,
  });
  assert.equal(incorrect.status, 400);
  assert.ok(
    await d.one('SELECT id FROM danh_muc WHERE slug=?', 'after-backup'),
  );
  const restore = await admin('/admin/backup/restore', 'POST', {
    confirm: 'RESTORE_ANTAM',
    passphrase,
    backup: backup.data,
  });
  assert.equal(restore.status, 200);
  assert.equal(
    await d.one('SELECT id FROM danh_muc WHERE slug=?', 'after-backup'),
    undefined,
  );
  assert.equal((await admin('/auth/me')).data, null);
});
test('staff activation sets a password and account lock requires a reason and revokes sessions', async (t) => {
  const { login, client } = await fixture(t);
  const admin = await login('admin@antam.vn');
  const staff = client();
  const email = 'qa.staff@antam.test';
  const invite = await admin('/admin/users', 'POST', {
    name: 'Nhân viên kiểm thử',
    email,
    jobTitle: 'pharmacist',
  });
  assert.equal(invite.status, 201);
  assert.equal(invite.data.user.verified, false);
  const verified = await staff('/auth/verify', 'POST', {
    email,
    code: invite.data.demoCode,
    password: 'Strong@1234',
  });
  assert.equal(verified.status, 200);
  assert.ok(verified.data.permissions.includes('prescriptions'));
  const endpoint = `/admin/users/${verified.data.id}`;
  assert.equal((await admin(endpoint, 'PATCH', { active: false })).status, 400);
  assert.equal(
    (
      await admin(endpoint, 'PATCH', {
        active: false,
        reason: 'Kiểm tra khóa tài khoản',
      })
    ).status,
    200,
  );
  assert.equal((await staff('/auth/me')).data, null);
});
test('new chatbot knowledge becomes available after a pharmacist reviews it', async (t) => {
  const { login } = await fixture(t);
  const admin = await login('admin@antam.vn');
  const pharmacist = await login('duocsi@antam.vn');
  const customer = await login();
  const knowledge = await admin('/admin/knowledge', 'POST', {
    title: 'Lịch hỗ trợ demo',
    keywords: 'lichphucvu',
    content: 'Giờ hỗ trợ demo từ 8 giờ.',
    source: 'Lịch phục vụ thử nghiệm',
  });
  assert.equal(knowledge.status, 201);
  const ask = () =>
    customer('/chat', 'POST', { message: 'Cho tôi hỏi lichphucvu' });
  assert.doesNotMatch((await ask()).data.reply, /Giờ hỗ trợ demo/);
  assert.equal(
    (await admin(`/admin/knowledge/${knowledge.data.id}/review`, 'POST', {}))
      .status,
    403,
  );
  assert.equal(
    (
      await pharmacist(
        `/admin/knowledge/${knowledge.data.id}/review`,
        'POST',
        {},
      )
    ).status,
    200,
  );
  assert.match((await ask()).data.reply, /Giờ hỗ trợ demo/);
});
test('guest chat answers store information without storing a personal history', async (t) => {
  const { d, client } = await fixture(t);
  const guest = client();
  const before = (await d.one('SELECT COUNT(*) n FROM cuoc_hoi_thoai')).n;
  const publicInfo = await guest('/chat', 'POST', {
    message: 'Phí giao hàng bao nhiêu?',
  });
  assert.equal(publicInfo.status, 200);
  assert.equal(publicInfo.data.sessionId, null);
  assert.match(publicInfo.data.reply, /25.000/);
  assert.match(
    (await guest('/chat', 'POST', { message: 'Theo dõi đơn hàng của tôi' }))
      .data.reply,
    /đăng nhập/,
  );
  assert.equal(
    (await d.one('SELECT COUNT(*) n FROM cuoc_hoi_thoai')).n,
    before,
  );
});
test('return requires private photo evidence and stores stock only when inspected', async (t) => {
  const { login } = await fixture(t);
  const customer = await login();
  const other = await login('huong@antam.vn');
  const staff = await login('duocsi@antam.vn');
  const cartItem = 1;
  await add(customer, cartItem);
  const created = (await order(customer)).data;
  for (const status of ['confirmed', 'packing', 'shipping', 'delivered']) {
    assert.equal(
      (
        await staff(`/admin/orders/${created.id}/status`, 'PATCH', {
          status,
          collected: true,
        })
      ).status,
      200,
    );
  }
  const endpoint = `/orders/${created.id}/requests`;
  assert.equal(
    (
      await customer(endpoint, 'POST', {
        type: 'return',
        reason: 'Tình trạng sản phẩm cần kiểm tra',
      })
    ).status,
    400,
  );
  const form = new FormData();
  form.append('type', 'return');
  form.append('reason', 'Tình trạng sản phẩm cần kiểm tra');
  form.append(
    'evidence',
    new Blob(
      [
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X35sAAAAASUVORK5CYII=',
          'base64',
        ),
      ],
      { type: 'image/png' },
    ),
    'tinh-trang.png',
  );
  const evidenceRequest = await customer(endpoint, 'POST', form);
  assert.equal(evidenceRequest.status, 201);
  assert.equal(evidenceRequest.data.evidenceAvailable, true);
  const id = evidenceRequest.data.id;
  assert.equal((await other(`${endpoint}/${id}/evidence`)).status, 404);
  assert.equal(
    (await staff(`${endpoint}/${id}/evidence`)).headers.get('content-type'),
    'image/png',
  );
  assert.equal(
    (
      await staff(`/admin/requests/${id}`, 'PATCH', {
        status: 'approved',
        restock: true,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await staff(`/admin/requests/${id}`, 'PATCH', {
        status: 'approved',
        restock: true,
        sealed: true,
      })
    ).status,
    200,
  );
  assert.equal(
    (await staff(`/admin/requests/${id}/refund`, 'POST', {})).data
      .paymentStatus,
    'refunded',
  );
});
const address = {
  recipient: 'Khách kiểm thử',
  phone: '0901234567',
  line1: '24 Nguyễn Văn Cừ',
  ward: 'Võ Cường',
  district: 'Bắc Ninh',
  city: 'Bắc Ninh',
};
async function add(c, productId, quantity = 1) {
  const r = await c('/cart', 'POST', { productId, quantity });
  assert.equal(r.status, 201, JSON.stringify(r.body));
}
async function order(c, extra = {}) {
  return c('/orders', 'POST', { address, paymentMethod: 'cod', ...extra });
}
async function upload(c) {
  const form = new FormData();
  form.append(
    'file',
    new Blob(['%PDF-1.7\nDemo prescription\n%%EOF'], {
      type: 'application/pdf',
    }),
    'don-thuoc.pdf',
  );
  const r = await c('/prescriptions', 'POST', form);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.data;
}
test('API enforces sessions, role permission, CSRF origin and accent-insensitive search', async (t) => {
  const { client, login } = await fixture(t),
    anonymous = client();
  assert.equal((await anonymous('/cart')).status, 401);
  const customer = await login();
  assert.equal((await customer('/admin/users')).status, 403);
  assert.equal((await customer('/admin/inventory')).status, 403);
  assert.equal(
    (
      await customer(
        '/cart',
        'POST',
        { productId: 1, quantity: 1 },
        { Origin: 'https://evil.example' },
      )
    ).status,
    403,
  );
  const found = await anonymous('/products?search=nuoc%20muoi');
  assert.equal(found.status, 200);
  assert.ok(found.data.some((p) => p.name.includes('Nước muối')));
  const warehouse = await login('kho@antam.vn');
  assert.equal((await warehouse('/admin/prescriptions')).status, 403);
  const admin = await login('admin@antam.vn');
  assert.equal((await admin('/admin/prescriptions')).status, 403);
});
test('registration verifies single-use OTP, resets password and revokes sessions', async (t) => {
  const { client } = await fixture(t),
    c = client();
  assert.equal(
    (
      await c('/auth/register', 'POST', {
        name: 'Tester',
        email: 'tester@example.test',
        password: 'weak',
      })
    ).status,
    400,
  );
  const reg = await c('/auth/register', 'POST', {
    name: 'Tester',
    email: 'tester@example.test',
    phone: '0909998877',
    password: 'Strong@123',
  });
  assert.equal(reg.status, 201);
  assert.match(reg.data.demoCode, /^\d{6}$/);
  assert.equal(
    (
      await c('/auth/login', 'POST', {
        email: 'tester@example.test',
        password: 'Strong@123',
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await c('/auth/verify', 'POST', {
        email: 'tester@example.test',
        code: '000000',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await c('/auth/verify', 'POST', {
        email: 'tester@example.test',
        code: reg.data.demoCode,
      })
    ).status,
    200,
  );
  assert.equal((await c('/auth/me')).data.email, 'tester@example.test');
  assert.equal(
    (
      await c('/auth/verify', 'POST', {
        email: 'tester@example.test',
        code: reg.data.demoCode,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await c('/profile/password', 'POST', {
        currentPassword: 'Strong@123',
        newPassword: 'Strong@123',
      })
    ).status,
    400,
  );
  const forgot = await c('/auth/forgot-password', 'POST', {
    email: 'tester@example.test',
  });
  assert.ok(forgot.data.demoCode);
  assert.equal(
    (
      await c('/auth/reset-password', 'POST', {
        email: 'tester@example.test',
        code: forgot.data.demoCode,
        password: 'Changed@123',
      })
    ).status,
    200,
  );
  assert.equal((await c('/auth/me')).data, null);
  assert.equal(
    (
      await c('/auth/login', 'POST', {
        email: 'tester@example.test',
        password: 'Changed@123',
      })
    ).status,
    200,
  );
});
test('prescription files are private and matched to actual order before pharmacist approval', async (t) => {
  const { login } = await fixture(t),
    customer = await login(),
    other = await login('huong@antam.vn'),
    staff = await login('duocsi@antam.vn');
  const rx = await upload(customer);
  assert.equal((await other(`/prescriptions/${rx.id}/file`)).status, 404);
  assert.equal(
    (
      await staff(`/admin/prescriptions/${rx.id}`, 'PATCH', {
        status: 'approved',
      })
    ).status,
    409,
  );
  await add(customer, 10);
  assert.equal((await order(customer, { paymentMethod: 'demo' })).status, 400);
  const created = await order(customer, {
    paymentMethod: 'demo',
    prescriptionId: rx.id,
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'pending_prescription');
  assert.equal(
    (
      await customer(`/orders/${created.data.id}/payment`, 'POST', {
        result: 'success',
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await staff(`/admin/orders/${created.data.id}/status`, 'PATCH', {
        status: 'confirmed',
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await staff(`/admin/prescriptions/${rx.id}`, 'PATCH', {
        status: 'approved',
        note: 'Đã đối chiếu thuốc và đơn',
      })
    ).status,
    200,
  );
  const paid = await customer(`/orders/${created.data.id}/payment`, 'POST', {
    result: 'success',
  });
  assert.equal(paid.status, 200);
  assert.equal(paid.data.paymentStatus, 'paid');
  assert.equal(
    (
      await staff(`/admin/orders/${created.data.id}/status`, 'PATCH', {
        status: 'confirmed',
      })
    ).status,
    200,
  );
});
test('checkout reserves FEFO stock, confirmation deducts once, cancellation restores once', async (t) => {
  const { login, d } = await fixture(t),
    customer = await login(),
    staff = await login('duocsi@antam.vn');
  const p = (await customer('/products/11')).data,
    early = await d.one(
      'SELECT * FROM lo_thuoc WHERE product_id=11 ORDER BY expires_at LIMIT 1',
    );
  await add(customer, 11, 2);
  const created = await order(customer);
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.equal(
    (await d.one('SELECT quantity FROM lo_thuoc WHERE id=?', early.id))
      .quantity,
    early.quantity,
  );
  assert.equal(
    (await d.one('SELECT reserved FROM lo_thuoc WHERE id=?', early.id))
      .reserved,
    early.reserved + 2,
  );
  assert.equal((await customer('/products/11')).data.stock, p.stock - 2);
  assert.equal(
    (
      await staff(`/admin/orders/${id}/status`, 'PATCH', {
        status: 'confirmed',
      })
    ).status,
    200,
  );
  assert.equal(
    (await d.one('SELECT quantity FROM lo_thuoc WHERE id=?', early.id))
      .quantity,
    early.quantity - 2,
  );
  assert.equal(
    (await d.one('SELECT reserved FROM lo_thuoc WHERE id=?', early.id))
      .reserved,
    early.reserved,
  );
  assert.equal(
    (
      await staff(`/admin/orders/${id}/status`, 'PATCH', {
        status: 'confirmed',
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await staff(`/admin/orders/${id}/status`, 'PATCH', {
        status: 'cancelled',
      })
    ).status,
    200,
  );
  assert.equal(
    (await d.one('SELECT quantity FROM lo_thuoc WHERE id=?', early.id))
      .quantity,
    early.quantity,
  );
  assert.equal(
    (
      await staff(`/admin/orders/${id}/status`, 'PATCH', {
        status: 'cancelled',
      })
    ).status,
    409,
  );
});
test('concurrent orders cannot oversell and a failed checkout preserves cart', async (t) => {
  const { login, d } = await fixture(t),
    a = await login(),
    b = await login('huong@antam.vn');
  const batches = await d.all('SELECT * FROM lo_thuoc WHERE product_id=11');
  for (const row of batches)
    await d.update(
      'lo_thuoc',
      {
        quantity: row.id === batches[0].id ? 3 : 0,
        reserved: 0,
      },
      row.id,
    );
  await add(a, 11, 2);
  await add(b, 11, 2);
  const results = await Promise.all([order(a), order(b)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(
    (await d.one('SELECT SUM(reserved) n FROM lo_thuoc WHERE product_id=11')).n,
    2,
  );
  const loser = results[0].status === 409 ? a : b;
  assert.equal((await loser('/cart')).data.length, 1);
});
test('expired batches never count as sellable and receipt rejects expired/future invalid dates', async (t) => {
  const { login, d } = await fixture(t),
    c = await login(),
    staff = await login('duocsi@antam.vn');
  const stock = (await c('/products/3')).data.stock,
    actual = (
      await d.one(
        "SELECT SUM(quantity-reserved) n FROM lo_thuoc WHERE product_id=3 AND expires_at>date('now')",
      )
    ).n;
  assert.equal(stock, actual);
  assert.ok(
    (
      await d.one(
        "SELECT quantity n FROM lo_thuoc WHERE product_id=3 AND expires_at<=date('now')",
      )
    ).n > 0,
  );
  assert.equal(
    (
      await staff('/admin/inventory/receipts', 'POST', {
        supplierId: 1,
        items: [
          {
            productId: 3,
            batchNumber: 'EXPIRED-TEST',
            quantity: 10,
            cost: 1000,
            manufacturedAt: '2020-01-01',
            expiresAt: '2021-01-01',
          },
        ],
      })
    ).status,
    400,
  );
  const inv = await staff('/admin/inventory');
  assert.ok(inv.data.alerts.some((a) => a.type === 'expired'));
});
test('server computes immutable totals and coupon usage, ignores forged client prices', async (t) => {
  const { login } = await fixture(t),
    c = await login();
  await add(c, 2, 2);
  const created = await order(c, {
    promotionCode: 'KHOEMANH10',
    total: 1,
    discount: 999999,
    price: 1,
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.subtotal, 430000);
  assert.equal(created.data.discount, 43000);
  assert.equal(created.data.shippingFee, 0);
  assert.equal(created.data.total, 387000);
});
test('demo payment is idempotent, refund cannot repeat and order transitions enforce COD collection', async (t) => {
  const { login, d } = await fixture(t),
    c = await login(),
    staff = await login('duocsi@antam.vn');
  await add(c, 1);
  const created = await order(c, { paymentMethod: 'demo' }),
    id = created.data.id;
  assert.equal(
    (
      await staff(`/admin/orders/${id}/status`, 'PATCH', {
        status: 'confirmed',
      })
    ).status,
    409,
  );
  assert.equal(
    (await c(`/orders/${id}/payment`, 'POST', { result: 'failed' })).data
      .paymentStatus,
    'failed',
  );
  assert.equal(
    (await c(`/orders/${id}/payment`, 'POST', { result: 'success' })).data
      .paymentStatus,
    'paid',
  );
  assert.equal(
    (await c(`/orders/${id}/payment`, 'POST', { result: 'success' })).status,
    200,
  );
  assert.equal(
    (
      await d.one(
        "SELECT COUNT(*) n FROM giao_dich_thanh_toan WHERE order_id=? AND status='success' AND type='payment'",
        id,
      )
    ).n,
    1,
  );
  const request = await c(`/orders/${id}/requests`, 'POST', {
    type: 'cancel',
    reason: 'Tôi muốn hủy đơn hàng này',
  });
  assert.equal(request.status, 201);
  assert.equal(
    (
      await staff(`/admin/requests/${request.data.id}`, 'PATCH', {
        status: 'approved',
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await staff(`/admin/requests/${request.data.id}/refund`, 'POST', {
        amount: created.data.total + 1,
      })
    ).status,
    400,
  );
  assert.equal(
    (await staff(`/admin/requests/${request.data.id}/refund`, 'POST', {})).data
      .paymentStatus,
    'refunded',
  );
  assert.equal(
    (await staff(`/admin/requests/${request.data.id}/refund`, 'POST', {}))
      .status,
    409,
  );
  await add(c, 1);
  const cod = (await order(c)).data;
  for (const status of ['confirmed', 'packing', 'shipping'])
    assert.equal(
      (await staff(`/admin/orders/${cod.id}/status`, 'PATCH', { status }))
        .status,
      200,
    );
  assert.equal(
    (
      await staff(`/admin/orders/${cod.id}/status`, 'PATCH', {
        status: 'delivered',
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await staff(`/admin/orders/${cod.id}/status`, 'PATCH', {
        status: 'delivered',
        collected: true,
      })
    ).data.paymentStatus,
    'paid',
  );
});
test('review requires ownership, delivered purchase and is unique per product/order', async (t) => {
  const { login } = await fixture(t),
    c = await login();
  await add(c, 11);
  const o = (await order(c)).data;
  assert.equal(
    (
      await c('/reviews', 'POST', {
        orderId: o.id,
        productId: 11,
        rating: 5,
        comment: 'Sản phẩm tốt',
      })
    ).status,
    403,
  );
  const review = {
    orderId: 2,
    productId: 2,
    rating: 4,
    comment: 'Giao hàng nhanh và cẩn thận',
  };
  assert.equal((await c('/reviews', 'POST', review)).status, 409);
  assert.equal(
    (
      await c('/reviews', 'POST', {
        orderId: 3,
        productId: 3,
        rating: 5,
        comment: 'Đóng gói cẩn thận',
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await c('/reviews', 'POST', {
        orderId: 3,
        productId: 3,
        rating: 5,
        comment: 'Đóng gói cẩn thận',
      })
    ).status,
    409,
  );
});
test('chat safety runs before provider and conversations are isolated by account', async (t) => {
  const { login } = await fixture(t),
    a = await login(),
    b = await login('huong@antam.vn');
  const chat = await a('/chat', 'POST', {
    message: 'Tôi bị khó thở và đau ngực',
  });
  assert.equal(chat.status, 200);
  assert.equal(chat.data.mode, 'safety');
  assert.ok(chat.data.handoff);
  assert.equal(chat.data.products.length, 0);
  assert.equal(
    (await b(`/chat/sessions/${chat.data.sessionId}/messages`)).status,
    404,
  );
  const knowledge = await a('/chat', 'POST', {
    message: 'Phí giao hàng bao nhiêu?',
  });
  assert.equal(knowledge.data.mode, 'knowledge');
  assert.match(knowledge.data.reply, /25.000/);
});
test('last admin is protected and permission deny overrides role default grants', async (t) => {
  const { login } = await fixture(t),
    admin = await login('admin@antam.vn');
  assert.equal(
    (await admin('/admin/users/3', 'PATCH', { active: false })).status,
    409,
  );
  assert.equal(
    (await admin('/admin/users/3', 'PATCH', { role: 'customer' })).status,
    409,
  );
  const staff = (await admin('/admin/users')).data.find(
    (u) => u.email === 'duocsi@antam.vn',
  );
  assert.equal(
    (
      await admin(`/admin/users/${staff.id}`, 'PATCH', {
        permissions: staff.permissions.filter((p) => p !== 'reports'),
      })
    ).status,
    200,
  );
  const pharmacy = await login('duocsi@antam.vn');
  assert.equal((await pharmacy('/admin/reports')).status, 403);
  assert.equal((await pharmacy('/admin/inventory')).status, 200);
});

test('delivery addresses accept current two-level locations and retain legacy districts', async (t) => {
  const { login } = await fixture(t);
  const customer = await login();
  const address = { recipient: 'Khách hàng', phone: '0901234567', line1: '12 Đường Mới', city: 'Thành phố Hà Nội', ward: 'Phường Ba Đình', district: '' };
  const modern = await customer('/addresses', 'POST', address);
  assert.equal(modern.status, 201);
  assert.equal(modern.data.district, '');
  const legacy = await customer('/addresses', 'POST', { ...address, district: 'Quận Ba Đình' });
  assert.equal(legacy.status, 201);
  assert.equal(legacy.data.district, 'Quận Ba Đình');
  assert.equal((await customer('/addresses', 'POST', { ...address, ward: '' })).status, 400);
});

test('VietQR uses server totals and only staff can reconcile a transfer once', async (t) => {
  const { login, d } = await fixture(t, { bankTransfer: { bankBin: '970423', account: '123456789', accountName: 'TEST ACCOUNT', bankName: 'TPBank' } });
  const customer = await login();
  const staff = await login('duocsi@antam.vn');
  await add(customer, 1, 1);
  const created = await order(customer, { paymentMethod: 'bank_transfer' });
  assert.equal(created.status, 201);
  const id = created.data.id;
  const details = await customer(`/orders/${id}/bank-transfer`);
  assert.equal(details.status, 200);
  assert.equal(details.data.amount, created.data.total);
  assert.equal(new URL(details.data.qrUrl).searchParams.get('amount'), String(created.data.total));
  const payload = { amount: created.data.total, reference: 'TESTBANK00001', confirmed: true };
  assert.equal((await customer(`/admin/orders/${id}/bank-transfer`, 'POST', payload)).status, 403);
  assert.equal((await staff(`/admin/orders/${id}/bank-transfer`, 'POST', { ...payload, amount: 1 })).status, 400);
  const paid = await staff(`/admin/orders/${id}/bank-transfer`, 'POST', payload);
  assert.equal(paid.status, 200);
  assert.equal(paid.data.paymentStatus, 'paid');
  assert.equal((await staff(`/admin/orders/${id}/bank-transfer`, 'POST', payload)).status, 200);
  assert.equal((await d.one("SELECT COUNT(*) n FROM giao_dich_thanh_toan WHERE provider='bank_transfer' AND status='success'")).n, 1);
});

test('prescription matching requires an owned upload and preserves pharmacist review', async (t) => {
  const { login } = await fixture(t);
  const customer = await login();
  const other = await login('huong@antam.vn');
  const rx = await upload(customer);
  const payload = { medicines: [{ name: 'Amoxicillin', ingredient: 'Amoxicillin', strength: '500mg' }] };
  const found = await customer(`/prescriptions/${rx.id}/matches`, 'POST', payload);
  assert.equal(found.status, 200);
  assert.ok(found.data.results[0].matches.some((product) => product.prescriptionRequired));
  assert.equal((await other(`/prescriptions/${rx.id}/matches`, 'POST', payload)).status, 404);
  assert.equal((await customer(`/prescriptions/${rx.id}/analyze`, 'POST', { consent: false })).status, 400);
  assert.equal((await customer(`/prescriptions/${rx.id}/analyze`, 'POST', { consent: true })).status, 503);
  await add(customer, found.data.results[0].matches.find((product) => product.prescriptionRequired).id);
  assert.equal((await order(customer)).status, 400);
  const created = await order(customer, { prescriptionId: rx.id });
  assert.equal(created.data.status, 'pending_prescription');
});

test('search suggestions accept accents, reordered words and small spelling errors', async (t) => {
  const { client } = await fixture(t);
  const guest = client();
  const fuzzy = await guest('/products/suggestions?search=vitamni');
  assert.equal(fuzzy.status, 200);
  assert.ok(fuzzy.data.some((product) => product.name.includes('Vitamin C')));
  assert.ok(fuzzy.data.every((product) => !product.prescriptionRequired));
  const reordered = await guest('/products?search=muoi%20nuoc');
  assert.ok(reordered.data.some((product) => product.name.includes('Nước muối')));
  assert.deepEqual((await guest('/products/suggestions?search=zzzzxyyy')).data, []);
});

test('Gemini recognition uses an owned file and produces editable catalog matches', async (t) => {
  const previous = process.env.GEMINI_API_KEYS;
  process.env.GEMINI_API_KEYS = '["test-ocr-key"]';
  t.after(() => {
    if (previous === undefined) delete process.env.GEMINI_API_KEYS;
    else process.env.GEMINI_API_KEYS = previous;
  });
  const originalFetch = globalThis.fetch;
  let recognized = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (!String(url).startsWith('https://generativelanguage.googleapis.com/')) return originalFetch(url, options);
    recognized++;
    const payload = JSON.parse(options.body);
    assert.equal(payload.contents[0].parts[0].inlineData.mimeType, 'application/pdf');
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ medicines: [{ name: 'Amoxicillin', ingredient: 'Amoxicillin', strength: '500mg', patient: 'discard this field' }] }) }] } }] });
  });
  const { login } = await fixture(t);
  const customer = await login();
  const rx = await upload(customer);
  const result = await customer(`/prescriptions/${rx.id}/analyze`, 'POST', { consent: true });
  assert.equal(result.status, 200);
  assert.equal(recognized, 1);
  assert.equal(result.data.medicines[0].name, 'Amoxicillin');
  assert.equal(result.data.medicines[0].patient, undefined);
  assert.ok(result.data.results[0].matches.length > 0);
});

test('public catalog endpoints are cacheable at the edge while private data stays no-store', async (t) => {
  const { client, login } = await fixture(t);
  const guest = client();
  for (const route of ['/config', '/products', '/categories', '/manufacturers']) {
    const response = await guest(route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('cache-control'), /^public, s-maxage=\d+, stale-while-revalidate=\d+$/, route);
  }
  assert.equal((await guest('/auth/me')).headers.get('cache-control'), 'no-store');
  const customer = await login();
  assert.equal((await customer('/orders')).headers.get('cache-control'), 'no-store');
});

test('pharmacist consultation is a two-way chat scoped to the customer and an owned prescription', async (t) => {
  const { login } = await fixture(t);
  const customer = await login();
  const other = await login('huong@antam.vn');
  const pharmacist = await login('duocsi@antam.vn');
  const rx = await upload(customer);

  assert.equal((await customer('/consultations', 'POST', { message: 'a' })).status, 400);
  assert.equal(
    (await other('/consultations', 'POST', { message: 'Cần tư vấn đơn thuốc', prescriptionId: rx.id })).status,
    404,
    'a customer cannot attach another customer prescription',
  );

  const created = await customer('/consultations', 'POST', {
    message: 'Dược sĩ giúp tôi xem đơn này với',
    prescriptionId: rx.id,
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.data.consultation.id;
  assert.match(created.data.consultation.title, new RegExp(`Đơn thuốc #${rx.id}$`));
  assert.equal(created.data.consultation.status, 'pending');

  const secondMsg = await customer(`/consultations/${id}/messages`, 'POST', {
    message: 'Đơn gửi lúc sáng',
  });
  assert.equal(secondMsg.status, 201);

  assert.equal((await other(`/consultations/${id}/messages`)).status, 404);
  assert.equal((await other(`/consultations/${id}/messages`, 'POST', { message: 'xen vào' })).status, 404);

  const queue = await pharmacist('/admin/support');
  const item = queue.data.find((row) => row.sessionId === id);
  assert.ok(item, 'pharmacist sees the consultation');
  assert.match(item.sessionTitle, /Đơn thuốc #/);
  assert.equal((await customer('/admin/support')).status, 403);

  const reply = await pharmacist(`/admin/support/${item.id}/messages`, 'POST', { message: 'Chào bạn, mình đã xem đơn.' });
  assert.equal(reply.status, 201);
  assert.equal(reply.data.mode, 'pharmacist');

  const polled = await customer(`/consultations/${id}/messages`);
  assert.equal(polled.data.messages.length, 3);
  assert.equal(polled.data.consultation.status, 'in_progress');
  assert.equal(polled.data.consultation.handlerName, 'Dược sĩ Trần Thanh Hà');
  const newer = await customer(`/consultations/${id}/messages?after=${polled.data.messages[1].id}`);
  assert.deepEqual(newer.data.messages.map((m) => m.mode), ['pharmacist']);

  const resolved = await pharmacist(`/admin/support/${item.id}`, 'PATCH', { status: 'resolved', reply: 'Kết thúc tư vấn.' });
  assert.equal(resolved.status, 200);
  const afterClose = await customer(`/consultations/${id}/messages`);
  assert.equal(afterClose.data.consultation.status, 'resolved');
  assert.equal(afterClose.data.consultation.closed, true);
  assert.equal(
    (await customer(`/consultations/${id}/messages`, 'POST', { message: 'Cho mình hỏi thêm' })).status,
    409,
    'a closed consultation cannot accept further customer messages',
  );
  assert.equal(
    (await pharmacist(`/admin/support/${item.id}/messages`, 'POST', { message: 'Nhắn thêm sau khi đóng' })).status,
    409,
    'a closed consultation cannot accept further pharmacist messages',
  );

  const secondThread = await customer('/consultations', 'POST', {
    title: 'Hỏi thêm về vitamin',
    message: 'Mình muốn mở cuộc trò chuyện mới để hỏi thêm',
  });
  assert.equal(secondThread.status, 201);
  assert.notEqual(secondThread.data.consultation.id, id);
  assert.equal((await customer('/consultations')).data.length, 2);
});

test('returned goods are tracked from approval to restock or discard', async (t) => {
  const { login, d } = await fixture(t);
  const customer = await login();
  const other = await login('huong@antam.vn');
  const staff = await login('duocsi@antam.vn');
  const stock = async () =>
    (await d.one('SELECT SUM(quantity) n FROM lo_thuoc')).n;
  const png = () => {
    const form = new FormData();
    form.append('type', 'return');
    form.append('reason', 'Sản phẩm bị móp hộp khi nhận');
    form.append(
      'evidence',
      new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X35sAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }),
      'anh.png',
    );
    return form;
  };
  const deliveredReturn = async () => {
    await add(customer, 1);
    const created = (await order(customer)).data;
    for (const status of ['confirmed', 'packing', 'shipping', 'delivered'])
      assert.equal((await staff(`/admin/orders/${created.id}/status`, 'PATCH', { status, collected: true })).status, 200);
    const request = await customer(`/orders/${created.id}/requests`, 'POST', png());
    assert.equal(request.status, 201, JSON.stringify(request.body));
    return { orderId: created.id, requestId: request.data.id };
  };

  const first = await deliveredReturn();
  const afterDelivery = await stock();
  assert.equal((await staff(`/admin/requests/${first.requestId}`, 'PATCH', { status: 'approved', sealed: true })).status, 200);
  assert.equal(await stock(), afterDelivery, 'approval alone does not put goods back on the shelf');

  let queue = (await staff('/admin/return-goods')).data;
  const goods = queue.find((row) => row.requestId === first.requestId);
  assert.equal(goods.status, 'awaiting');
  assert.equal(goods.items[0].quantity, 1);
  assert.equal((await customer('/admin/return-goods')).status, 403);
  assert.equal((await staff('/admin/requests')).data.find((row) => row.id === first.requestId).returnGoodsStatus, 'awaiting');

  assert.equal((await staff(`/admin/return-goods/${goods.id}`, 'PATCH', { status: 'restocked', sealed: true })).status, 409, 'goods must be received before restock');
  assert.equal((await staff(`/admin/requests/${first.requestId}/refund`, 'POST', {})).status, 409, 'no refund while goods have not arrived');
  const shipUrl = `/orders/${first.orderId}/requests/${first.requestId}/return-shipment`;
  assert.equal((await other(shipUrl, 'POST', { carrier: 'GHN', trackingCode: 'GHN123456' })).status, 404);
  assert.equal((await customer(shipUrl, 'POST', { carrier: 'GHN', trackingCode: '1' })).status, 400);
  const shipped = await customer(shipUrl, 'POST', { carrier: 'GHN', trackingCode: 'GHN123456' });
  assert.equal(shipped.status, 200);
  assert.equal(shipped.data.status, 'in_transit');
  const view = (await customer(`/orders/${first.orderId}`)).data.requests[0];
  assert.equal(view.returnGoodsStatus, 'in_transit');
  assert.equal(view.returnTrackingCode, 'GHN123456');

  assert.equal((await staff(`/admin/return-goods/${goods.id}`, 'PATCH', { status: 'in_transit', trackingCode: 'GHN123456' })).status, 409, 'in transit cannot be set again by staff after shipping started');
  assert.equal((await staff(`/admin/requests/${first.requestId}/refund`, 'POST', {})).status, 409, 'no refund while goods are in transit');
  assert.equal((await staff(`/admin/return-goods/${goods.id}`, 'PATCH', { status: 'received' })).data.status, 'received');
  assert.equal((await staff(`/admin/requests/${first.requestId}/refund`, 'POST', {})).data.paymentStatus, 'refunded', 'refund opens once the goods are received');
  assert.equal((await customer(shipUrl, 'POST', { carrier: 'GHN', trackingCode: 'GHN999999' })).status, 409, 'customer cannot edit shipment after receipt');
  assert.equal((await staff(`/admin/return-goods/${goods.id}`, 'PATCH', { status: 'restocked' })).status, 400);
  const restocked = await staff(`/admin/return-goods/${goods.id}`, 'PATCH', { status: 'restocked', sealed: true, note: 'Còn nguyên niêm phong' });
  assert.equal(restocked.status, 200, JSON.stringify(restocked.body));
  assert.equal(restocked.data.status, 'restocked');
  assert.ok(restocked.data.inspectedAt);
  assert.equal(await stock(), afterDelivery + 1, 'restock returns the quantity to its batch');
  assert.equal((await staff(`/admin/return-goods/${goods.id}`, 'PATCH', { status: 'discarded', note: 'Đã nhập kho rồi' })).status, 409, 'finished goods are final');

  const second = await deliveredReturn();
  assert.equal((await staff(`/admin/requests/${second.requestId}`, 'PATCH', { status: 'approved', storeFault: true })).status, 200);
  const next = (await staff('/admin/return-goods')).data.find((row) => row.requestId === second.requestId);
  const beforeDiscard = await stock();
  assert.equal((await staff(`/admin/return-goods/${next.id}`, 'PATCH', { status: 'received' })).status, 200);
  assert.equal((await staff(`/admin/return-goods/${next.id}`, 'PATCH', { status: 'discarded' })).status, 400, 'discard needs a reason');
  const discarded = await staff(`/admin/return-goods/${next.id}`, 'PATCH', { status: 'discarded', note: 'Hộp bị ướt, không đạt chất lượng' });
  assert.equal(discarded.data.status, 'discarded');
  assert.equal(await stock(), beforeDiscard, 'discarded goods never return to stock');

  const direct = await deliveredReturn();
  assert.equal((await staff(`/admin/requests/${direct.requestId}`, 'PATCH', { status: 'approved', sealed: true, restock: true })).status, 200);
  assert.equal((await staff('/admin/return-goods')).data.find((row) => row.requestId === direct.requestId).status, 'restocked', 'restock at approval keeps working and is recorded');
});

test('pending PostgreSQL migrations are applied once and never block startup', async () => {
  const run = async (present, options = {}) => {
    const sql = [];
    const store = {
      one: async () => ({ present }),
      transaction: async (work) => work(),
      migrate: async (statement) => {
        if (options.fail) throw Object.assign(new Error('denied'), { code: '42501' });
        sql.push(statement);
      },
    };
    await applyPendingMigrations(store);
    return sql;
  };
  assert.equal((await run(true)).length, 0, 'existing table: no DDL');
  const applied = await run(false);
  assert.equal(applied.length, 2);
  assert.match(applied[0], /CREATE TABLE IF NOT EXISTS antam\.hang_tra_ve/);
  assert.match(applied[1], /CREATE TABLE IF NOT EXISTS antam\.combo_san_pham/);
  assert.match(
    postgresSql('SELECT * FROM chi_tiet_gio_hang_combo WHERE cart_id=?'),
    /FROM antam\.chi_tiet_gio_hang_combo WHERE cart_id=\$1/,
  );
  assert.match(
    postgresSql('SELECT * FROM combo_san_pham JOIN combo_san_pham_item ON combo_id=combo_san_pham.id'),
    /FROM antam\.combo_san_pham JOIN antam\.combo_san_pham_item/,
  );
  const log = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await run(false, { fail: true }), [], 'a permission error is logged, not thrown');
  } finally {
    console.error = log;
  }
});

test('admin reports metrics stay internally consistent across breakdowns and status updates', async (t) => {
  const { login } = await fixture(t);
  const admin = await login('admin@antam.vn');
  const sum = (items, field) =>
    items.reduce((n, row) => n + (Number(row[field]) || 0), 0);

  const initial = await admin('/admin/reports');
  assert.equal(initial.status, 200);
  const r1 = initial.data;
  assert.equal(sum(r1.dailyRevenue, 'revenue'), r1.revenue);
  assert.equal(sum(r1.dailyRevenue, 'orders'), r1.orderCount);
  assert.equal(sum(r1.statusBreakdown, 'orders'), r1.orderCount);
  assert.equal(sum(r1.paymentBreakdown, 'orders'), r1.orderCount);
  assert.equal(sum(r1.paymentBreakdown, 'completedOrders'), r1.completedOrders);
  assert.equal(sum(r1.paymentBreakdown, 'revenue'), r1.revenue);
  assert.equal(sum(r1.categoryBreakdown, 'revenue'), r1.grossRevenue);
  assert.equal(
    r1.grossRevenue + r1.totalShipping - r1.totalDiscount - r1.refundTotal,
    r1.revenue,
  );
  assert.ok(sum(r1.topProducts, 'revenue') <= r1.grossRevenue);

  // Cancel the existing pending order (#10) and verify metrics stay consistent.
  const orders = await admin('/admin/orders');
  const pending = orders.data.find((o) => o.status === 'pending');
  assert.ok(pending);
  const cancelled = await admin(`/admin/orders/${pending.id}/status`, 'PATCH', {
    status: 'cancelled',
    note: 'Kiểm tra thống kê hủy đơn',
  });
  assert.equal(cancelled.status, 200);
  const afterCancel = await admin('/admin/reports');
  assert.equal(afterCancel.status, 200);
  const r2 = afterCancel.data;
  assert.equal(r2.cancelledOrders, r1.cancelledOrders + 1);
  assert.equal(sum(r2.statusBreakdown, 'orders'), r2.orderCount);
  assert.equal(sum(r2.paymentBreakdown, 'orders'), r2.orderCount);
  assert.equal(sum(r2.categoryBreakdown, 'revenue'), r2.grossRevenue);
  assert.equal(sum(r2.dailyRevenue, 'revenue'), r2.revenue);
});

test('admin dashboard overview reflects exact business pipeline, inventory health, live queues and permissions', async (t) => {
  const { login } = await fixture(t);
  const admin = await login('admin@antam.vn');
  const pharmacist = await login('duocsi@antam.vn');
  const customer = await login();

  const badDays = await admin('/admin/dashboard?days=0');
  assert.equal(badDays.status, 400);

  const d7 = (await admin('/admin/dashboard?days=7')).data;
  const d30 = (await admin('/admin/dashboard?days=30')).data;
  const d1 = (await admin('/admin/dashboard?days=1')).data;

  assert.equal(d7.days, 7);
  assert.equal(d7.revenue, 841000);
  assert.equal(d7.orderCount, 7);
  assert.equal(d30.days, 30);
  assert.equal(d30.revenue, 1424000);
  assert.equal(d30.orderCount, 10);
  assert.equal(d1.days, 1);
  assert.equal(d1.orderCount, 1);

  assert.equal(d7.allTime.revenue, 1424000);
  assert.equal(d7.allTime.orderCount, 10);
  assert.equal(d7.allTime.completedOrders, 7);
  assert.equal(d7.allTime.todayOrders, 1);
  assert.equal(d7.allTime.todayRevenue, 0);
  assert.equal(d7.allTime.prepaidInFlightAmount, 110000);
  assert.equal(d7.allTime.codPendingAmount, 653000);
  assert.equal(d7.allTime.inFlightAmount, 763000);

  assert.equal(d7.pipeline.activeOrders, 3);
  const stageSum = d7.pipeline.stages.reduce((n, s) => n + s.count, 0);
  assert.equal(stageSum, d7.allTime.orderCount);
  assert.equal(d7.queues.waitingConfirmOrders, 1);
  assert.equal(d7.queues.packingOrders, 1);
  assert.equal(d7.queues.shippingOrders, 1);
  assert.equal(d7.queues.expiredBatches, 1);
  assert.equal(d7.queues.expiringBatches, 1);
  assert.equal(d7.queues.outOfStockProducts, 1);
  assert.equal(d7.queues.lowStockProducts, 2);
  assert.equal(d7.queues.lowStockOnlyProducts, 1);
  assert.equal(d7.catalog.activeProducts, 100);
  assert.equal(d7.catalog.activeCustomers, 2);
  assert.ok(d7.recentAudit.length > 0);
  assert.ok(d7.recentOrders[0].customerName);

  // Create a prescription order -> pending_prescription + pendingPrescriptions update
  const rx = await upload(customer);
  await add(customer, 10, 1);
  const rxOrder = await order(customer, { prescriptionId: rx.id });
  assert.equal(rxOrder.status, 201);

  // Create a support handoff -> openSupport updates
  const chat = await customer('/chat', 'POST', { message: 'Tôi bị khó thở' });
  assert.equal(chat.status, 200);

  // Create a cancel request on packing order (#8) -> pendingRequests updates
  const orders = (await admin('/admin/orders')).data;
  const packing = orders.find((o) => o.status === 'packing');
  assert.ok(packing);
  const reqRes = await customer(`/orders/${packing.id}/requests`, 'POST', {
    type: 'cancel',
    reason: 'Khách cần đổi thời gian giao',
  });
  assert.equal(reqRes.status, 201);

  const afterMutations = (await admin('/admin/dashboard?days=7')).data;
  assert.equal(afterMutations.queues.pendingPrescriptions, 1);
  assert.equal(afterMutations.pipeline.activeOrders, 4);
  assert.equal(afterMutations.queues.openSupport, 1);
  assert.equal(afterMutations.queues.pendingRequests.total, 1);
  assert.equal(afterMutations.queues.pendingRequests.cancel, 1);

  // Pharmacist approves prescription -> moves to pending (waitingConfirmOrders = 2)
  const approved = await pharmacist(`/admin/prescriptions/${rx.id}`, 'PATCH', {
    status: 'approved',
  });
  assert.equal(approved.status, 200);
  const afterApprove = (await pharmacist('/admin/dashboard?days=7')).data;
  assert.equal(afterApprove.queues.pendingPrescriptions, 0);
  assert.equal(afterApprove.queues.waitingConfirmOrders, 2);
  assert.deepEqual(afterApprove.recentAudit, []);

  // Staff without orders permission must not receive customer PII in recentOrders
  const staffRow = (await admin('/admin/users')).data.find(
    (u) => u.email === 'kho@antam.vn',
  );
  await admin(`/admin/users/${staffRow.id}`, 'PATCH', {
    permissions: ['reports', 'inventory'],
  });
  const warehouseOnly = await login('kho@antam.vn');
  const restricted = (await warehouseOnly('/admin/dashboard?days=7')).data;
  assert.equal(restricted.recentAudit.length, 0);
  assert.equal(restricted.recentOrders[0].customerName, undefined);
  assert.equal(restricted.recentOrders[0].address, undefined);
});


test('admin orders expose internal fulfillment details only to staff, support edits, bulk transitions, assisted creation, requests and CSV export', async (t) => {
  const { login, d } = await fixture(t);
  const admin = await login('admin@antam.vn');
  const customer = await login();
  const otherCustomer = await login('huong@antam.vn');

  // Seed fix: order #10 belongs to user 4 (Lê Thu Hương) and has her real address
  const order10 = (await admin('/admin/orders/10')).data;
  assert.equal(order10.userName, 'Lê Thu Hương');
  assert.equal(order10.address.recipient, 'Lê Thu Hương');
  assert.equal(order10.address.phone, '0904445566');
  assert.equal(order10.itemCount, 2);
  assert.ok(order10.allocations.length > 0);
  assert.ok(order10.history[0].userName);

  // Lookup endpoint works for order staff without requiring admin users permission
  const staff = await login('duocsi@antam.vn');
  const lookup = await staff('/admin/orders/lookup');
  assert.equal(lookup.status, 200);
  assert.ok(lookup.data.customers.length >= 2);
  assert.ok(lookup.data.products.every((p) => !p.prescriptionRequired));

  // Assisted order creation blocks prescription drugs and calculates server totals for OTC
  const rxReject = await staff('/admin/orders', 'POST', {
    userId: 1,
    address,
    items: [{ productId: 10, quantity: 1 }],
    paymentMethod: 'cod',
  });
  assert.equal(rxReject.status, 400);

  const assisted = await staff('/admin/orders', 'POST', {
    userId: 1,
    address,
    items: [{ productId: 2, quantity: 2 }],
    paymentMethod: 'cod',
    promotionCode: 'KHOEMANH10',
    note: '=SUM(1,1) Giao chiều',
    internalNote: 'Khách đặt qua hotline',
    autoConfirm: false,
  });
  assert.equal(assisted.status, 201);
  assert.equal(assisted.data.promotionCode, 'KHOEMANH10');
  assert.equal(assisted.data.discount, 43000);
  assert.equal(assisted.data.total, 387000);
  assert.equal(assisted.data.internalNote, 'Khách đặt qua hotline');
  assert.ok(assisted.data.allocations.length > 0);

  // Customer view must NOT leak internalNote or warehouse allocations
  const customerOwnView = await customer(`/orders/${assisted.data.id}`);
  assert.equal(customerOwnView.status, 200);
  assert.equal(customerOwnView.data.internalNote, undefined);
  assert.equal(customerOwnView.data.allocations, undefined);

  // Fulfillment update (carrier, tracking, internalNote, address before packing)
  const updatedFulfill = await staff(`/admin/orders/${assisted.data.id}/fulfillment`, 'PATCH', {
    shippingCarrier: 'Nội bộ An Tâm',
    trackingCode: 'AT-HOTLINE-01',
    internalNote: 'Đã gọi xác nhận giờ nhận',
    address: { ...address, line1: '99 Trần Hưng Đạo' },
  });
  assert.equal(updatedFulfill.status, 200);
  assert.equal(updatedFulfill.data.shippingCarrier, 'Nội bộ An Tâm');
  assert.equal(updatedFulfill.data.trackingCode, 'AT-HOTLINE-01');
  assert.equal(updatedFulfill.data.address.line1, '99 Trần Hưng Đạo');

  // Bulk status transition updates eligible orders and reports failures cleanly
  const onlineUnpaid = await otherCustomer('/cart', 'POST', { productId: 1, quantity: 1 });
  assert.equal(onlineUnpaid.status, 201);
  const unpaidOrder = (await order(otherCustomer, { paymentMethod: 'demo' })).data;

  const bulkRes = await staff('/admin/orders/bulk-status', 'POST', {
    orderIds: [assisted.data.id, unpaidOrder.id],
    status: 'confirmed',
  });
  assert.equal(bulkRes.status, 200);
  assert.deepEqual(bulkRes.data.updated, [assisted.data.id]);
  assert.equal(bulkRes.data.failed.length, 1);
  assert.equal(bulkRes.data.failed[0].id, unpaidOrder.id);

  // Address becomes locked once order enters packing
  assert.equal(
    (await staff(`/admin/orders/${assisted.data.id}/status`, 'PATCH', { status: 'packing' })).status,
    200,
  );
  assert.equal(
    (
      await staff(`/admin/orders/${assisted.data.id}/fulfillment`, 'PATCH', {
        address: { ...address, line1: '100 Đường Khác' },
      })
    ).status,
    409,
  );

  // Cancelling an order directly approves any pending cancel request on that order
  const pendingCancelReq = await customer(`/orders/${assisted.data.id}/requests`, 'POST', {
    type: 'cancel',
    reason: 'Đổi ý không nhận nữa',
  });
  assert.equal(pendingCancelReq.status, 201);
  assert.equal(
    (
      await staff(`/admin/orders/${assisted.data.id}/status`, 'PATCH', {
        status: 'cancelled',
        note: 'Hủy theo xác nhận với khách',
      })
    ).status,
    200,
  );
  const syncedReq = await d.one('SELECT status FROM yeu_cau_huy_hoan WHERE id=?', pendingCancelReq.data.id);
  assert.equal(syncedReq.status, 'approved');

  // Admin-recorded return on delivered order enforces returnWindowDays and sealed/restock rules
  const expiredReturn = await staff('/admin/orders/2/requests', 'POST', {
    type: 'return',
    reason: 'Thử đổi trả đơn đã quá hạn 7 ngày',
    sealed: true,
    restock: true,
  });
  assert.equal(expiredReturn.status, 409);

  const deliveredReturn = await staff('/admin/orders/7/requests', 'POST', {
    type: 'return',
    reason: 'Khách mang sản phẩm nguyên seal đến đổi tại quầy',
    sealed: false,
    storeFault: false,
    restock: true,
  });
  assert.equal(deliveredReturn.status, 400);

  const validReturn = await staff('/admin/orders/7/requests', 'POST', {
    type: 'return',
    reason: 'Khách mang sản phẩm nguyên seal đến đổi tại quầy',
    sealed: true,
    restock: true,
  });
  assert.equal(validReturn.status, 201);
  assert.equal(validReturn.data.status, 'returned');
  assert.equal(validReturn.data.paymentStatus, 'refund_pending');

  // Overdue manual expiration cancels unpaid pending_payment orders and frees stock
  const beforeStock = (await customer('/products/1')).data.stock;
  const expiredManual = await staff(`/admin/orders/${unpaidOrder.id}/expire`, 'POST', {});
  assert.equal(expiredManual.status, 200);
  assert.equal(expiredManual.data.status, 'cancelled');
  assert.equal((await customer('/products/1')).data.stock, beforeStock + 1);

  // CSV export returns UTF-8 BOM CSV with formula injection neutralized
  const csvRes = await staff('/admin/orders/export');
  assert.equal(csvRes.status, 200);
  assert.match(csvRes.body, /AT202600109/);
  assert.match(csvRes.body, /'=SUM\(1,1\)/);
});

test('chat history preserves suggested products and stays separate from pharmacist consultations', async (t) => {
  const { login } = await fixture(t);
  const customer = await login('khach@antam.vn');

  const consult = await customer('/consultations', 'POST', {
    message: 'Em cần dược sĩ tư vấn thêm về thuốc cảm',
  });
  assert.equal(consult.status, 201);

  const chat = await customer('/chat', 'POST', {
    message: 'Nhà thuốc có Vitamin C không?',
  });
  assert.equal(chat.status, 200);
  assert.ok(chat.data.sessionId);
  assert.ok(chat.data.products.length > 0);

  const sessions = await customer('/chat/sessions');
  assert.equal(sessions.status, 200);
  assert.ok(sessions.data.some((s) => s.id === chat.data.sessionId));
  assert.ok(!sessions.data.some((s) => s.id === consult.data.consultation.id));

  const history = await customer(`/chat/sessions/${chat.data.sessionId}/messages`);
  assert.equal(history.status, 200);
  const assistantMsg = history.data.find((m) => m.role === 'assistant');
  assert.ok(assistantMsg);
  assert.ok(Array.isArray(assistantMsg.products) && assistantMsg.products.length > 0);
  assert.equal(assistantMsg.products[0].id, chat.data.products[0].id);
});

test('chatbot looks up standalone AT order codes, redacts PII for Gemini and falls back cleanly', async (t) => {
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-chat-key';
  t.after(() => {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  });

  let failProvider = false;
  let sentBody = '';
  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    if (String(url).includes('generativelanguage.googleapis.com')) {
      sentBody = String(init?.body || '');
      if (failProvider) return new Response('unavailable', { status: 503 });
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    thought: true,
                    text: 'Internal reasoning should not appear in final reply.',
                  },
                  {
                    text: 'Vitamin C hỗ trợ tăng cường sức đề kháng. Thông tin chỉ mang tính tham khảo.',
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return originalFetch(url, init);
  });

  const { login } = await fixture(t, { allowProviderInTests: true });
  const customer = await login('khach@antam.vn');
  const myOrders = await customer('/orders');
  assert.equal(myOrders.status, 200);
  const myCode = myOrders.data[0].code;
  assert.match(myCode, /^AT\d+/);

  const orderLookup = await customer('/chat', 'POST', {
    message: myCode,
  });
  assert.equal(orderLookup.status, 200);
  assert.ok(orderLookup.data.reply.includes(myCode));

  const aiReply = await customer('/chat', 'POST', {
    message:
      'Mình muốn hỏi về Vitamin C, liên hệ khach@antam.vn hoặc 0901234567 nhé',
  });
  assert.equal(aiReply.status, 200);
  assert.equal(aiReply.data.mode, 'gemini');
  assert.match(aiReply.data.reply, /Vitamin C/);
  assert.ok(!sentBody.includes('khach@antam.vn'), 'email must be redacted');
  assert.ok(!sentBody.includes('0901234567'), 'phone must be redacted');
  assert.ok(
    !aiReply.data.reply.includes('Internal reasoning'),
    'thought parts must be filtered',
  );
  const parsedRequest = JSON.parse(sentBody);
  assert.equal(parsedRequest.generationConfig.temperature, 0.15);
  assert.equal(parsedRequest.generationConfig.thinkingConfig.thinkingBudget, 0);
  const lastTurnText = parsedRequest.contents.at(-1).parts[0].text;
  assert.match(lastTurnText, /NGỮ CẢNH NHÀ THUỐC/);
  assert.match(lastTurnText, /Tồn kho: Còn/);

  const catalogQuestion = await customer('/chat', 'POST', {
    message: 'Nhà thuốc có sản phẩm nào?',
  });
  assert.equal(catalogQuestion.status, 200);
  assert.ok(catalogQuestion.data.products.length > 0);
  assert.ok(catalogQuestion.data.products.every((p) => !p.prescriptionRequired));

  const rxQuestion = await customer('/chat', 'POST', {
    message: 'Amoxicillin có bán không?',
  });
  assert.equal(rxQuestion.status, 200);
  assert.deepEqual(rxQuestion.data.products, []);
  assert.match(sentBody, /THUỐC KÊ ĐƠN/);

  failProvider = true;
  const fallback = await customer('/chat', 'POST', {
    message: 'Cho mình xem sản phẩm Vitamin C',
  });
  assert.equal(fallback.status, 200);
  assert.equal(fallback.data.mode, 'knowledge_fallback');
  assert.ok(fallback.data.products.length > 0);
  assert.match(fallback.data.reply, /đ\//);
});

test('customer profile stores and validates birthDate and gender (UC02.1)', async (t) => {
  const { login } = await fixture(t);
  const customer = await login('khach@antam.vn');

  const invalidDate = await customer('/profile', 'PATCH', {
    birthDate: '2099-01-01',
  });
  assert.equal(invalidDate.status, 400);

  const invalidGender = await customer('/profile', 'PATCH', {
    gender: 'unknown',
  });
  assert.equal(invalidGender.status, 400);

  const updated = await customer('/profile', 'PATCH', {
    name: 'Nguyễn Minh Anh',
    birthDate: '1999-08-15',
    gender: 'female',
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.birthDate, '1999-08-15');
  assert.equal(updated.data.gender, 'female');

  const me = await customer('/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.data.birthDate, '1999-08-15');
  assert.equal(me.data.gender, 'female');
});

test('admin promotions maxDiscount=0, audit, enriched prescriptions/catalog/knowledge/support, settings flags and warehouse inventory lookups', async (t) => {
  const { login, d } = await fixture(t);
  const admin = await login('admin@antam.vn');
  const pharmacist = await login('duocsi@antam.vn');
  const customer = await login();

  // 1. Promotion with maxDiscount: 0 means unlimited (must NOT cap discount to 0đ)
  const createdPromo = await admin('/admin/promotions', 'POST', {
    code: 'KHONGGIOIHAN15',
    name: 'Giảm 15% không giới hạn',
    type: 'percent',
    value: 15,
    minOrder: 0,
    maxDiscount: 0,
    usageLimit: 20,
    startDate: '2026-01-01',
    endDate: '2099-12-31',
    active: true,
  });
  assert.equal(createdPromo.status, 201);
  assert.equal(createdPromo.data.maxDiscount, null);

  await add(customer, 2, 2); // 2 * 215,000 = 430,000đ -> 15% = 64,500đ
  const promoOrder = await order(customer, { promotionCode: 'KHONGGIOIHAN15' });
  assert.equal(promoOrder.status, 201);
  assert.equal(promoOrder.data.discount, 64500);

  // Deactivating promotion writes promotion.deactivate audit entry
  const delPromo = await admin(`/admin/promotions/${createdPromo.data.id}`, 'DELETE');
  assert.equal(delPromo.status, 200);
  const promoAudit = await d.one(
    "SELECT * FROM nhat_ky_hoat_dong WHERE action='promotion.deactivate' AND entity_id=?",
    String(createdPromo.data.id),
  );
  assert.ok(promoAudit);

  // 2. Enriched GET /api/admin/prescriptions metadata
  const rx = await upload(customer);
  await add(customer, 10, 1);
  const rxOrder = await order(customer, { prescriptionId: rx.id });
  assert.equal(rxOrder.status, 201);
  const approveRx = await pharmacist(`/admin/prescriptions/${rx.id}`, 'PATCH', {
    status: 'approved',
  });
  assert.equal(approveRx.status, 200);
  const rxList = (await pharmacist('/admin/prescriptions')).data;
  const rxItem = rxList.find((r) => r.id === rx.id);
  assert.ok(rxItem);
  assert.equal(rxItem.reviewerName, 'Dược sĩ Trần Thanh Hà');
  assert.ok(Array.isArray(rxItem.approvedProductIds));
  assert.ok(rxItem.orderTotal > 0);
  assert.equal(rxItem.userPhone, '0901234567');

  // 3. Catalog itemCount + warehouse-only inventory lookup access
  const [cats, mfgs, sups] = await Promise.all([
    admin('/admin/categories'),
    admin('/admin/manufacturers'),
    admin('/admin/suppliers'),
  ]);
  assert.equal(cats.status, 200);
  assert.equal(typeof cats.data[0].itemCount, 'number');
  assert.ok(cats.data.some((c) => c.itemCount > 0));
  assert.equal(typeof mfgs.data[0].itemCount, 'number');
  assert.equal(typeof sups.data[0].itemCount, 'number');

  const khoUser = (await admin('/admin/users')).data.find(
    (u) => u.email === 'kho@antam.vn',
  );
  await admin(`/admin/users/${khoUser.id}`, 'PATCH', {
    permissions: ['inventory', 'reports'],
  });
  const khoOnly = await login('kho@antam.vn');
  assert.equal((await khoOnly('/admin/products')).status, 200);
  assert.equal((await khoOnly('/admin/suppliers')).status, 200);
  assert.equal((await khoOnly('/admin/categories')).status, 403);

  // 4. Knowledge reviewerName, support handlerName/userPhone, settings consistent flags
  const kb = await admin('/admin/knowledge', 'POST', {
    title: 'Lưu ý bảo quản thuốc',
    keywords: 'bảo quản, nhiệt độ',
    content: 'Bảo quản thuốc nơi khô ráo thoáng mát, tránh ánh nắng trực tiếp.',
    source: 'Dược thư Quốc gia Việt Nam',
    active: true,
  });
  assert.equal(kb.status, 201);
  assert.equal((await pharmacist(`/admin/knowledge/${kb.data.id}/review`, 'POST', {})).status, 200);
  const kbList = (await pharmacist('/admin/knowledge')).data;
  assert.equal(
    kbList.find((k) => k.id === kb.data.id)?.reviewerName,
    'Dược sĩ Trần Thanh Hà',
  );

  const chatHandoff = await customer('/chat', 'POST', { message: 'Tôi bị khó thở nặng' });
  assert.equal(chatHandoff.status, 200);
  const supQueue = (await pharmacist('/admin/support')).data;
  assert.ok(supQueue.length > 0);
  assert.equal(supQueue[0].userPhone, '0901234567');
  await pharmacist(`/admin/support/${supQueue[0].id}`, 'PATCH', {
    status: 'resolved',
    reply: 'Vui lòng gọi cấp cứu 115 ngay lập tức.',
  });
  const supAfter = (await pharmacist('/admin/support')).data.find(
    (s) => s.id === supQueue[0].id,
  );
  assert.equal(supAfter.handlerName, 'Dược sĩ Trần Thanh Hà');

  const patchSettings = await admin('/admin/settings', 'PATCH', {
    returnWindowDays: 10,
  });
  assert.equal(patchSettings.status, 200);
  assert.equal(patchSettings.data.returnWindowDays, 10);
  assert.equal(typeof patchSettings.data.googleConfigured, 'boolean');
  assert.equal(typeof patchSettings.data.paymentConfigured, 'boolean');
});

test('VietQR webhook auto-confirms payment with strict token/amount/idempotency checks and syncs customer & admin order views', async (t) => {
  const { login, client, d } = await fixture(t, {
    bankTransfer: {
      bankBin: '970436',
      account: '1012345678',
      accountName: 'NHA THUOC AN TAM',
      bankName: 'Vietcombank',
      webhookSecret: 'test-sepay-secret-2026',
    },
  });
  const customer = await login();
  const otherCustomer = await login('huong@antam.vn');
  const admin = await login('admin@antam.vn');
  const anon = client();

  await add(customer, 1, 2);
  const created = await order(customer, { paymentMethod: 'bank_transfer' });
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'pending_payment');
  assert.equal(created.data.paymentStatus, 'unpaid');

  const qr = await customer(`/orders/${created.data.id}/bank-transfer`);
  assert.equal(qr.status, 200);
  assert.equal(qr.data.autoVerify, true);
  assert.equal(qr.data.content, `ANTAM${created.data.id}`);
  assert.equal(qr.data.webhookSecret, undefined);

  // Payment status endpoint is scoped to the order owner
  const beforeStatus = await customer(`/orders/${created.data.id}/payment-status`);
  assert.equal(beforeStatus.status, 200);
  assert.equal(beforeStatus.data.paymentStatus, 'unpaid');
  assert.equal((await otherCustomer(`/orders/${created.data.id}/payment-status`)).status, 404);

  // Wrong webhook token -> 401
  const badToken = await anon('/payments/bank-transfer/webhook', 'POST', {
    transferType: 'in',
    accountNumber: '1012345678',
    transferAmount: created.data.total,
    content: `ANTAM${created.data.id}`,
    referenceCode: 'FT2611230001',
  }, { Authorization: 'Apikey wrong-token' });
  assert.equal(badToken.status, 401);

  // Outgoing transfer ignored
  const outgoing = await anon('/payments/bank-transfer/webhook', 'POST', {
    transferType: 'out',
    accountNumber: '1012345678',
    transferAmount: created.data.total,
    content: `ANTAM${created.data.id}`,
    referenceCode: 'FT2611230002',
  }, { Authorization: 'Apikey test-sepay-secret-2026' });
  assert.equal(outgoing.status, 200);
  assert.equal(outgoing.data.processed, false);

  // Underpayment rejected & audited, order stays unpaid
  const mismatch = await anon('/payments/bank-transfer/webhook', 'POST', {
    transferType: 'in',
    accountNumber: '1012345678',
    transferAmount: created.data.total - 1000,
    content: `Khach CK ANTAM${created.data.id}`,
    referenceCode: 'FT2611230003',
  }, { Authorization: 'Apikey test-sepay-secret-2026' });
  assert.equal(mismatch.status, 200);
  assert.equal(mismatch.data.processed, false);
  assert.equal(mismatch.data.reason, 'amount_mismatch');
  assert.equal(
    (await customer(`/orders/${created.data.id}/payment-status`)).data.paymentStatus,
    'unpaid',
  );

  // Valid SePay webhook -> auto-marks paid + transitions to pending (including concatenated bank memo & subAccount)
  const okHook = await anon('/payments/bank-transfer/webhook', 'POST', {
    id: 92704,
    transferType: 'in',
    gateway: 'Vietcombank',
    accountNumber: '1012345678',
    transferAmount: created.data.total,
    content: `FT261123ANTAM${created.data.id}CT`,
    referenceCode: 'FT2611239999',
  }, { Authorization: 'Apikey test-sepay-secret-2026' });
  assert.equal(okHook.status, 200);
  assert.equal(okHook.body.success, true);
  assert.equal(okHook.data.processed, true);
  assert.equal(okHook.data.paymentStatus, 'paid');
  assert.equal(okHook.data.status, 'pending');

  // Duplicate webhook delivery is idempotent
  const dupHook = await anon('/payments/bank-transfer/webhook', 'POST', {
    transferType: 'in',
    accountNumber: '1012345678',
    transferAmount: created.data.total,
    content: `ANTAM${created.data.id}`,
    referenceCode: 'FT2611239999',
  }, { Authorization: 'Apikey test-sepay-secret-2026' });
  assert.equal(dupHook.status, 200);
  assert.equal(dupHook.data.alreadyPaid, true);

  // Both customer and admin views reflect paid + pending + transaction
  const customerStatus = await customer(`/orders/${created.data.id}/payment-status`);
  assert.equal(customerStatus.data.paymentStatus, 'paid');
  assert.equal(customerStatus.data.status, 'pending');

  const adminOrder = (await admin(`/admin/orders/${created.data.id}`)).data;
  assert.equal(adminOrder.paymentStatus, 'paid');
  assert.equal(adminOrder.status, 'pending');
  assert.equal(adminOrder.transactions.length, 1);
  assert.equal(adminOrder.transactions[0].providerReference, 'FT2611239999');

  const auditRow = await d.one(
    "SELECT * FROM nhat_ky_hoat_dong WHERE action='payment.bank_webhook' AND entity_id=?",
    String(created.data.id),
  );
  assert.ok(auditRow);
});

test('cart checkbox selection checks out only selected items and preserves unselected items', async (t) => {
  const { login } = await fixture(t);
  const customer = await login('khach@antam.vn');

  await customer('/cart', 'POST', { productId: 1, quantity: 2 });
  await customer('/cart', 'POST', { productId: 2, quantity: 1 });
  const cartBefore = (await customer('/cart')).data;
  assert.equal(cartBefore.length, 2);
  assert.equal(cartBefore.every((x) => x.selected === true), true);

  const item1 = cartBefore.find((x) => x.productId === 1);
  const item2 = cartBefore.find((x) => x.productId === 2);
  const toggled = await customer(`/cart/${item2.id}`, 'PATCH', {
    selected: false,
  });
  assert.equal(toggled.status, 200);
  assert.equal(
    toggled.data.find((x) => x.id === item2.id).selected,
    false,
  );

  const placed = await customer('/orders', 'POST', {
    addressId: 1,
    paymentMethod: 'cod',
  });
  assert.equal(placed.status, 201, JSON.stringify(placed.body));
  assert.equal(placed.data.items.length, 1);
  assert.equal(placed.data.items[0].productId, 1);
  assert.equal(placed.data.items[0].quantity, 2);

  const cartAfter = (await customer('/cart')).data;
  assert.equal(cartAfter.length, 1, 'unselected item must stay in cart');
  assert.equal(cartAfter[0].productId, 2);
  assert.equal(cartAfter[0].selected, false);
});

test('product combos CRUD, scoped promotions (order/product/combo), best voucher evaluation and FEFO checkout', async (t) => {
  const { login } = await fixture(t);
  const admin = await login('admin@antam.vn');
  const customer = await login('khach@antam.vn');

  const p1Before = (await customer('/products/1')).data;
  const p2Before = (await customer('/products/2')).data;

  const createdCombo = await admin('/admin/combos', 'POST', {
    name: 'Combo Test Khỏe Mạnh',
    description: 'Tổ hợp 2 sản phẩm test',
    price: 95000,
    active: true,
    items: [
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 1 },
    ],
  });
  assert.equal(createdCombo.status, 201, JSON.stringify(createdCombo.body));
  const comboId = createdCombo.data.id;
  assert.equal(
    createdCombo.data.originalPrice,
    p1Before.price + p2Before.price,
  );
  assert.ok(createdCombo.data.stock > 0);

  const publicCombos = await customer('/combos');
  assert.equal(publicCombos.status, 200);
  assert.ok(publicCombos.data.some((c) => c.id === comboId));

  const prodPromo = await admin('/admin/promotions', 'POST', {
    code: 'ONLYP1',
    name: 'Giảm 20.000đ cho SP #1',
    type: 'fixed',
    value: 20000,
    minOrder: 20000,
    usageLimit: 50,
    startDate: '2026-01-01',
    endDate: '2028-12-31',
    applyScope: 'product',
    targetIds: [1],
    active: true,
  });
  assert.equal(prodPromo.status, 201, JSON.stringify(prodPromo.body));
  assert.equal(prodPromo.data.applyScope, 'product');
  assert.deepEqual(prodPromo.data.targetIds, [1]);

  const comboPromo = await admin('/admin/promotions', 'POST', {
    code: 'ONLYCOMBO40',
    name: 'Giảm 40.000đ cho Combo Test',
    type: 'fixed',
    value: 40000,
    minOrder: 50000,
    usageLimit: 50,
    startDate: '2026-01-01',
    endDate: '2028-12-31',
    applyScope: 'combo',
    targetIds: [comboId],
    active: true,
  });
  assert.equal(comboPromo.status, 201, JSON.stringify(comboPromo.body));
  assert.equal(comboPromo.data.applyScope, 'combo');

  // Add combo to cart + standalone product 1
  const addCombo = await customer('/cart/combos', 'POST', {
    comboId,
    quantity: 2,
  });
  assert.equal(addCombo.status, 201, JSON.stringify(addCombo.body));
  const comboRow = addCombo.data.find(
    (x) => x.itemType === 'combo' && x.comboId === comboId,
  );
  assert.ok(comboRow);
  await customer('/cart', 'POST', { productId: 1, quantity: 1 });

  const evalRes = await customer('/promotions/evaluate', 'POST', {});
  assert.equal(evalRes.status, 200, JSON.stringify(evalRes.body));
  assert.equal(evalRes.data.bestPromotion.code, 'ONLYCOMBO40');
  assert.equal(evalRes.data.bestPromotion.discount, 40000);
  assert.equal(evalRes.data.bestPromotion.isBest, true);
  assert.ok(
    evalRes.data.promotions.some(
      (p) => p.code === 'ONLYP1' && p.eligible && p.discount === 20000,
    ),
  );

  // Unselect standalone product 1 -> ONLYP1 becomes ineligible
  const cartNow = (await customer('/cart')).data;
  const p1CartRow = cartNow.find(
    (x) => x.itemType === 'product' && x.productId === 1,
  );
  await customer(`/cart/${p1CartRow.id}`, 'PATCH', { selected: false });
  const evalComboOnly = await customer('/promotions/evaluate', 'POST', {});
  assert.equal(
    evalComboOnly.data.promotions.find((p) => p.code === 'ONLYP1').eligible,
    false,
  );
  assert.equal(evalComboOnly.data.bestPromotion.code, 'ONLYCOMBO40');

  // Place order with combo only + ONLYCOMBO40
  const comboOrder = await customer('/orders', 'POST', {
    addressId: 1,
    paymentMethod: 'cod',
    promotionCode: 'ONLYCOMBO40',
  });
  assert.equal(comboOrder.status, 201, JSON.stringify(comboOrder.body));
  assert.equal(comboOrder.data.subtotal, 190000);
  assert.equal(comboOrder.data.discount, 40000);
  assert.equal(
    comboOrder.data.items.every((i) => i.comboId === comboId),
    true,
  );

  // Verify FEFO stock reserved for both underlying products (2 units each)
  const p1After = (await customer('/products/1')).data;
  const p2After = (await customer('/products/2')).data;
  assert.equal(p1After.stock, p1Before.stock - 2);
  assert.equal(p2After.stock, p2Before.stock - 2);

  // Unselected product 1 still remains in cart
  const cartFinal = (await customer('/cart')).data;
  assert.equal(cartFinal.length, 1);
  assert.equal(cartFinal[0].productId, 1);
});

test('chatbot routes policy questions through Gemini when configured via env or admin settings', async (t) => {
  const originalFetch = globalThis.fetch;
  let geminiCalls = 0;
  let lastPayload = '';
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    if (String(url).includes('generativelanguage.googleapis.com')) {
      geminiCalls += 1;
      lastPayload = String(init?.body || '');
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Phí giao hàng tại An Tâm là 25.000đ và miễn phí từ 299.000đ.',
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return originalFetch(url, init);
  });

  const { login } = await fixture(t, { allowProviderInTests: true });
  const admin = await login('admin@antam.vn');
  const customer = await login('khach@antam.vn');

  const saved = await admin('/admin/settings', 'PATCH', {
    geminiApiKey: 'AIzaTestSettingsKey123456',
    geminiModel: 'gemini-2.5-flash',
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.geminiConfigured, true);
  assert.equal(saved.data.geminiApiKey, undefined, 'raw key must never be returned');
  assert.match(saved.data.geminiKeyMasked, /^AIza/);

  const pubConfig = await customer('/config');
  assert.equal(pubConfig.data.geminiConfigured, true);

  const shipReply = await customer('/chat', 'POST', {
    message: 'Phí giao hàng bao nhiêu vậy?',
  });
  assert.equal(shipReply.status, 200);
  assert.equal(shipReply.data.mode, 'gemini');
  assert.ok(geminiCalls >= 1);
  assert.match(lastPayload, /Combo sản phẩm tiết kiệm/);
});

test('Gemini chat falls back to alternate models on 429/404 and avoids single-letter token false matches', async (t) => {
  const originalFetch = globalThis.fetch;
  const calledUrls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const s = String(url);
    if (s.includes('generativelanguage.googleapis.com')) {
      calledUrls.push(s);
      if (s.includes('gemini-2.5-flash:')) {
        return new Response(
          JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded' } }),
          { status: 429, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Vitamin C 1000mg hỗ trợ bổ sung vitamin C hằng ngày. Thông tin chỉ mang tính tham khảo.',
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return originalFetch(url, init);
  });

  const { login } = await fixture(t, { allowProviderInTests: true });
  const admin = await login('admin@antam.vn');
  const customer = await login('khach@antam.vn');
  await admin('/admin/settings', 'PATCH', {
    geminiApiKey: 'AIzaTestFallbackKey987654',
    geminiModel: 'gemini-2.5-flash',
  });

  const res = await customer('/chat', 'POST', {
    message: 'Cho tôi hỏi về Vitamin C',
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.mode, 'gemini');
  assert.ok(calledUrls.length >= 2, 'must retry with fallback Gemini model on 429');
  assert.match(calledUrls[1], /gemini-2\.5-flash-lite/);
  assert.ok(
    res.data.products.every((p) => /vitamin c/i.test(`${p.name} ${p.ingredient}`)),
    'Vitamin C query must not false-match unrelated products on single letter c',
  );
});

test('bankTransferConfig heals MB Bank aliases/typo BINs and QR proxy falls back cleanly to local EMVCo SVG', async (t) => {
  const keys = [
    'BANK_TRANSFER_BANK_BIN',
    'BANK_TRANSFER_BANK_NAME',
    'BANK_TRANSFER_ACCOUNT',
    'BANK_TRANSFER_NAME',
  ];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  t.after(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  // 1. Typo 6-digit BIN with MB bank name auto-heals to 970422
  process.env.BANK_TRANSFER_BANK_BIN = '970420';
  process.env.BANK_TRANSFER_BANK_NAME = 'Ngân hàng Quân đội (MB)';
  process.env.BANK_TRANSFER_ACCOUNT = ' "0333 123 456" ';
  process.env.BANK_TRANSFER_NAME = '"NHA THUOC AN TAM"';
  const healed = bankTransferConfig();
  assert.equal(healed.bankBin, '970422');
  assert.equal(healed.account, '0333123456');
  assert.equal(healed.accountName, 'NHA THUOC AN TAM');

  // 2. Short code MB in BIN env resolves to 970422
  process.env.BANK_TRANSFER_BANK_BIN = 'MB';
  process.env.BANK_TRANSFER_BANK_NAME = '';
  const fromAlias = bankTransferConfig();
  assert.equal(fromAlias.bankBin, '970422');
  assert.equal(fromAlias.bankName, 'MB Bank');

  // 3. EMVCo VietQR payload includes NAPAS GUID, MB BIN, amount, content, and valid CRC16
  const payload = buildVietQrPayload({
    bankBin: '970422',
    account: '0333123456',
    amount: 150000,
    content: 'ANTAM42',
  });
  assert.ok(payload.includes('A000000727'));
  assert.ok(payload.includes('970422'));
  assert.ok(payload.includes('0333123456'));
  assert.ok(payload.includes('QRIBFTTA'));
  assert.ok(payload.includes('5303704'));
  assert.ok(payload.includes('5406150000'));
  assert.ok(payload.includes('ANTAM42'));
  assert.match(payload, /6304[0-9A-F]{4}$/);

  // 4. Same-origin QR proxy skips text/html upstream error and serves valid image, then local SVG when all fail
  const { login } = await fixture(t, {
    bankTransfer: {
      bankBin: '970422',
      account: '0333123456',
      accountName: 'NHA THUOC AN TAM',
      bankName: 'MB Bank',
    },
  });
  const customer = await login('khach@antam.vn');
  const other = await login('huong@antam.vn');
  await add(customer, 1, 1);
  const created = await order(customer, { paymentMethod: 'bank_transfer' });
  assert.equal(created.status, 201);
  const id = created.data.id;

  const details = await customer(`/orders/${id}/bank-transfer`);
  assert.equal(details.status, 200);
  assert.equal(details.data.qrProxyUrl, `/api/orders/${id}/bank-transfer/qr`);

  // Other user cannot access order QR
  assert.equal((await other(`/orders/${id}/bank-transfer/qr`)).status, 404);

  const originalFetch = globalThis.fetch;
  let upstreamAttempt = 0;
  let forceAllFail = false;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const s = String(url);
    if (s.startsWith('https://qr.sepay.vn/') || s.startsWith('https://img.vietqr.io/')) {
      upstreamAttempt += 1;
      if (forceAllFail || upstreamAttempt === 1) {
        return new Response('Failed to return content Error: Ngân hàng này không được hỗ trợ', {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return new Response(Buffer.alloc(256, 0x89), {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      });
    }
    return originalFetch(url, init);
  });

  // First call: attempt 1 returns text/html -> skipped -> attempt 2 returns image/png
  const proxied = await customer(`/orders/${id}/bank-transfer/qr`);
  assert.equal(proxied.status, 200);
  assert.match(proxied.headers.get('content-type'), /^image\/png/);
  assert.equal(upstreamAttempt, 2);

  // Second call: all external providers return non-image -> falls back to local EMVCo VietQR SVG
  forceAllFail = true;
  const localSvg = await customer(`/orders/${id}/bank-transfer/qr`);
  assert.equal(localSvg.status, 200);
  assert.match(localSvg.headers.get('content-type'), /^image\/svg\+xml/);
  assert.equal(localSvg.headers.get('x-qr-source'), 'local-emvco');
  assert.match(String(localSvg.body), /<svg[\s>]/);
});
