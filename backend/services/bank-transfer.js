import { randomUUID, timingSafeEqual } from 'node:crypto';
import { transactionJson } from '../repositories/transactions.js';
import { assert, audit, orderView, text } from './shared.js';
import { now } from '../repositories/database.js';
import { setOrderStatus } from './orders.js';

export function bankTransferConfig() {
  const bankBin = process.env.BANK_TRANSFER_BANK_BIN;
  const account = process.env.BANK_TRANSFER_ACCOUNT;
  const accountName = process.env.BANK_TRANSFER_NAME;
  if (
    !/^\d{6}$/.test(bankBin || '') ||
    !/^\d{6,30}$/.test(account || '') ||
    !accountName?.trim()
  )
    return null;
  const webhookSecret = (
    process.env.BANK_TRANSFER_WEBHOOK_SECRET ||
    process.env.SEPAY_WEBHOOK_TOKEN ||
    ''
  ).trim();
  return {
    bankBin,
    account,
    accountName: accountName.trim(),
    bankName: process.env.BANK_TRANSFER_BANK_NAME || bankBin,
    webhookSecret,
  };
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function extractWebhookToken(req) {
  const authHeader = String(req.get('Authorization') || '').trim();
  const match = /^(?:Apikey|Bearer)\s+(.+)$/i.exec(authHeader);
  if (match) return match[1].trim();
  return String(
    req.get('x-webhook-secret') || req.get('secure-token') || '',
  ).trim();
}

function parseOrderIdentifier(content) {
  const raw = String(content || '');
  const idMatch = /\bANTAM[\s_-]*(\d+)\b/i.exec(raw);
  if (idMatch) return { type: 'id', value: Number(idMatch[1]) };
  const codeMatch = /\b(AT\d[A-Z0-9]{5,})\b/i.exec(raw);
  if (codeMatch) return { type: 'code', value: codeMatch[1].toUpperCase() };
  return null;
}

async function confirmBankTransferPayment(
  d,
  { order, amount, reference, actorId = null, sourceLabel, auditAction, meta = {} },
) {
  assert(
    order?.payment_method === 'bank_transfer',
    404,
    'Không tìm thấy đơn chuyển khoản.',
  );
  assert(
    Number(amount) === order.total,
    400,
    'Số tiền phải khớp tổng thanh toán của đơn.',
  );
  const previous = await d.one(
    "SELECT * FROM giao_dich_thanh_toan WHERE provider='bank_transfer' AND provider_reference=? AND type='payment' AND status='success'",
    reference,
  );
  if (previous) {
    assert(
      previous.order_id === order.id,
      409,
      'Giao dịch này đã được đối soát cho đơn khác.',
    );
    return { alreadyPaid: true, orderId: order.id };
  }
  assert(
    order.status === 'pending_payment' && order.payment_status !== 'paid',
    409,
    'Đơn đã được thanh toán hoặc không còn chờ thanh toán.',
  );
  await d.insert('giao_dich_thanh_toan', {
    order_id: order.id,
    reference: `BANK-${randomUUID()}`,
    provider_reference: reference,
    type: 'payment',
    provider: 'bank_transfer',
    amount: order.total,
    status: 'success',
    created_at: now(),
  });
  await d.update('don_hang', { payment_status: 'paid' }, order.id);
  await setOrderStatus(d, order.id, 'pending', actorId, sourceLabel);
  await audit(d, actorId, auditAction, 'order', order.id, {
    reference,
    amount: order.total,
    ...meta,
  });
  return { alreadyPaid: false, orderId: order.id };
}

export function installBankTransfers(
  app,
  d,
  { auth, permission },
  config,
  appConfig = {},
) {
  app.get('/api/orders/:id/bank-transfer', auth, async (req, res) => {
    assert(config, 503, 'Nhà thuốc chưa cấu hình tài khoản nhận chuyển khoản.');
    const order = await d.one(
      'SELECT * FROM don_hang WHERE id=? AND user_id=?',
      req.params.id,
      req.user.id,
    );
    assert(
      order && order.payment_method === 'bank_transfer',
      404,
      'Không tìm thấy đơn chuyển khoản.',
    );
    assert(
      order.status === 'pending_payment' && order.payment_status !== 'paid',
      409,
      'Đơn chưa sẵn sàng hoặc đã hoàn tất thanh toán.',
    );
    const content = `ANTAM${order.id}`;
    const params = new URLSearchParams({
      amount: String(order.total),
      addInfo: content,
      accountName: config.accountName,
    });
    const qrUrl = `https://img.vietqr.io/image/${config.bankBin}-${config.account}-compact2.png?${params}`;
    const { webhookSecret, ...publicBankConfig } = config;
    res.json({
      data: {
        ...publicBankConfig,
        amount: order.total,
        content,
        qrUrl,
        autoVerify: Boolean(webhookSecret),
      },
    });
  });

  app.get('/api/orders/:id/payment-status', auth, async (req, res) => {
    const order = await d.one(
      'SELECT id,code,status,payment_status,payment_method,total,updated_at FROM don_hang WHERE id=? AND user_id=?',
      req.params.id,
      req.user.id,
    );
    assert(order, 404, 'Không tìm thấy đơn hàng.');
    res.json({
      data: {
        id: order.id,
        code: order.code,
        status: order.status,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        total: order.total,
        updatedAt: order.updated_at,
      },
    });
  });

  app.post(
    '/api/payments/bank-transfer/webhook',
    transactionJson(d, async (req, res) => {
      assert(
        config?.webhookSecret,
        503,
        'Chưa cấu hình khóa webhook VietQR tự động.',
      );
      const token = extractWebhookToken(req);
      if (!safeEqual(token, config.webhookSecret)) {
        await audit(
          d,
          null,
          'payment.bank_webhook_invalid',
          'payment',
          '',
          'Từ chối webhook VietQR do sai mã xác thực.',
        );
        return res.status(401).json({ error: 'Mã xác thực webhook không hợp lệ.' });
      }
      const body = req.body || {};
      const transferType = String(body.transferType || 'in').toLowerCase();
      if (transferType !== 'in') {
        return res.json({
          data: { processed: false, reason: 'ignored_outgoing' },
        });
      }
      const incomingAccount = String(body.accountNumber || '').trim();
      if (incomingAccount && incomingAccount !== config.account) {
        return res.json({
          data: { processed: false, reason: 'account_mismatch' },
        });
      }
      const amount = Number(body.transferAmount ?? body.amount);
      const content = text(body.content || body.description || '', 1000);
      const rawRef = text(
        String(body.referenceCode || body.code || body.id || ''),
        100,
      );
      const reference =
        rawRef.length >= 6 ? rawRef : `VIETQR-${rawRef || randomUUID().slice(0, 8)}`;
      const parsed = parseOrderIdentifier(content);
      if (!parsed) {
        return res.json({
          data: { processed: false, reason: 'order_not_found_in_content' },
        });
      }
      const order =
        parsed.type === 'id'
          ? await d.one('SELECT * FROM don_hang WHERE id=?', parsed.value)
          : await d.one('SELECT * FROM don_hang WHERE code=?', parsed.value);
      if (!order || order.payment_method !== 'bank_transfer') {
        return res.json({
          data: { processed: false, reason: 'order_not_found' },
        });
      }
      if (!Number.isSafeInteger(amount) || amount !== order.total) {
        await audit(d, null, 'payment.bank_webhook_mismatch', 'order', order.id, {
          reference,
          expected: order.total,
          received: amount,
          gateway: text(body.gateway || 'sepay', 60),
        });
        return res.json({
          data: {
            processed: false,
            reason: 'amount_mismatch',
            orderId: order.id,
          },
        });
      }
      if (order.payment_status === 'paid') {
        return res.json({
          data: {
            processed: true,
            alreadyPaid: true,
            orderId: order.id,
            orderCode: order.code,
          },
        });
      }
      if (order.status !== 'pending_payment') {
        return res.json({
          data: {
            processed: false,
            reason: 'order_not_pending_payment',
            orderId: order.id,
          },
        });
      }
      const result = await confirmBankTransferPayment(d, {
        order,
        amount,
        reference,
        actorId: null,
        sourceLabel: 'Hệ thống tự động xác nhận chuyển khoản VietQR',
        auditAction: 'payment.bank_webhook',
        meta: { gateway: text(body.gateway || 'sepay', 60) },
      });
      res.json({
        data: {
          processed: true,
          alreadyPaid: result.alreadyPaid,
          orderId: order.id,
          orderCode: order.code,
          paymentStatus: 'paid',
          status: 'pending',
        },
      });
    }),
  );

  if (appConfig.demo) {
    app.post(
      '/api/orders/:id/bank-transfer/demo-confirm',
      auth,
      transactionJson(d, async (req, res) => {
        const order = await d.one(
          'SELECT * FROM don_hang WHERE id=? AND user_id=?',
          req.params.id,
          req.user.id,
        );
        assert(
          order && order.payment_method === 'bank_transfer',
          404,
          'Không tìm thấy đơn chuyển khoản.',
        );
        const reference = `DEMOQR${order.id}${Date.now().toString().slice(-6)}`;
        await confirmBankTransferPayment(d, {
          order,
          amount: order.total,
          reference,
          actorId: req.user.id,
          sourceLabel: 'Hệ thống tự động xác nhận chuyển khoản VietQR (mô phỏng)',
          auditAction: 'payment.bank_webhook',
          meta: { gateway: 'demo_vietqr' },
        });
        res.json({
          data: await orderView(d, order.id),
        });
      }),
    );
  }

  app.post(
    '/api/admin/orders/:id/bank-transfer',
    permission('orders'),
    transactionJson(d, async (req, res) => {
      const order = await d.one(
        'SELECT * FROM don_hang WHERE id=?',
        req.params.id,
      );
      assert(
        order?.payment_method === 'bank_transfer',
        404,
        'Không tìm thấy đơn chuyển khoản.',
      );
      const reference = text(req.body.reference, 100);
      assert(
        reference.length >= 6 && req.body.confirmed === true,
        400,
        'Nhập mã giao dịch và xác nhận đã kiểm tra sao kê.',
      );
      await confirmBankTransferPayment(d, {
        order,
        amount: req.body.amount,
        reference,
        actorId: req.user.id,
        sourceLabel: 'Đã đối soát chuyển khoản ngân hàng',
        auditAction: 'payment.bank_confirm',
      });
      res.json({
        data: await orderView(d, order.id, { includeInternal: true }),
      });
    }),
  );
}
