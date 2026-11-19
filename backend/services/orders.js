import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { now, today, camel } from '../repositories/database.js';
import { transactionJson } from '../repositories/transactions.js';
import { searchScore } from '../../shared/search.js';
import {
  imageMimes,
  prescriptionMimes,
  validPrescriptionName,
  matchesFile,
  verifyUpload,
  claimUpload,
} from './attachments.js';
import { activeVnpayAttempt, installVnpayOrders } from './vnpay-orders.js';
import { vnpayRefund } from '../integrations/vnpay.js';
import { medicineRows, readPrescription, prescriptionMatches } from './prescription-search.js';
import {
  assert,
  fail,
  text,
  positiveInt,
  audit,
  getSettings,
  getProduct,
  productList,
  cartRows,
  orderView,
  requestView,
} from './shared.js';
export const defaultStorage = fileURLToPath(
  new URL('../storage/prescriptions/', import.meta.url),
);
export async function validatePromotion(
  d,
  code,
  subtotal,
  previouslyReserved = false,
) {
  const p = await d.one(
    'SELECT * FROM khuyen_mai WHERE upper(code)=?',
    text(code, 40).toUpperCase(),
  );
  assert(p && p.active, 400, 'Mã khuyến mãi không tồn tại hoặc đã tạm dừng.');
  assert(
    p.start_date <= today() && p.end_date >= today(),
    400,
    'Mã khuyến mãi chưa đến hạn hoặc đã hết hạn.',
  );
  assert(
    p.used_count - (previouslyReserved ? 1 : 0) < p.usage_limit,
    400,
    'Mã khuyến mãi đã hết lượt sử dụng.',
  );
  assert(
    subtotal >= p.min_order,
    400,
    `Đơn hàng cần đạt ${p.min_order.toLocaleString('vi-VN')}đ để áp dụng mã này.`,
  );
  let discount =
    p.type === 'percent' ? Math.floor((subtotal * p.value) / 100) : p.value;
  if (p.max_discount !== null && p.max_discount > 0)
    discount = Math.min(discount, p.max_discount);
  return { ...camel(p), discount: Math.min(discount, subtotal) };
}
export async function reserveStock(d, orderId, items) {
  for (const item of items) {
    let remaining = item.quantity;
    const batches = await d.all(
      'SELECT * FROM lo_thuoc WHERE product_id=? AND expires_at>? AND quantity>reserved ORDER BY expires_at,id',
      item.productId,
      today(),
    );
    for (const b of batches) {
      const take = Math.min(remaining, b.quantity - b.reserved);
      if (take <= 0) continue;
      await d.run(
        'UPDATE lo_thuoc SET reserved=reserved+? WHERE id=?',
        take,
        b.id,
      );
      await d.insert('stock_allocations', {
        order_id: orderId,
        batch_id: b.id,
        quantity: take,
      });
      remaining -= take;
      if (!remaining) break;
    }
    assert(
      !remaining,
      409,
      `${item.name || 'Sản phẩm'} không còn đủ tồn kho. Vui lòng cập nhật giỏ hàng.`,
    );
  }
}
export async function releaseStock(d, order) {
  if (order.stock_released) return;
  const allocations = await d.all(
    'SELECT a.*,b.product_id FROM stock_allocations a JOIN lo_thuoc b ON b.id=a.batch_id WHERE a.order_id=?',
    order.id,
  );
  for (const a of allocations) {
    if (order.stock_deducted) {
      await d.run(
        'UPDATE lo_thuoc SET quantity=quantity+? WHERE id=?',
        a.quantity,
        a.batch_id,
      );
      await d.insert('lich_su_ton_kho', {
        product_id: a.product_id,
        batch_id: a.batch_id,
        order_id: order.id,
        type: ['delivered', 'returned'].includes(order.status)
          ? 'return_restore'
          : 'cancel_restore',
        quantity: a.quantity,
        reason: ['delivered', 'returned'].includes(order.status)
          ? 'Nhập lại hàng trả đã kiểm tra'
          : 'Hoàn kho khi hủy đơn',
      });
    } else
      await d.run(
        'UPDATE lo_thuoc SET reserved=reserved-? WHERE id=?',
        a.quantity,
        a.batch_id,
      );
  }
  await d.update(
    'don_hang',
    {
      stock_released: 1,
    },
    order.id,
  );
}
export async function confirmStock(d, order, userId) {
  if (order.stock_deducted) return;
  let allocations = await d.all(
    'SELECT a.*,b.expires_at,b.product_id FROM stock_allocations a JOIN lo_thuoc b ON b.id=a.batch_id WHERE a.order_id=?',
    order.id,
  );
  if (!allocations.length || allocations.some((x) => x.expires_at <= today())) {
    for (const a of allocations)
      await d.run(
        'UPDATE lo_thuoc SET reserved=reserved-? WHERE id=?',
        a.quantity,
        a.batch_id,
      );
    await d.run('DELETE FROM stock_allocations WHERE order_id=?', order.id);
    await reserveStock(
      d,
      order.id,
      await d.all(
        'SELECT product_id AS "productId",name,quantity FROM chi_tiet_don_hang WHERE order_id=?',
        order.id,
      ),
    );
    allocations = await d.all(
      'SELECT a.*,b.product_id FROM stock_allocations a JOIN lo_thuoc b ON b.id=a.batch_id WHERE a.order_id=?',
      order.id,
    );
  }
  for (const a of allocations) {
    await d.run(
      'UPDATE lo_thuoc SET quantity=quantity-?,reserved=reserved-? WHERE id=?',
      a.quantity,
      a.quantity,
      a.batch_id,
    );
    await d.insert('lich_su_ton_kho', {
      product_id: a.product_id,
      batch_id: a.batch_id,
      order_id: order.id,
      user_id: userId,
      type: 'sale',
      quantity: -a.quantity,
      reason: 'Xác nhận đơn hàng, xuất kho FEFO',
    });
  }
  await d.update(
    'don_hang',
    {
      stock_deducted: 1,
    },
    order.id,
  );
}
export async function setOrderStatus(d, orderId, status, userId, note = '') {
  await d.update(
    'don_hang',
    {
      status,
      updated_at: now(),
    },
    orderId,
  );
  await d.insert('order_status_history', {
    order_id: orderId,
    status,
    user_id: userId || null,
    note,
    created_at: now(),
  });
}
export async function expireOrders(d) {
  const minutes = Number((await getSettings(d)).paymentTimeoutMinutes),
    cutoff = new Date(Date.now() - minutes * 60000).toISOString();
  let expiredCount = 0;
  for (const candidate of await d.all(
    "SELECT id FROM don_hang WHERE status='pending_payment' AND payment_status!='paid' AND COALESCE(updated_at,created_at)<?",
    cutoff,
  )) {
    await d.transaction(async () => {
      const order = await d.one(
        "SELECT * FROM don_hang WHERE id=? AND status='pending_payment' AND payment_status!='paid' AND COALESCE(updated_at,created_at)<?",
        candidate.id,
        cutoff,
      );
      if (!order) return;
      const card =
        order.payment_method === 'vnpay' &&
        (await activeVnpayAttempt(d, order.id));
      if (card && Date.parse(card.expires_at) + 5 * 60000 > Date.now()) return;
      await releaseStock(d, order);
      await setOrderStatus(
        d,
        order.id,
        'cancelled',
        null,
        'Quá thời hạn thanh toán theo cấu hình',
      );
      if (order.promotion_id)
        await d.run(
          'UPDATE khuyen_mai SET used_count=MAX(0,used_count-1) WHERE id=?',
          order.promotion_id,
        );
      await audit(d, null, 'order.expired', 'order', order.id);
      expiredCount++;
    });
  }
  return expiredCount;
}
const ORDER_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  pending_payment: ['cancelled'],
  pending_prescription: ['cancelled'],
  confirmed: ['packing', 'cancelled'],
  packing: ['shipping', 'cancelled'],
  shipping: ['delivered', 'delivery_failed'],
  delivery_failed: ['shipping', 'cancelled'],
  delivered: [],
  cancelled: [],
  returned: [],
};
const ORDER_STATUS_TEXT = {
  pending_prescription: 'Chờ duyệt đơn thuốc',
  pending_payment: 'Chờ thanh toán',
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói',
  shipping: 'Đang giao',
  delivery_failed: 'Giao thất bại',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  returned: 'Đã trả hàng',
};
const PAYMENT_STATUS_TEXT = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refund_pending: 'Chờ hoàn tiền',
  refunded: 'Đã hoàn tiền',
};
const PAYMENT_METHOD_TEXT = {
  cod: 'COD',
  bank_transfer: 'Chuyển khoản VietQR',
  vnpay: 'VNPay Sandbox',
  demo: 'Thanh toán mô phỏng',
};
const safeCsvCell = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  const str = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
};
const vnDay = (iso) =>
  iso
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(iso))
    : '';

