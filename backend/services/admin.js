import {
  camel,
  now,
  today,
  daysFromNow,
  slugify,
} from '../repositories/database.js';
import {
  assert,
  text,
  positiveInt,
  audit,
  getSettings,
  publicUser,
  productList,
  getProduct,
  orderView,
} from './shared.js';
import { defaultSettings, permissionNames } from '../repositories/seed.js';
import bcrypt from 'bcryptjs';
import { randomToken } from './shared.js';
const dateValid = (s) =>
  typeof s === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(s)) &&
  new Date(s).toISOString().slice(0, 10) === s;
const number = (v, min = 0, max = 100000000000) =>
  Number.isSafeInteger(Number(v)) && Number(v) >= min && Number(v) <= max;
async function inventory(d) {
  const settings = await getSettings(d),
    cutoff = daysFromNow(Number(settings.expiryWarningDays));
  const batches = (
    await d.all(
      'SELECT b.*,t.name product_name,t.unit,s.name supplier_name FROM lo_thuoc b JOIN thuoc t ON t.id=b.product_id LEFT JOIN phieu_nhap_kho p ON p.id=b.receipt_id LEFT JOIN nha_cung_cap s ON s.id=p.supplier_id ORDER BY b.expires_at,b.id',
    )
  ).map((b) => ({
    ...camel(b),
    available: b.expires_at <= today() ? 0 : b.quantity - b.reserved,
    status:
      b.expires_at <= today()
        ? 'expired'
        : b.expires_at <= cutoff
          ? 'expiring'
          : 'available',
  }));
  const alerts = batches
    .filter((b) => b.status !== 'available' && b.quantity > 0)
    .map((b) => ({
      type: b.status === 'expired' ? 'expired' : 'expiring',
      productId: b.productId,
      productName: b.productName,
      batchId: b.id,
      batchNumber: b.batchNumber,
      quantity: b.quantity,
      expiresAt: b.expiresAt,
    }));
  for (const p of await productList(d, {}, true))
    if (p.active && p.stock < Number(settings.lowStockThreshold))
      alerts.push({
        type: 'low_stock',
        productId: p.id,
        productName: p.name,
        quantity: p.stock,
      });
  const movements = (
    await d.all(
      'SELECT l.*,t.name product_name,b.batch_number,u.name user_name FROM lich_su_ton_kho l JOIN thuoc t ON t.id=l.product_id JOIN lo_thuoc b ON b.id=l.batch_id LEFT JOIN nguoi_dung u ON u.id=l.user_id ORDER BY l.id DESC LIMIT 300',
    )
  ).map(camel);
  return {
    batches,
    movements,
    alerts,
    summary: {
      sellable: batches.reduce((n, b) => n + b.available, 0),
      reserved: batches.reduce((n, b) => n + b.reserved, 0),
      expired: batches
        .filter((b) => b.status === 'expired')
        .reduce((n, b) => n + b.quantity, 0),
      value: batches.reduce((n, b) => n + b.cost * b.quantity, 0),
    },
  };
}
async function reports(d, query = {}, includeOrderDetails = false) {
  const from = query.from || daysFromNow(-29),
    to = query.to || today();
  assert(
    dateValid(from) && dateValid(to) && from <= to,
    400,
    'Khoảng thời gian báo cáo không hợp lệ.',
  );
  const all = await d.all(
      `SELECT o.*, date(o.created_at,'+7 hours') report_date,
        COALESCE((SELECT SUM(t.amount) FROM giao_dich_thanh_toan t WHERE t.order_id=o.id AND t.type='refund' AND t.status='success'),0) returned_amount
       FROM don_hang o WHERE date(o.created_at,'+7 hours') BETWEEN ? AND ?`,
      from,
      to,
    ),
    completed = all.filter(
      (o) =>
        ['delivered', 'returned'].includes(o.status) &&
        ['paid', 'refund_pending', 'refunded'].includes(o.payment_status),
    );
  const revenue = completed.reduce(
      (n, o) => n + o.total - o.returned_amount,
      0,
    ),
    orderCount = all.length;
  const dailyRevenue = [];
  for (
    let date = new Date(from + 'T00:00:00Z');
    date.toISOString().slice(0, 10) <= to && dailyRevenue.length < 3660;
    date = new Date(date.getTime() + 86400000)
  ) {
    const day = date.toISOString().slice(0, 10),
      orders = all.filter((o) => o.report_date === day),
      done = completed.filter((o) => o.report_date === day);
    dailyRevenue.push({
      date: day,
      revenue: done.reduce((n, o) => n + o.total - o.returned_amount, 0),
      orders: orders.length,
    });
  }
  const topProducts = (
    await d.all(
      "SELECT p.id,p.name,SUM(i.quantity) quantity,SUM(i.quantity*i.price) revenue FROM chi_tiet_don_hang i JOIN don_hang o ON o.id=i.order_id JOIN thuoc p ON p.id=i.product_id WHERE o.status='delivered' AND o.payment_status='paid' AND date(o.created_at,'+7 hours') BETWEEN ? AND ? GROUP BY p.id ORDER BY quantity DESC LIMIT 10",
      from,
      to,
    )
  ).map(camel);
  const inv = await inventory(d),
    chatCount = (
      await d.one(
        "SELECT COUNT(*) n FROM cuoc_hoi_thoai WHERE date(created_at,'+7 hours') BETWEEN ? AND ?",
        from,
        to,
      )
    ).n;
  return {
    from,
    to,
    revenue,
    orderCount,
    completedOrders: completed.length,
    averageOrder: completed.length ? Math.round(revenue / completed.length) : 0,
    cancellationRate: orderCount
      ? Number(
          (
            (all.filter((o) => o.status === 'cancelled').length / orderCount) *
            100
          ).toFixed(1),
        )
      : 0,
    customerCount: (
      await d.one(
        'SELECT COUNT(*) n FROM nguoi_dung u JOIN khach_hang k ON k.id=u.id WHERE u.active=1',
      )
    ).n,
    pendingOrders: (
      await d.one(
        "SELECT COUNT(*) n FROM don_hang WHERE status IN ('pending','pending_payment','pending_prescription')",
      )
    ).n,
    pendingPrescriptions: (
      await d.one(
        "SELECT COUNT(*) n FROM don_thuoc WHERE status='pending' AND order_id IS NOT NULL",
      )
    ).n,
    lowStockCount: inv.alerts.filter((a) => a.type === 'low_stock').length,
    chatCount,
    handoffCount: (
      await d.one(
        "SELECT COUNT(*) n FROM yeu_cau_ho_tro WHERE date(created_at,'+7 hours') BETWEEN ? AND ?",
        from,
        to,
      )
    ).n,
    dailyRevenue,
    topProducts,
    inventory: {
      ...inv.summary,
      lowStockCount: inv.alerts.filter((a) => a.type === 'low_stock').length,
      expiringCount: inv.alerts.filter((a) => a.type === 'expiring').length,
      expiredCount: inv.alerts.filter((a) => a.type === 'expired').length,
    },
    recentOrders: await Promise.all(
      (
        await d.all(
          'SELECT id,code,created_at,total,status,payment_status,payment_method FROM don_hang ORDER BY id DESC LIMIT 8',
        )
      ).map(async (o) =>
        includeOrderDetails ? await orderView(d, o.id) : camel(o),
      ),
    ),
  };
}
export function installAdmin(
  app,
  d,
  { auth, permission, admin, sendOtp },
  options,
) {
  app.get('/api/admin/dashboard', permission('reports'), async (req, res) =>
    res.json({
      data: await reports(
        d,
        {
          from: daysFromNow(-6),
        },
        req.user.permissions.includes('orders'),
      ),
    }),
  );
  app.get('/api/admin/products', permission('catalog'), async (req, res) =>
    res.json({
      data: await productList(d, req.query, true),
    }),
  );
  const productValues = async (b, old = {}) => {
    const p = { ...camel(old), ...b };
    assert(
      text(p.name, 200).length >= 2,
      400,
      'Tên sản phẩm cần ít nhất 2 ký tự.',
    );
    assert(
      await d.one('SELECT id FROM danh_muc WHERE id=?', Number(p.categoryId)),
      400,
      'Danh mục không hợp lệ.',
    );
    assert(
      !p.manufacturerId ||
        (await d.one(
          'SELECT id FROM nha_san_xuat WHERE id=?',
          Number(p.manufacturerId),
        )),
      400,
      'Nhà sản xuất không hợp lệ.',
    );
    assert(number(p.price, 1), 400, 'Giá bán phải là số nguyên dương.');
    assert(
      p.oldPrice === undefined ||
        p.oldPrice === null ||
        p.oldPrice === '' ||
        number(p.oldPrice),
      400,
      'Giá gốc không hợp lệ.',
    );
    assert(text(p.unit, 60), 400, 'Cần đơn vị đóng gói.');
    const image = text(p.image, 1000);
    assert(
      !image || image.startsWith('/assets/') || /^https:\/\//.test(image),
      400,
      'Ảnh cần đường dẫn /assets/ hoặc HTTPS.',
    );
    return {
      name: text(p.name, 200),
      slug: slugify(p.slug || p.name),
      category_id: Number(p.categoryId),
      manufacturer_id: p.manufacturerId ? Number(p.manufacturerId) : null,
      ingredient: text(p.ingredient, 2000),
      description: text(p.description, 10000),
      usage: text(p.usage, 5000),
      warning: text(p.warning, 5000),
      unit: text(p.unit, 60),
      price: Number(p.price),
      old_price:
        p.oldPrice === undefined || p.oldPrice === null || p.oldPrice === ''
          ? null
          : Number(p.oldPrice),
      image: image || '/assets/products/vitamin-c.svg',
      prescription_required: p.prescriptionRequired ? 1 : 0,
      featured: p.featured ? 1 : 0,
      active: p.active === false || p.active === 0 ? 0 : 1,
      updated_at: now(),
    };
  };
  app.post('/api/admin/products', permission('catalog'), async (req, res) => {
    const values = await productValues(req.body);
    assert(
      !(await d.one('SELECT id FROM thuoc WHERE slug=?', values.slug)),
      409,
      'Mã đường dẫn sản phẩm đã tồn tại.',
    );
    const id = await d.insert('thuoc', values);
    await audit(d, req.user.id, 'product.create', 'product', id);
    res.status(201).json({
      data: await getProduct(d, id, true),
    });
  });
  app.patch(
    '/api/admin/products/:id',
    permission('catalog'),
    async (req, res) => {
      const old = await d.one('SELECT * FROM thuoc WHERE id=?', req.params.id);
      assert(old, 404, 'Không tìm thấy sản phẩm.');
      const values = await productValues(req.body, old);
      assert(
        !(await d.one(
          'SELECT id FROM thuoc WHERE slug=? AND id!=?',
          values.slug,
          old.id,
        )),
        409,
        'Mã đường dẫn sản phẩm đã tồn tại.',
      );
      await d.update('thuoc', values, old.id);
      await audit(d, req.user.id, 'product.update', 'product', old.id);
      res.json({
        data: await getProduct(d, old.id, true),
      });
    },
  );
  app.delete(
    '/api/admin/products/:id',
    permission('catalog'),
    async (req, res) => {
      assert(
        await d.one('SELECT id FROM thuoc WHERE id=?', req.params.id),
        404,
        'Không tìm thấy sản phẩm.',
      );
      await d.update(
        'thuoc',
        {
          active: 0,
          updated_at: now(),
        },
        req.params.id,
      );
      await audit(d, req.user.id, 'product.hide', 'product', req.params.id);
      res.json({
        data: {
          hidden: true,
        },
      });
    },
  );
  const simpleEntities = [
    ['categories', 'danh_muc'],
    ['manufacturers', 'nha_san_xuat'],
    ['suppliers', 'nha_cung_cap'],
  ];
  for (const [route, table] of simpleEntities) {
    app.get(`/api/admin/${route}`, permission('catalog'), async (req, res) =>
      res.json({
        data: (await d.all(`SELECT * FROM ${table} ORDER BY id`)).map((x) => ({
          ...camel(x),
          active: !!x.active,
        })),
      }),
    );
    const values = (body, old = {}) => {
      const b = { ...camel(old), ...body };
      assert(text(b.name, 160).length >= 2, 400, 'Tên cần ít nhất 2 ký tự.');
      const val = {
        name: text(b.name, 160),
        active: b.active === false || b.active === 0 ? 0 : 1,
      };
      if (table === 'danh_muc')
        Object.assign(val, {
          slug: slugify(b.slug || b.name),
          description: text(b.description, 2000),
        });
      if (table === 'nha_san_xuat')
        val.country = text(b.country, 100) || 'Việt Nam';
      if (table === 'nha_cung_cap')
        Object.assign(val, {
          email: text(b.email, 100),
          phone: text(b.phone, 20),
          address: text(b.address, 255),
        });
      return val;
    };
    app.post(`/api/admin/${route}`, permission('catalog'), async (req, res) => {
      const v = values(req.body);
      assert(
        !(await d.one(`SELECT id FROM ${table} WHERE name=?`, v.name)),
        409,
        'Tên đã tồn tại.',
      );
      const id = await d.insert(table, v);
      await audit(d, req.user.id, `${route}.create`, route, id);
      res.status(201).json({
        data: camel(await d.one(`SELECT * FROM ${table} WHERE id=?`, id)),
      });
    });
    app.patch(
      `/api/admin/${route}/:id`,
      permission('catalog'),
      async (req, res) => {
        const old = await d.one(
          `SELECT * FROM ${table} WHERE id=?`,
          req.params.id,
        );
        assert(old, 404, 'Không tìm thấy dữ liệu.');
        const v = values(req.body, old);
        assert(
          !(await d.one(
            `SELECT id FROM ${table} WHERE name=? AND id!=?`,
            v.name,
            old.id,
          )),
          409,
          'Tên đã tồn tại.',
        );
        await d.update(table, v, old.id);
        await audit(d, req.user.id, `${route}.update`, route, old.id);
        res.json({
          data: camel(await d.one(`SELECT * FROM ${table} WHERE id=?`, old.id)),
        });
      },
    );
    app.delete(
      `/api/admin/${route}/:id`,
      permission('catalog'),
      async (req, res) => {
        assert(
          await d.one(`SELECT id FROM ${table} WHERE id=?`, req.params.id),
          404,
          'Không tìm thấy dữ liệu.',
        );
        await d.update(
          table,
          {
            active: 0,
          },
          req.params.id,
        );
        await audit(
          d,
          req.user.id,
          `${route}.deactivate`,
          route,
          req.params.id,
        );
        res.json({
          data: {
            deactivated: true,
          },
        });
      },
    );
  }
  app.get('/api/admin/promotions', permission('promotions'), async (req, res) =>
    res.json({
      data: (await d.all('SELECT * FROM khuyen_mai ORDER BY id DESC')).map(
        (x) => ({
          ...camel(x),
          active: !!x.active,
        }),
      ),
    }),
  );
  const promotionValues = (body, old = {}) => {
    const p = { ...camel(old), ...body },
      code = text(p.code, 40).toUpperCase();
    assert(
      /^[A-Z0-9_-]{3,40}$/.test(code),
      400,
      'Mã khuyến mãi gồm 3–40 ký tự chữ, số, _ hoặc -.',
    );
    assert(text(p.name, 160), 400, 'Cần tên chương trình.');
    assert(
      ['percent', 'fixed'].includes(p.type),
      400,
      'Loại giảm giá không hợp lệ.',
    );
    assert(
      number(p.value, 1) && !(p.type === 'percent' && Number(p.value) > 100),
      400,
      'Giá trị giảm không hợp lệ.',
    );
    assert(
      dateValid(p.startDate) &&
        dateValid(p.endDate) &&
        p.startDate <= p.endDate,
      400,
      'Thời gian khuyến mãi không hợp lệ.',
    );
    assert(
      number(p.minOrder ?? 0) && number(p.usageLimit ?? 100, 1),
      400,
      'Mức đơn tối thiểu hoặc lượt sử dụng không hợp lệ.',
    );
    assert(
      p.maxDiscount === null ||
        p.maxDiscount === '' ||
        p.maxDiscount === undefined ||
        number(p.maxDiscount),
      400,
      'Mức giảm tối đa không hợp lệ.',
    );
    assert(
      !old.id || Number(p.usageLimit) >= old.used_count,
      400,
      'Lượt sử dụng tối đa không được nhỏ hơn số đã dùng.',
    );
    return {
      code,
      name: text(p.name, 160),
      type: p.type,
      value: Number(p.value),
      min_order: Number(p.minOrder || 0),
      max_discount:
        p.maxDiscount === undefined ||
        p.maxDiscount === null ||
        p.maxDiscount === ''
          ? null
          : Number(p.maxDiscount),
      usage_limit: Number(p.usageLimit || 100),
      start_date: p.startDate,
      end_date: p.endDate,
      active: p.active === false || p.active === 0 ? 0 : 1,
    };
  };
  app.post(
    '/api/admin/promotions',
    permission('promotions'),
    async (req, res) => {
      const v = promotionValues(req.body);
      assert(
        !(await d.one('SELECT id FROM khuyen_mai WHERE code=?', v.code)),
        409,
        'Mã khuyến mãi đã tồn tại.',
      );
      const id = await d.insert('khuyen_mai', v);
      await audit(d, req.user.id, 'promotion.create', 'promotion', id);
      res.status(201).json({
        data: camel(await d.one('SELECT * FROM khuyen_mai WHERE id=?', id)),
      });
    },
  );
  app.patch(
    '/api/admin/promotions/:id',
    permission('promotions'),
    async (req, res) => {
      const p = await d.one(
        'SELECT * FROM khuyen_mai WHERE id=?',
        req.params.id,
      );
      assert(p, 404, 'Không tìm thấy mã.');
      const v = promotionValues(req.body, p);
      assert(
        !(await d.one(
          'SELECT id FROM khuyen_mai WHERE code=? AND id!=?',
          v.code,
          p.id,
        )),
        409,
        'Mã khuyến mãi đã tồn tại.',
      );
      await d.update('khuyen_mai', v, p.id);
      await audit(d, req.user.id, 'promotion.update', 'promotion', p.id);
      res.json({
        data: camel(await d.one('SELECT * FROM khuyen_mai WHERE id=?', p.id)),
      });
    },
  );
  app.delete(
    '/api/admin/promotions/:id',
    permission('promotions'),
    async (req, res) => {
      assert(
        await d.one('SELECT id FROM khuyen_mai WHERE id=?', req.params.id),
        404,
        'Không tìm thấy mã.',
      );
      await d.update(
        'khuyen_mai',
        {
          active: 0,
        },
        req.params.id,
      );
      res.json({
        data: {
          deactivated: true,
        },
      });
    },
  );
  app.get('/api/admin/inventory', permission('inventory'), async (req, res) =>
    res.json({
      data: await inventory(d),
    }),
  );
  app.post(
    '/api/admin/inventory/receipts',
    permission('inventory'),
    async (req, res) => {
      assert(
        await d.one(
          'SELECT id FROM nha_cung_cap WHERE id=? AND active=1',
          Number(req.body.supplierId),
        ),
        400,
        'Nhà cung cấp không hợp lệ.',
      );
      assert(
        Array.isArray(req.body.items) &&
          req.body.items.length > 0 &&
          req.body.items.length <= 100,
        400,
        'Phiếu nhập cần từ 1 đến 100 dòng.',
      );
      const items = await Promise.all(
        req.body.items.map(async (i) => {
          assert(
            await d.one('SELECT id FROM thuoc WHERE id=?', Number(i.productId)),
            400,
            'Sản phẩm không tồn tại.',
          );
          assert(
            text(i.batchNumber, 80) &&
              positiveInt(i.quantity) &&
              number(i.cost),
            400,
            'Số lô, số lượng hoặc giá nhập không hợp lệ.',
          );
          assert(
            dateValid(i.manufacturedAt) &&
              dateValid(i.expiresAt) &&
              i.manufacturedAt <= today() &&
              i.expiresAt > today() &&
              i.manufacturedAt < i.expiresAt,
            400,
            'Ngày sản xuất/hạn dùng không hợp lệ; không nhập lô đã hết hạn.',
          );
          return {
            product_id: Number(i.productId),
            batch_number: text(i.batchNumber, 80),
            quantity: Number(i.quantity),
            cost: Number(i.cost),
            manufactured_at: i.manufacturedAt,
            expires_at: i.expiresAt,
          };
        }),
      );
      const id = await d.transaction(async () => {
        const id = await d.insert('phieu_nhap_kho', {
          code: `PN${Date.now()}`,
          supplier_id: Number(req.body.supplierId),
          user_id: req.user.id,
          total: items.reduce((n, i) => n + i.quantity * i.cost, 0),
        });
        for (const i of items) {
          assert(
            !(await d.one(
              'SELECT id FROM lo_thuoc WHERE product_id=? AND batch_number=?',
              i.product_id,
              i.batch_number,
            )),
            409,
            'Số lô đã tồn tại cho sản phẩm này.',
          );
          const bid = await d.insert('lo_thuoc', {
            ...i,
            receipt_id: id,
          });
          await d.insert('lich_su_ton_kho', {
            product_id: i.product_id,
            batch_id: bid,
            user_id: req.user.id,
            type: 'receipt',
            quantity: i.quantity,
            reason: `Phiếu nhập ${id}`,
          });
        }
        await audit(d, req.user.id, 'inventory.receipt', 'receipt', id);
        return id;
      });
      res.status(201).json({
        data: {
          id,
          ...(await inventory(d)),
        },
      });
    },
  );
  app.post(
    '/api/admin/inventory/adjustments',
    permission('inventory'),
    async (req, res) => {
      const b = await d.one(
        'SELECT * FROM lo_thuoc WHERE id=?',
        Number(req.body.batchId),
      );
      assert(b, 404, 'Không tìm thấy lô.');
      const qty = Number(req.body.quantity),
        reason = text(req.body.reason, 1000);
      assert(
        Number.isSafeInteger(qty) && qty !== 0 && Math.abs(qty) <= 1000000,
        400,
        'Số điều chỉnh phải là số nguyên khác 0.',
      );
      assert(reason.length >= 5, 400, 'Cần lý do điều chỉnh ít nhất 5 ký tự.');
      assert(
        b.quantity + qty >= b.reserved,
        409,
        'Không được giảm tồn dưới số lượng đã giữ cho đơn.',
      );
      await d.transaction(async () => {
        await d.run(
          'UPDATE lo_thuoc SET quantity=quantity+? WHERE id=?',
          qty,
          b.id,
        );
        await d.insert('lich_su_ton_kho', {
          product_id: b.product_id,
          batch_id: b.id,
          user_id: req.user.id,
          type: 'adjustment',
          quantity: qty,
          reason,
        });
        await audit(d, req.user.id, 'inventory.adjust', 'batch', b.id, {
          quantity: qty,
          reason,
        });
      });
      res.json({
        data: await inventory(d),
      });
    },
  );
  app.get('/api/admin/users', admin, permission('users'), async (req, res) =>
    res.json({
      data: await Promise.all(
        (await d.all('SELECT id FROM nguoi_dung ORDER BY id')).map(
          async (x) => await publicUser(d, x.id),
        ),
      ),
    }),
  );
  app.get('/api/admin/permissions', admin, permission('users'), (req, res) =>
    res.json({
      data: Object.entries(permissionNames).map(([code, name]) => ({
        code,
        name,
      })),
    }),
  );
  app.post('/api/admin/users', admin, permission('users'), async (req, res) => {
    const name = text(req.body.name, 100);
    const email = text(req.body.email, 100).toLowerCase();
    const phone = text(req.body.phone, 15) || null;
    const jobTitle = req.body.jobTitle || 'sales';
    assert(
      name.length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      400,
      'Nhập họ tên và email hợp lệ.',
    );
    assert(
      !phone || /^0\d{9}$/.test(phone),
      400,
      'Số điện thoại cần 10 chữ số và bắt đầu bằng 0.',
    );
    assert(
      ['pharmacist', 'sales', 'warehouse'].includes(jobTitle),
      400,
      'Chức danh nhân viên không hợp lệ.',
    );
    assert(
      options.demo || (process.env.SMTP_HOST && process.env.SMTP_FROM),
      503,
      'Cần cấu hình email để gửi mã kích hoạt nhân viên.',
    );
    assert(
      !(await d.one(
        'SELECT id FROM nguoi_dung WHERE email=? OR phone=?',
        email,
        phone,
      )),
      409,
      'Email hoặc số điện thoại đã được dùng.',
    );
    const id = await d.transaction(async () => {
      const id = await d.insert('nguoi_dung', {
        name,
        email,
        phone,
        active: 1,
        verified: 0,
        password_hash: bcrypt.hashSync(randomToken(), 10),
      });
      await d.insert('nhan_vien', {
        id,
        job_title: jobTitle,
      });
      await d.insert('nguoi_dung_vai_tro', {
        user_id: id,
        role_id: (await d.one("SELECT id FROM vai_tro WHERE name='staff'")).id,
      });
      await audit(d, req.user.id, 'user.invite', 'user', id, {
        jobTitle,
      });
      return id;
    });
    const demoCode = await sendOtp({ id, email, invited: true }, 'verify');
    res.status(201).json({
      data: {
        user: await publicUser(d, id),
        demoCode: demoCode || undefined,
      },
    });
  });
  app.patch(
    '/api/admin/users/:id',
    admin,
    permission('users'),
    async (req, res) => {
      const u = await publicUser(d, req.params.id);
      assert(u, 404, 'Không tìm thấy tài khoản.');
      const role = req.body.role ?? u.role,
        active = req.body.active === undefined ? u.active : !!req.body.active,
        title =
          req.body.jobTitle === undefined ? u.jobTitle : req.body.jobTitle;
      const lockReason = text(req.body.reason, 500);
      assert(
        ['customer', 'staff', 'admin'].includes(role),
        400,
        'Vai trò không hợp lệ.',
      );
      assert(
        !title || ['pharmacist', 'sales', 'warehouse'].includes(title),
        400,
        'Chức danh không hợp lệ.',
      );
      if (u.role === 'admin' && (!active || role !== 'admin')) {
        const count = (
          await d.one(
            "SELECT COUNT(DISTINCT u.id) n FROM nguoi_dung u JOIN nguoi_dung_vai_tro uv ON uv.user_id=u.id JOIN vai_tro v ON v.id=uv.role_id WHERE v.name='admin' AND u.active=1",
          )
        ).n;
        assert(
          count > 1,
          409,
          'Không thể khóa hoặc hạ quyền quản trị viên hoạt động cuối cùng.',
        );
      }
      assert(
        !(u.id === req.user.id && !active),
        409,
        'Không thể tự khóa tài khoản đang đăng nhập.',
      );
      if (u.active && !active)
        assert(
          lockReason.length >= 5,
          400,
          'Nhập lý do khóa tài khoản ít nhất 5 ký tự.',
        );
      const name =
        req.body.name === undefined ? u.name : text(req.body.name, 100);
      const phone =
        req.body.phone === undefined
          ? u.phone
          : text(req.body.phone, 15) || null;
      assert(
        name.length >= 2 && (!phone || /^0\d{9}$/.test(phone)),
        400,
        'Họ tên hoặc số điện thoại không hợp lệ.',
      );
      assert(
        !phone ||
          !(await d.one(
            'SELECT id FROM nguoi_dung WHERE phone=? AND id!=?',
            phone,
            u.id,
          )),
        409,
        'Số điện thoại đã được dùng.',
      );
      if (req.body.permissions !== undefined) {
        assert(
          Array.isArray(req.body.permissions) &&
            req.body.permissions.every((p) =>
              Object.hasOwn(permissionNames, p),
            ),
          400,
          'Danh sách quyền không hợp lệ.',
        );
        assert(
          !req.body.permissions.includes('prescriptions') ||
            title === 'pharmacist',
          400,
          'Quyền duyệt đơn thuốc chỉ dành cho người có chức danh dược sĩ.',
        );
        assert(
          u.id !== req.user.id || req.body.permissions.includes('users'),
          409,
          'Không thể tự bỏ quyền quản trị tài khoản.',
        );
      }
      await d.transaction(async () => {
        await d.update(
          'nguoi_dung',
          {
            name,
            phone,
            active: active ? 1 : 0,
            updated_at: now(),
          },
          u.id,
        );
        if (role !== u.role) {
          await d.run('DELETE FROM nguoi_dung_vai_tro WHERE user_id=?', u.id);
          await d.insert('nguoi_dung_vai_tro', {
            user_id: u.id,
            role_id: (await d.one('SELECT id FROM vai_tro WHERE name=?', role))
              .id,
          });
        }
        if (role === 'customer')
          await d.run('INSERT OR IGNORE INTO khach_hang(id) VALUES(?)', u.id);
        if (role === 'admin')
          await d.run(
            'INSERT OR IGNORE INTO quan_tri_vien(id) VALUES(?)',
            u.id,
          );
        if (role === 'staff' || title) {
          await d.run(
            'INSERT OR IGNORE INTO nhan_vien(id,job_title) VALUES(?,?)',
            u.id,
            title || 'sales',
          );
          await d.update(
            'nhan_vien',
            {
              job_title: title || 'sales',
            },
            u.id,
          );
        } else await d.run('DELETE FROM nhan_vien WHERE id=?', u.id);
        if (req.body.permissions !== undefined) {
          await d.run('DELETE FROM phan_quyen WHERE user_id=?', u.id);
          for (const p of await d.all('SELECT id,code FROM quyen'))
            await d.insert('phan_quyen', {
              user_id: u.id,
              permission_id: p.id,
              allowed: req.body.permissions.includes(p.code) ? 1 : 0,
            });
        }
        if (!active) await d.run('DELETE FROM sessions WHERE user_id=?', u.id);
        assert(
          (
            await Promise.all(
              (
                await d.all(
                  'SELECT id FROM nguoi_dung WHERE active=1 AND verified=1',
                )
              ).map(async ({ id }) => {
                const adminUser = await publicUser(d, id);
                return (
                  adminUser.role === 'admin' &&
                  adminUser.permissions.includes('users')
                );
              }),
            )
          ).some(Boolean),
          409,
          'Cần giữ ít nhất một quản trị viên hoạt động có quyền quản lý tài khoản.',
        );
        await audit(d, req.user.id, 'user.permissions', 'user', u.id, {
          role,
          active,
          jobTitle: title,
          lockReason: lockReason || undefined,
          permissions: req.body.permissions,
        });
      });
      res.json({
        data: await publicUser(d, u.id),
      });
    },
  );
  app.get(
    '/api/admin/settings',
    admin,
    permission('settings'),
    async (req, res) =>
      res.json({
        data: {
          ...(await getSettings(d)),
          demoMode: options.demo,
          geminiConfigured: !!process.env.GEMINI_API_KEY,
          smtpConfigured: !!process.env.SMTP_HOST,
          emailConfigured: !!process.env.SMTP_HOST,
          paymentConfigured: Boolean(options.vnpay),
          googleConfigured: Boolean(options.google),
          paymentProvider: options.vnpay
            ? 'vnpay'
            : options.demo
              ? 'demo'
              : 'cod',
        },
      }),
  );
  app.patch(
    '/api/admin/settings',
    admin,
    permission('settings'),
    async (req, res) => {
      const allowed = [
        'storeName',
        'shippingFee',
        'freeShippingThreshold',
        'lowStockThreshold',
        'expiryWarningDays',
        'otpTtlMinutes',
        'paymentTimeoutMinutes',
        'returnWindowDays',
        'chatbotEnabled',
      ];
      const values = {};
      for (const [key, val] of Object.entries(req.body)) {
        if (!allowed.includes(key)) continue;
        if (key === 'storeName') {
          assert(text(val, 100), 400, 'Tên nhà thuốc không được trống.');
          values[key] = text(val, 100);
        } else if (key === 'chatbotEnabled') values[key] = !!val;
        else {
          assert(
            number(
              val,
              key === 'otpTtlMinutes' || key === 'paymentTimeoutMinutes'
                ? 1
                : 0,
              key.includes('Fee') || key.includes('Threshold')
                ? 100000000
                : 3650,
            ),
            400,
            `Cấu hình ${key} không hợp lệ.`,
          );
          values[key] = Number(val);
        }
      }
      await d.transaction(async () => {
        for (const [k, v] of Object.entries(values))
          await d.run(
            'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
            k,
            JSON.stringify(v),
          );
        await audit(d, req.user.id, 'settings.update', 'settings', '', values);
      });
      res.json({
        data: {
          ...(await getSettings(d)),
          demoMode: options.demo,
        },
      });
    },
  );
  app.get('/api/admin/audit', admin, permission('audit'), async (req, res) =>
    res.json({
      data: (
        await d.all(
          'SELECT l.*,u.name user_name FROM nhat_ky_hoat_dong l LEFT JOIN nguoi_dung u ON u.id=l.user_id ORDER BY l.id DESC LIMIT 500',
        )
      ).map(camel),
    }),
  );
  app.get('/api/admin/reports', permission('reports'), async (req, res) =>
    res.json({
      data: await reports(d, req.query),
    }),
  );
  app.get(
    '/api/admin/reports/export',
    permission('reports'),
    async (req, res) => {
      const report = await reports(d, req.query),
        escape = (v) => `"${String(v).replace(/"/g, '""')}"`,
        csv =
          '\uFEFF' +
          [
            ['Ngày', 'Doanh thu đơn đã giao và thu tiền (VND)', 'Số đơn'],
            ...report.dailyRevenue.map((x) => [x.date, x.revenue, x.orders]),
          ]
            .map((row) => row.map(escape).join(','))
            .join('\r\n');
      await audit(
        d,
        req.user.id,
        'report.export',
        'report',
        '',
        `${report.from} → ${report.to}`,
      );
      res
        .set({
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="antam-revenue-${report.from}-${report.to}.csv"`,
        })
        .send(csv);
    },
  );
  app.get('/api/admin/knowledge', auth, async (req, res) => {
    assert(
      req.user.permissions.some((code) =>
        ['knowledge', 'prescriptions'].includes(code),
      ),
      403,
      'Bạn không có quyền xem tri thức chatbot.',
    );
    return res.json({
      data: (
        await d.all('SELECT * FROM tri_thuc_chatbot ORDER BY id DESC')
      ).map((x) => ({
        ...camel(x),
        active: !!x.active,
      })),
    });
  });
  const knowledgeValues = (b, old = {}) => {
    const p = { ...old, ...b };
    assert(
      text(p.title, 200) &&
        text(p.keywords, 1000) &&
        text(p.content, 10000) &&
        text(p.source, 1000),
      400,
      'Cần tiêu đề, từ khóa, nội dung và nguồn tham khảo.',
    );
    assert(
      !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b0\d{9}\b/i.test(p.content),
      400,
      'Không lưu email hoặc số điện thoại cá nhân trong tri thức chatbot.',
    );
    const values = {
      title: text(p.title, 200),
      keywords: text(p.keywords, 1000),
      content: text(p.content, 10000),
      source: text(p.source, 1000),
      active: p.active === false || p.active === 0 ? 0 : 1,
    };
    if (
      ['title', 'keywords', 'content', 'source'].some(
        (key) => values[key] !== old[key],
      )
    ) {
      values.reviewed_by = null;
      values.reviewed_at = null;
    }
    return values;
  };
  app.post(
    '/api/admin/knowledge',
    permission('knowledge'),
    async (req, res) => {
      const id = await d.insert('tri_thuc_chatbot', knowledgeValues(req.body));
      await audit(d, req.user.id, 'knowledge.create', 'knowledge', id);
      res.status(201).json({
        data: camel(
          await d.one('SELECT * FROM tri_thuc_chatbot WHERE id=?', id),
        ),
      });
    },
  );
  app.patch(
    '/api/admin/knowledge/:id',
    permission('knowledge'),
    async (req, res) => {
      const old = await d.one(
        'SELECT * FROM tri_thuc_chatbot WHERE id=?',
        req.params.id,
      );
      assert(old, 404, 'Không tìm thấy tri thức.');
      await d.update(
        'tri_thuc_chatbot',
        knowledgeValues(req.body, old),
        old.id,
      );
      await audit(d, req.user.id, 'knowledge.update', 'knowledge', old.id);
      res.json({
        data: camel(
          await d.one('SELECT * FROM tri_thuc_chatbot WHERE id=?', old.id),
        ),
      });
    },
  );
  app.post(
    '/api/admin/knowledge/:id/review',
    permission('prescriptions'),
    async (req, res) => {
      const entry = await d.one(
        'SELECT * FROM tri_thuc_chatbot WHERE id=?',
        req.params.id,
      );
      assert(
        entry?.source && entry.active,
        400,
        'Tri thức cần có nguồn và đang bật để được duyệt.',
      );
      await d.update(
        'tri_thuc_chatbot',
        {
          reviewed_at: now(),
          reviewed_by: req.user.id,
        },
        entry.id,
      );
      await audit(d, req.user.id, 'knowledge.review', 'knowledge', entry.id);
      res.json({
        data: camel(
          await d.one('SELECT * FROM tri_thuc_chatbot WHERE id=?', entry.id),
        ),
      });
    },
  );
  app.delete(
    '/api/admin/knowledge/:id',
    permission('knowledge'),
    async (req, res) => {
      assert(
        await d.one(
          'SELECT id FROM tri_thuc_chatbot WHERE id=?',
          req.params.id,
        ),
        404,
        'Không tìm thấy tri thức.',
      );
      await d.update(
        'tri_thuc_chatbot',
        {
          active: 0,
        },
        req.params.id,
      );
      await audit(
        d,
        req.user.id,
        'knowledge.deactivate',
        'knowledge',
        req.params.id,
      );
      res.json({
        data: {
          deactivated: true,
        },
      });
    },
  );
  app.get(
    '/api/admin/safety-rules',
    permission('knowledge'),
    async (req, res) =>
      res.json({
        data: await Promise.all(
          (await d.all('SELECT * FROM quy_tac_an_toan')).map(async (x) => ({
            ...camel(x),
            keywords: (
              await d.all(
                'SELECT keyword FROM tu_khoa_canh_bao WHERE rule_id=?',
                x.id,
              )
            ).map((k) => k.keyword),
          })),
        ),
      }),
  );
  app.patch(
    '/api/admin/safety-rules/:id',
    permission('knowledge'),
    async (req, res) => {
      const old = await d.one(
        'SELECT * FROM quy_tac_an_toan WHERE id=?',
        req.params.id,
      );
      assert(old, 404, 'Không tìm thấy quy tắc.');
      assert(
        text(req.body.response || old.response, 5000),
        400,
        'Nội dung cảnh báo không được trống.',
      );
      await d.transaction(async () => {
        await d.update(
          'quy_tac_an_toan',
          {
            name: text(req.body.name || old.name, 200),
            pattern: text(req.body.pattern || old.pattern, 2000),
            response: text(req.body.response || old.response, 5000),
            active:
              req.body.active === undefined
                ? old.active
                : req.body.active
                  ? 1
                  : 0,
          },
          old.id,
        );
        if (req.body.keywords !== undefined) {
          assert(
            Array.isArray(req.body.keywords) &&
              req.body.keywords.length > 0 &&
              req.body.keywords.length <= 100,
            400,
            'Cần 1–100 từ khóa.',
          );
          await d.run('DELETE FROM tu_khoa_canh_bao WHERE rule_id=?', old.id);
          for (const k of req.body.keywords) {
            assert(text(k, 100), 400, 'Từ khóa không hợp lệ.');
            await d.insert('tu_khoa_canh_bao', {
              rule_id: old.id,
              keyword: text(k, 100),
            });
          }
        }
        await audit(d, req.user.id, 'safety_rule.update', 'rule', old.id);
      });
      res.json({
        data: camel(
          await d.one('SELECT * FROM quy_tac_an_toan WHERE id=?', old.id),
        ),
      });
    },
  );
  app.get('/api/admin/support', permission('support'), async (req, res) =>
    res.json({
      data: (
        await d.all(
          'SELECT s.*,u.name user_name,c.title session_title FROM yeu_cau_ho_tro s JOIN nguoi_dung u ON u.id=s.user_id JOIN cuoc_hoi_thoai c ON c.id=s.session_id ORDER BY s.id DESC',
        )
      ).map(camel),
    }),
  );
  app.get(
    '/api/admin/support/:id/messages',
    permission('support'),
    async (req, res) => {
      const s = await d.one(
        'SELECT * FROM yeu_cau_ho_tro WHERE id=?',
        req.params.id,
      );
      assert(s, 404, 'Không tìm thấy yêu cầu.');
      res.json({
        data: (
          await d.all(
            'SELECT * FROM tin_nhan WHERE session_id=? AND id>? ORDER BY id',
            s.session_id,
            Number(req.query.after) || 0,
          )
        ).map(camel),
      });
    },
  );
  app.patch(
    '/api/admin/support/:id',
    permission('support'),
    async (req, res) => {
      const s = await d.one(
        'SELECT * FROM yeu_cau_ho_tro WHERE id=?',
        req.params.id,
      );
      assert(s, 404, 'Không tìm thấy yêu cầu.');
      const status = req.body.status || s.status,
        reply = text(req.body.reply, 5000);
      assert(
        ['pending', 'in_progress', 'resolved'].includes(status),
        400,
        'Trạng thái hỗ trợ không hợp lệ.',
      );
      assert(
        status !== 'resolved' || reply,
        400,
        'Cần nội dung trả lời trước khi kết thúc hỗ trợ.',
      );
      await d.transaction(async () => {
        await d.update(
          'yeu_cau_ho_tro',
          {
            status,
            reply,
            handler_id: req.user.id,
            updated_at: now(),
          },
          s.id,
        );
        if (reply)
          await d.insert('tin_nhan', {
            session_id: s.session_id,
            role: 'assistant',
            content: `Dược sĩ/nhân viên ${req.user.name}: ${reply}`,
            mode: 'pharmacist',
          });
        await audit(d, req.user.id, 'support.reply', 'support', s.id);
      });
      res.json({
        data: camel(
          await d.one('SELECT * FROM yeu_cau_ho_tro WHERE id=?', s.id),
        ),
      });
    },
  );
}
