-- Đồng bộ 100 sản phẩm + hình ảnh Nhà thuốc Long Châu cho schema antam trên Supabase PostgreSQL.
-- An toàn khi chạy trên DB đang hoạt động: không xóa/ghi đè đơn hàng, người dùng, hoặc lô tồn kho hiện có.
-- Chạy toàn bộ file này trong Supabase Dashboard -> SQL Editor.

BEGIN;
SET LOCAL search_path TO antam, pg_catalog;

-- 1. Đồng bộ sequence tránh xung đột ID nếu dữ liệu cũ từng chèn thủ công
SELECT setval(pg_get_serial_sequence('antam.danh_muc', 'id'), COALESCE((SELECT MAX(id) FROM antam.danh_muc), 1), (SELECT EXISTS (SELECT 1 FROM antam.danh_muc)));
SELECT setval(pg_get_serial_sequence('antam.nha_san_xuat', 'id'), COALESCE((SELECT MAX(id) FROM antam.nha_san_xuat), 1), (SELECT EXISTS (SELECT 1 FROM antam.nha_san_xuat)));
SELECT setval(pg_get_serial_sequence('antam.nha_cung_cap', 'id'), COALESCE((SELECT MAX(id) FROM antam.nha_cung_cap), 1), (SELECT EXISTS (SELECT 1 FROM antam.nha_cung_cap)));
SELECT setval(pg_get_serial_sequence('antam.phieu_nhap_kho', 'id'), COALESCE((SELECT MAX(id) FROM antam.phieu_nhap_kho), 1), (SELECT EXISTS (SELECT 1 FROM antam.phieu_nhap_kho)));
SELECT setval(pg_get_serial_sequence('antam.thuoc', 'id'), COALESCE((SELECT MAX(id) FROM antam.thuoc), 1), (SELECT EXISTS (SELECT 1 FROM antam.thuoc)));
SELECT setval(pg_get_serial_sequence('antam.lo_thuoc', 'id'), COALESCE((SELECT MAX(id) FROM antam.lo_thuoc), 1), (SELECT EXISTS (SELECT 1 FROM antam.lo_thuoc)));
SELECT setval(pg_get_serial_sequence('antam.lich_su_ton_kho', 'id'), COALESCE((SELECT MAX(id) FROM antam.lich_su_ton_kho), 1), (SELECT EXISTS (SELECT 1 FROM antam.lich_su_ton_kho)));

