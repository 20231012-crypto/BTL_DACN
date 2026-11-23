import { randomUUID, timingSafeEqual } from 'node:crypto';
import { transactionJson } from '../repositories/transactions.js';
import { assert, audit, orderView, text } from './shared.js';
import { now } from '../repositories/database.js';
import { setOrderStatus } from './orders.js';

const BANK_BIN_ALIASES = {
  MB: '970422',
  MBBANK: '970422',
  VCB: '970436',
  VIETCOMBANK: '970436',
  TCB: '970407',
  TECHCOMBANK: '970407',
  ACB: '970416',
  BIDV: '970418',
  VPB: '970432',
  VPBANK: '970432',
  TPB: '970423',
  TPBANK: '970423',
  ICB: '970415',
  VIETINBANK: '970415',
  STB: '970403',
  SACOMBANK: '970403',
  AGR: '970405',
  AGRIBANK: '970405',
  OCB: '970448',
  VIB: '970441',
  HDB: '970437',
  HDBANK: '970437',
  SHB: '970443',
  MSB: '970426',
  SEAB: '970440',
  SEABANK: '970440',
};

function resolveBankBin(raw) {
  const clean = String(raw || '').trim();
  if (/^\d{6}$/.test(clean)) return clean;
  const key = clean.replace(/[\s_-]+/g, '').toUpperCase();
  return BANK_BIN_ALIASES[key] || '';
}

export function bankTransferConfig() {
  const rawBin = String(process.env.BANK_TRANSFER_BANK_BIN || '').trim();
  const bankBin =
    resolveBankBin(rawBin) ||
    resolveBankBin(process.env.BANK_TRANSFER_BANK_NAME);
  const account = String(process.env.BANK_TRANSFER_ACCOUNT || '')
    .replace(/[\s-]+/g, '')
    .trim();
  const accountName = String(process.env.BANK_TRANSFER_NAME || '').trim();
  if (
    !/^\d{6}$/.test(bankBin) ||
    !/^[A-Za-z0-9]{4,30}$/.test(account) ||
    !accountName
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
    accountName,
    bankName:
      String(process.env.BANK_TRANSFER_BANK_NAME || '').trim() ||
      (bankBin === '970422' ? 'MB Bank' : bankBin),
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

function parseOrderIdentifier(content, paymentCode = '') {
  const combined = `${paymentCode || ''} ${content || ''}`.trim();
  const idMatch = /(?:^|[^A-Z])ANTAM[\s_-]*(\d+)(?!\d)/i.exec(combined);
  if (idMatch) return { type: 'id', value: Number(idMatch[1]) };
  const codeMatch = /(?:^|[^A-Z0-9])(AT\d[A-Z0-9]{5,})(?![A-Z0-9])/i.exec(
    combined,
  );
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
    const sepayParams = new URLSearchParams({
      acc: config.account,
      bank: config.bankBin,
      amount: String(order.total),
      des: content,
      template: 'compact',
    });
    const sepayQrUrl = `https://qr.sepay.vn/img?${sepayParams}`;
    const vietQrParams = new URLSearchParams({
      amount: String(order.total),
      addInfo: content,
      accountName: config.accountName,
    });
    const vietQrUrl = `https://img.vietqr.io/image/${config.bankBin}-${encodeURIComponent(config.account)}-compact2.png?${vietQrParams}`;
    const qrUrl = sepayQrUrl;
    const qrFallbackUrl = vietQrUrl;
    const { webhookSecret, ...publicBankConfig } = config;
    res.json({
      data: {
        ...publicBankConfig,
        amount: order.total,
        content,
        qrUrl,
        qrFallbackUrl,
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
          success: true,
          data: { processed: false, reason: 'ignored_outgoing' },
        });
      }
      const incomingAccount = String(body.accountNumber || '').trim();
      const incomingSub = String(body.subAccount || '').trim();
      const expectedAccount = String(config.account || '').trim();
      const accountMatches =
        (!incomingAccount && !incomingSub) ||
        incomingAccount === expectedAccount ||
        incomingSub === expectedAccount;
      if (!accountMatches) {
        return res.json({
          success: true,
          data: { processed: false, reason: 'account_mismatch' },
        });
      }
      const amount = Number(body.transferAmount ?? body.amount);
      const content = text(body.content || body.description || '', 1000);
      const paymentCode = text(String(body.code || ''), 100);
      const rawRef = text(String(body.referenceCode || ''), 100);
      const sepayId = body.id !== undefined && body.id !== null ? String(body.id).trim() : '';
      const reference =
        rawRef.length >= 6
          ? rawRef
          : sepayId
            ? `SEPAY-${sepayId}`
            : `VIETQR-${randomUUID().slice(0, 8)}`;
      const parsed = parseOrderIdentifier(content, paymentCode);
      if (!parsed) {
        return res.json({
          success: true,
          data: { processed: false, reason: 'order_not_found_in_content' },
        });
      }
      const order =
        parsed.type === 'id'
          ? await d.one('SELECT * FROM don_hang WHERE id=?', parsed.value)
          : await d.one('SELECT * FROM don_hang WHERE code=?', parsed.value);
      if (!order || order.payment_method !== 'bank_transfer') {
        return res.json({
          success: true,
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
          success: true,
          data: {
            processed: false,
            reason: 'amount_mismatch',
            orderId: order.id,
          },
        });
      }
      if (order.payment_status === 'paid') {
        return res.json({
          success: true,
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
          success: true,
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
        success: true,
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
