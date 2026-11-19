import bcrypt from 'bcryptjs';
import { daysFromNow, now, slugify } from './database.js';
export const defaultSettings = {
  storeName: 'Nhà thuốc An Tâm',
  shippingFee: 25000,
  freeShippingThreshold: 299000,
  lowStockThreshold: 15,
  expiryWarningDays: 60,
  otpTtlMinutes: 10,
  paymentTimeoutMinutes: 30,
  demoMode: true,
  chatbotEnabled: true,
  returnWindowDays: 7,
  maxUploadMb: 5,
  otpMode: 'demo',
  paymentProvider: 'demo',
};
export const permissionNames = {
  catalog: 'Quản lý thuốc và danh mục',
  inventory: 'Quản lý kho',
  orders: 'Xử lý đơn hàng',
  prescriptions: 'Duyệt đơn thuốc',
  promotions: 'Quản lý khuyến mãi',
  reports: 'Xem báo cáo',
  support: 'Hỗ trợ khách hàng',
  users: 'Quản trị tài khoản',
  settings: 'Cấu hình hệ thống',
  knowledge: 'Quản lý tri thức chatbot',
  audit: 'Xem nhật ký',
  backup: 'Sao lưu dữ liệu',
};
export async function seedDatabase(
  d,
  { demoData = true, sampleCatalogOwnerId = null } = {},
) {
  for (const [key, value] of Object.entries(defaultSettings))
    await d.run(
      'INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)',
      key,
      JSON.stringify(value),
    );
  for (const name of ['customer', 'staff', 'admin'])
    await d.run('INSERT OR IGNORE INTO vai_tro(name) VALUES(?)', name);
  for (const [code, name] of Object.entries(permissionNames))
    await d.run(
      'INSERT OR IGNORE INTO quyen(code,name) VALUES(?,?)',
      code,
      name,
    );
  for (const role of await d.all('SELECT * FROM vai_tro')) {
    const permitted =
      role.name === 'admin'
        ? Object.keys(permissionNames)
        : role.name === 'staff'
          ? [
              'catalog',
              'inventory',
              'orders',
              'prescriptions',
              'promotions',
              'reports',
              'support',
            ]
          : [];
    for (const code of permitted)
      await d.run(
        'INSERT OR IGNORE INTO quyen_vai_tro(role_id,permission_id) VALUES(?,?)',
        role.id,
        (await d.one('SELECT id FROM quyen WHERE code=?', code)).id,
      );
  }
  if (!demoData && !sampleCatalogOwnerId) return;
  await d.transaction(async () => {
    if (demoData && (await d.one('SELECT COUNT(*) n FROM nguoi_dung')).n)
      return;
    if (!demoData && (await d.one('SELECT id FROM thuoc LIMIT 1'))) return;
    if (demoData) {
      const hash = bcrypt.hashSync('Demo@123', 10);
      const users = [
        ['Nguyễn Minh Anh', 'khach@antam.vn', '0901234567', 'customer', null],
        [
          'Dược sĩ Trần Thanh Hà',
          'duocsi@antam.vn',
          '0902223344',
          'staff',
          'pharmacist',
        ],
        ['Quản trị An Tâm', 'admin@antam.vn', '0903334455', 'admin', null],
        ['Lê Thu Hương', 'huong@antam.vn', '0904445566', 'customer', null],
        [
          'Nhân viên kho Minh',
          'kho@antam.vn',
          '0905556677',
          'staff',
          'warehouse',
        ],
      ];
      for (const [name, email, phone, role, title] of users) {
        const id = await d.insert('nguoi_dung', {
          name,
          email,
          phone,
          password_hash: hash,
          active: 1,
          verified: 1,
          created_at: now(),
        });
        await d.insert('nguoi_dung_vai_tro', {
          user_id: id,
          role_id: (await d.one('SELECT id FROM vai_tro WHERE name=?', role))
            .id,
        });
        await d.insert(
          role === 'customer'
            ? 'khach_hang'
            : role === 'staff'
              ? 'nhan_vien'
              : 'quan_tri_vien',
          role === 'staff'
            ? {
                id,
                job_title: title,
              }
            : {
                id,
              },
        );
        if (title === 'warehouse')
          await d.insert('phan_quyen', {
            user_id: id,
            permission_id: (
              await d.one('SELECT id FROM quyen WHERE code=?', 'prescriptions')
            ).id,
            allowed: 0,
          });
        if (role === 'customer') {
          await d.insert('gio_hang', {
            user_id: id,
          });
          await d.insert('dia_chi_giao_hang', {
            user_id: id,
            recipient: name,
            phone,
            line1: id === 1 ? '24 Nguyễn Văn Cừ' : '18 Lý Thường Kiệt',
            ward: 'Phường Võ Cường',
            district: 'Thành phố Bắc Ninh',
            city: 'Bắc Ninh',
            is_default: 1,
          });
        }
      }
    }
    const operatorId = demoData ? 2 : sampleCatalogOwnerId;
    const cats = [
      [
        'Thuốc không kê đơn',
        'thuoc-khong-ke-don',
        'Thuốc cần được sử dụng đúng hướng dẫn',
      ],
      [
        'Vitamin & khoáng chất',
        'vitamin-khoang-chat',
        'Sản phẩm bổ sung dưỡng chất',
      ],
      ['Chăm sóc cá nhân', 'cham-soc-ca-nhan', 'Chăm sóc sức khỏe hằng ngày'],
      ['Thiết bị y tế', 'thiet-bi-y-te', 'Dụng cụ và vật tư y tế'],
      ['Thuốc kê đơn', 'thuoc-ke-don', 'Cần đơn thuốc và dược sĩ kiểm duyệt'],
      ['Mẹ & bé', 'me-va-be', 'Chăm sóc mẹ và bé'],
    ];
    const categoryIds = [];
    for (const [name, slug, description] of cats) {
      const row = await d.one(
        'SELECT id FROM danh_muc WHERE slug=? OR name=?',
        slug,
        name,
      );
      categoryIds.push(
        row?.id ?? (await d.insert('danh_muc', { name, slug, description })),
      );
    }
    const manufacturerIds = [];
    for (const [name, country] of [
      ['An Tâm Pharma', 'Việt Nam'],
      ['An Khang Healthcare', 'Việt Nam'],
      ['Wellness Labs', 'Đức'],
      ['Healthy Life', 'Úc'],
    ]) {
      const row = await d.one('SELECT id FROM nha_san_xuat WHERE name=?', name);
      manufacturerIds.push(
        row?.id ?? (await d.insert('nha_san_xuat', { name, country })),
      );
    }
    const primaryName = 'Công ty Dược phẩm An Khang';
    const secondaryName = 'Thiết bị Y tế Bình An';
    const supplier = await d.one(
      'SELECT id FROM nha_cung_cap WHERE name=?',
      primaryName,
    );
    const supplierId =
      supplier?.id ??
      (await d.insert('nha_cung_cap', {
        name: primaryName,
        email: 'kho@example.test',
        phone: '0243555666',
        address: 'Bắc Ninh',
      }));
    if (
      !(await d.one('SELECT id FROM nha_cung_cap WHERE name=?', secondaryName))
    ) {
      await d.insert('nha_cung_cap', {
        name: secondaryName,
        email: 'vat-tu@example.test',
        phone: '0243666777',
        address: 'Hà Nội',
      });
    }
    const products = [
      [
        'Vitamin C 1000mg',
        2,
        3,
        'Vitamin C',
        'Hỗ trợ bổ sung vitamin C cho chế độ dinh dưỡng hằng ngày.',
        'Tuýp 20 viên',
        85000,
        105000,
        'vitamin-c',
        false,
        true,
        160,
      ],
      [
        'Omega 3 Fish Oil',
        2,
        4,
        'Dầu cá tinh chế',
        'Sản phẩm bổ sung dinh dưỡng từ dầu cá.',
        'Hộp 60 viên',
        215000,
        255000,
        'omega-3',
        false,
        true,
        84,
      ],
      [
        'Nước muối sinh lý 0,9%',
        3,
        1,
        'Natri clorid 0,9%',
        'Dung dịch vệ sinh theo hướng dẫn trên bao bì.',
        'Chai 500 ml',
        18000,
        22000,
        'saline',
        false,
        true,
        210,
      ],
      [
        'Khẩu trang y tế 4 lớp',
        4,
        2,
        'Vải không dệt',
        'Vật tư bảo vệ cá nhân sử dụng một lần.',
        'Hộp 50 chiếc',
        45000,
        55000,
        'mask',
        false,
        true,
        130,
      ],
      [
        'Men vi sinh Bio Balance',
        2,
        3,
        'Lợi khuẩn',
        'Sản phẩm bổ sung lợi khuẩn.',
        'Hộp 20 gói',
        169000,
        195000,
        'probiotic',
        false,
        true,
        58,
      ],
      [
        'Calcium D3 Plus',
        2,
        4,
        'Calci, vitamin D3',
        'Sản phẩm bổ sung calci và vitamin D3.',
        'Hộp 60 viên',
        189000,
        220000,
        'calcium',
        false,
        true,
        75,
      ],
      [
        'Bộ sơ cứu gia đình',
        4,
        2,
        'Gạc, băng y tế',
        'Bộ dụng cụ sơ cứu cơ bản cho gia đình.',
        'Bộ',
        129000,
        149000,
        'first-aid',
        false,
        true,
        43,
      ],
      [
        'Nhiệt kế điện tử',
        4,
        2,
        'Thiết bị đo thân nhiệt',
        'Thiết bị đo nhiệt độ điện tử tại nhà.',
        'Chiếc',
        99000,
        125000,
        'thermometer',
        false,
        true,
        27,
      ],
      [
        'Paracetamol 500mg',
        1,
        1,
        'Paracetamol 500mg',
        'Thuốc không kê đơn. Tham khảo dược sĩ trước khi sử dụng.',
        'Hộp 10 vỉ',
        35000,
        40000,
        'paracetamol',
        false,
        false,
        160,
      ],
      [
        'Amoxicillin 500mg',
        5,
        1,
        'Amoxicillin 500mg',
        'Thuốc kê đơn. Chỉ cung cấp sau khi dược sĩ duyệt đơn thuốc hợp lệ.',
        'Hộp 20 viên',
        68000,
        null,
        'amoxicillin',
        true,
        false,
        90,
      ],
      [
        'Dung dịch rửa tay dịu nhẹ',
        3,
        2,
        'Sản phẩm vệ sinh',
        'Chăm sóc vệ sinh bàn tay hằng ngày.',
        'Chai 250 ml',
        59000,
        72000,
        'handwash',
        false,
        false,
        13,
      ],
      [
        'Vitamin D3 Kids',
        6,
        4,
        'Vitamin D3',
        'Sản phẩm bổ sung vitamin D dành cho trẻ, cần tư vấn của nhân viên chuyên môn.',
        'Chai 10 ml',
        145000,
        170000,
        'vitamin-d',
        false,
        true,
        68,
      ],
      [
        'Gạc y tế vô trùng',
        4,
        2,
        'Gạc vô trùng',
        'Vật tư y tế dùng theo hướng dẫn.',
        'Hộp 10 gói',
        32000,
        38000,
        'first-aid',
        false,
        false,
        95,
      ],
      [
        'Kẽm Zinc 15mg',
        2,
        3,
        'Kẽm',
        'Sản phẩm bổ sung kẽm cho chế độ dinh dưỡng.',
        'Hộp 30 viên',
        115000,
        135000,
        'vitamin-c',
        false,
        false,
        52,
      ],
      [
        'Thuốc kê đơn Azithromycin',
        5,
        1,
        'Azithromycin',
        'Thuốc kê đơn. Cần thăm khám và đơn thuốc hợp lệ.',
        'Hộp 6 viên',
        98000,
        null,
        'amoxicillin',
        true,
        false,
        44,
      ],
      [
        'Bông tẩy trang mềm mại',
        3,
        2,
        'Bông cotton',
        'Sản phẩm chăm sóc cá nhân.',
        'Túi 120 miếng',
        39000,
        49000,
        'saline',
        false,
        false,
        0,
      ],
    ];
    const receipt = await d.insert('phieu_nhap_kho', {
      code: 'PN-DEMO-001',
      supplier_id: supplierId,
      user_id: operatorId,
      total: 8500000,
    });
    const productIds = [];
    for (const [
      name,
      category_id,
      manufacturer_id,
      ingredient,
      description,
      unit,
      price,
      old_price,
      asset,
      rx,
      featured,
      stock,
    ] of products) {
      const id = await d.insert('thuoc', {
        name,
        category_id: categoryIds[category_id - 1],
        manufacturer_id: manufacturerIds[manufacturer_id - 1],
        slug: slugify(name),
        ingredient,
        description,
        unit,
        price,
        old_price,
        image: `/assets/products/${asset}.svg`,
        prescription_required: rx ? 1 : 0,
        featured: featured ? 1 : 0,
        usage:
          'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.',
        warning:
          'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
      });
      productIds.push(id);
      if (stock > 0) {
        const early = Math.floor(stock * 0.3),
          late = stock - early;
        for (const [suffix, quantity, expiry] of [
          ['A', early, daysFromNow(id === 11 ? 35 : 240)],
          ['B', late, daysFromNow(540)],
        ]) {
          const batch = await d.insert('lo_thuoc', {
            product_id: id,
            receipt_id: receipt,
            batch_number: `AT${String(id).padStart(3, '0')}${suffix}`,
            quantity,
            cost: Math.round(price * 0.65),
            manufactured_at: daysFromNow(-180),
            expires_at: expiry,
          });
          await d.insert('lich_su_ton_kho', {
            product_id: id,
            batch_id: batch,
            user_id: operatorId,
            type: 'receipt',
            quantity,
            reason: 'Nhập dữ liệu mẫu',
          });
        }
      }
    }
    // Expired batch exists for alert QA, excluded from all sellable quantities.
    const expired = await d.insert('lo_thuoc', {
      product_id: productIds[2],
      receipt_id: receipt,
      batch_number: 'AT003-HH',
      quantity: 8,
      cost: 9000,
      manufactured_at: daysFromNow(-700),
      expires_at: daysFromNow(-5),
    });
    await d.insert('lich_su_ton_kho', {
      product_id: productIds[2],
      batch_id: expired,
      user_id: operatorId,
      type: 'receipt',
      quantity: 8,
      reason: 'Lô mẫu đã hết hạn, không bán',
    });
    await d.insert('khuyen_mai', {
      code: 'KHOEMANH10',
      name: 'Chăm sức khỏe, nhận ưu đãi 10%',
      type: 'percent',
      value: 10,
      min_order: 150000,
      max_discount: 50000,
      usage_limit: 500,
      start_date: daysFromNow(-30),
      end_date: daysFromNow(120),
    });
    await d.insert('khuyen_mai', {
      code: 'ANTAM30',
      name: 'Giảm 30.000đ cho đơn từ 299.000đ',
      type: 'fixed',
      value: 30000,
      min_order: 299000,
      max_discount: 30000,
      usage_limit: 200,
      start_date: daysFromNow(-10),
      end_date: daysFromNow(60),
    });
    if (!demoData) return;
    const address = await d.one(
      'SELECT * FROM dia_chi_giao_hang WHERE user_id=1',
    );
    for (let i = 0; i < 10; i++) {
      const age = 9 - i,
        product = await d.one('SELECT * FROM thuoc WHERE id=?', (i % 8) + 1),
        qty = (i % 2) + 1,
        subtotal = product.price * qty,
        ship = subtotal >= 299000 ? 0 : 25000;
      const status =
        i < 7
          ? 'delivered'
          : i === 7
            ? 'packing'
            : i === 8
              ? 'shipping'
              : 'pending';
      const created = new Date(
        Date.now() - age * 86400000 - 3600000,
      ).toISOString();
      const id = await d.insert('don_hang', {
        user_id: i % 3 === 0 ? 4 : 1,
        code: `AT${new Date().getFullYear()}${String(100 + i).padStart(5, '0')}`,
        status,
        payment_method: i % 2 ? 'cod' : 'demo',
        payment_status: i < 7 || i % 2 === 0 ? 'paid' : 'unpaid',
        subtotal,
        shipping_fee: ship,
        total: subtotal + ship,
        address_json: JSON.stringify({
          recipient: address.recipient,
          phone: address.phone,
          line1: address.line1,
          ward: address.ward,
          district: address.district,
          city: address.city,
        }),
        created_at: created,
        stock_deducted: status === 'pending' ? 0 : 1,
      });
      await d.insert('chi_tiet_don_hang', {
        order_id: id,
        product_id: product.id,
        name: product.name,
        unit: product.unit,
        image: product.image,
        price: product.price,
        quantity: qty,
        prescription_required: 0,
      });
      await d.insert('order_status_history', {
        order_id: id,
        status,
        user_id: 2,
        note: 'Đơn hàng mẫu',
        created_at: created,
      });
      if (i < 7 || i % 2 === 0)
        await d.insert('giao_dich_thanh_toan', {
          order_id: id,
          reference: `DEMO-SEED-${id}`,
          type: 'payment',
          provider: i % 2 ? 'cod' : 'demo',
          amount: subtotal + ship,
          status: 'success',
          created_at: created,
        });
      if (status !== 'pending') {
        const batch = await d.one(
          'SELECT * FROM lo_thuoc WHERE product_id=? AND expires_at>? ORDER BY expires_at,id LIMIT 1',
          product.id,
          daysFromNow(0),
        );
        await d.run(
          'UPDATE lo_thuoc SET quantity=quantity-? WHERE id=?',
          qty,
          batch.id,
        );
        await d.insert('stock_allocations', {
          order_id: id,
          batch_id: batch.id,
          quantity: qty,
        });
        await d.insert('lich_su_ton_kho', {
          product_id: product.id,
          batch_id: batch.id,
          order_id: id,
          user_id: 2,
          type: 'sale',
          quantity: -qty,
          reason: 'Xuất đơn mẫu',
          created_at: created,
        });
      } else {
        const batch = await d.one(
          'SELECT * FROM lo_thuoc WHERE product_id=? AND expires_at>? ORDER BY expires_at,id LIMIT 1',
          product.id,
          daysFromNow(0),
        );
        await d.run(
          'UPDATE lo_thuoc SET reserved=reserved+? WHERE id=?',
          qty,
          batch.id,
        );
        await d.insert('stock_allocations', {
          order_id: id,
          batch_id: batch.id,
          quantity: qty,
        });
      }
    }
    await d.insert('danh_gia', {
      order_id: 2,
      product_id: 2,
      user_id: 1,
      rating: 5,
      comment: 'Gói hàng cẩn thận, thông tin sản phẩm rõ ràng.',
    });
    for (const [title, keywords, content] of [
      [
        'Chính sách giao hàng',
        'giao hàng,phí ship,vận chuyển,miễn phí',
        'Phí giao hàng mẫu là 25.000đ; miễn phí từ 299.000đ. Bạn có thể xem phí chính xác ở bước đặt hàng. Đây là cấu hình demo có thể thay đổi.',
      ],
      [
        'Mua thuốc kê đơn',
        'kê đơn,đơn thuốc,kháng sinh,amoxicillin',
        'Thuốc kê đơn cần ảnh hoặc PDF đơn thuốc hợp lệ. Dược sĩ sẽ kiểm duyệt trước khi xác nhận và giao hàng. Chatbot không kê đơn hoặc thay đổi chỉ định của bác sĩ.',
      ],
      [
        'Thanh toán',
        'thanh toán,cod,chuyển khoản',
        'Bạn có thể chọn COD hoặc cổng thanh toán mô phỏng trong bản đồ án. Thanh toán mô phỏng không thu tiền thật.',
      ],
      [
        'Đổi trả và hoàn tiền',
        'đổi trả,hoàn tiền,hủy đơn',
        'Mở mục Đơn hàng, chọn đơn rồi gửi yêu cầu kèm lý do. Nhân viên sẽ kiểm tra điều kiện. Thuốc hoàn trả chỉ nhập lại kho khi còn nguyên niêm phong và đảm bảo chất lượng.',
      ],
      [
        'Tư vấn chuyên môn',
        'tư vấn,dược sĩ,liều dùng,tác dụng',
        'Tôi hỗ trợ thông tin sản phẩm và quy trình mua hàng. Về liều dùng, tương tác hoặc lựa chọn điều trị, hãy yêu cầu dược sĩ tư vấn hoặc thăm khám bác sĩ. Không tự ý dùng thuốc kê đơn.',
      ],
    ])
      await d.insert('tri_thuc_chatbot', {
        title,
        keywords,
        content,
        source: 'Quy trình trình diễn theo báo cáo Nhóm 11',
        reviewed_at: now(),
        reviewed_by: 2,
      });
    const rule = await d.insert('quy_tac_an_toan', {
      name: 'Dấu hiệu nguy hiểm',
      pattern: 'khó thở,đau ngực,bất tỉnh,co giật,ngất,phản vệ',
      response:
        'Các dấu hiệu bạn mô tả cần được nhân viên y tế đánh giá khẩn cấp. Hãy đến cơ sở y tế gần nhất hoặc liên hệ cấp cứu tại địa phương. Không chờ tư vấn qua chatbot. Tôi sẽ tạo yêu cầu chuyển dược sĩ.',
    });
    for (const keyword of [
      'khó thở',
      'đau ngực',
      'bất tỉnh',
      'co giật',
      'ngất',
      'phản vệ',
    ])
      await d.insert('tu_khoa_canh_bao', {
        rule_id: rule,
        keyword,
      });
    await d.insert('nhat_ky_hoat_dong', {
      user_id: 3,
      action: 'system.seed',
      entity: 'system',
      detail:
        'Khởi tạo dữ liệu minh họa cho đồ án, không dùng làm dữ liệu y tế thực.',
    });
  });
}
