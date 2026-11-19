import { camel, now } from '../repositories/database.js';
import { transactionJson } from '../repositories/transactions.js';
import { assert, audit, text } from './shared.js';
import { releaseStock } from './orders.js';

// Luồng hàng trả về (hàng back) của yêu cầu đổi trả đã được duyệt:
//   awaiting (chờ hàng về) -> in_transit (đang gửi về) -> received (đã nhận hàng)
//   -> restocked (nhập lại kho) hoặc discarded (loại bỏ).
// Khách có thể bỏ qua in_transit nếu mang hàng tới nhà thuốc.
export const RETURN_GOODS_FLOW = {
  awaiting: ['in_transit', 'received'],
  in_transit: ['received'],
  received: ['restocked', 'discarded'],
  restocked: [],
  discarded: [],
};

const listSql = `SELECT g.*,r.reason,r.type request_type,r.status request_status,o.code order_code,o.total,o.status order_status,u.name user_name,u.phone user_phone,h.name handler_name
  FROM hang_tra_ve g
  JOIN yeu_cau_huy_hoan r ON r.id=g.request_id
  JOIN don_hang o ON o.id=g.order_id
  JOIN nguoi_dung u ON u.id=o.user_id
  LEFT JOIN nguoi_dung h ON h.id=g.handler_id`;

export function installReturnGoods(app, d, { auth, permission }) {
  const withItems = async (rows) => {
    if (!rows.length) return [];
    const orderIds = [...new Set(rows.map((row) => row.order_id))];
    const items = await d.all(
      `SELECT order_id,product_id,name,unit,quantity FROM chi_tiet_don_hang WHERE order_id IN (${orderIds.map(() => '?').join(',')}) ORDER BY id`,
      ...orderIds,
    );
    return rows.map((row) => ({
      ...camel(row),
      items: items.filter((item) => item.order_id === row.order_id).map(camel),
    }));
  };

  app.get('/api/admin/return-goods', permission('orders'), async (req, res) => {
    const rows = await d.all(`${listSql} ORDER BY g.id DESC`);
    res.json({ data: await withItems(rows) });
  });

  app.patch(
    '/api/admin/return-goods/:id',
    permission('orders'),
    transactionJson(d, async (req, res) => {
      const goods = await d.one(
        'SELECT * FROM hang_tra_ve WHERE id=?',
        req.params.id,
      );
      assert(goods, 404, 'Không tìm thấy hàng trả về.');
      const status = req.body?.status;
      assert(
        Object.hasOwn(RETURN_GOODS_FLOW, status) &&
          RETURN_GOODS_FLOW[goods.status].includes(status),
        409,
        'Không thể chuyển hàng trả về sang trạng thái này.',
      );
      const note = text(req.body?.note, 1000);
      const carrier = text(req.body?.carrier, 60);
      const trackingCode = text(req.body?.trackingCode, 60);
      const changes = {
        status,
        handler_id: req.user.id,
        updated_at: now(),
      };
      if (note) changes.note = note;
      if (status === 'in_transit') {
        assert(
          trackingCode.length >= 3,
          400,
          'Nhập mã vận đơn (ít nhất 3 ký tự) của hàng gửi về.',
        );
        changes.carrier = carrier;
        changes.tracking_code = trackingCode;
      }
      if (status === 'received') changes.received_at = now();
      if (status === 'restocked' || status === 'discarded')
        changes.inspected_at = now();
      if (status === 'restocked') {
        assert(
          req.body?.sealed === true,
          400,
          'Cần xác nhận thuốc còn nguyên niêm phong và đảm bảo chất lượng để nhập lại kho.',
        );
        const order = await d.one(
          'SELECT * FROM don_hang WHERE id=?',
          goods.order_id,
        );
        assert(
          !order.stock_released,
          409,
          'Đơn hàng này đã được hoàn kho trước đó.',
        );
        await releaseStock(d, order);
      }
      if (status === 'discarded')
        assert(
          note.length >= 5,
          400,
          'Nhập lý do loại bỏ hàng trả về (ít nhất 5 ký tự).',
        );
      await d.update('hang_tra_ve', changes, goods.id);
      await audit(d, req.user.id, 'return_goods.update', 'return_goods', goods.id, {
        from: goods.status,
        to: status,
      });
      const updated = await d.one(`${listSql} WHERE g.id=?`, goods.id);
      res.json({ data: (await withItems([updated]))[0] });
    }),
  );

  // Khách hàng cập nhật đơn vị vận chuyển và mã vận đơn khi gửi hàng trả về.
  app.post(
    '/api/orders/:orderId/requests/:requestId/return-shipment',
    auth,
    transactionJson(d, async (req, res) => {
      const goods = await d.one(
        `SELECT g.* FROM hang_tra_ve g
         JOIN yeu_cau_huy_hoan r ON r.id=g.request_id
         WHERE g.request_id=? AND g.order_id=? AND r.user_id=?`,
        Number(req.params.requestId),
        Number(req.params.orderId),
        req.user.id,
      );
      assert(goods, 404, 'Không tìm thấy hàng trả về của bạn.');
      assert(
        ['awaiting', 'in_transit'].includes(goods.status),
        409,
        'Nhà thuốc đã nhận hàng trả về nên không thể cập nhật mã vận đơn.',
      );
      const carrier = text(req.body?.carrier, 60);
      const trackingCode = text(req.body?.trackingCode, 60);
      assert(
        trackingCode.length >= 3,
        400,
        'Nhập mã vận đơn (ít nhất 3 ký tự).',
      );
      await d.update(
        'hang_tra_ve',
        {
          status: 'in_transit',
          carrier,
          tracking_code: trackingCode,
          updated_at: now(),
        },
        goods.id,
      );
      await audit(d, req.user.id, 'return_goods.ship', 'return_goods', goods.id);
      res.json({
        data: camel(await d.one('SELECT * FROM hang_tra_ve WHERE id=?', goods.id)),
      });
    }),
  );
}
