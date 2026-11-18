-- Schema tham chiếu MySQL 8.0 của báo cáo Nhóm 11 (mục 2.6).
-- Runtime local sử dụng schema.sqlite.sql. Hai schema không dùng chung kho dữ liệu.

-- CSDL hệ thống bán thuốc trực tuyến tích hợp chatbot AI (Nhóm 11) — sinh từ thiết kế mục 2.6.1.
-- MySQL 8.0, InnoDB, utf8mb4. Bảng được tạo theo thứ tự phụ thuộc (bảng được tham chiếu trước).
-- Kế thừa Người dùng chuyển theo Joined Table: nguoi_dung (cột chung) + khach_hang, nhan_vien, quan_tri_vien
-- (id bảng con vừa là khóa chính vừa là khóa ngoại → nguoi_dung.id).
-- Dùng: tạo CSDL, chạy script, rồi Database > Reverse Engineer trong MySQL Workbench để chụp lược đồ.

-- Quyền hiệu lực UC12.3: hợp các quyền của vai trò đang gắn và ngoại lệ ChoPhep;
-- ngoại lệ TuChoi có hiệu lực ưu tiên, DaThuHoi không tham gia. Tài khoản phải có
-- ít nhất một vai trò; việc gán Dược sĩ và quyền duyệt đơn thuốc kiểm tra nghiệp vụ.
-- Không cho xóa quyền quản trị của quản trị viên duy nhất.

CREATE DATABASE IF NOT EXISTS ban_thuoc_truc_tuyen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ban_thuoc_truc_tuyen;

