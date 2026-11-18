import { randomUUID } from 'node:crypto';
import { now } from '../repositories/database.js';
import { assert, audit, getSettings } from './shared.js';
import { readVnpayResult, vnpayPaymentUrl } from '../integrations/vnpay.js';

export function activeVnpayAttempt(d, orderId) {
  return d.one(
    "SELECT * FROM giao_dich_thanh_toan WHERE order_id=? AND type='payment' AND provider='vnpay' AND status='pending' ORDER BY id DESC LIMIT 1",
    orderId,
  );
}

export function installVnpayOrders(app, d, auth, config, setOrderStatus) {
  if (!config) return;

  app.post('/api/orders/:id/vnpay', auth, (req, res) => {
    const order = d.one(
      'SELECT * FROM don_hang WHERE id=? AND user_id=?',
      req.params.id,
      req.user.id,
    );
    assert(
      order?.payment_method === 'vnpay' && order.status === 'pending_payment',
      409,
      'Đơn hàng chưa sẵn sàng thanh toán VNPay.',
    );
    const rx = d.one('SELECT status FROM don_thuoc WHERE order_id=?', order.id);
    assert(
      !rx || rx.status === 'approved',
      409,
      'Dược sĩ cần duyệt đơn thuốc trước khi thanh toán.',
    );
    assert(
      order.total > 0,
      400,
      'Vui lòng chọn COD cho đơn có tổng thanh toán bằng 0.',
    );
    const transaction = d.transaction(() => {
      const prior = activeVnpayAttempt(d, order.id);
      if (prior) return prior;
      const deadline =
        new Date(order.updated_at || order.created_at).getTime() +
        getSettings(d).paymentTimeoutMinutes * 60000;
      assert(
        deadline > Date.now(),
        409,
        'Đơn hàng đã quá thời hạn thanh toán.',
      );
      const id = d.insert('giao_dich_thanh_toan', {
        order_id: order.id,
        reference: `MA${randomUUID().replaceAll('-', '').toUpperCase()}`,
        type: 'payment',
        provider: 'vnpay',
        amount: order.total,
        status: 'pending',
        expires_at: new Date(deadline).toISOString(),
        created_at: now(),
      });
      audit(d, req.user.id, 'payment.vnpay_create', 'order', order.id);
      return d.one('SELECT * FROM giao_dich_thanh_toan WHERE id=?', id);
    });
    assert(
      transaction.expires_at > now(),
      409,
      'Giao dịch hết hạn. Vui lòng chờ kết quả đối soát.',
    );
    const url = vnpayPaymentUrl(config, {
      reference: transaction.reference,
      order,
      createdAt: transaction.created_at,
      expiresAt: transaction.expires_at,
      ip: req.ip.replace(/^::ffff:/, ''),
    });
    res.json({ data: { url, expiresAt: transaction.expires_at } });
  });

  app.get('/api/payments/vnpay/return', (req, res) => {
    const result = readVnpayResult(config, req.query);
    if (!result) return res.redirect('/orders?payment=invalid');
    const transaction = d.one(
      "SELECT order_id,amount FROM giao_dich_thanh_toan WHERE reference=? AND provider='vnpay' AND type='payment'",
      result.reference,
    );
    if (!transaction || transaction.amount !== result.amount)
      return res.redirect('/orders?payment=invalid');
    // A browser return shows information. Only the signed server notification updates accounting.
    res.redirect(
      `/orders/${transaction.order_id}?payment=${result.successful ? 'waiting' : 'failed'}`,
    );
  });

  app.get('/api/payments/vnpay/ipn', (req, res) => {
    const respond = (RspCode, Message) => res.json({ RspCode, Message });
    const result = readVnpayResult(config, req.query);
    if (!result) {
      audit(d, null, 'payment.vnpay_invalid_signature', 'payment', '');
      return respond('97', 'Invalid signature');
    }
    const transaction = d.one(
      "SELECT * FROM giao_dich_thanh_toan WHERE reference=? AND type='payment' AND provider='vnpay'",
      result.reference,
    );
    if (!transaction) return respond('01', 'Order not found');
    const order = d.one(
      'SELECT * FROM don_hang WHERE id=?',
      transaction.order_id,
    );
    if (!order || order.payment_method !== 'vnpay')
      return respond('01', 'Order not found');
    if (result.amount !== transaction.amount || result.amount !== order.total) {
      audit(d, null, 'payment.vnpay_invalid_amount', 'order', order.id);
      return respond('04', 'Invalid amount');
    }
    if (transaction.status !== 'pending')
      return respond('02', 'Order already confirmed');
    d.transaction(() => {
      d.update(
        'giao_dich_thanh_toan',
        {
          status: result.successful ? 'success' : 'failed',
          provider_reference: result.transactionNo,
        },
        transaction.id,
      );
      if (order.status === 'pending_payment') {
        d.update(
          'don_hang',
          {
            payment_status: result.successful ? 'paid' : 'failed',
            updated_at: now(),
          },
          order.id,
        );
        if (result.successful)
          setOrderStatus(
            d,
            order.id,
            'pending',
            null,
            'Đã nhận xác nhận thanh toán từ VNPay Sandbox',
          );
      } else if (result.successful && order.status === 'cancelled') {
        d.update(
          'don_hang',
          { payment_status: 'refund_pending', updated_at: now() },
          order.id,
        );
        d.insert('yeu_cau_huy_hoan', {
          order_id: order.id,
          user_id: order.user_id,
          type: 'refund',
          status: 'approved',
          reason:
            'VNPay thông báo thanh toán sau khi đơn đã hủy. Cần hoàn tiền qua cổng.',
        });
      }
      audit(d, null, 'payment.vnpay_result', 'order', order.id, {
        responseCode: result.responseCode,
        success: result.successful,
      });
    });
    return respond('00', 'Confirm success');
  });
}