-- 2. Bổ sung danh mục & hãng sản xuất còn thiếu
INSERT INTO antam.danh_muc (name, slug, description, active) VALUES ('Thuốc không kê đơn', 'thuoc-khong-ke-don', 'Thuốc cần được sử dụng đúng hướng dẫn', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.danh_muc (name, slug, description, active) VALUES ('Vitamin & khoáng chất', 'vitamin-khoang-chat', 'Sản phẩm bổ sung dưỡng chất', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.danh_muc (name, slug, description, active) VALUES ('Chăm sóc cá nhân', 'cham-soc-ca-nhan', 'Chăm sóc sức khỏe hằng ngày', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.danh_muc (name, slug, description, active) VALUES ('Thiết bị y tế', 'thiet-bi-y-te', 'Dụng cụ và vật tư y tế', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.danh_muc (name, slug, description, active) VALUES ('Thuốc kê đơn', 'thuoc-ke-don', 'Cần đơn thuốc và dược sĩ kiểm duyệt', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.danh_muc (name, slug, description, active) VALUES ('Mẹ & bé', 'me-va-be', 'Chăm sóc mẹ và bé', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.danh_muc (name, slug, description, active) VALUES ('Dược mỹ phẩm', 'duoc-my-pham', 'Chăm sóc da và làm đẹp chuẩn nhà thuốc', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.danh_muc (name, slug, description, active) VALUES ('Thực phẩm chức năng', 'thuc-pham-chuc-nang', 'Hỗ trợ tăng cường và bảo vệ sức khỏe', 1) ON CONFLICT DO NOTHING;

INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('An Tâm Pharma', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('An Khang Healthcare', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Wellness Labs', 'Đức', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Healthy Life', 'Úc', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Gsk', 'Anh', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Upsa Sas', 'Pháp', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Dhg', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('United', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Mega We Care', 'Thái Lan', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Engelhard', 'Đức', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Ipsen', 'Pháp', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Sanofi', 'Pháp', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Pharimexco', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Reckitt Benckiser', 'Anh', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Traphaco', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Hisamitsu', 'Nhật Bản', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Vidipha', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Dhc', 'Nhật Bản', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Bayer', 'Đức', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Np Pharma', 'Ba Lan', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Ostelin', 'Úc', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Mediplantex', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Blackmores', 'Úc', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Listerine', 'Thái Lan', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Xisat', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Lactacyd', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Hoa Linh', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Sensodyne', 'Anh', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('La Beauty', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Silcot', 'Nhật Bản', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Fobelife', 'Quốc tế', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Pharmedic', 'Quốc tế', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('V.Rohto', 'Nhật Bản', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Omron', 'Nhật Bản', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Mediusa', 'Quốc tế', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Yuwell', 'Quốc tế', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Urgo', 'Pháp', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Vĩnh Phúc', 'Quốc tế', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Hdpharma', 'Quốc tế', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Agimexpharm', 'Quốc tế', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Thiên Thanh', 'Quốc tế', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Humasis', 'Quốc tế', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Imexpharm', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Trường Thọ Pharma', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Tipharco', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Tv.Pharm', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Organon', 'Hà Lan', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Nam Dược', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Biogaia', 'Thụy Điển', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Ergopharma', 'Slovenia', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Fysoline', 'Pháp', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Densmore', 'Pháp', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Promum', 'Ba Lan', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Laroche Posay', 'Pháp', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Bioderma', 'Pháp', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Anessa', 'Nhật Bản', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Cerave', 'Pháp', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Glenmark', 'Ấn Độ', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Cetaphil', 'Canada', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Eucerin', 'Đức', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Garnier', 'Pháp', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Vitatree', 'Úc', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Ecogreen', 'Mỹ', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Thái Minh', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Tâm Bình', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Hongjitang', 'Trung Quốc', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Opc', 'Việt Nam', 1) ON CONFLICT DO NOTHING;
INSERT INTO antam.nha_san_xuat (name, country, active) VALUES ('Jpanwell', 'Nhật Bản', 1) ON CONFLICT DO NOTHING;

INSERT INTO antam.nha_cung_cap (name, email, phone, address, active) VALUES ('Công ty Dược phẩm An Khang', 'kho@example.test', '0243555666', 'Bắc Ninh', 1) ON CONFLICT DO NOTHING;

-- 3. Cập nhật ảnh 16 sản phẩm cũ sang ảnh Long Châu & thêm sản phẩm 17..100 kèm lô tồn kho
DO $$
DECLARE
  v_now TEXT := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_supplier_id BIGINT;
  v_user_id BIGINT;
  v_receipt_id BIGINT;
  v_pid BIGINT;
  v_bid BIGINT;
BEGIN
  SELECT id INTO v_supplier_id FROM antam.nha_cung_cap WHERE name = 'Công ty Dược phẩm An Khang' LIMIT 1;
  SELECT COALESCE(
    (SELECT u.id FROM antam.nguoi_dung u JOIN antam.nguoi_dung_vai_tro r ON r.user_id = u.id JOIN antam.vai_tro v ON v.id = r.role_id WHERE v.name = 'admin' ORDER BY u.id LIMIT 1),
    (SELECT id FROM antam.nguoi_dung ORDER BY id LIMIT 1)
  ) INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO antam.phieu_nhap_kho (code, supplier_id, user_id, total)
    VALUES ('PN-LONGCHAU-100', v_supplier_id, v_user_id, 0)
    ON CONFLICT (code) DO NOTHING;
    SELECT id INTO v_receipt_id FROM antam.phieu_nhap_kho WHERE code = 'PN-LONGCHAU-100' LIMIT 1;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Wellness Labs' ORDER BY id LIMIT 1),
    'Vitamin C 1000mg', 'vitamin-c-1000mg', 'Vitamin C', 'Hỗ trợ bổ sung vitamin C cho chế độ dinh dưỡng hằng ngày.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Tuýp 20 viên', 85000, 105000, '/assets/products/1.jpg', 0, 1, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT001A', 46, 0, 55250, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 46, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT001B', 112, 0, 55250, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 112, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Healthy Life' ORDER BY id LIMIT 1),
    'Omega 3 Fish Oil', 'omega-3-fish-oil', 'Dầu cá tinh chế', 'Sản phẩm bổ sung dinh dưỡng từ dầu cá.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 60 viên', 215000, 255000, '/assets/products/2.jpg', 0, 1, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT002A', 23, 0, 139750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 23, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT002B', 59, 0, 139750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 59, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'cham-soc-ca-nhan' OR name = 'Chăm sóc cá nhân' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'An Tâm Pharma' ORDER BY id LIMIT 1),
    'Nước muối sinh lý 0,9%', 'nuoc-muoi-sinh-ly-0-9', 'Natri clorid 0,9%', 'Dung dịch vệ sinh theo hướng dẫn trên bao bì.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai 500 ml', 18000, 22000, '/assets/products/3.jpg', 0, 1, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT003A', 62, 0, 11700, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 62, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT003B', 147, 0, 11700, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 147, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thiet-bi-y-te' OR name = 'Thiết bị y tế' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'An Khang Healthcare' ORDER BY id LIMIT 1),
    'Khẩu trang y tế 4 lớp', 'khau-trang-y-te-4-lop', 'Vải không dệt', 'Vật tư bảo vệ cá nhân sử dụng một lần.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 50 chiếc', 45000, 55000, '/assets/products/4.jpg', 0, 1, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT004A', 37, 0, 29250, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 37, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT004B', 91, 0, 29250, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 91, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Wellness Labs' ORDER BY id LIMIT 1),
    'Men vi sinh Bio Balance', 'men-vi-sinh-bio-balance', 'Lợi khuẩn', 'Sản phẩm bổ sung lợi khuẩn.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 20 gói', 169000, 195000, '/assets/products/5.jpg', 0, 1, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT005A', 16, 0, 109850, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 16, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT005B', 41, 0, 109850, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 41, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Healthy Life' ORDER BY id LIMIT 1),
    'Calcium D3 Plus', 'calcium-d3-plus', 'Calci, vitamin D3', 'Sản phẩm bổ sung calci và vitamin D3.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 60 viên', 189000, 220000, '/assets/products/6.png', 0, 1, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT006A', 20, 0, 122850, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 20, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT006B', 53, 0, 122850, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 53, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thiet-bi-y-te' OR name = 'Thiết bị y tế' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'An Khang Healthcare' ORDER BY id LIMIT 1),
    'Bộ sơ cứu gia đình', 'bo-so-cuu-gia-dinh', 'Gạc, băng y tế', 'Bộ dụng cụ sơ cứu cơ bản cho gia đình.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Bộ', 129000, 149000, '/assets/products/7.png', 0, 1, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT007A', 11, 0, 83850, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 11, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT007B', 31, 0, 83850, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 31, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thiet-bi-y-te' OR name = 'Thiết bị y tế' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'An Khang Healthcare' ORDER BY id LIMIT 1),
    'Nhiệt kế điện tử', 'nhiet-ke-dien-tu', 'Thiết bị đo thân nhiệt', 'Thiết bị đo nhiệt độ điện tử tại nhà.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chiếc', 99000, 125000, '/assets/products/8.jpg', 0, 1, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT008A', 6, 0, 64350, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 6, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT008B', 19, 0, 64350, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 19, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-khong-ke-don' OR name = 'Thuốc không kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'An Tâm Pharma' ORDER BY id LIMIT 1),
    'Paracetamol 500mg', 'paracetamol-500mg', 'Paracetamol 500mg', 'Thuốc không kê đơn. Tham khảo dược sĩ trước khi sử dụng.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 10 vỉ', 35000, 40000, '/assets/products/9.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT009A', 48, 0, 22750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 48, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT009B', 112, 0, 22750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 112, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-ke-don' OR name = 'Thuốc kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'An Tâm Pharma' ORDER BY id LIMIT 1),
    'Amoxicillin 500mg', 'amoxicillin-500mg', 'Amoxicillin 500mg', 'Thuốc kê đơn. Chỉ cung cấp sau khi dược sĩ duyệt đơn thuốc hợp lệ.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 20 viên', 68000, NULL, '/assets/products/10.png', 1, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT010A', 27, 0, 44200, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 27, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT010B', 63, 0, 44200, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 63, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'cham-soc-ca-nhan' OR name = 'Chăm sóc cá nhân' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'An Khang Healthcare' ORDER BY id LIMIT 1),
    'Dung dịch rửa tay dịu nhẹ', 'dung-dich-rua-tay-diu-nhe', 'Sản phẩm vệ sinh', 'Chăm sóc vệ sinh bàn tay hằng ngày.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai 250 ml', 59000, 72000, '/assets/products/11.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT011A', 3, 0, 38350, '2026-05-23', '2026-12-24')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 3, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT011B', 10, 0, 38350, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 10, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'me-va-be' OR name = 'Mẹ & bé' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Healthy Life' ORDER BY id LIMIT 1),
    'Vitamin D3 Kids', 'vitamin-d3-kids', 'Vitamin D3', 'Sản phẩm bổ sung vitamin D dành cho trẻ, cần tư vấn của nhân viên chuyên môn.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai 10 ml', 145000, 170000, '/assets/products/12.jpg', 0, 1, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT012A', 20, 0, 94250, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 20, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT012B', 48, 0, 94250, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 48, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thiet-bi-y-te' OR name = 'Thiết bị y tế' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'An Khang Healthcare' ORDER BY id LIMIT 1),
    'Gạc y tế vô trùng', 'gac-y-te-vo-trung', 'Gạc vô trùng', 'Vật tư y tế dùng theo hướng dẫn.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 10 gói', 32000, 38000, '/assets/products/13.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT013A', 28, 0, 20800, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 28, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT013B', 67, 0, 20800, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 67, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Wellness Labs' ORDER BY id LIMIT 1),
    'Kẽm Zinc 15mg', 'kem-zinc-15mg', 'Kẽm', 'Sản phẩm bổ sung kẽm cho chế độ dinh dưỡng.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 30 viên', 115000, 135000, '/assets/products/14.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT014A', 15, 0, 74750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 15, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT014B', 37, 0, 74750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 37, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-ke-don' OR name = 'Thuốc kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'An Tâm Pharma' ORDER BY id LIMIT 1),
    'Thuốc kê đơn Azithromycin', 'thuoc-ke-don-azithromycin', 'Azithromycin', 'Thuốc kê đơn. Cần thăm khám và đơn thuốc hợp lệ.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 6 viên', 98000, NULL, '/assets/products/15.jpg', 1, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT015A', 13, 0, 63700, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 13, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT015B', 31, 0, 63700, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 31, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'cham-soc-ca-nhan' OR name = 'Chăm sóc cá nhân' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'An Khang Healthcare' ORDER BY id LIMIT 1),
    'Bông tẩy trang mềm mại', 'bong-tay-trang-mem-mai', 'Bông cotton', 'Sản phẩm chăm sóc cá nhân.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Túi 120 miếng', 39000, 49000, '/assets/products/16.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-khong-ke-don' OR name = 'Thuốc không kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Gsk' ORDER BY id LIMIT 1),
    'Viên nén Panadol Extra đỏ GSK giảm mạnh các cơn đau, hạ sốt, điều trị đau đầu, đau lưng (15 vỉ x 12 viên)', 'vien-nen-panadol-extra-do-gsk-giam-manh-cac-con-dau-ha-sot-dieu-tri-dau-dau-dau-lung-15-vi-x-12-vien', 'Caffeine 65mg, Paracetamol 500mg', 'Viên nén Panadol Extra đỏ GSK giảm mạnh các cơn đau, hạ sốt, điều trị đau đầu, đau lưng (15 vỉ x 12 viên).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 15 Vỉ x 12 Viên', 252000, NULL, '/assets/products/17.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT017A', 13, 0, 163800, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 13, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT017B', 31, 0, 163800, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 31, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-khong-ke-don' OR name = 'Thuốc không kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Upsa Sas' ORDER BY id LIMIT 1),
    'Viên sủi Efferalgan 500mg UPSA SAS giảm đau, hạ sốt (4 vỉ x 4 viên)', 'vien-sui-efferalgan-500mg-upsa-sas-giam-dau-ha-sot-4-vi-x-4-vien', 'Paracetamol 500mg', 'Viên sủi Efferalgan 500mg UPSA SAS giảm đau, hạ sốt (4 vỉ x 4 viên). Dạng bào chế: Viên nén sủi bọt.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 4 Vỉ x 4 Viên', 51990, NULL, '/assets/products/18.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT018A', 18, 0, 33794, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 18, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT018B', 43, 0, 33794, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 43, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-khong-ke-don' OR name = 'Thuốc không kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Dhg' ORDER BY id LIMIT 1),
    'Thuốc Hapacol 650 DHG giảm đau, hạ sốt (10 vỉ x 5 viên)', 'thuoc-hapacol-650-dhg-giam-dau-ha-sot-10-vi-x-5-vien', 'Paracetamol 650mg', 'Thuốc Hapacol 650 DHG giảm đau, hạ sốt (10 vỉ x 5 viên). Dạng bào chế: Viên nén.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 10 vỉ x 5 viên', 28600, NULL, '/assets/products/19.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT019A', 23, 0, 18590, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 23, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT019B', 55, 0, 18590, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 55, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-khong-ke-don' OR name = 'Thuốc không kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'United' ORDER BY id LIMIT 1),
    'Thuốc Decolgen Forte United giảm các triệu chứng cảm cúm, sốt, đau họng, nghẹt mũi (30 vỉ x 4 viên)', 'thuoc-decolgen-forte-united-giam-cac-trieu-chung-cam-cum-sot-dau-hong-nghet-mui-30-vi-x-4-vien', 'Paracetamol 500mg, Phenylephrine 10mg, Chlorpheniramine 2mg', 'Thuốc Decolgen Forte United giảm các triệu chứng cảm cúm, sốt, đau họng, nghẹt mũi (30 vỉ x 4 viên). Dạng bào chế: Viên nén.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 30 Vỉ x 4 Viên', 150000, 172000, '/assets/products/20.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT020A', 28, 0, 97500, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 28, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT020B', 67, 0, 97500, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 67, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-khong-ke-don' OR name = 'Thuốc không kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Mega We Care' ORDER BY id LIMIT 1),
    'Thuốc Eugica MEGA We care điều trị ho đờm, cảm cúm, sổ mũi (10 vỉ x 10 viên)', 'thuoc-eugica-mega-we-care-dieu-tri-ho-dom-cam-cum-so-mui-10-vi-x-10-vien', 'Eucalyptol 100mg, Tinh dầu tần 0.18mg, Tinh dầu gừng 0.5mg, Menthol natural 0.5mg', 'Thuốc Eugica MEGA We care điều trị ho đờm, cảm cúm, sổ mũi (10 vỉ x 10 viên). Dạng bào chế: Viên nang mềm.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 10 Vỉ x 10 Viên', 73000, NULL, '/assets/products/21.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT021A', 33, 0, 47450, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 33, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT021B', 79, 0, 47450, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 79, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-khong-ke-don' OR name = 'Thuốc không kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Engelhard' ORDER BY id LIMIT 1),
    'Siro ho Prospan Engelhard điều trị viêm phế quản mạn tính (100ml)', 'siro-ho-prospan-engelhard-dieu-tri-viem-phe-quan-man-tinh-100ml', 'Chiết xuất cao khô lá thường xuân 17.5mg', 'Siro ho Prospan Engelhard điều trị viêm phế quản mạn tính (100ml).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai x 100ml', 93000, NULL, '/assets/products/22.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT022A', 38, 0, 60450, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 38, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT022B', 91, 0, 60450, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 91, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-khong-ke-don' OR name = 'Thuốc không kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Ipsen' ORDER BY id LIMIT 1),
    'Thuốc bột pha hỗn dịch uống Smecta Ipsen hương cam & vani', 'thuoc-bot-pha-hon-dich-uong-smecta-ipsen-huong-cam-vani', 'Diosmectite 3g', 'Thuốc bột pha hỗn dịch uống Smecta Ipsen hương cam & vani điều trị tiêu chảy, bảo vệ niêm mạc tiêu hoá (10 gói).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 10 Gói', 56000, NULL, '/assets/products/23.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT023A', 43, 0, 36400, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 43, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT023B', 103, 0, 36400, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 103, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-khong-ke-don' OR name = 'Thuốc không kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Sanofi' ORDER BY id LIMIT 1),
    'Hỗn dịch uống Phosphalugel Sanofi giảm độ axit của dạ dày (26 gói x 20g)', 'hon-dich-uong-phosphalugel-sanofi-giam-do-axit-cua-da-day-26-goi-x-20g', 'Aluminium phosphate 20%', 'Hỗn dịch uống Phosphalugel Sanofi giảm độ axit của dạ dày (26 gói x 20g).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 26 Gói x 20g', 130000, 150000, '/assets/products/24.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT024A', 48, 0, 84500, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 48, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT024B', 115, 0, 84500, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 115, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-khong-ke-don' OR name = 'Thuốc không kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Pharimexco' ORDER BY id LIMIT 1),
    'Thuốc Berberin 10mg Pharimexco điều trị lỵ, viêm ruột, tiêu chảy (100 viên)', 'thuoc-berberin-10mg-pharimexco-dieu-tri-ly-viem-ruot-tieu-chay-100-vien', 'Berberin Clorid 10mg', 'Thuốc Berberin 10mg Pharimexco điều trị lỵ, viêm ruột, tiêu chảy (100 viên). Dạng bào chế: Viên nén bao đường.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai 100 viên', 12000, NULL, '/assets/products/25.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT025A', 12, 0, 7800, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 12, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT025B', 28, 0, 7800, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 28, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-khong-ke-don' OR name = 'Thuốc không kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Reckitt Benckiser' ORDER BY id LIMIT 1),
    'Hỗn dịch Gaviscon Reckitt Benckiser điều trị trào ngược dạ dày, thực quản (24 gói x 10ml)', 'hon-dich-gaviscon-reckitt-benckiser-dieu-tri-trao-nguoc-da-day-thuc-quan-24-goi-x-10ml', 'alginate 500mg, natri bicarbonate 267mg, Calci carbonat 160mg', 'Hỗn dịch Gaviscon Reckitt Benckiser điều trị trào ngược dạ dày, thực quản (24 gói x 10ml).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 24 Gói X 10ml', 192000, NULL, '/assets/products/26.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT026A', 17, 0, 124800, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 17, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT026B', 40, 0, 124800, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 40, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-khong-ke-don' OR name = 'Thuốc không kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Traphaco' ORDER BY id LIMIT 1),
    'Viên nén Loratadin 10mg Traphaco giảm viêm mũi dị ứng, viêm kết mạc, ngứa và mày đay (1 vỉ x 10 viên)', 'vien-nen-loratadin-10mg-traphaco-giam-viem-mui-di-ung-viem-ket-mac-ngua-va-may-day-1-vi-x-10-vien', 'Loratadine 10mg', 'Viên nén Loratadin 10mg Traphaco giảm viêm mũi dị ứng, viêm kết mạc, ngứa và mày đay (1 vỉ x 10 viên).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 1 Vỉ x 10 Viên', 10000, NULL, '/assets/products/27.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT027A', 22, 0, 6500, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 22, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT027B', 52, 0, 6500, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 52, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-khong-ke-don' OR name = 'Thuốc không kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Dhg' ORDER BY id LIMIT 1),
    'Bột pha uống Oresol 245 DHG Pharma bù nước', 'bot-pha-uong-oresol-245-dhg-pharma-bu-nuoc', 'Natri clorid 520mg, Natri citrat 580mg, Glucose 2.7, Kali clorid 300mg', 'Bột pha uống Oresol 245 DHG Pharma bù nước, bổ sung chất điện giải, điều trị mất nước do tiêu chảy (20 gói x 4.1g). Dạng bào chế: Dạng bọt.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 20 gói X 4.1g', 27000, 31000, '/assets/products/28.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT028A', 27, 0, 17550, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 27, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT028B', 64, 0, 17550, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 64, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-khong-ke-don' OR name = 'Thuốc không kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Hisamitsu' ORDER BY id LIMIT 1),
    'Cao dán Salonpas Hisamitsu giảm đau vai, đau lưng, đau cơ (2 gói x 10 miếng)', 'cao-dan-salonpas-hisamitsu-giam-dau-vai-dau-lung-dau-co-2-goi-x-10-mieng', 'Methyl salicylate 6.29%, L-menthol 5.71%, DL-camphor 1.24%, Tocopheryl acetate 2%', 'Cao dán Salonpas Hisamitsu giảm đau vai, đau lưng, đau cơ (2 gói x 10 miếng). Dạng bào chế: Miếng dán.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 2 Gói x 10 Miếng', 29000, NULL, '/assets/products/29.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT029A', 32, 0, 18850, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 32, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT029B', 76, 0, 18850, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 76, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Mega We Care' ORDER BY id LIMIT 1),
    'Thuốc Enat 400 MEGA We care điều trị và dự phòng tình trạng thiếu Vitamin E (3 vỉ x 10 viên)', 'thuoc-enat-400-mega-we-care-dieu-tri-va-du-phong-tinh-trang-thieu-vitamin-e-3-vi-x-10-vien', 'Vitamin E 400iu', 'Thuốc Enat 400 MEGA We care điều trị và dự phòng tình trạng thiếu Vitamin E (3 vỉ x 10 viên). Dạng bào chế: Viên nang mềm.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 3 vỉ x 10 viên', 135000, NULL, '/assets/products/30.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT030A', 37, 0, 87750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 37, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT030B', 88, 0, 87750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 88, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Vidipha' ORDER BY id LIMIT 1),
    'Thuốc B Complex C Vidipha bổ sung các vitamin nhóm B, C (10 vỉ x 10 viên)', 'thuoc-b-complex-c-vidipha-bo-sung-cac-vitamin-nhom-b-c-10-vi-x-10-vien', 'Vitamin B1 15mg, Vitamin B2 10mg, Vitamin B6 5mg, Vitamin PP 50mg, Vitamin C', 'Thuốc B Complex C Vidipha bổ sung các vitamin nhóm B, C (10 vỉ x 10 viên). Dạng bào chế: Viên nang cứng.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp', 145000, NULL, '/assets/products/31.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT031A', 42, 0, 94250, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 42, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT031B', 100, 0, 94250, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 100, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Mega We Care' ORDER BY id LIMIT 1),
    'Viên uống hỗ trợ giảm nguy cơ thiếu máu do thiếu sắt Ferrovit C Mega (3 vỉ x 10 viên)', 'vien-uong-ho-tro-giam-nguy-co-thieu-mau-do-thieu-sat-ferrovit-c-mega-3-vi-x-10-vien', 'Sắt fumarate 183mg, Acid folic 800mcg, Vitamin B12 15mcg, Vitamin B2 5mg, Vitamin C 50mg', 'Viên uống hỗ trợ giảm nguy cơ thiếu máu do thiếu sắt Ferrovit C Mega (3 vỉ x 10 viên). Dạng bào chế: Viên nang mềm.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 3 Vỉ x 10 Viên', 120000, 138000, '/assets/products/32.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT032A', 47, 0, 78000, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 47, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT032B', 112, 0, 78000, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 112, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Sanofi' ORDER BY id LIMIT 1),
    'Viên nén Magne-B6 Corbière Sanofi điều trị thiếu magnesi riêng biệt hay kết hợp (5 vỉ x 10 viên)', 'vien-nen-magne-b6-corbiere-sanofi-dieu-tri-thieu-magnesi-rieng-biet-hay-ket-hop-5-vi-x-10-vien', 'Magnesium lactate 470mg, Pyridoxin HCl 5mg', 'Viên nén Magne-B6 Corbière Sanofi điều trị thiếu magnesi riêng biệt hay kết hợp (5 vỉ x 10 viên).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 5 Vỉ x 10 Viên', 99000, NULL, '/assets/products/33.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT033A', 10, 0, 64350, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 10, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT033B', 26, 0, 64350, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 26, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Dhc' ORDER BY id LIMIT 1),
    'Viên giúp da sáng mịn Vitamin C DHC (60 viên)', 'vien-giup-da-sang-min-vitamin-c-dhc-60-vien', 'Vitamin C 1000mg, Vitamin B2 2mg', 'Viên giúp da sáng mịn Vitamin C DHC (60 viên). Dạng bào chế: Viên nang.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Gói 60 Viên', 99000, NULL, '/assets/products/34.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT034A', 15, 0, 64350, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 15, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT034B', 38, 0, 64350, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 38, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Bayer' ORDER BY id LIMIT 1),
    'Viên sủi Berocca Bayer bổ sung vitamin và khoáng chất (10 viên)', 'vien-sui-berocca-bayer-bo-sung-vitamin-va-khoang-chat-10-vien', 'Vitamin B1 15mg, Vitamin B2 15mg, Vitamin B6 10mg, Vitamin B12 0.01mg, Vitamin B3 50mg, Vitamin B5 23mg, Magnesia 100mg, Vitamin C 500mg, Calcium 100mg, Vitamin B8 0.15mg, Kẽm 10mg', 'Viên sủi Berocca Bayer bổ sung vitamin và khoáng chất (10 viên).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Tuýp 10 Viên', 75000, NULL, '/assets/products/35.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT035A', 21, 0, 48750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 21, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT035B', 49, 0, 48750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 49, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Np Pharma' ORDER BY id LIMIT 1),
    'Viên sủi bổ sung vitamin và khoáng chất Plusssz Max Multivitamin orange flavoured (20 viên)', 'vien-sui-bo-sung-vitamin-va-khoang-chat-plusssz-max-multivitamin-orange-flavoured-20-vien', 'Vitamin B1 1.4mg, Vitamin D3 2.5Mcg, Vitamin B3 18mg, Vitamin E 10mg, Vitamin B5 6mg, Zinc 2.5mg, Vitamin B6 2mg, Vitamin B2 1.6mg, Folic Acid 0.2mg, Biotin 150Mcg, Selenium 15Mcg, Vitamin B12 1Mcg', 'Viên sủi bổ sung vitamin và khoáng chất Plusssz Max Multivitamin orange flavoured (20 viên).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Tuýp 20 viên', 40000, 46000, '/assets/products/36.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT036A', 26, 0, 26000, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 26, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT036B', 61, 0, 26000, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 61, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Ostelin' ORDER BY id LIMIT 1),
    'Viên uống Ostelin Calcium & Vitamin D3 Sanofi', 'vien-uong-ostelin-calcium-vitamin-d3-sanofi', 'Calci carbonat 1.5g, Vitamin D3 500iu', 'Viên uống Ostelin Calcium & Vitamin D3 Sanofi giúp tăng hấp thụ canxi, duy trì xương và răng chắc khỏe (130 viên). Dạng bào chế: Viên nén bao phim.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Lọ 130 Viên', 318250, 335000, '/assets/products/37.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT037A', 31, 0, 206863, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 31, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT037B', 73, 0, 206863, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 73, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Mediplantex' ORDER BY id LIMIT 1),
    'Thuốc Biotin 5mg Mediplantex điều trị thiếu hụt biotin (2 vỉ x 10 viên)', 'thuoc-biotin-5mg-mediplantex-dieu-tri-thieu-hut-biotin-2-vi-x-10-vien', 'Biotin 5mg', 'Thuốc Biotin 5mg Mediplantex điều trị thiếu hụt biotin (2 vỉ x 10 viên). Dạng bào chế: Viên nén.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 2 Vỉ x 10 Viên', 18700, NULL, '/assets/products/38.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT038A', 36, 0, 12155, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 36, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT038B', 85, 0, 12155, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 85, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Dhc' ORDER BY id LIMIT 1),
    'Viên giúp cơ thể khỏe mạnh Zinc DHC (30 viên)', 'vien-giup-co-the-khoe-manh-zinc-dhc-30-vien', 'Chiết xuất nấm men 55mg, Kẽm Gluconat 120mg', 'Viên giúp cơ thể khỏe mạnh Zinc DHC (30 viên). Dạng bào chế: Viên nang cứng.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Gói 30 Viên', 110000, NULL, '/assets/products/39.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT039A', 41, 0, 71500, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 41, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT039B', 97, 0, 71500, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 97, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'vitamin-khoang-chat' OR name = 'Vitamin & khoáng chất' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Blackmores' ORDER BY id LIMIT 1),
    'Viên hỗ trợ sức khỏe nam giới Blackmores Multivitamin For Men (50 viên)', 'vien-ho-tro-suc-khoe-nam-gioi-blackmores-multivitamin-for-men-50-vien', 'Magie oxide 63.1mg, Canxi Pantothenate 70mg, Kẽm axit amin chelate 75mg, Chiết xuất tribulus terrestris 120mg, Vitamin C 100mg, Canxi hydrogen phosphat 170mg, Chiết xuất silybum marianum 57.1mg, Chiết xuất Turnera diffusa 100mg, Thiamin nit', 'Viên hỗ trợ sức khỏe nam giới Blackmores Multivitamin For Men (50 viên). Dạng bào chế: Viên nén.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 50 Viên', 555300, 617000, '/assets/products/40.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT040A', 46, 0, 360945, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 46, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT040B', 109, 0, 360945, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 109, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'cham-soc-ca-nhan' OR name = 'Chăm sóc cá nhân' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Listerine' ORDER BY id LIMIT 1),
    'Nước súc miệng Listerine Cool Mint (750ml)', 'nuoc-suc-mieng-listerine-cool-mint-750ml', 'Acid benzoic , Poloxamer , Sorbitol , Alcohol , Nước (aqua) , Sodium saccharin , Eucalyptol , Thymol , Methyl salicylate , Menthol , Sodium benzoate , Flavor', 'Nước súc miệng Listerine Cool Mint bảo vệ khoang miệng suốt 24h khỏi vi khuẩn hôi miệng, mảng bám, viêm nướu (750ml).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai x 750ml', 97440, 168000, '/assets/products/41.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT041A', 51, 0, 63336, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 51, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT041B', 121, 0, 63336, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 121, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'cham-soc-ca-nhan' OR name = 'Chăm sóc cá nhân' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Xisat' ORDER BY id LIMIT 1),
    'Xịt mũi Xisat người lớn 75ml làm sạch thông mũi', 'xit-mui-xisat-nguoi-lon-75ml-lam-sach-thong-mui', 'Nước biển sâu , Khoáng biển', 'Xịt mũi Xisat người lớn 75ml làm sạch thông mũi. Dạng bào chế: Dạng xịt.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai x 75ml', 30000, NULL, '/assets/products/42.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT042A', 14, 0, 19500, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 14, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT042B', 35, 0, 19500, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 35, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'cham-soc-ca-nhan' OR name = 'Chăm sóc cá nhân' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Lactacyd' ORDER BY id LIMIT 1),
    'Dung dịch vệ sinh phụ nữ Lactacyd Pro Sensitive kháng khuẩn, giảm ngứa (250ml)', 'dung-dich-ve-sinh-phu-nu-lactacyd-pro-sensitive-khang-khuan-giam-ngua-250ml', 'Lactic Acid  , Sodium benzoate  , Styrene Acrylates Copolymer  , Cocamidopropyl betaine  , Sodium Chloride', 'Dung dịch vệ sinh phụ nữ Lactacyd Pro Sensitive kháng khuẩn, giảm ngứa (250ml).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai x 250ml', 100000, NULL, '/assets/products/43.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT043A', 19, 0, 65000, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 19, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT043B', 47, 0, 65000, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 47, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'cham-soc-ca-nhan' OR name = 'Chăm sóc cá nhân' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Hoa Linh' ORDER BY id LIMIT 1),
    'Dung dịch vệ sinh phụ nữ Dạ Hương Xanh Lô Hội giúp làm sạch nhẹ nhàng, khử mùi hôi (100ml)', 'dung-dich-ve-sinh-phu-nu-da-huong-xanh-lo-hoi-giup-lam-sach-nhe-nhang-khu-mui-hoi-100ml', 'NaCl , Lô hội , Menthol , Thymol , Acid lactic , Vitamin E , Hương liệu', 'Dung dịch vệ sinh phụ nữ Dạ Hương Xanh Lô Hội giúp làm sạch nhẹ nhàng, khử mùi hôi (100ml).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp x 100ml', 42000, 48000, '/assets/products/44.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT044A', 24, 0, 27300, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 24, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT044B', 59, 0, 27300, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 59, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'cham-soc-ca-nhan' OR name = 'Chăm sóc cá nhân' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Sensodyne' ORDER BY id LIMIT 1),
    'Kem đánh răng Sensodyne Gentle Whitening làm trắng răng tự nhiên, bảo vệ răng ê buốt mỗi ngày (100g)', 'kem-danh-rang-sensodyne-gentle-whitening-lam-trang-rang-tu-nhien-bao-ve-rang-e-buot-moi-ngay-100g', 'Glycerin , Sorbitol , Aqua , Hydrated silica  , Cocamidopropyl betaine  , Sodium methyl cocoyl taurate  , Alumina , PEG-6  , Sodium fluoride  , Xanthan gum  , Sodium hydroxide  , Sodium saccharin  , Pentasodium triphosphate , Potassium nitr', 'Kem đánh răng Sensodyne Gentle Whitening làm trắng răng tự nhiên, bảo vệ răng ê buốt mỗi ngày (100g).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Tuýp x 100g', 68000, NULL, '/assets/products/45.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT045A', 30, 0, 44200, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 30, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT045B', 70, 0, 44200, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 70, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'cham-soc-ca-nhan' OR name = 'Chăm sóc cá nhân' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Traphaco' ORDER BY id LIMIT 1),
    'Xịt họng Methorphan Bee Traphaco (30ml)', 'xit-hong-methorphan-bee-traphaco-30ml', 'chiết xuất cúc tím 900mg, Chiết xuất Keo ong 800mg, Chiết xuất rễ marshmallow 600mg, Chiết xuất gừng 600mg, Vitamin C 500mg, Bromelain 1200GDU, Papain 25000iu, Menthol 24mg', 'Xịt họng Methorphan Bee Traphaco giảm ho, viêm họng, viêm phế quản, nhiệt miệng, viêm nướu, hôi miệng (30ml). Dạng bào chế: Dung dịch.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp x 30ml', 80000, NULL, '/assets/products/46.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT046A', 35, 0, 52000, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 35, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT046B', 82, 0, 52000, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 82, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'cham-soc-ca-nhan' OR name = 'Chăm sóc cá nhân' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'La Beauty' ORDER BY id LIMIT 1),
    'Gel rửa tay khô Natural Hand Sanitizer sát khuẩn, làm sạch tay (250ml)', 'gel-rua-tay-kho-natural-hand-sanitizer-sat-khuan-lam-sach-tay-250ml', 'Propylene glycol , Myristyl Alcohol , Phenoxyethanol , triethanolamine , Fragrance , Carbomer , Glycerin , Chiết xuất quế , Trà xanh , Tinh dầu Sả chanh , Water purified', 'Gel rửa tay khô Natural Hand Sanitizer sát khuẩn, làm sạch tay (250ml).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai x 250ml', 48000, 60000, '/assets/products/47.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT047A', 40, 0, 31200, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 40, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT047B', 94, 0, 31200, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 94, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'cham-soc-ca-nhan' OR name = 'Chăm sóc cá nhân' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Silcot' ORDER BY id LIMIT 1),
    'Bông trang điểm Silcot Nhật Bản không xù bông, thấm hút dung dịch', 'bong-trang-diem-silcot-nhat-ban-khong-xu-bong-tham-hut-dung-dich', 'Bông tự nhiên', 'Bông trang điểm Silcot Nhật Bản không xù bông, thấm hút dung dịch giúp tiết kiệm mỹ phẩm dưỡng da (82 miếng).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp', 38000, 44000, '/assets/products/48.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT048A', 45, 0, 24700, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 45, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT048B', 106, 0, 24700, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 106, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'cham-soc-ca-nhan' OR name = 'Chăm sóc cá nhân' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Fobelife' ORDER BY id LIMIT 1),
    'Sáp dưỡng ẩm Vaseline Original Fobelife giữ ẩm, bảo vệ da khô, nứt nẻ (7g)', 'sap-duong-am-vaseline-original-fobelife-giu-am-bao-ve-da-kho-nut-ne-7g', 'Hydrogenated Olive Oil , Linolenic acid , Linoleic acid , DMHC Hydantoin , Euphorbia Cerifera (Candelilla) Wax , Oil Unsaponifiables , Olea Europaea Fruit Oil , Frangrance , Panthenol , Cetearyl Alcohol , Disodium EDTA , Paraffinum Liquidum', 'Sáp dưỡng ẩm Vaseline Original Fobelife giữ ẩm, bảo vệ da khô, nứt nẻ (7g). Dạng bào chế: Dạng sáp.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hũ x 7g', 35000, NULL, '/assets/products/49.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT049A', 50, 0, 22750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 50, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT049B', 118, 0, 22750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 118, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'cham-soc-ca-nhan' OR name = 'Chăm sóc cá nhân' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Pharmedic' ORDER BY id LIMIT 1),
    'Dầu gió Nâu Pharmedic điều trị cảm cúm, sổ mũi, nghẹt mũi (3ml)', 'dau-gio-nau-pharmedic-dieu-tri-cam-cum-so-mui-nghet-mui-3ml', 'Methyl Salicylat 2, Menthol 8, Tinh dầu bạc hà 58', 'Dầu gió Nâu Pharmedic điều trị cảm cúm, sổ mũi, nghẹt mũi (3ml). Dạng bào chế: Dung dịch.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai x 3ml', 12800, NULL, '/assets/products/50.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT050A', 13, 0, 8320, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 13, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT050B', 32, 0, 8320, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 32, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'cham-soc-ca-nhan' OR name = 'Chăm sóc cá nhân' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'V.Rohto' ORDER BY id LIMIT 1),
    'Nhỏ mắt V.Rohto Mineral Tear 13ml hỗ trợ dưỡng ẩm, bổ sung khoáng chất', 'nho-mat-v-rohto-mineral-tear-13ml-ho-tro-duong-am-bo-sung-khoang-chat', 'Nước tinh khiết , Polyhexamethylene biguanide , Disodium Edetate Hydrate , Polyoxyethylene Polyoxypropylene Glycol , Polysorbate 80 , Sodium hyaluronate , Sodium borate , Boric acid , Hypromellose 1.3mg, Sodium Chondroitin Sulfate 65mg, Cal', 'Nhỏ mắt V.Rohto Mineral Tear 13ml hỗ trợ dưỡng ẩm, bổ sung khoáng chất. Dạng bào chế: Dung dịch.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp x 13ml', 53600, 67000, '/assets/products/51.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT051A', 18, 0, 34840, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 18, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT051B', 44, 0, 34840, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 44, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thiet-bi-y-te' OR name = 'Thiết bị y tế' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Omron' ORDER BY id LIMIT 1),
    'Máy đo huyết áp bắp tay omron ez 7183 hỗ trợ đo huyết áp,nhịp tim', 'may-do-huyet-ap-bap-tay-omron-ez-7183-ho-tro-do-huyet-ap-nhip-tim', 'Nhựa', 'Máy đo huyết áp bắp tay omron ez 7183 hỗ trợ đo huyết áp,nhịp tim.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp', 1090000, 1254000, '/assets/products/52.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT052A', 23, 0, 708500, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 23, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT052B', 56, 0, 708500, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 56, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thiet-bi-y-te' OR name = 'Thiết bị y tế' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Mediusa' ORDER BY id LIMIT 1),
    'Máy đo đường huyết MediUsa GM3300 hỗ trợ theo dõi, kiểm soát lượng đường trong máu', 'may-do-duong-huyet-mediusa-gm3300-ho-tro-theo-doi-kiem-soat-luong-duong-trong-mau', 'Nhựa', 'Máy đo đường huyết MediUsa GM3300 hỗ trợ theo dõi, kiểm soát lượng đường trong máu.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp', 911200, 1139000, '/assets/products/53.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT053A', 28, 0, 592280, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 28, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT053B', 68, 0, 592280, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 68, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thiet-bi-y-te' OR name = 'Thiết bị y tế' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Yuwell' ORDER BY id LIMIT 1),
    'Nhiệt kế hồng ngoại đo trán Yuwell YT-1C', 'nhiet-ke-hong-ngoai-do-tran-yuwell-yt-1c', 'Nhựa', 'Nhiệt kế hồng ngoại đo trán Yuwell YT-1C.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp', 501500, 590000, '/assets/products/54.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT054A', 33, 0, 325975, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 33, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT054B', 80, 0, 325975, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 80, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thiet-bi-y-te' OR name = 'Thiết bị y tế' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Urgo' ORDER BY id LIMIT 1),
    'Băng cá nhân vải Urgo Durable 2x6cm (20 miếng)', 'bang-ca-nhan-vai-urgo-durable-2x6cm-20-mieng', 'Vải lụa , Kẽm oxyd', 'Băng cá nhân vải Urgo Durable 2x6cm (20 miếng).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 20 Cái', 27000, NULL, '/assets/products/55.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT055A', 39, 0, 17550, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 39, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT055B', 91, 0, 17550, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 91, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thiet-bi-y-te' OR name = 'Thiết bị y tế' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Vĩnh Phúc' ORDER BY id LIMIT 1),
    'Cồn 70 độ Vĩnh Phúc 500ml dùng sát trùng da và tiệt trùng dụng cụ y tế', 'con-70-do-vinh-phuc-500ml-dung-sat-trung-da-va-tiet-trung-dung-cu-y-te', 'Ethanol', 'Cồn 70 độ Vĩnh Phúc 500ml dùng sát trùng da và tiệt trùng dụng cụ y tế.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai x 500ml', 32000, 37000, '/assets/products/56.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT056A', 44, 0, 20800, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 44, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT056B', 103, 0, 20800, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 103, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thiet-bi-y-te' OR name = 'Thiết bị y tế' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Hdpharma' ORDER BY id LIMIT 1),
    'Nước Oxy Già 3% HD Pharma sát khuẩn (50ml)', 'nuoc-oxy-gia-3-hd-pharma-sat-khuan-50ml', 'Hydrogen peroxyd (50%) 3g', 'Nước Oxy Già 3% HD pharma sát khuẩn, tẩy uế, rửa vết thương, mụn nhọt đã vỡ, viêm tai, răng, miệng (Chai 50ml). Dạng bào chế: Dung dịch dùng ngoài.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai x 50ml', 3000, NULL, '/assets/products/57.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT057A', 49, 0, 1950, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 49, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT057B', 115, 0, 1950, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 115, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thiet-bi-y-te' OR name = 'Thiết bị y tế' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Agimexpharm' ORDER BY id LIMIT 1),
    'Povidone 10% Agimex 20ML sát trùng vết thương hay phẫu thuật, vết loét sâu', 'povidone-10-agimex-20ml-sat-trung-vet-thuong-hay-phau-thuat-vet-loet-sau', 'Povidon Iod 10%', 'Povidone 10% Agimex 20ML sát trùng vết thương hay phẫu thuật, vết loét sâu. Dạng bào chế: Dung dịch dùng ngoài.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp x 20ml', 6000, NULL, '/assets/products/58.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT058A', 12, 0, 3900, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 12, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT058B', 29, 0, 3900, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 29, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thiet-bi-y-te' OR name = 'Thiết bị y tế' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Omron' ORDER BY id LIMIT 1),
    'Máy xông khí dung Omron NE C106 hỗ trợ điều trị bệnh lý về đường hô hấp', 'may-xong-khi-dung-omron-ne-c106-ho-tro-dieu-tri-benh-ly-ve-duong-ho-hap', 'Nhựa', 'Máy xông khí dung Omron NE C106 hỗ trợ điều trị bệnh lý về đường hô hấp.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp', 705500, 830000, '/assets/products/59.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT059A', 17, 0, 458575, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 17, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT059B', 41, 0, 458575, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 41, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thiet-bi-y-te' OR name = 'Thiết bị y tế' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Thiên Thanh' ORDER BY id LIMIT 1),
    'Túi chườm đa năng Thiên Thanh nhỏ hỗ trợ chườm nóng, chườm lạnh, giữ ấm 4 - 6 tiếng', 'tui-chuom-da-nang-thien-thanh-nho-ho-tro-chuom-nong-chuom-lanh-giu-am-4-6-tieng', 'Vải', 'Túi chườm đa năng Thiên Thanh nhỏ hỗ trợ chườm nóng, chườm lạnh, giữ ấm 4 - 6 tiếng.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Cái', 135000, 155000, '/assets/products/60.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT060A', 22, 0, 87750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 22, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT060B', 53, 0, 87750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 53, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thiet-bi-y-te' OR name = 'Thiết bị y tế' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Humasis' ORDER BY id LIMIT 1),
    'Que thử thai Humasis Hello Baby+ dạng bút giúp phát hiện sớm thai kỳ sau 7-10 ngày thụ thai', 'que-thu-thai-humasis-hello-baby-dang-but-giup-phat-hien-som-thai-ky-sau-7-10-ngay-thu-thai', 'Nhựa', 'Que thử thai Humasis Hello Baby+ dạng bút giúp phát hiện sớm thai kỳ sau 7-10 ngày thụ thai.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp', 50000, NULL, '/assets/products/61.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT061A', 27, 0, 32500, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 27, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT061B', 65, 0, 32500, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 65, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-ke-don' OR name = 'Thuốc kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Gsk' ORDER BY id LIMIT 1),
    'Thuốc Augmentin 1g GSK điều trị nhiễm khuẩn (2 vỉ x 7 viên)', 'thuoc-augmentin-1g-gsk-dieu-tri-nhiem-khuan-2-vi-x-7-vien', 'Amoxicillin 875mg, Clavulanic acid 125mg', 'Thuốc Augmentin 1g GSK điều trị nhiễm khuẩn (2 vỉ x 7 viên). Dạng bào chế: Viên nén bao phim.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 2 Vỉ x 7 Viên', 78000, NULL, '/assets/products/62.png', 1, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT062A', 32, 0, 50700, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 32, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT062B', 77, 0, 50700, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 77, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-ke-don' OR name = 'Thuốc kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Imexpharm' ORDER BY id LIMIT 1),
    'Thuốc pms-Zanimex 500mg Imexpharm điều trị nhiễm trùng tai mũi họng (2 vỉ x 5 viên)', 'thuoc-pms-zanimex-500mg-imexpharm-dieu-tri-nhiem-trung-tai-mui-hong-2-vi-x-5-vien', 'Cefuroxim 500mg', 'Thuốc pms-Zanimex 500mg Imexpharm điều trị nhiễm trùng tai mũi họng (2 vỉ x 5 viên). Dạng bào chế: viên nén dài bao phim.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 2 Vỉ x 5 Viên', 125000, NULL, '/assets/products/63.jpg', 1, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT063A', 37, 0, 81250, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 37, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT063B', 89, 0, 81250, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 89, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-ke-don' OR name = 'Thuốc kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Trường Thọ Pharma' ORDER BY id LIMIT 1),
    'Thuốc Amlodipin 5mg Trường Thọ điều trị tăng huyết áp, đau thắt ngực (3 vỉ x 10 viên)', 'thuoc-amlodipin-5mg-truong-tho-dieu-tri-tang-huyet-ap-dau-that-nguc-3-vi-x-10-vien', 'Amlodipine 5mg', 'Thuốc Amlodipin 5mg Trường Thọ điều trị tăng huyết áp, đau thắt ngực (3 vỉ x 10 viên). Dạng bào chế: Viên nén.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 3 Vỉ x 10 Viên', 68000, NULL, '/assets/products/64.png', 1, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT064A', 42, 0, 44200, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 42, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT064B', 101, 0, 44200, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 101, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-ke-don' OR name = 'Thuốc kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Tipharco' ORDER BY id LIMIT 1),
    'Viên nén Metformin 500mg Tipharco điều trị đái tháo đường típ 2 (4 vỉ x 15 viên)', 'vien-nen-metformin-500mg-tipharco-dieu-tri-dai-thao-duong-tip-2-4-vi-x-15-vien', 'Metformine 500mg', 'Viên nén Metformin 500mg Tipharco điều trị đái tháo đường típ 2 (4 vỉ x 15 viên). Dạng bào chế: Viên nén bao phim.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 4 Vỉ x 15 Viên', 85000, NULL, '/assets/products/65.png', 1, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT065A', 48, 0, 55250, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 48, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT065B', 112, 0, 55250, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 112, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-ke-don' OR name = 'Thuốc kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Dhg' ORDER BY id LIMIT 1),
    'Viên nang Omeprazol DHG 20mg điều trị trào ngược dạ dày - thực quản (3 vỉ x 10 viên)', 'vien-nang-omeprazol-dhg-20mg-dieu-tri-trao-nguoc-da-day-thuc-quan-3-vi-x-10-vien', 'Omeprazol 20mg', 'Viên nang Omeprazol DHG 20mg điều trị trào ngược dạ dày - thực quản (3 vỉ x 10 viên). Dạng bào chế: Viên nang cứng chứa vi hạt bao tan trong ruột.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 3 Vỉ x 10 Viên', 95000, NULL, '/assets/products/66.jpg', 1, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT066A', 11, 0, 61750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 11, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT066B', 26, 0, 61750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 26, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-ke-don' OR name = 'Thuốc kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Tv.Pharm' ORDER BY id LIMIT 1),
    'Thuốc Atorvastatin 10mg TV.Pharm điều trị tăng cholesterol toàn phần, LDL-cholesterol (3 vỉ x 10 viên)', 'thuoc-atorvastatin-10mg-tv-pharm-dieu-tri-tang-cholesterol-toan-phan-ldl-cholesterol-3-vi-x-10-vien', 'Atorvastatin 10mg', 'Thuốc Atorvastatin 10mg TV.Pharm điều trị tăng cholesterol toàn phần, LDL-cholesterol (3 vỉ x 10 viên). Dạng bào chế: Viên nén bao phim.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 3 Vỉ x 10 Viên', 115000, NULL, '/assets/products/67.jpg', 1, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT067A', 16, 0, 74750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 16, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT067B', 38, 0, 74750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 38, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-ke-don' OR name = 'Thuốc kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Organon' ORDER BY id LIMIT 1),
    'Thuốc Cozaar 50mg Organon', 'thuoc-cozaar-50mg-organon', 'Losartan Potassium 50mg', 'Thuốc Cozaar 50mg Organon điều trị tăng huyết áp và bảo vệ thận từ tổn thương do bệnh tiểu đường (2 vỉ x 14 viên). Dạng bào chế: Viên nén bao phim.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 2 Vỉ x 14 Viên', 135000, NULL, '/assets/products/68.png', 1, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT068A', 21, 0, 87750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 21, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT068B', 50, 0, 87750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 50, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuoc-ke-don' OR name = 'Thuốc kê đơn' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Bayer' ORDER BY id LIMIT 1),
    'Thuốc Ciprobay 500mg Bayer điều trị nhiễm trùng (1 vỉ x 10 viên)', 'thuoc-ciprobay-500mg-bayer-dieu-tri-nhiem-trung-1-vi-x-10-vien', 'Ciprofloxacin 500mg', 'Thuốc Ciprobay 500mg Bayer điều trị nhiễm trùng (1 vỉ x 10 viên). Dạng bào chế: Viên nén bao phim.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 1 Vỉ x 10 Viên', 155000, NULL, '/assets/products/69.jpg', 1, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT069A', 26, 0, 100750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 26, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT069B', 62, 0, 100750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 62, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'me-va-be' OR name = 'Mẹ & bé' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Nam Dược' ORDER BY id LIMIT 1),
    'Dầu tràm khuynh diệp Ích nhi giúp giữ ấm cơ thể, phòng cảm lạnh (30ml)', 'dau-tram-khuynh-diep-ich-nhi-giup-giu-am-co-the-phong-cam-lanh-30ml', 'Paraffinum Liquidum , Eucalyptol , Eucalyptus Globulus Leaf Oil , Fragrance , Tinh dầu tràm gió', 'Dầu tràm khuynh diệp Ích nhi giúp giữ ấm cơ thể, phòng cảm lạnh (30ml). Dạng bào chế: Dạng dầu.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp x 30ml', 70000, NULL, '/assets/products/70.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT070A', 31, 0, 45500, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 31, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT070B', 74, 0, 45500, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 74, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'me-va-be' OR name = 'Mẹ & bé' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Bayer' ORDER BY id LIMIT 1),
    'Kem bôi chống hăm tã Bepanthen Balm Bayer dưỡng ẩm, giảm kích ứng (30g)', 'kem-boi-chong-ham-ta-bepanthen-balm-bayer-duong-am-giam-kich-ung-30g', 'Lanolin , Nước (aqua) , Paraffinum Liquidum , Petrolatum , Panthenol , Glycerin , Lanolin alcohol , Cetyl alcohol , Cera alba , Stearyl alcohol , Oleate , Ozokerite , Paraffiinum liduidum , Prunus anygdalus dulcis oil', 'Kem bôi chống hăm tã Bepanthen Balm Bayer dưỡng ẩm, giảm kích ứng (30g). Dạng bào chế: Dạng kem.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Tuýp x 30g', 72000, NULL, '/assets/products/71.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT071A', 36, 0, 46800, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 36, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT071B', 86, 0, 46800, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 86, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'me-va-be' OR name = 'Mẹ & bé' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Hisamitsu' ORDER BY id LIMIT 1),
    'Miếng dán hạ sốt Bye Bye Fever Babies dùng cho trẻ từ 0-2 tuổi (3 gói x 2 miếng)', 'mieng-dan-ha-sot-bye-bye-fever-babies-dung-cho-tre-tu-0-2-tuoi-3-goi-x-2-mieng', 'Polymer , Glycerin , Nước (aqua)', 'Miếng dán hạ sốt Bye Bye Fever Babies dùng cho trẻ từ 0-2 tuổi (3 gói x 2 miếng).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 3 Gói x 2 Miếng', 60000, 69000, '/assets/products/72.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT072A', 41, 0, 39000, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 41, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT072B', 98, 0, 39000, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 98, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'me-va-be' OR name = 'Mẹ & bé' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Biogaia' ORDER BY id LIMIT 1),
    'Bổ sung lợi khuẩn cho đường tiêu hóa BioGaia Protectis Baby Drops (5ml)', 'bo-sung-loi-khuan-cho-duong-tieu-hoa-biogaia-protectis-baby-drops-5ml', 'Tinh dầu hướng dương , Lactobacillus reuteri DMS 17938 , Tinh dầu lõi cọ , Tá dược vừa đủ', 'Bổ sung lợi khuẩn cho đường tiêu hóa BioGaia Protectis Baby Drops (5ml). Dạng bào chế: Dung dịch uống.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp x 5ml', 460000, NULL, '/assets/products/73.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT073A', 46, 0, 299000, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 46, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT073B', 110, 0, 299000, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 110, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'me-va-be' OR name = 'Mẹ & bé' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Lactacyd' ORDER BY id LIMIT 1),
    'Sữa tắm gội cho bé Lactacyd Active Play (500ml)', 'sua-tam-goi-cho-be-lactacyd-active-play-500ml', 'Water , Sodium Laureth Sulfate , Sodium Chloride , Cocamidopropyl betaine , Glycol Distearate , cocamide MEA , Laureth-10 , Lactoserum , Disodium Laureth Sulfosuccinate , PEG-7 Glyceryl Cocoate , Perfume , Sodium benzoate , Peg-120 Methyl G', 'Sữa tắm gội cho bé Lactacyd Active Play (500ml).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai x 500ml', 204000, NULL, '/assets/products/74.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT074A', 51, 0, 132600, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 51, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT074B', 122, 0, 132600, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 122, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'me-va-be' OR name = 'Mẹ & bé' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Ergopharma' ORDER BY id LIMIT 1),
    'Siro giúp hỗ trợ hấp thụ canxi LineaBon K2+D3 ErgoPharm (10ml)', 'siro-giup-ho-tro-hap-thu-canxi-lineabon-k2-d3-ergopharm-10ml', 'Vitamin D3 400iu, Vitamin K2 22.5mcg', 'Siro giúp hỗ trợ hấp thụ canxi LineaBon K2+D3 ErgoPharm (10ml). Dạng bào chế: Dung dịch.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp x 10ml', 295000, NULL, '/assets/products/75.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT075A', 15, 0, 191750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 15, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT075B', 35, 0, 191750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 35, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'me-va-be' OR name = 'Mẹ & bé' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Bayer' ORDER BY id LIMIT 1),
    'Viên uống Elevit Bayer hỗ trợ tăng cường sức khỏe, nâng cao sức đề kháng cho thai kỳ (3 vỉ x 10 viên)', 'vien-uong-elevit-bayer-ho-tro-tang-cuong-suc-khoe-nang-cao-suc-de-khang-cho-thai-ky-3-vi-x-10-vien', 'Vitamin A 2566iu, Vitamin D 200iu, Vitamin E 10mg, Vitamin C 85mg, Vitamin B1 1.4mg, Vitamin B2 1.4mg, Vitamin B3 18mg, Vitamin B5 6mg, Vitamin B6 1.9mg, Vitamin B12 2.6Mcg, Biotin 30Mcg, Acid folic 800Mcg, Canxi 125mg, Magie 100mg, Sắt 14m', 'Viên uống Elevit Bayer hỗ trợ tăng cường sức khỏe, nâng cao sức đề kháng cho thai kỳ (3 vỉ x 10 viên). Dạng bào chế: Viên nén bao phim.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 3 Vỉ x 10 Viên', 366000, 421000, '/assets/products/76.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT076A', 20, 0, 237900, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 20, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT076B', 47, 0, 237900, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 47, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'me-va-be' OR name = 'Mẹ & bé' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Fysoline' ORDER BY id LIMIT 1),
    'Nước muối sinh lý Fysoline Septinasal (20 ống x 5ml)', 'nuoc-muoi-sinh-ly-fysoline-septinasal-20-ong-x-5ml', 'NaCl 0.9, Polysorbate 80 , Thyme , Glycerol , Nước tinh khiết , Đồng sulfat pentahydrate', 'Nước muối sinh lý Fysoline Septinasal (20 ống x 5ml) giúp giảm sổ mũi, viêm mũi, nghẹt mũi, dùng được cho trẻ sơ sinh.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 20 Ống x 5ml', 193000, NULL, '/assets/products/77.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT077A', 25, 0, 125450, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 25, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT077B', 59, 0, 125450, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 59, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'me-va-be' OR name = 'Mẹ & bé' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Nam Dược' ORDER BY id LIMIT 1),
    'Kem dưỡng ẩm thảo mộc Ích Nhi giúp dưỡng ẩm, làm mềm mịn da (30g)', 'kem-duong-am-thao-moc-ich-nhi-giup-duong-am-lam-mem-min-da-30g', 'Purified water , Cetyl alcohol (and) glyceryl stearate (and) peg-75 stearate-20 (and) ceteth-20 (and) steareth-20 , Glycerin , Dầu Jojoba , Bơ Shea , Chiết xuất yến mạch , Chiết xuất rau má , D-panthenol , Vitamin E , Allantoin , 1,2-Hexane', 'Kem dưỡng ẩm thảo mộc Ích Nhi giúp dưỡng ẩm, làm mềm mịn da (30g). Dạng bào chế: Kem bôi da.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp x 30g', 55000, NULL, '/assets/products/78.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT078A', 30, 0, 35750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 30, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT078B', 71, 0, 35750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 71, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'me-va-be' OR name = 'Mẹ & bé' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Densmore' ORDER BY id LIMIT 1),
    'Viên uống Suvéal Grossesse Fer Densmore bổ sung Omega 3, DHA, Vitamin, khoáng chất (2 vỉ x 15 viên)', 'vien-uong-suveal-grossesse-fer-densmore-bo-sung-omega-3-dha-vitamin-khoang-chat-2-vi-x-15-vien', 'Maltodextrin , Vitamin B1 , Vitamin B6 , Vitamin E tự nhiên , Vitamin B9 , Vitamin D3 , Lecithin , Vitamin B5 , Chất tạo màu tổng hợp , Glycerol , Vitamin C , Vitamin B2 , Vitamin B12 , Natri selenat', 'Viên uống Suvéal Grossesse Fer Densmore bổ sung Omega 3, DHA, Vitamin, khoáng chất (2 vỉ x 15 viên). Dạng bào chế: Viên nang.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 2 Vỉ x 15 Viên', 405000, NULL, '/assets/products/79.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT079A', 35, 0, 263250, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 35, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT079B', 83, 0, 263250, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 83, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'me-va-be' OR name = 'Mẹ & bé' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Promum' ORDER BY id LIMIT 1),
    'Viên uống bổ sung DHA cho phụ nữ có thai và cho con bú proMUM DHA Alg (3 vỉ x 10 viên)', 'vien-uong-bo-sung-dha-cho-phu-nu-co-thai-va-cho-con-bu-promum-dha-alg-3-vi-x-10-vien', 'Dầu tảo Schizochytrium sp 1000mg, Vitamin E 6mg', 'Viên uống bổ sung DHA cho phụ nữ có thai và cho con bú proMUM DHA Alg (3 vỉ x 10 viên). Dạng bào chế: Viên nang mềm.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 3 Vỉ x 10 Viên', 499000, 574000, '/assets/products/80.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT080A', 40, 0, 324350, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 40, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT080B', 95, 0, 324350, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 95, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'duoc-my-pham' OR name = 'Dược mỹ phẩm' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Laroche Posay' ORDER BY id LIMIT 1),
    'Sữa rửa mặt La Roche-Posay Mela B3 Gel (200ml)', 'sua-rua-mat-la-roche-posay-mela-b3-gel-200ml', 'Aqua , Glycerin , Coco-betaine , Propanediol , Sodium Cocoyl Glycinate , Peg-120 Methyl Glucose Dioleate , Sodium hydroxide , Sodium Chloride , Citric Acid , Gluconolactone', 'Sữa rửa mặt La Roche-Posay Mela B3 Gel Micro-Peeling Clarifying 200ml mờ thâm nám, dưỡng da sáng và đều màu.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai x 200ml', 543650, 655000, '/assets/products/81.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT081A', 45, 0, 353373, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 45, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT081B', 107, 0, 353373, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 107, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'duoc-my-pham' OR name = 'Dược mỹ phẩm' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Bioderma' ORDER BY id LIMIT 1),
    'Nước tẩy trang Bioderma Sebium H2O dành cho da dầu và hỗn hợp (500ml)', 'nuoc-tay-trang-bioderma-sebium-h2o-danh-cho-da-dau-va-hon-hop-500ml', 'Water , Peg-6 Caprylic , Sodium Citrate , Zinc gluconate , Copper sulfate , Ginkgo Biloba Leaf Water , Mannitol , Xylitol , Rhamnose , Fructooligosaccharides , Propylene glycol , Citric Acid , Disodium EDTA , Cetrimonium Bromide , Fragrance', 'Nước tẩy trang Bioderma Sebium H2O dành cho da dầu và hỗn hợp (500ml).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai x 500ml', 392000, 560000, '/assets/products/82.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT082A', 50, 0, 254800, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 50, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT082B', 119, 0, 254800, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 119, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'duoc-my-pham' OR name = 'Dược mỹ phẩm' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Anessa' ORDER BY id LIMIT 1),
    'Sữa chống nắng Anessa Mild Milk SPF 50+ (60ml)', 'sua-chong-nang-anessa-mild-milk-spf-50-60ml', 'Methyl Methacrylate Crosspolymer , Diisopropyl Sebacate , Dimethicone , Aqua/ Water , Caprylyl Methicone , Zinc oxide , Cetyl ethylhexanoate , Titanium dioxide , Pentaerythrityl Tetraethylhexanoate , Triethylhexanoin , Butylene glycol , Die', 'Sữa chống nắng Anessa Perfect UV Sunscreen Mild Milk SPF 50+ PA++++ dịu nhẹ cho da nhạy cảm và trẻ em (60ml).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Tuýp x 60ml', 456300, 702000, '/assets/products/83.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT083A', 13, 0, 296595, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 13, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT083B', 33, 0, 296595, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 33, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'duoc-my-pham' OR name = 'Dược mỹ phẩm' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Cerave' ORDER BY id LIMIT 1),
    'Kem dưỡng ẩm cho da khô CeraVe Moisturising Cream (50ml)', 'kem-duong-am-cho-da-kho-cerave-moisturising-cream-50ml', 'Ceramide Eop , Ceteareth-20 , Aqua/ Water , Petrolatum , Glycerin , Potassium phosphate , Ceramide NP , Cetearyl Alcohol , Ceramide AP , Caprylic/capric triglycerides , Cetyl alcohol , Tocopherols , Dimethicone , Behentrimonium Methosulfate', 'Kem dưỡng ẩm cho da khô CeraVe Moisturising Cream (50ml).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Tuýp x 50ml', 147200, 184000, '/assets/products/84.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT084A', 18, 0, 95680, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 18, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT084B', 45, 0, 95680, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 45, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'duoc-my-pham' OR name = 'Dược mỹ phẩm' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Glenmark' ORDER BY id LIMIT 1),
    'Gel bôi da Klenzit MS điều trị mụn trứng cá (15g)', 'gel-boi-da-klenzit-ms-dieu-tri-mun-trung-ca-15g', 'Adapalene 0.1%', 'Gel bôi da Klenzit MS điều trị mụn trứng cá (15g).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Tuýp X 15g', 155000, NULL, '/assets/products/85.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT085A', 24, 0, 100750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 24, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT085B', 56, 0, 100750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 56, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'duoc-my-pham' OR name = 'Dược mỹ phẩm' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Cetaphil' ORDER BY id LIMIT 1),
    'Sữa rửa mặt dịu nhẹ Cetaphil Gentle Skin Cleanser bổ sung độ ẩm dành cho mọi loại da (473ml)', 'sua-rua-mat-diu-nhe-cetaphil-gentle-skin-cleanser-bo-sung-do-am-danh-cho-moi-loai-da-473ml', 'Panthenol  , Pantolactone  , Sodium Cocoyl Isethionate  , Aqua , Glycerin , Cetearyl Alcohol , Niacinamide , Xanthan gum , Sodium benzoate , Citric Acid', 'Sữa rửa mặt dịu nhẹ Cetaphil Gentle Skin Cleanser bổ sung độ ẩm dành cho mọi loại da (473ml). Dạng bào chế: Dung dịch.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai x 473ml', 359390, 433000, '/assets/products/86.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT086A', 29, 0, 233604, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 29, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT086B', 68, 0, 233604, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 68, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'duoc-my-pham' OR name = 'Dược mỹ phẩm' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Laroche Posay' ORDER BY id LIMIT 1),
    'Kem chống nắng La Roche-Posay Anthelios XL (50ml)', 'kem-chong-nang-la-roche-posay-anthelios-xl-50ml', 'Aqua , Homosalate , Silica , Octocrylene , Ethylhexyl Salicylate , Butyl Methoxydibenzoylmethane , Propylene glycol , Caprylyl glycol , P-Anisic Acid , Stearic acid , Glycerin , Drometrizole trisiloxane , Dimethicone , Acrylates , Perlite ,', 'Kem chống nắng giảm bóng nhờn La Roche-posay Laboratoire Dermatologique Anthelios Xl Anti-shine Non-perfumed Dry Touch Gel-cream SPF 50+ PA++++ 50ml.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp x 50ml', 506300, 610000, '/assets/products/87.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT087A', 34, 0, 329095, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 34, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT087B', 80, 0, 329095, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 80, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'duoc-my-pham' OR name = 'Dược mỹ phẩm' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Bioderma' ORDER BY id LIMIT 1),
    'Kem dưỡng Bioderma Cicabio Crème+ giúp phục hồi da tổn thương, hỗ trợ làm mờ sẹo (40ml)', 'kem-duong-bioderma-cicabio-creme-giup-phuc-hoi-da-ton-thuong-ho-tro-lam-mo-seo-40ml', 'Aqua , Caprylic/capric triglyceride , Glycerin , Polyglyceryl-3 Polyricinoleate , Brassica campestris (rapeseed) seed oil , Butylene glycol , Tapioca Starch , Hydrogenated rapeseed oil , Xylose , Polyglyceryl-3 Diisostearate , Simmondsia Ch', 'Kem dưỡng Bioderma Cicabio Crème+ giúp phục hồi da tổn thương, hỗ trợ làm mờ sẹo (40ml).', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp x 40ml', 331800, 395000, '/assets/products/88.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT088A', 39, 0, 215670, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 39, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT088B', 92, 0, 215670, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 92, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'duoc-my-pham' OR name = 'Dược mỹ phẩm' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Eucerin' ORDER BY id LIMIT 1),
    'Tinh chất Eucerin Anti-Age Hyaluron-Filler Moisture Filler cấp ẩm ngăn ngừa lão hóa (30ml)', 'tinh-chat-eucerin-anti-age-hyaluron-filler-moisture-filler-cap-am-ngan-ngua-lao-hoa-30ml', 'Aqua , Alcohol Denat , Butylene glycol , Glycerin , Sodium hyaluronate , Peg-40 Hydrogenated Castor Oil , Caprylyl glycol , Citric Acid , BHT , Parfum , Sodium Ascorbyl Phosphate', 'Tinh chất Eucerin Anti-Age Hyaluron-Filler Moisture Filler cấp ẩm ngăn ngừa lão hóa (30ml). Dạng bào chế: Serum.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp x 30ml', 889000, NULL, '/assets/products/89.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT089A', 44, 0, 577850, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 44, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT089B', 104, 0, 577850, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 104, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'duoc-my-pham' OR name = 'Dược mỹ phẩm' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Garnier' ORDER BY id LIMIT 1),
    'Tinh chất dưỡng sáng da, mờ thâm Garnier Skin Naturals Bright Complete 30x Vitamin C Booster Serum 30ml', 'tinh-chat-duong-sang-da-mo-tham-garnier-skin-naturals-bright-complete-30x-vitamin-c-booster-serum-30ml', 'Oxothiazolidinecarboxylic acid , Acetyl Trifluoromethylphenyl Valylglycine , Maltodextrin , Xanthan gum , Citrus Junos Fruit Extract , Citrus Limon Fruit Extract , Citric Acid , Hydrogenated Lecithin , Disodium EDTA , Tocopheryl acetate , A', 'Tinh chất dưỡng sáng da, mờ thâm Garnier Skin Naturals Bright Complete 30x Vitamin C Booster Serum 30ml.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp x 30ml', 262650, 309000, '/assets/products/90.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT090A', 49, 0, 170723, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 49, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT090B', 116, 0, 170723, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 116, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuc-pham-chuc-nang' OR name = 'Thực phẩm chức năng' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Traphaco' ORDER BY id LIMIT 1),
    'Thuốc Hoạt Huyết Dưỡng Não bao phim Traphaco', 'thuoc-hoat-huyet-duong-nao-bao-phim-traphaco', 'Bạch quả 5mg, Đinh lăng 150mg', 'Thuốc Hoạt Huyết Dưỡng Não bao phim Traphaco điều trị suy giảm trí nhớ, căng thẳng thần kinh (5 vỉ x 20 viên). Dạng bào chế: Viên nén bao phim.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 5 Vỉ x 20 Viên', 115000, NULL, '/assets/products/91.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT091A', 12, 0, 74750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 12, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT091B', 30, 0, 74750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 30, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuc-pham-chuc-nang' OR name = 'Thực phẩm chức năng' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Traphaco' ORDER BY id LIMIT 1),
    'Thuốc Boganic Forte Traphaco bổ gan, hỗ trợ điều trị suy giảm chức năng gan (5 vỉ x 10 viên)', 'thuoc-boganic-forte-traphaco-bo-gan-ho-tro-dieu-tri-suy-giam-chuc-nang-gan-5-vi-x-10-vien', 'Bìm Bìm 13.6mg, Rau đắng đất 128mg, Cao khô actiso 170mg', 'Thuốc Boganic Forte Traphaco bổ gan, hỗ trợ điều trị suy giảm chức năng gan (5 vỉ x 10 viên). Dạng bào chế: Viên nang mềm.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 5 vỉ x 10 viên', 115000, 132000, '/assets/products/92.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT092A', 17, 0, 74750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 17, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT092B', 42, 0, 74750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 42, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuc-pham-chuc-nang' OR name = 'Thực phẩm chức năng' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Vitatree' ORDER BY id LIMIT 1),
    'Viên uống Vitatree Glucosamine 1500 Plus Shark Cartilage (100 viên)', 'vien-uong-vitatree-glucosamine-1500-plus-shark-cartilage-100-vien', 'bột sụn vi cá mập 250mg, Glucosamine Hydrochloride 1500mg', 'Viên uống hỗ trợ duy trì chức năng của khớp, sụn khớp Vitatree Glucosamine 1500 Plus Shark Cartilage (100 viên). Dạng bào chế: Viên nén.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 100 viên', 700000, NULL, '/assets/products/93.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT093A', 22, 0, 455000, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 22, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT093B', 54, 0, 455000, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 54, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuc-pham-chuc-nang' OR name = 'Thực phẩm chức năng' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Ecogreen' ORDER BY id LIMIT 1),
    'Viên uống tăng cường thị lực giảm mờ và nhòe mắt WIT For Your Eyes (30 viên)', 'vien-uong-tang-cuong-thi-luc-giam-mo-va-nhoe-mat-wit-for-your-eyes-30-vien', 'Bông cải xanh 5000Mcg, Việt quất 100mg, Zeaxanthin 100mg, DHA , Vitamin C', 'Viên uống tăng cường thị lực giảm mờ và nhòe mắt WIT For Your Eyes (30 viên). Dạng bào chế: Viên nang.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 30 Viên', 352800, 392000, '/assets/products/94.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT094A', 27, 0, 229320, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 27, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT094B', 66, 0, 229320, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 66, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuc-pham-chuc-nang' OR name = 'Thực phẩm chức năng' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Thái Minh' ORDER BY id LIMIT 1),
    'Viên hỗ trợ viêm đại tràng cấp và mãn tính Tràng Phục Linh (2 vỉ x 10 viên)', 'vien-ho-tro-viem-dai-trang-cap-va-man-tinh-trang-phuc-linh-2-vi-x-10-vien', 'Phục Linh 50mg, ImmuneGamma 100mg, Bạch truật', 'Viên hỗ trợ viêm đại tràng cấp và mãn tính Tràng Phục Linh (2 vỉ x 10 viên). Dạng bào chế: Viên nang.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 2 vỉ x 10 viên', 115000, NULL, '/assets/products/95.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT095A', 33, 0, 74750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 33, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT095B', 77, 0, 74750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 77, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuc-pham-chuc-nang' OR name = 'Thực phẩm chức năng' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Tâm Bình' ORDER BY id LIMIT 1),
    'Viên giảm viêm đại tràng cấp và mãn tính Đại Tràng Tâm Bình (5 vỉ x 12 viên)', 'vien-giam-viem-dai-trang-cap-va-man-tinh-dai-trang-tam-binh-5-vi-x-12-vien', 'Bạch linh 150mg, Đảng Sâm 100mg, Trần bì 100mg, Mộc hương bắc 150mg, Hoài Sơn 100mg, Nhục đậu khấu 80mg, Mạch Nha 100mg, Sơn Tra 150mg, Sa nhân 80mg, Hoàng liên 80mg, Tá dược vừa đủ  , Bạch truật  , Cam thảo', 'Viên giảm viêm đại tràng cấp và mãn tính Đại Tràng Tâm Bình (5 vỉ x 12 viên). Dạng bào chế: Viên nang cứng.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 5 vỉ x 12 viên', 125000, 144000, '/assets/products/96.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT096A', 38, 0, 81250, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 38, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT096B', 89, 0, 81250, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 89, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuc-pham-chuc-nang' OR name = 'Thực phẩm chức năng' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Ecogreen' ORDER BY id LIMIT 1),
    'Viên uống tăng cường sinh lực phái mạnh Ecogreen Men’s Ginseng Alipas (60 viên)', 'vien-uong-tang-cuong-sinh-luc-phai-manh-ecogreen-men-s-ginseng-alipas-60-vien', 'Eurycoma logifolia 240mg, Oyster Meat Extract 150mg, Tribulus terrestris 100mg, L-Arginine HCL 100mg, Butea superba Extract 81mg, Horny Goat Weed Extract 50mg, Ginkgo Leaf Extract 40mg, Pine bark extract 40mg, Zinc picolinate 30mg', 'Viên uống tăng cường sinh lực phái mạnh Ecogreen Men’s Ginseng Alipas (60 viên). Dạng bào chế: Viên nang.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 60 Viên', 1550000, NULL, '/assets/products/97.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT097A', 43, 0, 1007500, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 43, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT097B', 101, 0, 1007500, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 101, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuc-pham-chuc-nang' OR name = 'Thực phẩm chức năng' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Hongjitang' ORDER BY id LIMIT 1),
    'Thuốc An Cung Ngưu Hoàng Hoàn thanh nhiệt, giải độc, trấn kinh, khai khiếu (1 viên)', 'thuoc-an-cung-nguu-hoang-hoan-thanh-nhiet-giai-doc-tran-kinh-khai-khieu-1-vien', 'Ngưu hoàng 166.7mg, Bột thủy ngưu giác cô đặc 333.3mg, Xạ hương 41.7mg, Trân Châu 83.3mg, Chu sa 166.7mg, Hùng hoàng 166.7mg, Hoàng liên 166.7mg, Hoàng cầm 166.7mg, Chi tử 166.7mg, Uất Kim 166.7mg, Băng phiến 41.7mg, Mật ong 1333.1mg', 'Thuốc An Cung Ngưu Hoàng Hoàn thanh nhiệt, giải độc, trấn kinh, khai khiếu (1 viên). Dạng bào chế: Viên hoàn mềm.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 1 Viên', 95000, NULL, '/assets/products/98.png', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT098A', 48, 0, 61750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 48, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT098B', 113, 0, 61750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 113, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuc-pham-chuc-nang' OR name = 'Thực phẩm chức năng' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Opc' ORDER BY id LIMIT 1),
    'Thuốc Cao Ích Mẫu OPC điều trị kinh nguyệt không đều (180ml)', 'thuoc-cao-ich-mau-opc-dieu-tri-kinh-nguyet-khong-deu-180ml', 'Ngải cứu 18mg, Hương phụ 22.5mg, Ích mẫu 72mg', 'Thuốc Cao Ích Mẫu OPC điều trị kinh nguyệt không đều (180ml). Dạng bào chế: Cao lỏng.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Chai x 180ml', 60000, NULL, '/assets/products/99.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT099A', 11, 0, 39000, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 11, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT099B', 27, 0, 39000, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 27, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

  INSERT INTO antam.thuoc (
    category_id, manufacturer_id, name, slug, ingredient, description, usage, warning,
    unit, price, old_price, image, prescription_required, featured, active
  ) VALUES (
    (SELECT id FROM antam.danh_muc WHERE slug = 'thuc-pham-chuc-nang' OR name = 'Thực phẩm chức năng' ORDER BY id LIMIT 1),
    (SELECT id FROM antam.nha_san_xuat WHERE name = 'Jpanwell' ORDER BY id LIMIT 1),
    'Viên uống bổ phổi, hỗ trợ hệ hô hấp khỏe mạnh Lung Care+ Jpanwell (60 viên)', 'vien-uong-bo-phoi-ho-tro-he-ho-hap-khoe-manh-lung-care-jpanwell-60-vien', 'bột hoa cúc tím 150mg', 'Viên uống bổ phổi, hỗ trợ hệ hô hấp khỏe mạnh Lung Care+ Jpanwell (60 viên). Dạng bào chế: Viên nang.', 'Đọc kỹ hướng dẫn trên bao bì; hỏi dược sĩ để được tư vấn phù hợp. Thông tin trong bản demo không dùng làm chỉ định điều trị.', 'Dữ liệu mẫu cho đồ án. Không tự ý dùng thuốc kê đơn hoặc thay đổi điều trị. Sản phẩm bổ sung không thay thế thuốc chữa bệnh.',
    'Hộp 60 Viên', 995000, 1144000, '/assets/products/100.jpg', 0, 0, 1
  )
  ON CONFLICT (slug) DO UPDATE SET
    image = EXCLUDED.image,
    updated_at = v_now
  RETURNING id INTO v_pid;
  IF NOT EXISTS (SELECT 1 FROM antam.lo_thuoc WHERE product_id = v_pid) THEN
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT100A', 16, 0, 646750, '2026-05-23', '2027-07-17')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 16, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
    INSERT INTO antam.lo_thuoc (product_id, receipt_id, batch_number, quantity, reserved, cost, manufactured_at, expires_at)
    VALUES (v_pid, v_receipt_id, 'AT100B', 39, 0, 646750, '2026-05-23', '2028-05-12')
    ON CONFLICT (product_id, batch_number) DO NOTHING
    RETURNING id INTO v_bid;
    IF v_bid IS NOT NULL THEN
      INSERT INTO antam.lich_su_ton_kho (product_id, batch_id, user_id, type, quantity, reason)
      VALUES (v_pid, v_bid, v_user_id, 'receipt', 39, 'Đồng bộ 100 sản phẩm Long Châu');
    END IF;
  END IF;

END $$;
COMMIT;

SELECT COUNT(*) AS tong_san_pham,
       COUNT(*) FILTER (WHERE image ~ '^/assets/products/[0-9]+\.(jpg|png|webp)$') AS anh_long_chau
FROM antam.thuoc;
