import { randomUUID } from 'node:crypto';
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
  return {
    bankBin,
    account,
    accountName: accountName.trim(),
    bankName: process.env.BANK_TRANSFER_BANK_NAME || bankBin,
  };
}

export function installBankTransfers(app, d, { auth, permission }, config) {
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
    res.json({ data: { ...config, amount: order.total, content, qrUrl } });
  });

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
      assert(
        Number(req.body.amount) === order.total,
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
        return res.json({ data: await orderView(d, order.id) });
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
      await setOrderStatus(
        d,
        order.id,
        'pending',
        req.user.id,
        'Đã đối soát chuyển khoản ngân hàng',
      );
      await audit(d, req.user.id, 'payment.bank_confirm', 'order', order.id, {
        reference,
      });
      res.json({
        data: await orderView(d, order.id, { includeInternal: true }),
      });
    }),
  );
}