async function transitionOrderStatus(
  d,
  o,
  { status, userId, note = '', collected = false, shippingCarrier, trackingCode },
) {
  assert(
    ORDER_TRANSITIONS[o.status]?.includes(status),
    409,
    'Không thể chuyển trạng thái đơn theo thứ tự này.',
  );
  const cleanNote = text(note, 1000);
  if (status === 'delivery_failed')
    assert(
      cleanNote.length >= 5,
      400,
      'Nhập lý do giao thất bại ít nhất 5 ký tự.',
    );
  if (status === 'confirmed') {
    const rx = await d.one(
      'SELECT status FROM don_thuoc WHERE order_id=?',
      o.id,
    );
    assert(
      !rx || rx.status === 'approved',
      409,
      'Đơn thuốc chưa được dược sĩ duyệt.',
    );
    assert(
      o.payment_method === 'cod' || o.payment_status === 'paid',
      409,
      'Đơn trực tuyến cần thanh toán thành công trước khi xác nhận.',
    );
  }
  if (status === 'delivered' && o.payment_method === 'cod')
    assert(
      collected === true,
      409,
      'Cần xác nhận đã thu đủ tiền COD trước khi giao thành công.',
    );

  const carrierText =
    shippingCarrier !== undefined ? text(shippingCarrier, 100) : undefined;
  const trackingText =
    trackingCode !== undefined ? text(trackingCode, 100) : undefined;

  await d.transaction(async () => {
    if (status === 'confirmed') await confirmStock(d, o, userId);
    if (status === 'cancelled') {
      await releaseStock(d, o);
      if (o.promotion_id)
        await d.run(
          'UPDATE khuyen_mai SET used_count=MAX(0,used_count-1) WHERE id=?',
          o.promotion_id,
        );
      for (const pendingCancel of await d.all(
        "SELECT id,reply FROM yeu_cau_huy_hoan WHERE order_id=? AND type='cancel' AND status='pending'",
        o.id,
      )) {
        await d.update(
          'yeu_cau_huy_hoan',
          {
            status: 'approved',
            handler_id: userId,
            reply:
              pendingCancel.reply ||
              cleanNote ||
              'Đã hủy đơn theo xử lý của nhân viên',
            updated_at: now(),
          },
          pendingCancel.id,
        );
      }
      if (o.payment_status === 'paid') {
        await d.update(
          'don_hang',
          {
            payment_status: 'refund_pending',
          },
          o.id,
        );
        if (
          !(await d.one(
            "SELECT id FROM yeu_cau_huy_hoan WHERE order_id=? AND type='refund' AND status!='rejected'",
            o.id,
          ))
        )
          await d.insert('yeu_cau_huy_hoan', {
            order_id: o.id,
            user_id: o.user_id,
            type: 'refund',
            reason: cleanNote || 'Đơn đã thanh toán bị hủy',
            status: 'approved',
            handler_id: userId,
          });
      }
    }
    if (status === 'delivered' && o.payment_method === 'cod') {
      await d.update(
        'don_hang',
        {
          payment_status: 'paid',
        },
        o.id,
      );
      await d.insert('giao_dich_thanh_toan', {
        order_id: o.id,
        reference: `COD-${randomUUID()}`,
        type: 'payment',
        provider: 'cod',
        amount: o.total,
        status: 'success',
      });
    }
    const fulfillmentPatch = {};
    if (carrierText !== undefined)
      fulfillmentPatch.shipping_carrier = carrierText;
    if (trackingText !== undefined) fulfillmentPatch.tracking_code = trackingText;
    if (Object.keys(fulfillmentPatch).length)
      await d.update('don_hang', fulfillmentPatch, o.id);

    const historyNote =
      cleanNote ||
      (status === 'shipping' && (carrierText || trackingText)
        ? `Bàn giao vận chuyển: ${[carrierText, trackingText].filter(Boolean).join(' · ')}`
        : '');
    await setOrderStatus(d, o.id, status, userId, historyNote);
    await audit(d, userId, 'order.status', 'order', o.id, {
      from: o.status,
      to: status,
      ...(carrierText ? { shippingCarrier: carrierText } : {}),
      ...(trackingText ? { trackingCode: trackingText } : {}),
    });
  });
}

async function applyApprovedCancelOrReturn(
  d,
  o,
  { type, userId, reply = '', sealed = false, storeFault = false, restock = false },
) {
  if (type === 'cancel') {
    assert(
      [
        'pending_prescription',
        'pending_payment',
        'pending',
        'confirmed',
        'packing',
        'delivery_failed',
      ].includes(o.status),
      409,
      'Đơn đã chuyển giao không thể hủy.',
    );
    await releaseStock(d, o);
    await setOrderStatus(
      d,
      o.id,
      'cancelled',
      userId,
      reply || 'Chấp nhận yêu cầu hủy',
    );
    if (o.promotion_id)
      await d.run(
        'UPDATE khuyen_mai SET used_count=MAX(0,used_count-1) WHERE id=?',
        o.promotion_id,
      );
  }
  if (type === 'return') {
    assert(o.status === 'delivered', 409, 'Đơn không còn đủ điều kiện đổi trả.');
    assert(
      sealed === true || storeFault === true,
      400,
      'Xác nhận sản phẩm đủ điều kiện đổi trả hoặc lỗi thuộc nhà thuốc.',
    );
    if (restock === true) {
      assert(
        sealed === true,
        400,
        'Cần xác nhận thuốc còn nguyên niêm phong và đảm bảo chất lượng để nhập lại kho.',
      );
      await releaseStock(d, o);
    }
    await setOrderStatus(
      d,
      o.id,
      'returned',
      userId,
      reply || 'Chấp nhận đổi trả',
    );
  }
  if (['cancel', 'return'].includes(type) && o.payment_status === 'paid') {
    await d.update(
      'don_hang',
      {
        payment_status: 'refund_pending',
      },
      o.id,
    );
  }
}