CREATE TABLE nguoi_dung (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã người dùng. Khóa chính, tự tăng.',
  ho_ten VARCHAR(100) NOT NULL COMMENT 'Họ và tên. NOT NULL.',
  email VARCHAR(100) NULL UNIQUE COMMENT 'Email đăng nhập, nhận OTP. UNIQUE; được để trống nếu đăng ký bằng số điện thoại (phải có ít nhất email hoặc số điện thoại – FR01).',
  so_dien_thoai VARCHAR(15) NULL UNIQUE COMMENT 'Số điện thoại đăng ký. UNIQUE; được để trống nếu đăng ký bằng email.',
  mat_khau_ma_hoa VARCHAR(255) NOT NULL COMMENT 'Mật khẩu đã mã hóa, không lưu mật khẩu gốc. NOT NULL.',
  trang_thai ENUM('ChoXacThuc', 'HoatDong', 'BiKhoa') NOT NULL DEFAULT 'ChoXacThuc' COMMENT 'Trạng thái tài khoản: chờ xác thực OTP (UC01.2), hoạt động, bị khóa (UC11.2). NOT NULL, mặc định ChoXacThuc.',
  ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Ngày tạo tài khoản. NOT NULL, mặc định thời điểm hiện tại.',
  ngay_cap_nhat DATETIME NULL COMMENT 'Ngày cập nhật gần nhất.',
  PRIMARY KEY (id),
  CONSTRAINT ck_nguoi_dung_1 CHECK (email IS NOT NULL OR so_dien_thoai IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng nguoi_dung (người dùng)';

CREATE TABLE khach_hang (
  id INT NOT NULL COMMENT 'Mã khách hàng, trùng mã người dùng. Khóa chính, đồng thời là khóa ngoại → nguoi_dung.id.',
  PRIMARY KEY (id),
  CONSTRAINT fk_khach_hang_id FOREIGN KEY (id) REFERENCES nguoi_dung (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng khach_hang (khách hàng)';

CREATE TABLE nhan_vien (
  id INT NOT NULL COMMENT 'Mã nhân viên, trùng mã người dùng. Khóa chính, đồng thời là khóa ngoại → nguoi_dung.id.',
  chuc_danh ENUM('DuocSi', 'NhanVienBanHang', 'NhanVienKho') NOT NULL COMMENT 'Chức danh của nhân viên. Chỉ DuocSi mới được cấp quyền kiểm duyệt đơn thuốc (BR2 UC12.3). NOT NULL.',
  PRIMARY KEY (id),
  CONSTRAINT fk_nhan_vien_id FOREIGN KEY (id) REFERENCES nguoi_dung (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng nhan_vien (nhân viên)';

CREATE TABLE quan_tri_vien (
  id INT NOT NULL COMMENT 'Mã quản trị viên, trùng mã người dùng. Khóa chính, đồng thời là khóa ngoại → nguoi_dung.id.',
  PRIMARY KEY (id),
  CONSTRAINT fk_quan_tri_vien_id FOREIGN KEY (id) REFERENCES nguoi_dung (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng quan_tri_vien (quản trị viên)';

CREATE TABLE vai_tro (
  id INT NOT NULL AUTO_INCREMENT,
  ma_vai_tro VARCHAR(40) NOT NULL UNIQUE,
  ten_vai_tro VARCHAR(100) NOT NULL,
  mo_ta VARCHAR(255) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Danh mục vai trò UC12.3';

INSERT INTO vai_tro (ma_vai_tro, ten_vai_tro) VALUES
  ('KhachHang', 'Khách hàng'),
  ('NhanVienBanHang', 'Nhân viên bán hàng'),
  ('DuocSi', 'Dược sĩ'),
  ('NhanVienKho', 'Nhân viên kho'),
  ('QuanTriVien', 'Quản trị viên');

CREATE TABLE nguoi_dung_vai_tro (
  id INT NOT NULL AUTO_INCREMENT,
  nguoi_dung_id INT NOT NULL,
  vai_tro_id INT NOT NULL,
  ngay_gan DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nguoi_dung_vai_tro (nguoi_dung_id, vai_tro_id),
  CONSTRAINT fk_ndvt_nguoi_dung FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung (id),
  CONSTRAINT fk_ndvt_vai_tro FOREIGN KEY (vai_tro_id) REFERENCES vai_tro (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Vai trò gắn với tài khoản';

CREATE TABLE quyen (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã quyền. Khóa chính, tự tăng.',
  ma_quyen VARCHAR(50) NOT NULL UNIQUE COMMENT 'Mã quyền duy nhất của một cặp chức năng-thao tác. NOT NULL, UNIQUE.',
  ten_quyen VARCHAR(100) NOT NULL COMMENT 'Tên hiển thị của quyền. NOT NULL.',
  chuc_nang VARCHAR(100) NOT NULL COMMENT 'Chức năng được kiểm soát.',
  hanh_dong ENUM('Xem', 'Them', 'Sua', 'Xoa', 'Duyet') NOT NULL COMMENT 'Thao tác trong chức năng.',
  mo_ta VARCHAR(255) NULL COMMENT 'Mô tả phạm vi quyền.',
  UNIQUE KEY uq_quyen_chuc_nang_hanh_dong (chuc_nang, hanh_dong),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng quyen (quyền)';

CREATE TABLE quyen_vai_tro (
  id INT NOT NULL AUTO_INCREMENT,
  vai_tro_id INT NOT NULL,
  quyen_id INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quyen_vai_tro (vai_tro_id, quyen_id),
  CONSTRAINT fk_qvt_vai_tro FOREIGN KEY (vai_tro_id) REFERENCES vai_tro (id),
  CONSTRAINT fk_qvt_quyen FOREIGN KEY (quyen_id) REFERENCES quyen (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bộ quyền mặc định của vai trò';

CREATE TABLE phan_quyen (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã bản ghi phân quyền. Khóa chính, tự tăng.',
  nguoi_dung_id INT NOT NULL COMMENT 'Tài khoản có ngoại lệ quyền. Khóa ngoại → nguoi_dung.id; NOT NULL.',
  quyen_id INT NOT NULL COMMENT 'Quyền áp dụng ngoại lệ. Khóa ngoại → quyen.id; NOT NULL.',
  nguoi_cap_id INT NOT NULL COMMENT 'Quản trị viên cấp hoặc thu hồi quyền. Khóa ngoại → quan_tri_vien.id; NOT NULL.',
  kieu_ngoai_le ENUM('ChoPhep', 'TuChoi') NOT NULL COMMENT 'Ngoại lệ cấp hoặc chặn quyền cho tài khoản.',
  thoi_diem_cap DATETIME NOT NULL COMMENT 'Thời điểm cấp hoặc điều chỉnh quyền. NOT NULL.',
  trang_thai ENUM('HieuLuc', 'DaThuHoi') NOT NULL DEFAULT 'HieuLuc' COMMENT 'Hiệu lực ngoại lệ; chỉ HieuLuc tham gia tính quyền hiệu lực. NOT NULL, mặc định HieuLuc.',
  PRIMARY KEY (id),
  UNIQUE KEY uq_phan_quyen_tai_khoan_quyen (nguoi_dung_id, quyen_id),
  CONSTRAINT fk_phan_quyen_nguoi_dung_id FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung (id),
  CONSTRAINT fk_phan_quyen_quyen_id FOREIGN KEY (quyen_id) REFERENCES quyen (id),
  CONSTRAINT fk_phan_quyen_nguoi_cap_id FOREIGN KEY (nguoi_cap_id) REFERENCES quan_tri_vien (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Ngoại lệ phân quyền ở cấp tài khoản';

CREATE TABLE ma_otp (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã bản ghi. Khóa chính, tự tăng.',
  nguoi_dung_id INT NOT NULL COMMENT 'Tài khoản nhận mã. Khóa ngoại → nguoi_dung.id; NOT NULL.',
  ma_xac_nhan VARCHAR(10) NOT NULL COMMENT 'Mã OTP/mã xác nhận đã gửi. NOT NULL.',
  muc_dich ENUM('DangKy', 'QuenMatKhau') NOT NULL COMMENT 'Xác thực đăng ký (UC01.2) hoặc đặt lại mật khẩu (UC02.3). NOT NULL.',
  thoi_diem_het_han DATETIME NOT NULL COMMENT 'Hạn dùng của mã. NOT NULL.',
  da_su_dung BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Mã đã được dùng hay chưa; mã đã dùng không dùng lại được. NOT NULL, mặc định FALSE.',
  PRIMARY KEY (id),
  CONSTRAINT fk_ma_otp_nguoi_dung_id FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng ma_otp (mã OTP)';

CREATE TABLE nhat_ky_hoat_dong (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã bản ghi nhật ký. Khóa chính, tự tăng.',
  nguoi_dung_id INT NULL COMMENT 'Người thực hiện. Khóa ngoại → nguoi_dung.id; để trống nếu do hệ thống tự ghi.',
  hanh_dong VARCHAR(100) NOT NULL COMMENT 'Loại thao tác: kiểm duyệt đơn thuốc, phân quyền, nhập kho, kết quả thanh toán bất thường, xử lý hủy/hoàn tiền... NOT NULL.',
  doi_tuong VARCHAR(50) NOT NULL COMMENT 'Loại đối tượng bị tác động (tên bảng). NOT NULL.',
  doi_tuong_id INT NULL COMMENT 'Mã bản ghi bị tác động; không đặt khóa ngoại vì trỏ tới nhiều bảng.',
  chi_tiet TEXT NULL COMMENT 'Nội dung chi tiết của thao tác.',
  thoi_diem DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm thao tác. NOT NULL, mặc định thời điểm hiện tại.',
  PRIMARY KEY (id),
  CONSTRAINT fk_nhat_ky_hoat_dong_nguoi_dung_id FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng nhat_ky_hoat_dong (nhật ký hoạt động)';

CREATE TABLE danh_muc (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã danh mục. Khóa chính, tự tăng.',
  ten_danh_muc VARCHAR(100) NOT NULL UNIQUE COMMENT 'Tên danh mục, dùng để lọc thuốc (UC04.2). NOT NULL, UNIQUE.',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng danh_muc (danh mục thuốc)';

CREATE TABLE nha_san_xuat (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã nhà sản xuất. Khóa chính, tự tăng.',
  ten_nha_san_xuat VARCHAR(150) NOT NULL UNIQUE COMMENT 'Tên nhà sản xuất, dùng để lọc thuốc (UC04.2); không trùng (BR2 UC12.1). NOT NULL, UNIQUE.',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng nha_san_xuat (nhà sản xuất)';

CREATE TABLE thuoc (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã thuốc. Khóa chính, tự tăng.',
  ten_thuoc VARCHAR(200) NOT NULL COMMENT 'Tên thuốc, dùng tìm kiếm theo tên. NOT NULL.',
  hoat_chat VARCHAR(255) NULL COMMENT 'Hoạt chất, dùng tìm kiếm theo hoạt chất.',
  thanh_phan TEXT NULL COMMENT 'Thành phần.',
  cong_dung TEXT NULL COMMENT 'Công dụng, chỉ định; dùng tìm kiếm theo công dụng.',
  cach_dung TEXT NULL COMMENT 'Cách dùng, liều dùng.',
  chong_chi_dinh TEXT NULL COMMENT 'Chống chỉ định.',
  luu_y TEXT NULL COMMENT 'Lưu ý, khả năng tương tác thuốc.',
  phan_loai ENUM('KeDon', 'KhongKeDon', 'ThucPhamChucNang', 'ThietBiYTe') NOT NULL COMMENT 'Phân loại sản phẩm; thuốc KeDon chỉ bán khi đơn thuốc đã được duyệt. NOT NULL.',
  gia_ban DECIMAL(12,2) NOT NULL COMMENT 'Giá bán, dùng lọc theo giá. NOT NULL, không âm.',
  muc_ton_canh_bao INT NULL COMMENT 'Ngưỡng tồn kho để cảnh báo sắp hết hàng (UC09.5).',
  trang_thai ENUM('DangBan', 'DaAn') NOT NULL DEFAULT 'DangBan' COMMENT 'Trạng thái hiển thị; DaAn khi nhân viên ẩn thuốc (UC09.3). NOT NULL, mặc định DangBan.',
  danh_muc_id INT NOT NULL COMMENT 'Danh mục của thuốc. Khóa ngoại → danh_muc.id; NOT NULL.',
  nha_san_xuat_id INT NOT NULL COMMENT 'Nhà sản xuất. Khóa ngoại → nha_san_xuat.id; NOT NULL.',
  PRIMARY KEY (id),
  CONSTRAINT fk_thuoc_danh_muc_id FOREIGN KEY (danh_muc_id) REFERENCES danh_muc (id),
  CONSTRAINT fk_thuoc_nha_san_xuat_id FOREIGN KEY (nha_san_xuat_id) REFERENCES nha_san_xuat (id),
  CONSTRAINT ck_thuoc_1 CHECK (gia_ban >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng thuoc (thuốc)';

CREATE TABLE dia_chi_giao_hang (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã địa chỉ. Khóa chính, tự tăng.',
  khach_hang_id INT NOT NULL COMMENT 'Khách hàng sở hữu địa chỉ. Khóa ngoại → khach_hang.id; NOT NULL.',
  dia_chi VARCHAR(255) NOT NULL COMMENT 'Nội dung địa chỉ giao hàng. NOT NULL.',
  PRIMARY KEY (id),
  CONSTRAINT fk_dia_chi_giao_hang_khach_hang_id FOREIGN KEY (khach_hang_id) REFERENCES khach_hang (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng dia_chi_giao_hang (địa chỉ giao hàng)';

CREATE TABLE gio_hang (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã giỏ hàng. Khóa chính, tự tăng.',
  khach_hang_id INT NOT NULL UNIQUE COMMENT 'Chủ giỏ hàng. Khóa ngoại → khach_hang.id; NOT NULL, UNIQUE (mỗi khách một giỏ).',
  ngay_cap_nhat DATETIME NULL COMMENT 'Lần cập nhật giỏ gần nhất.',
  PRIMARY KEY (id),
  CONSTRAINT fk_gio_hang_khach_hang_id FOREIGN KEY (khach_hang_id) REFERENCES khach_hang (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng gio_hang (giỏ hàng)';

CREATE TABLE chi_tiet_gio_hang (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã dòng giỏ hàng. Khóa chính, tự tăng.',
  gio_hang_id INT NOT NULL COMMENT 'Giỏ hàng chứa dòng này. Khóa ngoại → gio_hang.id; NOT NULL.',
  thuoc_id INT NOT NULL COMMENT 'Thuốc được chọn. Khóa ngoại → thuoc.id; NOT NULL. Cặp (gio_hang_id, thuoc_id) là UNIQUE.',
  so_luong INT NOT NULL COMMENT 'Số lượng (UC05.2). NOT NULL, lớn hơn 0.',
  PRIMARY KEY (id),
  UNIQUE KEY uq_chi_tiet_gio_hang_gio_hang_thuoc (gio_hang_id, thuoc_id),
  CONSTRAINT fk_chi_tiet_gio_hang_gio_hang_id FOREIGN KEY (gio_hang_id) REFERENCES gio_hang (id),
  CONSTRAINT fk_chi_tiet_gio_hang_thuoc_id FOREIGN KEY (thuoc_id) REFERENCES thuoc (id),
  CONSTRAINT ck_chi_tiet_gio_hang_1 CHECK (so_luong > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng chi_tiet_gio_hang (chi tiết giỏ hàng)';

CREATE TABLE khuyen_mai (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã khuyến mãi. Khóa chính, tự tăng.',
  ma_giam_gia VARCHAR(30) NOT NULL UNIQUE COMMENT 'Mã khách nhập khi đặt hàng (UC06.2). NOT NULL, UNIQUE.',
  ten_chuong_trinh VARCHAR(150) NOT NULL COMMENT 'Tên chương trình ưu đãi. NOT NULL.',
  gia_tri_giam DECIMAL(12,2) NOT NULL COMMENT 'Mức giảm. NOT NULL.',
  ngay_bat_dau DATETIME NULL COMMENT 'Thời điểm bắt đầu áp dụng; để trống khi chương trình mới tạo (ChuaApDung, UC12.2), bắt buộc khi thiết lập thời gian áp dụng (UC12.3).',
  ngay_ket_thuc DATETIME NULL COMMENT 'Thời điểm kết thúc, phải sau ngày bắt đầu; để trống và bắt buộc như ngay_bat_dau.',
  trang_thai ENUM('ChuaApDung', 'DangApDung', 'TamDung', 'HetHan', 'DaXoa') NOT NULL DEFAULT 'ChuaApDung' COMMENT 'Trạng thái (UC12.3); DaXoa là xóa mềm để các đơn đã áp dụng vẫn tra cứu được. NOT NULL, mặc định ChuaApDung.',
  nguoi_tao_id INT NOT NULL COMMENT 'Quản trị viên tạo mã. Khóa ngoại → quan_tri_vien.id; NOT NULL.',
  PRIMARY KEY (id),
  CONSTRAINT fk_khuyen_mai_nguoi_tao_id FOREIGN KEY (nguoi_tao_id) REFERENCES quan_tri_vien (id),
  CONSTRAINT ck_khuyen_mai_1 CHECK (ngay_ket_thuc > ngay_bat_dau),
  CONSTRAINT ck_khuyen_mai_2 CHECK (trang_thai IN ('ChuaApDung', 'DaXoa') OR (ngay_bat_dau IS NOT NULL AND ngay_ket_thuc IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng khuyen_mai (khuyến mãi)';

CREATE TABLE don_hang (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã đơn hàng. Khóa chính, tự tăng.',
  khach_hang_id INT NOT NULL COMMENT 'Khách đặt hàng. Khóa ngoại → khach_hang.id; NOT NULL.',
  dia_chi_giao_hang_id INT NULL COMMENT 'Địa chỉ trong sổ địa chỉ mà khách đã chọn khi đặt (UC06.1). Khóa ngoại → dia_chi_giao_hang.id; được để trống, tự để trống khi khách xóa địa chỉ đó khỏi sổ địa chỉ (UC03.3).',
  dia_chi_giao VARCHAR(255) NOT NULL COMMENT 'Địa chỉ giao tại thời điểm đặt, không đổi khi khách sửa hoặc xóa sổ địa chỉ (UC03.3). NOT NULL.',
  phuong_thuc_giao_hang VARCHAR(50) NOT NULL COMMENT 'Phương thức giao hàng đã chọn (UC06.1). NOT NULL.',
  phuong_thuc_thanh_toan ENUM('TrucTuyen', 'COD') NULL COMMENT 'Thanh toán trực tuyến (UC06.4) hoặc khi nhận hàng (UC06.5); để trống khi khách chưa chọn.',
  khuyen_mai_id INT NULL COMMENT 'Mã giảm giá đã áp dụng. Khóa ngoại → khuyen_mai.id; được để trống.',
  tong_tien_hang DECIMAL(12,2) NOT NULL COMMENT 'Tổng tiền hàng. NOT NULL.',
  tien_giam DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Số tiền được giảm. NOT NULL, mặc định 0.',
  tong_thanh_toan DECIMAL(12,2) NOT NULL COMMENT 'Số tiền khách phải trả (UC06.4 bước 2). NOT NULL.',
  can_duyet_don_thuoc BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Đơn có thuốc kê đơn, phải có đơn thuốc được duyệt. NOT NULL, mặc định FALSE.',
  trang_thai ENUM('ChoKiemDuyetDonThuoc', 'ChoThanhToan', 'ChoXacNhan', 'DaXacNhan', 'DangDongGoi', 'DangGiao', 'DaGiao', 'BiTuChoi', 'DaHuy') NOT NULL COMMENT 'Trạng thái xử lý đơn; khởi tạo ChoKiemDuyetDonThuoc nếu có thuốc kê đơn, ngược lại ChoThanhToan. NOT NULL.',
  trang_thai_thanh_toan ENUM('ChuaThanhToan', 'ChoXacMinh', 'DaThanhToan', 'ChoHoanTien', 'DaHoanTien') NOT NULL DEFAULT 'ChuaThanhToan' COMMENT 'Trạng thái thanh toán, tách riêng với trạng thái xử lý đơn. NOT NULL, mặc định ChuaThanhToan.',
  ngay_dat DATETIME NOT NULL COMMENT 'Thời điểm đặt hàng. NOT NULL.',
  ngay_cap_nhat DATETIME NULL COMMENT 'Thời điểm cập nhật gần nhất.',
  PRIMARY KEY (id),
  CONSTRAINT fk_don_hang_khach_hang_id FOREIGN KEY (khach_hang_id) REFERENCES khach_hang (id),
  CONSTRAINT fk_don_hang_dia_chi_giao_hang_id FOREIGN KEY (dia_chi_giao_hang_id) REFERENCES dia_chi_giao_hang (id) ON DELETE SET NULL,
  CONSTRAINT fk_don_hang_khuyen_mai_id FOREIGN KEY (khuyen_mai_id) REFERENCES khuyen_mai (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng don_hang (đơn hàng)';

CREATE TABLE chi_tiet_don_hang (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã dòng đơn hàng. Khóa chính, tự tăng.',
  don_hang_id INT NOT NULL COMMENT 'Đơn hàng chứa dòng này. Khóa ngoại → don_hang.id; NOT NULL.',
  thuoc_id INT NOT NULL COMMENT 'Thuốc được mua. Khóa ngoại → thuoc.id; NOT NULL.',
  so_luong INT NOT NULL COMMENT 'Số lượng mua. NOT NULL, lớn hơn 0.',
  don_gia DECIMAL(12,2) NOT NULL COMMENT 'Giá bán tại thời điểm đặt, không đổi khi giá thuốc thay đổi. NOT NULL.',
  PRIMARY KEY (id),
  CONSTRAINT fk_chi_tiet_don_hang_don_hang_id FOREIGN KEY (don_hang_id) REFERENCES don_hang (id),
  CONSTRAINT fk_chi_tiet_don_hang_thuoc_id FOREIGN KEY (thuoc_id) REFERENCES thuoc (id),
  CONSTRAINT ck_chi_tiet_don_hang_1 CHECK (so_luong > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng chi_tiet_don_hang (chi tiết đơn hàng)';

CREATE TABLE don_thuoc (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã đơn thuốc. Khóa chính, tự tăng.',
  don_hang_id INT NOT NULL UNIQUE COMMENT 'Đơn hàng có thuốc kê đơn. Khóa ngoại → don_hang.id; NOT NULL, UNIQUE (mỗi đơn hàng tối đa một đơn thuốc).',
  duong_dan_tep VARCHAR(255) NOT NULL COMMENT 'Vị trí lưu ảnh/tệp đơn thuốc; chỉ người có quyền được truy cập (BR2 UC06.3). NOT NULL.',
  dinh_dang_tep VARCHAR(10) NOT NULL COMMENT 'Định dạng tệp đã được kiểm tra khi tải lên. NOT NULL.',
  thoi_diem_tai_len DATETIME NOT NULL COMMENT 'Thời điểm tải lên. NOT NULL.',
  trang_thai ENUM('ChoDuyet', 'ChoBoSung', 'DaDuyet', 'BiTuChoi') NOT NULL DEFAULT 'ChoDuyet' COMMENT 'Trạng thái kiểm duyệt. NOT NULL, mặc định ChoDuyet.',
  nguoi_duyet_id INT NULL COMMENT 'Nhân viên kiểm duyệt (chức danh DuocSi, có quyền kiểm duyệt). Khóa ngoại → nhan_vien.id; để trống khi chưa duyệt.',
  thoi_diem_duyet DATETIME NULL COMMENT 'Thời điểm duyệt hoặc từ chối.',
  ly_do VARCHAR(500) NULL COMMENT 'Lý do từ chối (bắt buộc khi BiTuChoi – BR2 UC10.2) hoặc nội dung cần bổ sung.',
  PRIMARY KEY (id),
  CONSTRAINT fk_don_thuoc_don_hang_id FOREIGN KEY (don_hang_id) REFERENCES don_hang (id),
  CONSTRAINT fk_don_thuoc_nguoi_duyet_id FOREIGN KEY (nguoi_duyet_id) REFERENCES nhan_vien (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng don_thuoc (đơn thuốc)';

CREATE TABLE giao_dich_thanh_toan (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã bản ghi giao dịch. Khóa chính, tự tăng.',
  don_hang_id INT NOT NULL COMMENT 'Đơn hàng của giao dịch. Khóa ngoại → don_hang.id; NOT NULL.',
  loai_giao_dich ENUM('ThanhToan', 'HoanTien') NOT NULL COMMENT 'Thanh toán (UC06.4) hoặc hoàn tiền (UC10.4). NOT NULL.',
  ma_giao_dich VARCHAR(100) NOT NULL UNIQUE COMMENT 'Mã giao dịch đối chiếu với cổng thanh toán. NOT NULL, UNIQUE để không ghi nhận trùng (BR3 UC06.4).',
  so_tien DECIMAL(12,2) NOT NULL COMMENT 'Số tiền giao dịch, đối chiếu với kết quả cổng trả về. NOT NULL.',
  trang_thai ENUM('DaKhoiTao', 'ChoXacMinh', 'ThanhCong', 'ThatBai', 'DaHuy') NOT NULL DEFAULT 'DaKhoiTao' COMMENT 'Trạng thái giao dịch; ChoXacMinh khi cổng không phản hồi hoặc kết quả sai lệch. NOT NULL, mặc định DaKhoiTao.',
  ly_do VARCHAR(255) NULL COMMENT 'Lý do thất bại hoặc hủy.',
  thoi_diem_tao DATETIME NOT NULL COMMENT 'Thời điểm tạo yêu cầu giao dịch. NOT NULL.',
  thoi_diem_xac_nhan DATETIME NULL COMMENT 'Thời điểm xác thực kết quả từ cổng thanh toán.',
  PRIMARY KEY (id),
  CONSTRAINT fk_giao_dich_thanh_toan_don_hang_id FOREIGN KEY (don_hang_id) REFERENCES don_hang (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng giao_dich_thanh_toan (giao dịch thanh toán)';

CREATE TABLE yeu_cau_huy_hoan (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã yêu cầu. Khóa chính, tự tăng.',
  don_hang_id INT NOT NULL COMMENT 'Đơn hàng được yêu cầu hủy/hoàn tiền. Khóa ngoại → don_hang.id; NOT NULL.',
  loai_yeu_cau ENUM('HuyDon', 'HoanTien') NOT NULL COMMENT 'Loại yêu cầu. NOT NULL.',
  ly_do_yeu_cau VARCHAR(500) NOT NULL COMMENT 'Lý do khách nêu khi gửi yêu cầu, bắt buộc lưu để nhân viên xem xét (POST-1, BR1 UC07.2). NOT NULL.',
  trang_thai ENUM('ChoXuLy', 'BiTuChoi', 'ChoHoanTien', 'HoanTat') NOT NULL DEFAULT 'ChoXuLy' COMMENT 'Trạng thái xử lý. NOT NULL, mặc định ChoXuLy.',
  nguoi_xu_ly_id INT NULL COMMENT 'Nhân viên xử lý. Khóa ngoại → nhan_vien.id; để trống khi chưa xử lý.',
  ly_do_xu_ly VARCHAR(500) NULL COMMENT 'Lý do chấp nhận hoặc từ chối (BR2 UC10.4).',
  giao_dich_hoan_tien_id INT NULL UNIQUE COMMENT 'Giao dịch hoàn tiền phát sinh. Khóa ngoại → giao_dich_thanh_toan.id; UNIQUE, để trống nếu không hoàn tiền.',
  thoi_diem_gui DATETIME NOT NULL COMMENT 'Thời điểm khách gửi yêu cầu. NOT NULL.',
  thoi_diem_xu_ly DATETIME NULL COMMENT 'Thời điểm nhân viên xử lý.',
  PRIMARY KEY (id),
  CONSTRAINT fk_yeu_cau_huy_hoan_don_hang_id FOREIGN KEY (don_hang_id) REFERENCES don_hang (id),
  CONSTRAINT fk_yeu_cau_huy_hoan_nguoi_xu_ly_id FOREIGN KEY (nguoi_xu_ly_id) REFERENCES nhan_vien (id),
  CONSTRAINT fk_yeu_cau_huy_hoan_giao_dich_hoan_tien_id FOREIGN KEY (giao_dich_hoan_tien_id) REFERENCES giao_dich_thanh_toan (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng yeu_cau_huy_hoan (yêu cầu hủy đơn/hoàn tiền)';

CREATE TABLE danh_gia (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã đánh giá. Khóa chính, tự tăng.',
  khach_hang_id INT NOT NULL COMMENT 'Khách hàng đánh giá. Khóa ngoại → khach_hang.id; NOT NULL.',
  thuoc_id INT NOT NULL COMMENT 'Sản phẩm được đánh giá. Khóa ngoại → thuoc.id; NOT NULL.',
  don_hang_id INT NOT NULL COMMENT 'Đơn hàng chứa sản phẩm được đánh giá. Khóa ngoại → don_hang.id; NOT NULL.',
  diem_danh_gia INT NOT NULL COMMENT 'Điểm đánh giá. NOT NULL.',
  noi_dung TEXT NULL COMMENT 'Nhận xét của khách hàng.',
  thoi_diem DATETIME NOT NULL COMMENT 'Thời điểm đánh giá. NOT NULL.',
  PRIMARY KEY (id),
  CONSTRAINT fk_danh_gia_khach_hang_id FOREIGN KEY (khach_hang_id) REFERENCES khach_hang (id),
  CONSTRAINT fk_danh_gia_thuoc_id FOREIGN KEY (thuoc_id) REFERENCES thuoc (id),
  CONSTRAINT fk_danh_gia_don_hang_id FOREIGN KEY (don_hang_id) REFERENCES don_hang (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng danh_gia (đánh giá sản phẩm)';

CREATE TABLE nha_cung_cap (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã nhà cung cấp. Khóa chính, tự tăng.',
  ten_nha_cung_cap VARCHAR(150) NOT NULL UNIQUE COMMENT 'Tên nhà cung cấp lô thuốc nhập kho; không trùng (BR2 UC12.1). NOT NULL, UNIQUE.',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng nha_cung_cap (nhà cung cấp)';

CREATE TABLE phieu_nhap_kho (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã phiếu nhập. Khóa chính, tự tăng.',
  nhan_vien_id INT NOT NULL COMMENT 'Nhân viên lập phiếu. Khóa ngoại → nhan_vien.id; NOT NULL.',
  nha_cung_cap_id INT NOT NULL COMMENT 'Nhà cung cấp. Khóa ngoại → nha_cung_cap.id; NOT NULL.',
  thoi_diem_nhap DATETIME NOT NULL COMMENT 'Thời điểm nhập kho. NOT NULL.',
  ghi_chu VARCHAR(255) NULL COMMENT 'Ghi chú của phiếu nhập.',
  PRIMARY KEY (id),
  CONSTRAINT fk_phieu_nhap_kho_nhan_vien_id FOREIGN KEY (nhan_vien_id) REFERENCES nhan_vien (id),
  CONSTRAINT fk_phieu_nhap_kho_nha_cung_cap_id FOREIGN KEY (nha_cung_cap_id) REFERENCES nha_cung_cap (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng phieu_nhap_kho (phiếu nhập kho)';

CREATE TABLE lo_thuoc (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã lô trong hệ thống. Khóa chính, tự tăng.',
  thuoc_id INT NOT NULL COMMENT 'Thuốc của lô. Khóa ngoại → thuoc.id; NOT NULL.',
  phieu_nhap_id INT NOT NULL COMMENT 'Phiếu nhập ghi nhận lô. Khóa ngoại → phieu_nhap_kho.id; NOT NULL.',
  ma_lo VARCHAR(50) NOT NULL COMMENT 'Mã lô, dùng truy vết theo lô (BR1 UC09.4). NOT NULL.',
  so_luong_nhap INT NOT NULL COMMENT 'Số lượng nhập. NOT NULL, lớn hơn 0.',
  so_luong_ton INT NOT NULL COMMENT 'Số lượng còn tồn của lô. NOT NULL, không âm.',
  ngay_san_xuat DATE NOT NULL COMMENT 'Ngày sản xuất. NOT NULL.',
  han_su_dung DATE NOT NULL COMMENT 'Hạn sử dụng, phải sau ngày sản xuất (1.0.E1 của UC09.4). NOT NULL.',
  trang_thai ENUM('ConHan', 'SapHetHan', 'HetHan', 'HetHang') NOT NULL DEFAULT 'ConHan' COMMENT 'Trạng thái lô theo hạn dùng và số lượng tồn. NOT NULL, mặc định ConHan.',
  PRIMARY KEY (id),
  CONSTRAINT fk_lo_thuoc_thuoc_id FOREIGN KEY (thuoc_id) REFERENCES thuoc (id),
  CONSTRAINT fk_lo_thuoc_phieu_nhap_id FOREIGN KEY (phieu_nhap_id) REFERENCES phieu_nhap_kho (id),
  CONSTRAINT ck_lo_thuoc_1 CHECK (so_luong_nhap > 0),
  CONSTRAINT ck_lo_thuoc_2 CHECK (so_luong_ton >= 0),
  CONSTRAINT ck_lo_thuoc_3 CHECK (han_su_dung > ngay_san_xuat)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng lo_thuoc (lô thuốc)';

CREATE TABLE lich_su_ton_kho (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã bản ghi biến động. Khóa chính, tự tăng.',
  lo_thuoc_id INT NOT NULL COMMENT 'Lô có biến động. Khóa ngoại → lo_thuoc.id; NOT NULL.',
  loai_bien_dong ENUM('NhapKho', 'XuatBan') NOT NULL COMMENT 'Loại biến động tồn kho. NOT NULL.',
  so_luong_thay_doi INT NOT NULL COMMENT 'Số lượng thay đổi: dương khi nhập kho, âm khi xuất bán. NOT NULL.',
  nguoi_thuc_hien_id INT NULL COMMENT 'Người thực hiện. Khóa ngoại → nguoi_dung.id; để trống nếu do hệ thống ghi.',
  don_hang_id INT NULL COMMENT 'Đơn hàng phát sinh xuất bán. Khóa ngoại → don_hang.id; để trống với biến động nhập kho.',
  thoi_diem DATETIME NOT NULL COMMENT 'Thời điểm biến động. NOT NULL.',
  PRIMARY KEY (id),
  CONSTRAINT fk_lich_su_ton_kho_lo_thuoc_id FOREIGN KEY (lo_thuoc_id) REFERENCES lo_thuoc (id),
  CONSTRAINT fk_lich_su_ton_kho_nguoi_thuc_hien_id FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES nguoi_dung (id),
  CONSTRAINT fk_lich_su_ton_kho_don_hang_id FOREIGN KEY (don_hang_id) REFERENCES don_hang (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng lich_su_ton_kho (lịch sử tồn kho)';

CREATE TABLE cuoc_hoi_thoai (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã cuộc hội thoại. Khóa chính, tự tăng.',
  khach_hang_id INT NULL COMMENT 'Khách hàng tham gia. Khóa ngoại → khach_hang.id; để trống khi khách chưa đăng nhập (hỏi đáp chatbot không bắt buộc đăng nhập).',
  thoi_diem_bat_dau DATETIME NOT NULL COMMENT 'Thời điểm bắt đầu phiên. NOT NULL.',
  thoi_diem_cap_nhat DATETIME NULL COMMENT 'Thời điểm có tin nhắn gần nhất.',
  PRIMARY KEY (id),
  CONSTRAINT fk_cuoc_hoi_thoai_khach_hang_id FOREIGN KEY (khach_hang_id) REFERENCES khach_hang (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng cuoc_hoi_thoai (cuộc hội thoại)';

CREATE TABLE tin_nhan (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã tin nhắn. Khóa chính, tự tăng.',
  cuoc_hoi_thoai_id INT NOT NULL COMMENT 'Cuộc hội thoại chứa tin nhắn. Khóa ngoại → cuoc_hoi_thoai.id; NOT NULL.',
  nguoi_gui ENUM('KhachHang', 'Chatbot', 'NhanVien') NOT NULL COMMENT 'Bên gửi tin nhắn. NOT NULL.',
  nhan_vien_id INT NULL COMMENT 'Nhân viên trả lời sau khi chuyển tiếp (UC08.4). Khóa ngoại → nhan_vien.id; để trống với tin của khách hàng, chatbot.',
  noi_dung TEXT NOT NULL COMMENT 'Nội dung tin nhắn; là dữ liệu nhạy cảm, chỉ người có quyền được xem. NOT NULL.',
  la_canh_bao_an_toan BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'TRUE khi phản hồi của chatbot đã được thay bằng cảnh báo an toàn (1.0.E2 của UC08.1). NOT NULL, mặc định FALSE.',
  thoi_diem DATETIME NOT NULL COMMENT 'Thời điểm gửi. NOT NULL.',
  PRIMARY KEY (id),
  CONSTRAINT fk_tin_nhan_cuoc_hoi_thoai_id FOREIGN KEY (cuoc_hoi_thoai_id) REFERENCES cuoc_hoi_thoai (id),
  CONSTRAINT fk_tin_nhan_nhan_vien_id FOREIGN KEY (nhan_vien_id) REFERENCES nhan_vien (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng tin_nhan (tin nhắn)';

CREATE TABLE yeu_cau_ho_tro (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã yêu cầu hỗ trợ. Khóa chính, tự tăng.',
  cuoc_hoi_thoai_id INT NOT NULL COMMENT 'Cuộc hội thoại được chuyển tiếp. Khóa ngoại → cuoc_hoi_thoai.id; NOT NULL.',
  nhan_vien_id INT NULL COMMENT 'Nhân viên tiếp nhận. Khóa ngoại → nhan_vien.id; để trống khi chưa có người tiếp nhận.',
  noi_dung_dinh_kem TEXT NOT NULL COMMENT 'Chỉ phần nội dung hội thoại cần thiết (BR1 UC08.4). NOT NULL.',
  trang_thai ENUM('MoiTao', 'ChuaGui', 'ChoTiepNhan', 'DaChuyen', 'DaPhanHoi') NOT NULL DEFAULT 'MoiTao' COMMENT 'Trạng thái yêu cầu. NOT NULL, mặc định MoiTao.',
  thoi_diem_tao DATETIME NOT NULL COMMENT 'Thời điểm tạo yêu cầu. NOT NULL.',
  thoi_diem_phan_hoi DATETIME NULL COMMENT 'Thời điểm nhân viên phản hồi.',
  PRIMARY KEY (id),
  CONSTRAINT fk_yeu_cau_ho_tro_cuoc_hoi_thoai_id FOREIGN KEY (cuoc_hoi_thoai_id) REFERENCES cuoc_hoi_thoai (id),
  CONSTRAINT fk_yeu_cau_ho_tro_nhan_vien_id FOREIGN KEY (nhan_vien_id) REFERENCES nhan_vien (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng yeu_cau_ho_tro (yêu cầu hỗ trợ)';

CREATE TABLE tri_thuc_chatbot (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã mục tri thức. Khóa chính, tự tăng.',
  loai ENUM('TriThuc', 'CauTraLoiMau') NOT NULL COMMENT 'Mục tri thức hay câu trả lời mẫu (UC14.1). NOT NULL.',
  chu_de VARCHAR(255) NOT NULL COMMENT 'Chủ đề hoặc câu hỏi liên quan. NOT NULL.',
  noi_dung TEXT NOT NULL COMMENT 'Nội dung tri thức hoặc câu trả lời mẫu. NOT NULL.',
  dang_su_dung BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Đang được chatbot sử dụng. NOT NULL, mặc định TRUE.',
  nguoi_cap_nhat_id INT NOT NULL COMMENT 'Quản trị viên cập nhật gần nhất. Khóa ngoại → quan_tri_vien.id; NOT NULL.',
  ngay_cap_nhat DATETIME NOT NULL COMMENT 'Thời điểm cập nhật gần nhất. NOT NULL.',
  PRIMARY KEY (id),
  CONSTRAINT fk_tri_thuc_chatbot_nguoi_cap_nhat_id FOREIGN KEY (nguoi_cap_nhat_id) REFERENCES quan_tri_vien (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng tri_thuc_chatbot (tri thức chatbot)';

CREATE TABLE quy_tac_an_toan (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã quy tắc. Khóa chính, tự tăng.',
  ten_quy_tac VARCHAR(150) NOT NULL COMMENT 'Tên quy tắc. NOT NULL.',
  noi_dung TEXT NOT NULL COMMENT 'Mô tả quy tắc, chẳng hạn không tự chẩn đoán, không kê đơn thuốc kê đơn, luôn kèm khuyến cáo. NOT NULL.',
  hanh_dong ENUM('ThemKhuyenCao', 'ThayBangCanhBao', 'ChuyenTiepNhanVien') NOT NULL COMMENT 'Cách xử lý khi câu hỏi hoặc phản hồi vi phạm quy tắc. NOT NULL.',
  dang_ap_dung BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Quy tắc đang bật. NOT NULL, mặc định TRUE.',
  nguoi_thiet_lap_id INT NOT NULL COMMENT 'Quản trị viên thiết lập quy tắc (UC14.2). Khóa ngoại → quan_tri_vien.id; NOT NULL.',
  PRIMARY KEY (id),
  CONSTRAINT fk_quy_tac_an_toan_nguoi_thiet_lap_id FOREIGN KEY (nguoi_thiet_lap_id) REFERENCES quan_tri_vien (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng quy_tac_an_toan (quy tắc an toàn)';

CREATE TABLE tu_khoa_canh_bao (
  id INT NOT NULL AUTO_INCREMENT COMMENT 'Mã từ khóa. Khóa chính, tự tăng.',
  quy_tac_id INT NOT NULL COMMENT 'Quy tắc chứa từ khóa. Khóa ngoại → quy_tac_an_toan.id; NOT NULL.',
  tu_khoa VARCHAR(100) NOT NULL COMMENT 'Từ khóa nhận diện câu hỏi rủi ro. NOT NULL.',
  muc_rui_ro ENUM('Thuong', 'Cao') NOT NULL DEFAULT 'Thuong' COMMENT 'Mức rủi ro; Cao thì đề xuất chuyển tiếp nhân viên (UC08.4). NOT NULL, mặc định Thuong.',
  PRIMARY KEY (id),
  CONSTRAINT fk_tu_khoa_canh_bao_quy_tac_id FOREIGN KEY (quy_tac_id) REFERENCES quy_tac_an_toan (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng tu_khoa_canh_bao (từ khóa cảnh báo)';
