import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHmac } from 'node:crypto';
import { createApp } from '../backend/app.js';
import { openPostgres } from '../backend/repositories/postgres.js';
import { initializePostgresSchema } from '../backend/repositories/postgres-migrations.js';
import { createTestDatabase } from './postgres-fixture.js';
import { resolveApiUrl } from '../api/index.js';
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

  const again = await customer('/consultations', 'POST', { message: 'Đơn gửi lúc sáng', prescriptionId: rx.id });
  assert.equal(again.status, 200);
  assert.equal(again.data.consultation.id, id, 'an open consultation is reused');

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
  assert.equal((await customer(`/consultations/${id}/messages`)).data.consultation.status, 'resolved');
  assert.equal((await customer(`/consultations/${id}/messages`, 'POST', { message: 'Cho mình hỏi thêm' })).status, 201);
  assert.equal((await customer(`/consultations/${id}/messages`)).data.consultation.status, 'pending', 'a new customer message reopens the consultation');
  assert.equal((await customer('/consultations')).data.length, 1);
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