async function listFilteredAdminOrders(d, query = {}) {
  const settings = await getSettings(d);
  let list = await Promise.all(
    (await d.all('SELECT id FROM don_hang ORDER BY id DESC')).map(
      async (o) => await orderView(d, o.id, { includeInternal: true, settings }),
    ),
  );
  if (query.status) list = list.filter((o) => o.status === query.status);
  if (query.paymentMethod)
    list = list.filter((o) => o.paymentMethod === query.paymentMethod);
  if (query.paymentStatus)
    list = list.filter((o) => o.paymentStatus === query.paymentStatus);
  if (query.prescription === 'true')
    list = list.filter((o) => o.requiresPrescription);
  if (query.prescription === 'false')
    list = list.filter((o) => !o.requiresPrescription);
  if (query.hasPendingRequest === 'true')
    list = list.filter((o) =>
      o.requests?.some(
        (r) =>
          r.status === 'pending' ||
          (r.status === 'approved' &&
            o.paymentStatus === 'refund_pending' &&
            !r.refundAmount),
      ),
    );
  if (query.from) list = list.filter((o) => vnDay(o.createdAt) >= query.from);
  if (query.to) list = list.filter((o) => vnDay(o.createdAt) <= query.to);
  if (query.search) {
    const q = String(query.search).trim();
    list = list.filter((o) =>
      [
        o.code,
        o.userName,
        o.email,
        o.phone,
        o.trackingCode,
        o.shippingCarrier,
        o.address?.recipient,
        o.address?.phone,
        o.address?.line1,
        o.address?.city,
        ...(o.items || []).map((i) => i.name),
      ]
        .filter(Boolean)
        .some((field) => searchScore(field, q) > 0),
    );
  }
  return list;
}
export function installOrders(
  app,
  d,
  { auth, permission, addressValues },
  options,
) {
  const storage = options.storagePath || defaultStorage;
  const cloud = options.attachmentStorage;
  const skip = (req, res, next) => next();
  if (!cloud)
    mkdirSync(storage, {
      recursive: true,
      mode: 0o700,
    });
  const parsePrescription = cloud
    ? skip
    : multer({
        storage: multer.diskStorage({
          destination: storage,
          filename: (req, file, cb) => cb(null, randomUUID()),
        }),
        limits: {
          fileSize: 5 * 1024 * 1024,
          files: 1,
        },
        fileFilter: (req, file, cb) =>
          cb(null, prescriptionMimes.includes(file.mimetype)),
      }).single('file');
  const parseEvidence = cloud
    ? skip
    : multer({
        storage: multer.memoryStorage(),
        limits: {
          fileSize: 5 * 1024 * 1024,
          files: 1,
          fields: 2,
        },
        fileFilter: (req, file, cb) =>
          cb(null, imageMimes.includes(file.mimetype)),
      }).single('evidence');
  app.get('/api/cart', auth, async (req, res) =>
    res.json({
      data: await cartRows(d, req.user.id),
    }),
  );
  app.post(
    '/api/cart',
    auth,
    transactionJson(d, async (req, res) => {
      const product = await getProduct(d, req.body.productId);
      assert(product, 404, 'Sản phẩm không còn kinh doanh.');
      const quantity = positiveInt(req.body.quantity, 999);
      assert(quantity, 400, 'Số lượng phải là số nguyên từ 1 đến 999.');
      let cart = await d.one(
        'SELECT id FROM gio_hang WHERE user_id=?',
        req.user.id,
      );
      if (!cart)
        cart = {
          id: await d.insert('gio_hang', {
            user_id: req.user.id,
          }),
        };
      const old = await d.one(
          'SELECT * FROM chi_tiet_gio_hang WHERE cart_id=? AND product_id=?',
          cart.id,
          product.id,
        ),
        newQty = (old?.quantity || 0) + quantity;
      assert(newQty <= product.stock, 409, 'Số lượng vượt tồn kho có thể bán.');
      if (old)
        await d.update(
          'chi_tiet_gio_hang',
          {
            quantity: newQty,
          },
          old.id,
        );
      else
        await d.insert('chi_tiet_gio_hang', {
          cart_id: cart.id,
          product_id: product.id,
          quantity,
        });
      res.status(201).json({
        data: await cartRows(d, req.user.id),
      });
    }),
  );
  app.patch(
    '/api/cart/:id',
    auth,
    transactionJson(d, async (req, res) => {
      const row = await d.one(
        'SELECT c.* FROM chi_tiet_gio_hang c JOIN gio_hang g ON g.id=c.cart_id WHERE c.id=? AND g.user_id=?',
        req.params.id,
        req.user.id,
      );
      assert(row, 404, 'Không tìm thấy mục trong giỏ.');
      const qty = positiveInt(req.body.quantity, 999),
        p = await getProduct(d, row.product_id);
      assert(qty, 400, 'Số lượng không hợp lệ.');
      assert(p && qty <= p.stock, 409, 'Số lượng vượt tồn kho có thể bán.');
      await d.update(
        'chi_tiet_gio_hang',
        {
          quantity: qty,
        },
        row.id,
      );
      res.json({
        data: await cartRows(d, req.user.id),
      });
    }),
  );
  app.delete(
    '/api/cart/:id',
    auth,
    transactionJson(d, async (req, res) => {
      const row = await d.one(
        'SELECT c.id FROM chi_tiet_gio_hang c JOIN gio_hang g ON g.id=c.cart_id WHERE c.id=? AND g.user_id=?',
        req.params.id,
        req.user.id,
      );
      assert(row, 404, 'Không tìm thấy mục trong giỏ.');
      await d.run('DELETE FROM chi_tiet_gio_hang WHERE id=?', row.id);
      res.json({
        data: await cartRows(d, req.user.id),
      });
    }),
  );
  app.get('/api/promotions', async (req, res) =>
    res.json({
      data: (
        await d.all(
          'SELECT * FROM khuyen_mai WHERE active=1 AND start_date<=? AND end_date>=? AND used_count<usage_limit',
          today(),
          today(),
        )
      ).map(camel),
    }),
  );
  app.post('/api/promotions/validate', auth, async (req, res) => {
    const subtotal = Number(req.body.subtotal);
    assert(
      Number.isSafeInteger(subtotal) && subtotal >= 0,
      400,
      'Giá trị đơn hàng không hợp lệ.',
    );
    res.json({
      data: await validatePromotion(d, req.body.code, subtotal),
    });
  });
  app.post('/api/prescriptions', auth, parsePrescription, async (req, res) => {
    const attachment = cloud
      ? await verifyUpload(
          d,
          cloud,
          req.user.id,
          req.body?.uploadId,
          'prescription',
        )
      : null;
    if (!cloud) {
      assert(req.file, 400, 'Chọn tệp JPG, PNG hoặc PDF, tối đa 5 MB.');
      if (!matchesFile(req.file.mimetype, readFileSync(req.file.path))) {
        unlinkSync(req.file.path);
        fail(400, 'Nội dung tệp không đúng định dạng JPG, PNG hoặc PDF.');
      }
    }
    const fileName =
      attachment?.original_name ?? text(req.file.originalname, 200);
    const size = attachment?.size ?? req.file.size;
    let id;
    try {
      id = await d.transaction(async () => {
        if (attachment) await claimUpload(d, attachment);
        const id = await d.insert('don_thuoc', {
          user_id: req.user.id,
          file_name: fileName,
          storage_name: attachment?.id ?? req.file.filename,
          mime_type: attachment?.mime_type ?? req.file.mimetype,
          size,
          status: 'pending',
        });
        await audit(d, req.user.id, 'prescription.upload', 'prescription', id);
        return id;
      });
    } catch (error) {
      if (req.file) unlinkSync(req.file.path);
      throw error;
    }
    res.status(201).json({ data: { id, fileName, status: 'pending', size } });
  });
  app.post('/api/prescriptions/:id/analyze', auth, async (req, res) => {
    const prescription = await d.one('SELECT * FROM don_thuoc WHERE id=? AND user_id=?', req.params.id, req.user.id);
    assert(prescription && validPrescriptionName(prescription.storage_name), 404, 'Không tìm thấy đơn thuốc của bạn.');
    assert(req.body.consent === true, 400, 'Xác nhận gửi ảnh đơn đến Gemini để nhận diện.');
    await d.transaction(async () => {
      const { count } = await d.one("SELECT COUNT(*) AS count FROM nhat_ky_hoat_dong WHERE user_id=? AND action='prescription.analyze' AND created_at>?", req.user.id, new Date(Date.now() - 60000).toISOString());
      assert(count < 6, 429, 'Vui lòng chờ một phút trước khi đọc thêm đơn thuốc.');
      await audit(d, req.user.id, 'prescription.analyze', 'prescription', prescription.id);
    });
    const buffer = cloud ? await cloud.read(prescription.storage_name) : readFileSync(path.join(storage, prescription.storage_name));
    const medicines = await readPrescription(buffer, prescription.mime_type);
    res.json({ data: { medicines, results: await prescriptionMatches(d, medicines) } });
  });
  app.post('/api/prescriptions/:id/matches', auth, async (req, res) => {
    assert(await d.one('SELECT id FROM don_thuoc WHERE id=? AND user_id=?', req.params.id, req.user.id), 404, 'Không tìm thấy đơn thuốc của bạn.');
    const medicines = medicineRows(req.body.medicines);
    res.json({ data: { medicines, results: await prescriptionMatches(d, medicines) } });
  });
  app.get('/api/prescriptions/:id/file', auth, async (req, res) => {
    const p = await d.one('SELECT * FROM don_thuoc WHERE id=?', req.params.id);
    assert(
      p &&
        validPrescriptionName(p.storage_name) &&
        prescriptionMimes.includes(p.mime_type) &&
        (p.user_id === req.user.id ||
          req.user.permissions.includes('prescriptions')),
      404,
      'Không tìm thấy đơn thuốc hoặc không có quyền truy cập.',
    );
    if (cloud) {
      res.set({
        'Referrer-Policy': 'no-referrer',
        'X-Frame-Options': 'SAMEORIGIN',
      });
      return res.redirect(302, await cloud.signedRead(p.storage_name));
    }
    res.set({
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': 'no-store',
      'Content-Type': p.mime_type,
      'Content-Disposition': `inline; filename="prescription-${p.id}${p.mime_type === 'application/pdf' ? '.pdf' : p.mime_type === 'image/png' ? '.png' : '.jpg'}"`,
    });
    res.sendFile(p.storage_name, { root: storage, dotfiles: 'deny' });
  });
  app.get('/api/prescriptions', auth, async (req, res) =>
    res.json({
      data: (
        await d.all(
          'SELECT id,order_id,file_name,mime_type,size,status,note,reviewed_at,created_at FROM don_thuoc WHERE user_id=? ORDER BY id DESC',
          req.user.id,
        )
      ).map(camel),
    }),
  );
  app.post('/api/orders', auth, async (req, res) => {
    const method = req.body.paymentMethod || 'cod';
    assert(
      ['cod', 'demo', 'vnpay', 'bank_transfer'].includes(method),
      400,
      'Phương thức thanh toán không được hỗ trợ.',
    );
    assert(
      method !== 'demo' || options.demo,
      400,
      'Cổng thanh toán mô phỏng chỉ dùng trong chế độ demo.',
    );
    assert(
      method !== 'vnpay' || options.vnpay,
      400,
      'Chưa cấu hình VNPay Sandbox.',
    );
    assert(method !== 'bank_transfer' || options.bankTransfer, 400, 'Chưa cấu hình tài khoản nhận chuyển khoản.');
    let address;
    if (req.body.addressId) {
      const a = await d.one(
        'SELECT * FROM dia_chi_giao_hang WHERE id=? AND user_id=?',
        req.body.addressId,
        req.user.id,
      );
      assert(a, 400, 'Địa chỉ không hợp lệ.');
      address = camel(a);
    } else address = addressValues(req.body.address || {});
    // Normalize both stored and freshly supplied address fields before snapshot.
    address = {
      recipient: address.recipient,
      phone: address.phone,
      line1: address.line1,
      ward: address.ward,
      district: address.district,
      city: address.city,
    };
    const orderId = await d.transaction(async () => {
      const rows = await cartRows(d, req.user.id);
      assert(rows.length, 400, 'Giỏ hàng đang trống.');
      for (const r of rows)
        assert(
          r.product?.active &&
            r.product?.categoryActive &&
            r.quantity <= r.product.stock,
          409,
          `${r.product?.name || 'Sản phẩm'} không còn đủ tồn kho.`,
        );
      const requiresRx = rows.some((r) => r.product.prescriptionRequired);
      let rx = null;
      if (requiresRx) {
        rx = await d.one(
          'SELECT * FROM don_thuoc WHERE id=? AND user_id=? AND order_id IS NULL',
          Number(req.body.prescriptionId || 0),
          req.user.id,
        );
        assert(
          rx,
          400,
          'Giỏ hàng có thuốc kê đơn. Vui lòng tải đơn thuốc hợp lệ.',
        );
        assert(
          rx.status === 'pending',
          400,
          'Cần tải đơn thuốc mới để dược sĩ đối chiếu với giỏ hàng này.',
        );
      }
      const subtotal = rows.reduce(
          (n, r) => n + r.product.price * r.quantity,
          0,
        ),
        settings = await getSettings(d),
        shipping =
          subtotal >= Number(settings.freeShippingThreshold)
            ? 0
            : Number(settings.shippingFee);
      const promo = req.body.promotionCode
          ? await validatePromotion(d, req.body.promotionCode, subtotal)
          : null,
        discount = promo?.discount || 0;
      const status =
        requiresRx && rx.status !== 'approved'
          ? 'pending_prescription'
          : method !== 'cod'
            ? 'pending_payment'
            : 'pending';
      const id = await d.insert('don_hang', {
        user_id: req.user.id,
        code: `AT${new Date().getFullYear()}${Date.now().toString().slice(-8)}${randomUUID().slice(0, 4).toUpperCase()}`,
        status,
        payment_method: method,
        payment_status: 'unpaid',
        subtotal,
        shipping_fee: shipping,
        discount,
        total: subtotal + shipping - discount,
        address_json: JSON.stringify(address),
        promotion_id: promo?.id || null,
        note: text(req.body.note, 1000),
        created_at: now(),
      });
      for (const r of rows)
        await d.insert('chi_tiet_don_hang', {
          order_id: id,
          product_id: r.productId,
          name: r.product.name,
          unit: r.product.unit,
          image: r.product.image,
          price: r.product.price,
          quantity: r.quantity,
          prescription_required: r.product.prescriptionRequired ? 1 : 0,
        });
      await reserveStock(
        d,
        id,
        rows.map((r) => ({
          productId: r.productId,
          name: r.product.name,
          quantity: r.quantity,
        })),
      );
      if (rx)
        await d.update(
          'don_thuoc',
          {
            order_id: id,
          },
          rx.id,
        );
      if (promo)
        await d.run(
          'UPDATE khuyen_mai SET used_count=used_count+1 WHERE id=?',
          promo.id,
        );
      await d.run(
        'DELETE FROM chi_tiet_gio_hang WHERE cart_id=(SELECT id FROM gio_hang WHERE user_id=?)',
        req.user.id,
      );
      await d.insert('order_status_history', {
        order_id: id,
        status,
        user_id: req.user.id,
        note: 'Tiếp nhận đơn hàng',
      });
      await audit(d, req.user.id, 'order.create', 'order', id);
      return id;
    });
    res.status(201).json({
      data: await orderView(d, orderId),
    });
  });
  app.get('/api/orders', auth, async (req, res) =>
    res.json({
      data: await Promise.all(
        (
          await d.all(
            'SELECT id FROM don_hang WHERE user_id=? ORDER BY id DESC',
            req.user.id,
          )
        ).map(async (o) => await orderView(d, o.id)),
      ),
    }),
  );
  app.get('/api/orders/:id', auth, async (req, res) => {
    const order = await orderView(d, req.params.id);
    assert(
      order && order.userId === req.user.id,
      404,
      'Không tìm thấy đơn hàng.',
    );
    res.json({ data: order });
  });
  app.post(
    '/api/orders/:id/prescription',
    auth,
    transactionJson(d, async (req, res) => {
      const o = await d.one(
        'SELECT * FROM don_hang WHERE id=? AND user_id=?',
        req.params.id,
        req.user.id,
      );
      assert(
        o && o.status === 'pending_prescription',
        400,
        'Đơn hàng không ở trạng thái bổ sung đơn thuốc.',
      );
      const rx = await d.one(
        'SELECT * FROM don_thuoc WHERE id=? AND user_id=? AND order_id IS NULL',
        Number(req.body.prescriptionId),
        req.user.id,
      );
      assert(rx && rx.status === 'pending', 400, 'Đơn thuốc mới không hợp lệ.');
      await d.transaction(async () => {
        await d.run(
          'UPDATE don_thuoc SET order_id=NULL WHERE order_id=?',
          o.id,
        );
        await d.update(
          'don_thuoc',
          {
            order_id: o.id,
          },
          rx.id,
        );
        await audit(d, req.user.id, 'prescription.replace', 'order', o.id);
      });
      res.json({
        data: await orderView(d, o.id),
      });
    }),
  );
  app.post(
    '/api/orders/:id/payment',
    auth,
    transactionJson(d, async (req, res) => {
      assert(options.demo, 403, 'Thanh toán mô phỏng đã bị tắt.');
      const o = await d.one(
        'SELECT * FROM don_hang WHERE id=? AND user_id=?',
        req.params.id,
        req.user.id,
      );
      assert(
        o && o.payment_method === 'demo',
        400,
        'Đơn hàng không dùng thanh toán mô phỏng.',
      );
      assert(
        !['cancelled', 'returned'].includes(o.status),
        400,
        'Đơn hàng không còn nhận thanh toán.',
      );
      if (o.payment_status === 'paid')
        return res.json({
          data: await orderView(d, o.id),
        });
      const rx = await d.one(
        'SELECT status FROM don_thuoc WHERE order_id=?',
        o.id,
      );
      assert(
        !rx || rx.status === 'approved',
        409,
        'Đơn thuốc phải được dược sĩ duyệt trước khi thanh toán.',
      );
      assert(
        ['success', 'failed'].includes(req.body.result),
        400,
        'Kết quả mô phỏng không hợp lệ.',
      );
      await d.transaction(async () => {
        const ok = req.body.result === 'success';
        await d.insert('giao_dich_thanh_toan', {
          order_id: o.id,
          reference: `DEMO-${randomUUID()}`,
          type: 'payment',
          provider: 'demo',
          amount: o.total,
          status: ok ? 'success' : 'failed',
        });
        await d.update(
          'don_hang',
          {
            payment_status: ok ? 'paid' : 'failed',
            updated_at: now(),
          },
          o.id,
        );
        await setOrderStatus(
          d,
          o.id,
          ok ? 'pending' : 'pending_payment',
          req.user.id,
          ok
            ? 'Thanh toán mô phỏng thành công (không thu tiền thật)'
            : 'Thanh toán mô phỏng thất bại',
        );
        await audit(
          d,
          req.user.id,
          'payment.demo',
          'order',
          o.id,
          req.body.result,
        );
      });
      res.json({
        data: await orderView(d, o.id),
      });
    }),
  );
  app.post(
    '/api/orders/:id/rx-adjustment',
    auth,
    transactionJson(d, async (req, res) => {
      const o = await d.one(
        'SELECT * FROM don_hang WHERE id=? AND user_id=?',
        req.params.id,
        req.user.id,
      );
      assert(
        o?.status === 'pending_prescription',
        409,
        'Đơn không còn ở bước điều chỉnh thuốc kê đơn.',
      );
      const rx = await d.one('SELECT * FROM don_thuoc WHERE order_id=?', o.id);
      const keepApproved = req.body.mode === 'approved_only';
      assert(
        rx &&
          ((keepApproved && rx.status === 'partial') ||
            req.body.mode === 'remove_all'),
        400,
        'Lựa chọn điều chỉnh không hợp lệ.',
      );
      const approved = keepApproved ? JSON.parse(rx.approved_product_ids) : [];
      const items = await d.all(
        'SELECT * FROM chi_tiet_don_hang WHERE order_id=?',
        o.id,
      );
      const kept = items.filter(
        (item) =>
          !item.prescription_required || approved.includes(item.product_id),
      );
      assert(
        kept.length,
        409,
        'Đơn không còn sản phẩm. Vui lòng gửi yêu cầu hủy đơn.',
      );
      assert(
        kept.length < items.length,
        400,
        'Không có thuốc cần bỏ khỏi đơn.',
      );
      const settings = await getSettings(d);
      const subtotal = kept.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const shippingFee =
        subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
      let promotion = null;
      if (o.promotion_id) {
        const code = (
          await d.one('SELECT code FROM khuyen_mai WHERE id=?', o.promotion_id)
        )?.code;
        if (code)
          try {
            promotion = await validatePromotion(d, code, subtotal, true);
          } catch (error) {
            if (error.status !== 400) throw error;
          }
      }
      const discount = promotion?.discount || 0;
      await d.transaction(async () => {
        await releaseStock(d, o);
        await d.run('DELETE FROM stock_allocations WHERE order_id=?', o.id);
        for (const item of items)
          if (!kept.includes(item))
            await d.run('DELETE FROM chi_tiet_don_hang WHERE id=?', item.id);
        await reserveStock(
          d,
          o.id,
          kept.map((item) => ({
            productId: item.product_id,
            quantity: item.quantity,
            name: item.name,
          })),
        );
        if (o.promotion_id && !promotion)
          await d.run(
            'UPDATE khuyen_mai SET used_count=MAX(0,used_count-1) WHERE id=?',
            o.promotion_id,
          );
        await d.update(
          'don_thuoc',
          keepApproved
            ? {
                status: 'approved',
              }
            : {
                order_id: null,
              },
          rx.id,
        );
        await d.update(
          'don_hang',
          {
            stock_released: 0,
            subtotal,
            shipping_fee: shippingFee,
            discount,
            total: subtotal + shippingFee - discount,
            promotion_id: promotion?.id || null,
          },
          o.id,
        );
        await setOrderStatus(
          d,
          o.id,
          o.payment_method === 'cod' ? 'pending' : 'pending_payment',
          req.user.id,
          'Khách hàng xác nhận điều chỉnh thuốc kê đơn',
        );
        await audit(d, req.user.id, 'order.rx_adjustment', 'order', o.id, {
          kept: kept.map((item) => item.product_id),
          prescriptionId: rx.id,
        });
      });
      res.json({
        data: await orderView(d, o.id),
      });
    }),
  );
  app.post(
    '/api/orders/:id/payment-method',
    auth,
    transactionJson(d, async (req, res) => {
      const o = await d.one(
        'SELECT * FROM don_hang WHERE id=? AND user_id=?',
        req.params.id,
        req.user.id,
      );
      assert(
        o &&
          ['pending_payment', 'pending_prescription', 'pending'].includes(
            o.status,
          ) &&
          o.payment_status !== 'paid',
        400,
        'Không thể đổi phương thức thanh toán.',
      );
      assert(req.body.paymentMethod === 'cod', 400, 'Chỉ hỗ trợ đổi sang COD.');
      assert(
        !(await activeVnpayAttempt(d, o.id)),
        409,
        'Giao dịch VNPay đang chờ kết quả. Hãy chờ xác nhận trước khi đổi phương thức.',
      );
      await d.transaction(async () => {
        await d.update(
          'don_hang',
          {
            payment_method: 'cod',
            payment_status: 'unpaid',
          },
          o.id,
        );
        if (o.status === 'pending_payment')
          await setOrderStatus(
            d,
            o.id,
            'pending',
            req.user.id,
            'Chuyển sang COD',
          );
      });
      res.json({
        data: await orderView(d, o.id),
      });
    }),
  );
  installVnpayOrders(app, d, auth, options.vnpay, setOrderStatus);
  app.post(
    '/api/orders/:id/requests',
    auth,
    parseEvidence,
    async (req, res, next) => {
      if (cloud && req.body?.type === 'return')
        req.attachment = await verifyUpload(
          d,
          cloud,
          req.user.id,
          req.body.uploadId,
          'return',
        );
      next();
    },
    transactionJson(d, async (req, res) => {
      const o = await d.one(
        'SELECT * FROM don_hang WHERE id=? AND user_id=?',
        req.params.id,
        req.user.id,
      );
      assert(o, 404, 'Không tìm thấy đơn hàng.');
      const type = req.body.type,
        reason = text(req.body.reason, 2000);
      assert(
        ['cancel', 'return', 'refund'].includes(type) && reason.length >= 5,
        400,
        'Chọn loại yêu cầu và nhập lý do ít nhất 5 ký tự.',
      );
      assert(
        !(await d.one(
          "SELECT id FROM yeu_cau_huy_hoan WHERE order_id=? AND (status='pending' OR (status='approved' AND type=?))",
          o.id,
          type,
        )),
        409,
        'Đã có yêu cầu loại này đang chờ hoặc đã được chấp nhận.',
      );
      if (type === 'cancel')
        assert(
          [
            'pending_prescription',
            'pending_payment',
            'pending',
            'confirmed',
            'packing',
            'delivery_failed',
          ].includes(o.status),
          409,
          'Không thể hủy đơn đã giao cho đơn vị vận chuyển.',
        );
      if (type === 'return') {
        assert(
          o.status === 'delivered',
          409,
          'Chỉ gửi đổi trả sau khi nhận hàng.',
        );
        assert(
          req.attachment ||
            (req.file && matchesFile(req.file.mimetype, req.file.buffer)),
          400,
          'Đính kèm ảnh JPG hoặc PNG của sản phẩm để gửi đổi trả.',
        );
        const delivered = await d.one(
          "SELECT created_at FROM order_status_history WHERE order_id=? AND status='delivered' ORDER BY id DESC LIMIT 1",
          o.id,
        );
        assert(
          Date.now() -
            new Date(delivered?.created_at || o.created_at).getTime() <=
            Number((await getSettings(d)).returnWindowDays) * 86400000,
          409,
          'Đã quá thời hạn gửi yêu cầu đổi trả theo cấu hình.',
        );
      }
      if (type === 'refund')
        assert(
          ['cancelled', 'returned'].includes(o.status) &&
            ['paid', 'refund_pending'].includes(o.payment_status),
          409,
          'Đơn hàng chưa đủ điều kiện hoàn tiền.',
        );
      const autoCancel =
        type === 'cancel' &&
        ['pending_prescription', 'pending_payment', 'pending'].includes(
          o.status,
        ) &&
        ['unpaid', 'failed', 'pending'].includes(o.payment_status) &&
        !(await activeVnpayAttempt(d, o.id));
      const evidenceName =
        type === 'return' ? req.attachment?.id || randomUUID() : null;
      const evidencePath =
        evidenceName && !cloud ? path.join(storage, evidenceName) : null;
      if (evidencePath)
        writeFileSync(evidencePath, req.file.buffer, {
          mode: 0o600,
          flag: 'wx',
        });
      let id;
      try {
        id = await d.transaction(async () => {
          if (req.attachment) await claimUpload(d, req.attachment);
          const id = await d.insert('yeu_cau_huy_hoan', {
            order_id: o.id,
            user_id: req.user.id,
            type,
            reason,
            status: autoCancel ? 'approved' : 'pending',
            reply: autoCancel
              ? 'Đã hủy đơn chưa xác nhận và chưa thanh toán.'
              : '',
            evidence_storage_name: evidenceName,
            evidence_mime_type: evidenceName
              ? req.attachment?.mime_type || req.file.mimetype
              : null,
          });
          if (autoCancel) {
            await releaseStock(d, o);
            await setOrderStatus(d, o.id, 'cancelled', req.user.id, reason);
            if (o.promotion_id)
              await d.run(
                'UPDATE khuyen_mai SET used_count=MAX(0,used_count-1) WHERE id=?',
                o.promotion_id,
              );
          }
          await audit(
            d,
            req.user.id,
            autoCancel ? 'order.self_cancel' : 'order.request',
            'request',
            id,
            type,
          );
          return id;
        });
      } catch (error) {
        if (evidencePath) unlinkSync(evidencePath);
        throw error;
      }
      res.status(201).json({
        data: requestView(
          await d.one('SELECT * FROM yeu_cau_huy_hoan WHERE id=?', id),
        ),
      });
    }),
  );
  app.get(
    '/api/orders/:orderId/requests/:requestId/evidence',
    auth,
    async (req, res) => {
      const evidence = await d.one(
        'SELECT * FROM yeu_cau_huy_hoan WHERE order_id=? AND id=?',
        req.params.orderId,
        req.params.requestId,
      );
      assert(
        evidence &&
          (evidence.user_id === req.user.id ||
            req.user.permissions.includes('orders')) &&
          validPrescriptionName(evidence.evidence_storage_name) &&
          imageMimes.includes(evidence.evidence_mime_type),
        404,
        'Không tìm thấy ảnh đổi trả.',
      );
      if (cloud) {
        res.set('Referrer-Policy', 'no-referrer');
        return res.redirect(
          302,
          await cloud.signedRead(evidence.evidence_storage_name),
        );
      }
      res.set({
        'Content-Type': evidence.evidence_mime_type,
        'Content-Security-Policy': "default-src 'none'",
      });
      res.sendFile(evidence.evidence_storage_name, {
        root: storage,
        dotfiles: 'deny',
      });
    },
  );
  app.post('/api/reviews', auth, async (req, res) => {
    const o = await d.one(
      "SELECT * FROM don_hang WHERE id=? AND user_id=? AND status='delivered'",
      Number(req.body.orderId),
      req.user.id,
    );
    assert(o, 403, 'Chỉ đánh giá sản phẩm của đơn hàng đã giao.');
    assert(
      await d.one(
        'SELECT id FROM chi_tiet_don_hang WHERE order_id=? AND product_id=?',
        o.id,
        Number(req.body.productId),
      ),
      400,
      'Sản phẩm không có trong đơn hàng.',
    );
    const rating = positiveInt(req.body.rating, 5),
      comment = text(req.body.comment, 2000);
    assert(
      rating && comment.length >= 5,
      400,
      'Chọn 1–5 sao và nhập nhận xét ít nhất 5 ký tự.',
    );
    assert(
      !(await d.one(
        'SELECT id FROM danh_gia WHERE order_id=? AND product_id=? AND user_id=?',
        o.id,
        Number(req.body.productId),
        req.user.id,
      )),
      409,
      'Bạn đã đánh giá sản phẩm này trong đơn hàng.',
    );
    const id = await d.insert('danh_gia', {
      order_id: o.id,
      product_id: Number(req.body.productId),
      user_id: req.user.id,
      rating,
      comment,
    });
    res.status(201).json({
      data: camel(await d.one('SELECT * FROM danh_gia WHERE id=?', id)),
    });
  });
  app.get('/api/admin/orders', permission('orders'), async (req, res) => {
    res.json({ data: await listFilteredAdminOrders(d, req.query) });
  });
  app.get('/api/admin/orders/lookup', permission('orders'), async (req, res) => {
    const [customers, addresses, products, promotions, settings] =
      await Promise.all([
        d.all(
          `SELECT u.id,u.name,u.email,u.phone
           FROM nguoi_dung u
           JOIN khach_hang k ON k.id=u.id
           WHERE u.active=1
           ORDER BY u.name`,
        ),
        d.all(
          'SELECT * FROM dia_chi_giao_hang ORDER BY is_default DESC, id',
        ),
        productList(d, { inStock: 'true' }),
        d.all(
          'SELECT * FROM khuyen_mai WHERE active=1 AND start_date<=? AND end_date>=? AND used_count<usage_limit ORDER BY id DESC',
          today(),
          today(),
        ),
        getSettings(d),
      ]);
    const addrMap = new Map();
    for (const a of addresses) {
      const list = addrMap.get(a.user_id) || [];
      list.push(camel(a));
      addrMap.set(a.user_id, list);
    }
    res.json({
      data: {
        customers: customers.map((c) => ({
          ...camel(c),
          addresses: addrMap.get(c.id) || [],
        })),
        products: products.filter((p) => !p.prescriptionRequired),
        promotions: promotions.map(camel),
        settings: {
          shippingFee: Number(settings.shippingFee),
          freeShippingThreshold: Number(settings.freeShippingThreshold),
        },
      },
    });
  });
  app.get('/api/admin/orders/export', permission('orders'), async (req, res) => {
    const orders = await listFilteredAdminOrders(d, req.query);
    const headers = [
      'Mã đơn',
      'Ngày tạo',
      'Khách hàng',
      'SĐT tài khoản',
      'Người nhận',
      'SĐT nhận',
      'Địa chỉ giao',
      'SL sản phẩm',
      'Chi tiết sản phẩm',
      'Tiền hàng',
      'Phí giao hàng',
      'Giảm giá',
      'Mã khuyến mãi',
      'Tổng tiền',
      'Phương thức TT',
      'Trạng thái TT',
      'Trạng thái đơn',
      'Đơn vị vận chuyển',
      'Mã vận đơn',
      'Ghi chú khách',
    ];
    const rows = orders.map((o) => {
      const addr = o.address || {};
      const fullAddress = [addr.line1, addr.ward, addr.district, addr.city]
        .filter(Boolean)
        .join(', ');
      const itemsText = (o.items || [])
        .map((i) => `${i.name} x${i.quantity}`)
        .join('; ');
      return [
        o.code,
        o.createdAt,
        o.userName || o.customerName || '',
        o.phone || '',
        addr.recipient || '',
        addr.phone || '',
        fullAddress,
        Number(o.itemCount || 0),
        itemsText,
        Number(o.subtotal || 0),
        Number(o.shippingFee || 0),
        Number(o.discount || 0),
        o.promotionCode || '',
        Number(o.total || 0),
        PAYMENT_METHOD_TEXT[o.paymentMethod] || o.paymentMethod,
        PAYMENT_STATUS_TEXT[o.paymentStatus] || o.paymentStatus,
        ORDER_STATUS_TEXT[o.status] || o.status,
        o.shippingCarrier || '',
        o.trackingCode || '',
        o.note || '',
      ];
    });
    const csv =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map(safeCsvCell).join(','))
        .join('\r\n');
    await audit(d, req.user.id, 'order.export', 'order', '', {
      count: orders.length,
    });
    res
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="antam-orders-${today()}.csv"`,
      })
      .send(csv);
  });
  app.post(
    '/api/admin/orders',
    permission('orders'),
    transactionJson(d, async (req, res) => {
      const customerId = positiveInt(req.body.userId);
      assert(customerId, 400, 'Chọn khách hàng hợp lệ.');
      const customer = await d.one(
        'SELECT id, name, active FROM nguoi_dung WHERE id=?',
        customerId,
      );
      assert(customer && customer.active, 404, 'Tài khoản khách hàng không hoạt động.');
      const method = req.body.paymentMethod || 'cod';
      assert(
        ['cod', 'demo', 'bank_transfer'].includes(method),
        400,
        'Phương thức thanh toán không được hỗ trợ khi tạo đơn hộ.',
      );
      assert(
        method !== 'demo' || options.demo,
        400,
        'Thanh toán mô phỏng chỉ dùng trong chế độ demo.',
      );
      assert(
        method !== 'bank_transfer' || options.bankTransfer,
        400,
        'Chưa cấu hình tài khoản nhận chuyển khoản VietQR.',
      );
      let address;
      if (req.body.addressId) {
        const a = await d.one(
          'SELECT * FROM dia_chi_giao_hang WHERE id=? AND user_id=?',
          Number(req.body.addressId),
          customer.id,
        );
        assert(a, 400, 'Địa chỉ giao hàng không thuộc khách hàng này.');
        address = camel(a);
      } else address = addressValues(req.body.address || {});
      address = {
        recipient: address.recipient,
        phone: address.phone,
        line1: address.line1,
        ward: address.ward,
        district: address.district,
        city: address.city,
      };
      const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
      assert(
        rawItems.length > 0 && rawItems.length <= 50,
        400,
        'Đơn hàng cần từ 1 đến 50 dòng sản phẩm.',
      );
      const merged = new Map();
      for (const row of rawItems) {
        const pid = positiveInt(row.productId);
        const qty = positiveInt(row.quantity, 999);
        assert(pid && qty, 400, 'Sản phẩm hoặc số lượng không hợp lệ.');
        merged.set(pid, (merged.get(pid) || 0) + qty);
      }
      const resolvedItems = [];
      for (const [productId, quantity] of merged.entries()) {
        const product = await getProduct(d, productId);
        assert(
          product && product.active && product.categoryActive,
          404,
          'Có sản phẩm không tồn tại hoặc đã ngừng kinh doanh.',
        );
        assert(
          !product.prescriptionRequired,
          400,
          `${product.name} là thuốc kê đơn. Khách hàng cần tải đơn thuốc để dược sĩ kiểm duyệt.`,
        );
        assert(
          quantity <= product.stock,
          409,
          `${product.name} chỉ còn ${product.stock} ${product.unit} khả dụng.`,
        );
        resolvedItems.push({ productId, quantity, product });
      }
      const orderId = await d.transaction(async () => {
        const subtotal = resolvedItems.reduce(
          (sum, entry) => sum + entry.product.price * entry.quantity,
          0,
        );
        const settings = await getSettings(d);
        const shipping =
          subtotal >= Number(settings.freeShippingThreshold)
            ? 0
            : Number(settings.shippingFee);
        const promo = req.body.promotionCode
          ? await validatePromotion(d, req.body.promotionCode, subtotal)
          : null;
        const discount = promo?.discount || 0;
        const initialStatus = method === 'cod' ? 'pending' : 'pending_payment';
        const id = await d.insert('don_hang', {
          user_id: customer.id,
          code: `AT${new Date().getFullYear()}${Date.now().toString().slice(-8)}${randomUUID().slice(0, 4).toUpperCase()}`,
          status: initialStatus,
          payment_method: method,
          payment_status: 'unpaid',
          subtotal,
          shipping_fee: shipping,
          discount,
          total: subtotal + shipping - discount,
          address_json: JSON.stringify(address),
          promotion_id: promo?.id || null,
          note: text(req.body.note, 1000),
          shipping_carrier: text(req.body.shippingCarrier, 100),
          internal_note: text(req.body.internalNote, 2000),
          created_at: now(),
          updated_at: now(),
        });
        for (const entry of resolvedItems)
          await d.insert('chi_tiet_don_hang', {
            order_id: id,
            product_id: entry.productId,
            name: entry.product.name,
            unit: entry.product.unit,
            image: entry.product.image,
            price: entry.product.price,
            quantity: entry.quantity,
            prescription_required: 0,
          });
        await reserveStock(
          d,
          id,
          resolvedItems.map((entry) => ({
            productId: entry.productId,
            name: entry.product.name,
            quantity: entry.quantity,
          })),
        );
        if (promo)
          await d.run(
            'UPDATE khuyen_mai SET used_count=used_count+1 WHERE id=?',
            promo.id,
          );
        await d.insert('order_status_history', {
          order_id: id,
          status: initialStatus,
          user_id: req.user.id,
          note: `Tạo đơn hộ khách bởi ${req.user.name}`,
          created_at: now(),
        });
        await audit(d, req.user.id, 'order.admin_create', 'order', id, {
          customerId: customer.id,
          paymentMethod: method,
        });
        if (req.body.autoConfirm === true && method === 'cod') {
          const createdOrder = await d.one('SELECT * FROM don_hang WHERE id=?', id);
          await confirmStock(d, createdOrder, req.user.id);
          await setOrderStatus(
            d,
            id,
            'confirmed',
            req.user.id,
            'Xác nhận ngay khi tạo đơn COD',
          );
        }
        return id;
      });
      res.status(201).json({
        data: await orderView(d, orderId, { includeInternal: true }),
      });
    }),
  );
  app.post(
    '/api/admin/orders/bulk-status',
    permission('orders'),
    transactionJson(d, async (req, res) => {
      const ids = Array.isArray(req.body.orderIds)
        ? [...new Set(req.body.orderIds.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))]
        : [];
      assert(ids.length > 0 && ids.length <= 50, 400, 'Chọn từ 1 đến 50 đơn hàng.');
      const targetStatus = req.body.status;
      assert(
        Object.hasOwn(ORDER_TRANSITIONS, targetStatus),
        400,
        'Trạng thái đích không hợp lệ.',
      );
      const updated = [];
      const failed = [];
      for (const orderId of ids) {
        const o = await d.one('SELECT * FROM don_hang WHERE id=?', orderId);
        if (!o) {
          failed.push({ id: orderId, code: `#${orderId}`, error: 'Không tìm thấy đơn.' });
          continue;
        }
        try {
          await transitionOrderStatus(d, o, {
            status: targetStatus,
            userId: req.user.id,
            note: req.body.note,
            collected: req.body.collected === true,
            shippingCarrier: req.body.shippingCarrier,
          });
          updated.push(o.id);
        } catch (err) {
          failed.push({ id: o.id, code: o.code, error: err.message });
        }
      }
      res.json({ data: { updated, failed } });
    }),
  );
  app.post(
    '/api/admin/orders/expire-overdue',
    permission('orders'),
    transactionJson(d, async (req, res) => {
      const expiredCount = await expireOrders(d);
      res.json({ data: { expiredCount } });
    }),
  );
  app.get('/api/admin/orders/:id', permission('orders'), async (req, res) => {
    const o = await orderView(d, req.params.id, { includeInternal: true });
    assert(o, 404, 'Không tìm thấy đơn.');
    res.json({ data: o });
  });
  app.patch(
    '/api/admin/orders/:id/status',
    permission('orders'),
    transactionJson(d, async (req, res) => {
      const o = await d.one('SELECT * FROM don_hang WHERE id=?', req.params.id);
      assert(o, 404, 'Không tìm thấy đơn.');
      await transitionOrderStatus(d, o, {
        status: req.body.status,
        userId: req.user.id,
        note: req.body.note,
        collected: req.body.collected === true,
        shippingCarrier: req.body.shippingCarrier,
        trackingCode: req.body.trackingCode,
      });
      res.json({
        data: await orderView(d, o.id, { includeInternal: true }),
      });
    }),
  );
  app.patch(
    '/api/admin/orders/:id/fulfillment',
    permission('orders'),
    transactionJson(d, async (req, res) => {
      const o = await d.one('SELECT * FROM don_hang WHERE id=?', req.params.id);
      assert(o, 404, 'Không tìm thấy đơn.');
      const patch = { updated_at: now() };
      if (req.body.shippingCarrier !== undefined)
        patch.shipping_carrier = text(req.body.shippingCarrier, 100);
      if (req.body.trackingCode !== undefined)
        patch.tracking_code = text(req.body.trackingCode, 100);
      if (req.body.internalNote !== undefined)
        patch.internal_note = text(req.body.internalNote, 2000);
      if (req.body.address !== undefined) {
        assert(
          ['pending_prescription', 'pending_payment', 'pending', 'confirmed'].includes(
            o.status,
          ),
          409,
          'Chỉ cập nhật địa chỉ giao trước khi đóng gói đơn hàng.',
        );
        const normalized = addressValues(req.body.address || {});
        patch.address_json = JSON.stringify({
          recipient: normalized.recipient,
          phone: normalized.phone,
          line1: normalized.line1,
          ward: normalized.ward,
          district: normalized.district,
          city: normalized.city,
        });
      }
      await d.transaction(async () => {
        await d.update('don_hang', patch, o.id);
        await audit(d, req.user.id, 'order.fulfillment', 'order', o.id, {
          shippingCarrier: patch.shipping_carrier,
          trackingCode: patch.tracking_code,
          addressUpdated: req.body.address !== undefined,
          internalNoteUpdated: req.body.internalNote !== undefined,
        });
      });
      res.json({
        data: await orderView(d, o.id, { includeInternal: true }),
      });
    }),
  );
  app.post(
    '/api/admin/orders/:id/expire',
    permission('orders'),
    transactionJson(d, async (req, res) => {
      const o = await d.one('SELECT * FROM don_hang WHERE id=?', req.params.id);
      assert(o, 404, 'Không tìm thấy đơn.');
      assert(
        o.status === 'pending_payment' && o.payment_status !== 'paid',
        409,
        'Đơn hàng không ở trạng thái chờ thanh toán.',
      );
      const card =
        o.payment_method === 'vnpay' && (await activeVnpayAttempt(d, o.id));
      assert(
        !(card && Date.parse(card.expires_at) + 5 * 60000 > Date.now()),
        409,
        'Giao dịch VNPay đang trong thời gian chờ đối soát, chưa thể hủy.',
      );
      await d.transaction(async () => {
        await releaseStock(d, o);
        await setOrderStatus(
          d,
          o.id,
          'cancelled',
          req.user.id,
          text(req.body.note, 1000) || 'Hủy đơn quá hạn thanh toán',
        );
        if (o.promotion_id)
          await d.run(
            'UPDATE khuyen_mai SET used_count=MAX(0,used_count-1) WHERE id=?',
            o.promotion_id,
          );
        await audit(d, req.user.id, 'order.expire_manual', 'order', o.id);
      });
      res.json({
        data: await orderView(d, o.id, { includeInternal: true }),
      });
    }),
  );
  app.post(
    '/api/admin/orders/:id/requests',
    permission('orders'),
    transactionJson(d, async (req, res) => {
      const o = await d.one('SELECT * FROM don_hang WHERE id=?', req.params.id);
      assert(o, 404, 'Không tìm thấy đơn.');
      const type = req.body.type;
      const reason = text(req.body.reason, 2000);
      const reply = text(req.body.reply, 2000);
      assert(
        ['cancel', 'return'].includes(type) && reason.length >= 5,
        400,
        'Chọn loại xử lý (hủy hoặc đổi trả) và nhập lý do ít nhất 5 ký tự.',
      );
      assert(
        !(await d.one(
          "SELECT id FROM yeu_cau_huy_hoan WHERE order_id=? AND (status='pending' OR (status='approved' AND type=?))",
          o.id,
          type,
        )),
        409,
        'Đơn đã có yêu cầu loại này đang chờ hoặc đã được chấp nhận.',
      );
      if (type === 'return') {
        assert(o.status === 'delivered', 409, 'Chỉ ghi nhận đổi trả cho đơn đã giao.');
        const delivered = await d.one(
          "SELECT created_at FROM order_status_history WHERE order_id=? AND status='delivered' ORDER BY id DESC LIMIT 1",
          o.id,
        );
        assert(
          Date.now() -
            new Date(delivered?.created_at || o.created_at).getTime() <=
            Number((await getSettings(d)).returnWindowDays) * 86400000,
          409,
          'Đã quá thời hạn đổi trả theo cấu hình nhà thuốc.',
        );
      }
      await d.transaction(async () => {
        await applyApprovedCancelOrReturn(d, o, {
          type,
          userId: req.user.id,
          reply: reply || reason,
          sealed: req.body.sealed === true,
          storeFault: req.body.storeFault === true,
          restock: req.body.restock === true,
        });
        const id = await d.insert('yeu_cau_huy_hoan', {
          order_id: o.id,
          user_id: o.user_id,
          type,
          reason,
          status: 'approved',
          reply: reply || reason,
          handler_id: req.user.id,
          restock: req.body.restock ? 1 : 0,
          updated_at: now(),
        });
        if (type === 'return') {
          const restockedNow = req.body.restock === true;
          await d.insert('hang_tra_ve', {
            request_id: id,
            order_id: o.id,
            status: restockedNow ? 'restocked' : 'awaiting',
            note: restockedNow ? 'Nhập lại kho ngay khi ghi nhận tại quầy.' : '',
            handler_id: req.user.id,
            received_at: restockedNow ? now() : null,
            inspected_at: restockedNow ? now() : null,
            updated_at: now(),
          });
        }
        await audit(d, req.user.id, 'order.admin_request', 'request', id, {
          orderId: o.id,
          type,
          restock: !!req.body.restock,
        });
      });
      res.status(201).json({
        data: await orderView(d, o.id, { includeInternal: true }),
      });
    }),
  );
  app.get(
    '/api/admin/prescriptions',
    permission('prescriptions'),
    async (req, res) =>
      res.json({
        data: await Promise.all(
          (
            await d.all(
              `SELECT p.id,p.user_id,p.order_id,p.file_name,p.mime_type,p.size,p.status,p.note,p.approved_product_ids,
                p.reviewer_id,p.reviewed_at,p.created_at,u.name user_name,u.phone user_phone,u.email user_email,
                r.name reviewer_name,o.code order_code,o.status order_status,o.total order_total
               FROM don_thuoc p
               JOIN nguoi_dung u ON u.id=p.user_id
               LEFT JOIN nguoi_dung r ON r.id=p.reviewer_id
               JOIN don_hang o ON o.id=p.order_id
               ORDER BY p.id DESC`,
            )
          ).map(async (row) => {
            let approvedProductIds = [];
            try {
              approvedProductIds = row.approved_product_ids
                ? JSON.parse(row.approved_product_ids)
                : [];
            } catch {
              approvedProductIds = [];
            }
            const { approved_product_ids, ...rest } = row;
            return {
              ...camel(rest),
              approvedProductIds: Array.isArray(approvedProductIds)
                ? approvedProductIds.map(Number)
                : [],
              items: (
                await d.all(
                  'SELECT product_id,name,quantity,unit FROM chi_tiet_don_hang WHERE order_id=? AND prescription_required=1',
                  row.order_id,
                )
              ).map(camel),
            };
          }),
        ),
      }),
  );
  app.patch(
    '/api/admin/prescriptions/:id',
    permission('prescriptions'),
    transactionJson(d, async (req, res) => {
      const p = await d.one(
        'SELECT * FROM don_thuoc WHERE id=?',
        req.params.id,
      );
      assert(p, 404, 'Không tìm thấy đơn thuốc.');
      assert(p.status === 'pending', 409, 'Đơn thuốc đã được xử lý.');
      assert(
        ['approved', 'rejected', 'partial'].includes(req.body.status),
        400,
        'Trạng thái kiểm duyệt không hợp lệ.',
      );
      assert(
        req.body.status === 'approved' || text(req.body.note, 2000).length >= 5,
        400,
        'Cần ghi lý do từ chối ít nhất 5 ký tự.',
      );
      const o = p.order_id
        ? await d.one('SELECT * FROM don_hang WHERE id=?', p.order_id)
        : null;
      assert(
        o && o.status === 'pending_prescription',
        409,
        'Chỉ duyệt đơn thuốc đã gắn với đơn hàng đang chờ kiểm duyệt để đối chiếu đúng sản phẩm.',
      );
      let approved = null;
      if (req.body.status === 'partial') {
        const products = (
          await d.all(
            'SELECT product_id FROM chi_tiet_don_hang WHERE order_id=? AND prescription_required=1',
            o.id,
          )
        ).map((r) => r.product_id);
        const selected = Array.isArray(req.body.productIds)
          ? [...new Set(req.body.productIds.map(Number))]
          : [];
        assert(
          selected.length > 0 &&
            selected.length < products.length &&
            selected.every((id) => products.includes(id)),
          400,
          'Chọn một phần các thuốc kê đơn đã đối chiếu.',
        );
        approved = JSON.stringify(selected);
      }
      await d.transaction(async () => {
        await d.update(
          'don_thuoc',
          {
            status: req.body.status,
            approved_product_ids: approved,
            note: text(req.body.note, 2000),
            reviewer_id: req.user.id,
            reviewed_at: now(),
          },
          p.id,
        );
        if (o && req.body.status === 'approved')
          await setOrderStatus(
            d,
            o.id,
            o.payment_method === 'cod' ? 'pending' : 'pending_payment',
            req.user.id,
            'Dược sĩ đã duyệt đơn thuốc',
          );
        await audit(
          d,
          req.user.id,
          'prescription.review',
          'prescription',
          p.id,
          {
            status: req.body.status,
            note: text(req.body.note, 2000),
          },
        );
      });
      res.json({
        data: camel(
          await d.one(
            'SELECT id,order_id,user_id,file_name,status,note,reviewed_at,created_at FROM don_thuoc WHERE id=?',
            p.id,
          ),
        ),
      });
    }),
  );
  app.get('/api/admin/requests', permission('orders'), async (req, res) =>
    res.json({
      data: (
        await d.all(
          `SELECT r.*,o.code order_code,o.status order_status,o.payment_status,o.payment_method,o.total,o.updated_at order_updated_at,
            u.name user_name,u.phone user_phone,u.email user_email,h.name handler_name,g.status return_goods_status
           FROM yeu_cau_huy_hoan r
           JOIN don_hang o ON o.id=r.order_id
           JOIN nguoi_dung u ON u.id=r.user_id
           LEFT JOIN nguoi_dung h ON h.id=r.handler_id
           LEFT JOIN hang_tra_ve g ON g.request_id=r.id
           ORDER BY r.id DESC`,
        )
      ).map(requestView),
    }),
  );
  app.patch(
    '/api/admin/requests/:id',
    permission('orders'),
    transactionJson(d, async (req, res) => {
      const r = await d.one(
        'SELECT * FROM yeu_cau_huy_hoan WHERE id=?',
        req.params.id,
      );
      assert(r, 404, 'Không tìm thấy yêu cầu.');
      assert(r.status === 'pending', 409, 'Yêu cầu đã được xử lý.');
      const status = req.body.status,
        reply = text(req.body.reply || req.body.note, 2000);
      assert(
        ['approved', 'rejected'].includes(status),
        400,
        'Trạng thái không hợp lệ.',
      );
      assert(
        status !== 'rejected' || reply.length >= 5,
        400,
        'Vui lòng nhập lý do từ chối.',
      );
      const o = await d.one('SELECT * FROM don_hang WHERE id=?', r.order_id);
      await d.transaction(async () => {
        if (status === 'approved') {
          await applyApprovedCancelOrReturn(d, o, {
            type: r.type,
            userId: req.user.id,
            reply,
            sealed: req.body.sealed === true,
            storeFault: req.body.storeFault === true,
            restock: req.body.restock === true,
          });
        }
        await d.update(
          'yeu_cau_huy_hoan',
          {
            status,
            reply,
            handler_id: req.user.id,
            restock: req.body.restock ? 1 : 0,
            updated_at: now(),
          },
          r.id,
        );
        if (status === 'approved' && r.type === 'return') {
          // Yêu cầu đã duyệt bắt đầu theo dõi hàng trả về; nếu đã nhập kho ngay thì ghi nhận hoàn tất.
          const restockedNow = req.body.restock === true;
          await d.insert('hang_tra_ve', {
            request_id: r.id,
            order_id: o.id,
            status: restockedNow ? 'restocked' : 'awaiting',
            note: restockedNow ? 'Nhập lại kho ngay khi duyệt yêu cầu.' : '',
            handler_id: req.user.id,
            received_at: restockedNow ? now() : null,
            inspected_at: restockedNow ? now() : null,
            updated_at: now(),
          });
        }
        await audit(d, req.user.id, 'request.review', 'request', r.id, {
          status,
          reply,
        });
      });
      res.json({
        data: requestView(
          await d.one('SELECT * FROM yeu_cau_huy_hoan WHERE id=?', r.id),
        ),
      });
    }),
  );
  app.post(
    '/api/admin/requests/:id/refund',
    permission('orders'),
    async (req, res) => {
      const r = await d.one(
        'SELECT * FROM yeu_cau_huy_hoan WHERE id=?',
        req.params.id,
      );
      assert(
        r && r.status === 'approved',
        409,
        'Yêu cầu cần được chấp nhận trước khi hoàn tiền.',
      );
      const o = await d.one('SELECT * FROM don_hang WHERE id=?', r.order_id);
      assert(
        ['cancelled', 'returned'].includes(o.status) &&
          ['paid', 'refund_pending'].includes(o.payment_status),
        409,
        'Đơn không đủ điều kiện hoàn tiền hoặc đã hoàn tiền.',
      );
      if (r.type === 'return') {
        // Yêu cầu đổi trả chỉ được hoàn tiền sau khi nhà thuốc đã nhận hàng trả về.
        const goods = await d.one(
          'SELECT status FROM hang_tra_ve WHERE request_id=?',
          r.id,
        );
        assert(
          !goods || ['received', 'restocked', 'discarded'].includes(goods.status),
          409,
          'Chỉ hoàn tiền sau khi nhà thuốc đã nhận hàng trả về.',
        );
      }
      const amount =
        req.body.amount === undefined ? o.total : Number(req.body.amount);
      assert(
        Number.isSafeInteger(amount) && amount > 0 && amount <= o.total,
        400,
        'Số tiền hoàn phải dương và không vượt số tiền đã thanh toán.',
      );
      assert(
        !(await d.one(
          "SELECT id FROM giao_dich_thanh_toan WHERE order_id=? AND type='refund' AND status IN ('success','pending')",
          o.id,
        )),
        409,
        'Giao dịch đã hoàn tiền hoặc đang chờ đối soát.',
      );
      const payment = await d.one(
        "SELECT * FROM giao_dich_thanh_toan WHERE order_id=? AND type='payment' AND status='success' ORDER BY id DESC LIMIT 1",
        o.id,
      );
      assert(
        payment && amount <= payment.amount,
        400,
        'Không tìm thấy giao dịch thanh toán phù hợp.',
      );
      const reference = `RF${randomUUID().replaceAll('-', '').slice(0, 28).toUpperCase()}`;
      let gatewayRefundId = null;
      if (payment.provider === 'vnpay') {
        assert(
          options.vnpay && payment.provider_reference,
          503,
          'Chưa đủ thông tin hoàn tiền qua VNPay Sandbox.',
        );
        gatewayRefundId = await d.insert('giao_dich_thanh_toan', {
          order_id: o.id,
          reference,
          type: 'refund',
          provider: 'vnpay',
          amount,
          status: 'pending',
          created_at: now(),
        });
        let result;
        try {
          result = await vnpayRefund(options.vnpay, {
            reference,
            payment,
            amount,
            userId: req.user.id,
            ip: req.ip.replace(/^::ffff:/, ''),
          });
        } catch {
          await audit(
            d,
            req.user.id,
            'refund.vnpay_reconcile',
            'order',
            o.id,
            reference,
          );
          fail(
            502,
            'Chưa có xác nhận hoàn tiền. Hãy đối soát giao dịch trên VNPay Sandbox.',
          );
        }
        assert(
          result.confirmed,
          409,
          'VNPay chưa xác nhận hoàn tiền. Hãy đối soát giao dịch trên cổng.',
        );
        await d.update(
          'giao_dich_thanh_toan',
          {
            provider_reference: result.reference,
          },
          gatewayRefundId,
        );
      } else {
        assert(
          options.demo ||
            (payment.provider === 'cod' && req.body.confirmedCash === true) ||
            (payment.provider === 'bank_transfer' && req.body.confirmedTransfer === true && text(req.body.refundReference, 100).length >= 6),
          400,
          'Xác nhận đã hoàn tiền và cung cấp mã giao dịch nếu hoàn bằng chuyển khoản.',
        );
      }
      await d.transaction(async () => {
        if (gatewayRefundId)
          await d.update(
            'giao_dich_thanh_toan',
            {
              status: 'success',
            },
            gatewayRefundId,
          );
        else
          await d.insert('giao_dich_thanh_toan', {
            order_id: o.id,
            reference,
            type: 'refund',
            provider: payment.provider,
            provider_reference: payment.provider === 'bank_transfer' ? text(req.body.refundReference, 100) : null,
            amount,
            status: 'success',
          });
        await d.update(
          'don_hang',
          {
            payment_status: 'refunded',
            updated_at: now(),
          },
          o.id,
        );
        await d.update(
          'yeu_cau_huy_hoan',
          {
            refund_amount: amount,
            updated_at: now(),
          },
          r.id,
        );
        await audit(d, req.user.id, 'refund.complete', 'order', o.id, {
          amount,
          provider: payment.provider,
        });
      });
      res.json({
        data: await orderView(d, o.id, { includeInternal: true }),
      });
    },
  );
}
