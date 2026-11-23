import { randomUUID, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';
import { transactionJson } from '../repositories/transactions.js';
import { assert, audit, orderView, text } from './shared.js';
import { now } from '../repositories/database.js';
import { setOrderStatus } from './orders.js';

const VALID_NAPAS_BINS = {
  970422: 'MB',
  970436: 'VCB',
  970407: 'TCB',
  970415: 'ICB',
  970418: 'BIDV',
  970416: 'ACB',
  970432: 'VPB',
  970423: 'TPB',
  970405: 'VBA',
  970403: 'STB',
  970448: 'OCB',
  970441: 'VIB',
  970437: 'HDB',
  970443: 'SHB',
  970426: 'MSB',
  970440: 'SEAB',
  970431: 'EIB',
  970414: 'OCEANBANK',
  970429: 'SCB',
  970454: 'VCCB',
  970449: 'LPB',
  970438: 'BVB',
  970428: 'NAB',
  970419: 'NCB',
  970425: 'ABB',
  970433: 'VIETBANK',
  970427: 'VAB',
  970430: 'PGB',
  970412: 'PVCB',
  970409: 'BAB',
  970452: 'KLB',
  970400: 'SGICB',
  970424: 'SHBVN',
  970457: 'WVN',
  546034: 'CAKE',
  546035: 'Ubank',
  963388: 'TIMO',
  970406: 'DOB',
  970408: 'GPB',
  970421: 'VRB',
  970434: 'IVB',
  970439: 'PBVN',
  970442: 'HLBVN',
  970446: 'COOPBANK',
  970458: 'UOB',
  970462: 'KBHN',
  970463: 'KBHCM',
};

const BANK_BIN_ALIASES = {
  MB: '970422',
  MBBANK: '970422',
  MILITARYBANK: '970422',
  QUANDOI: '970422',
  NGANHANGQUANDOI: '970422',
  NGANHANGTMCPQUANDOI: '970422',
  VCB: '970436',
  VIETCOMBANK: '970436',
  NGOAITHUONG: '970436',
  TCB: '970407',
  TECHCOMBANK: '970407',
  KYTHUONG: '970407',
  ACB: '970416',
  ACHAU: '970416',
  BIDV: '970418',
  VPB: '970432',
  VPBANK: '970432',
  TPB: '970423',
  TPBANK: '970423',
  TIENPHONG: '970423',
  ICB: '970415',
  VIETINBANK: '970415',
  CONGTHUONG: '970415',
  STB: '970403',
  SACOMBANK: '970403',
  AGR: '970405',
  VBA: '970405',
  AGRIBANK: '970405',
  OCB: '970448',
  PHUONGDONG: '970448',
  VIB: '970441',
  HDB: '970437',
  HDBANK: '970437',
  SHB: '970443',
  MSB: '970426',
  SEAB: '970440',
  SEABANK: '970440',
  EIB: '970431',
  EXIMBANK: '970431',
  LPB: '970449',
  LPBANK: '970449',
  LIENVIETPOSTBANK: '970449',
  NAB: '970428',
  NAMABANK: '970428',
  BVB: '970438',
  BAOVIETBANK: '970438',
  VCCB: '970454',
  BVBANK: '970454',
  TIMO: '963388',
  CAKE: '546034',
  UBANK: '546035',
  SHINHAN: '970424',
  SHINHANBANK: '970424',
  WOORI: '970457',
  WOORIBANK: '970457',
};

function cleanEnvValue(value) {
  return String(value || '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
}

function normalizeBankKey(raw) {
  return cleanEnvValue(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toUpperCase();
}

function resolveBankAlias(raw) {
  const clean = cleanEnvValue(raw);
  if (!clean) return '';
  const key = normalizeBankKey(clean);
  if (BANK_BIN_ALIASES[key]) return BANK_BIN_ALIASES[key];
  if (/\bMB\b/i.test(clean) || key.includes('MBBANK') || key.includes('QUANDOI'))
    return '970422';
  for (const [alias, bin] of Object.entries(BANK_BIN_ALIASES)) {
    if (alias.length >= 4 && key.includes(alias)) return bin;
  }
  return '';
}

function emvTlv(id, value) {
  const str = String(value || '');
  return `${id}${String(str.length).padStart(2, '0')}${str}`;
}

function crc16CcittFalse(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc =
        crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildVietQrPayload({ bankBin, account, amount, content }) {
  const cleanBin = cleanEnvValue(bankBin);
  const cleanAccount = cleanEnvValue(account).replace(/[\s-]+/g, '');
  const cleanContent = String(content || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^A-Za-z0-9 _.-]/g, '')
    .trim()
    .slice(0, 50);
  const beneficiary = emvTlv('00', cleanBin) + emvTlv('01', cleanAccount);
  const merchantAccount =
    emvTlv('00', 'A000000727') +
    emvTlv('01', beneficiary) +
    emvTlv('02', 'QRIBFTTA');
  const parts = [
    emvTlv('00', '01'),
    emvTlv('01', Number(amount) > 0 ? '12' : '11'),
    emvTlv('38', merchantAccount),
    emvTlv('53', '704'),
  ];
  if (Number(amount) > 0)
    parts.push(emvTlv('54', String(Math.round(Number(amount)))));
  parts.push(emvTlv('58', 'VN'));
  if (cleanContent) parts.push(emvTlv('62', emvTlv('08', cleanContent)));
  const body = `${parts.join('')}6304`;
  return `${body}${crc16CcittFalse(body)}`;
}

function buildQrUrls(config, order, content) {
  const sepayParams = new URLSearchParams({
    acc: config.account,
    bank: config.bankBin,
    amount: String(order.total),
    des: content,
    template: 'compact',
  });
  const sepayQrUrl = `https://qr.sepay.vn/img?${sepayParams}`;
  const shortCode = VALID_NAPAS_BINS[config.bankBin];
  const sepayShortQrUrl = shortCode
    ? `https://qr.sepay.vn/img?${new URLSearchParams({
        acc: config.account,
        bank: shortCode,
        amount: String(order.total),
        des: content,
        template: 'compact',
      })}`
    : '';
  const vietQrParams = new URLSearchParams({
    amount: String(order.total),
    addInfo: content,
    accountName: config.accountName,
  });
  const encodedAcc = encodeURIComponent(config.account);
  const vietQrUrl = `https://img.vietqr.io/image/${config.bankBin}-${encodedAcc}-compact2.png?${vietQrParams}`;
  const vietQrCompactUrl = `https://img.vietqr.io/image/${config.bankBin}-${encodedAcc}-compact.png?${vietQrParams}`;
  return {
    sepayQrUrl,
    sepayShortQrUrl,
    vietQrUrl,
    vietQrCompactUrl,
    candidates: [
      sepayQrUrl,
      sepayShortQrUrl,
      vietQrUrl,
      vietQrCompactUrl,
    ].filter(Boolean),
  };
}

export function bankTransferConfig() {
  const rawBin = cleanEnvValue(process.env.BANK_TRANSFER_BANK_BIN);
  const rawBankName = cleanEnvValue(process.env.BANK_TRANSFER_BANK_NAME);
  const binFromRaw = VALID_NAPAS_BINS[rawBin]
    ? rawBin
    : resolveBankAlias(rawBin);
  const binFromName = resolveBankAlias(rawBankName);
  const bankBin =
    binFromRaw || binFromName || (/^\d{6}$/.test(rawBin) ? rawBin : '');
  const account = cleanEnvValue(process.env.BANK_TRANSFER_ACCOUNT).replace(
    /[\s-]+/g,
    '',
  );
  const accountName = cleanEnvValue(process.env.BANK_TRANSFER_NAME);
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
    bankName: rawBankName || (bankBin === '970422' ? 'MB Bank' : bankBin),
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
    const { sepayQrUrl, vietQrUrl } = buildQrUrls(config, order, content);
    const qrUrl = sepayQrUrl;
    const qrProxyUrl = `/api/orders/${order.id}/bank-transfer/qr`;
    const qrFallbackUrl = vietQrUrl;
    const { webhookSecret, ...publicBankConfig } = config;
    res.json({
      data: {
        ...publicBankConfig,
        amount: order.total,
        content,
        qrUrl,
        qrProxyUrl,
        qrFallbackUrl,
        autoVerify: Boolean(webhookSecret),
      },
    });
  });

  app.get('/api/orders/:id/bank-transfer/qr', auth, async (req, res) => {
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
    const { candidates } = buildQrUrls(config, order, content);
    for (const url of candidates) {
      try {
        const upstream = await fetch(url, {
          signal: AbortSignal.timeout(4500),
          headers: { Accept: 'image/*,*/*;q=0.8' },
        });
        const contentType = String(
          upstream.headers.get('content-type') || '',
        ).toLowerCase();
        if (!upstream.ok || !contentType.startsWith('image/')) continue;
        const buf = Buffer.from(await upstream.arrayBuffer());
        if (buf.length < 100) continue;
        res.set({
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=300',
        });
        return res.status(200).send(buf);
      } catch {
        // Thử nguồn QR tiếp theo hoặc tạo mã VietQR EMVCo nội bộ.
      }
    }
    const payload = buildVietQrPayload({
      bankBin: config.bankBin,
      account: config.account,
      amount: order.total,
      content,
    });
    const svg = await QRCode.toString(payload, {
      type: 'svg',
      margin: 2,
      width: 280,
      errorCorrectionLevel: 'M',
    });
    res.set({
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
      'X-QR-Source': 'local-emvco',
    });
    return res.status(200).send(svg);
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
