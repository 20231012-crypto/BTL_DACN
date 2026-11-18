# Mô hình dữ liệu theo báo cáo nguồn

Nguồn: mục 2.6.1–2.6.2, Bảng 2.53–2.86 của `docs/source/requirements.docx`. Báo cáo chọn **MySQL 8.0, InnoDB, utf8mb4**, gồm 34 bảng và nêu 48 khóa ngoại. Danh sách dưới đây giữ tên trường theo nguồn; các cột hạ tầng hay mở rộng của bản cài đặt cần được phân biệt rõ trong script cơ sở dữ liệu.

## 34 bảng nguồn

### Tài khoản, phân quyền, nhật ký — 11 bảng

| Bảng | Các cột nguồn | Ràng buộc đáng chú ý |
| --- | --- | --- |
| `nguoi_dung` | `id`, `ho_ten`, `email`, `so_dien_thoai`, `mat_khau_ma_hoa`, `trang_thai`, `ngay_tao`, `ngay_cap_nhat` | Email/điện thoại duy nhất, phải có ít nhất một; mật khẩu chỉ lưu dạng băm; trạng thái `ChoXacThuc/HoatDong/BiKhoa`. |
| `khach_hang` | `id` | PK đồng thời FK `nguoi_dung.id`. |
| `nhan_vien` | `id`, `chuc_danh` | PK/FK người dùng; chức danh `DuocSi/NhanVienBanHang/NhanVienKho`. |
| `quan_tri_vien` | `id` | PK/FK người dùng. |
| `vai_tro` | `id`, `ma_vai_tro`, `ten_vai_tro`, `mo_ta` | Mã vai trò duy nhất. |
| `nguoi_dung_vai_tro` | `id`, `nguoi_dung_id`, `vai_tro_id`, `ngay_gan` | Cặp người dùng/vai trò duy nhất; hai FK. |
| `quyen` | `id`, `ma_quyen`, `ten_quyen`, `mo_ta`, `chuc_nang`, `hanh_dong` | Mã quyền duy nhất; cặp chức năng/hành động duy nhất; hành động `Xem/Them/Sua/Xoa/Duyet`. |
| `quyen_vai_tro` | `id`, `vai_tro_id`, `quyen_id` | Cặp vai trò/quyền duy nhất; hai FK. |
| `phan_quyen` | `id`, `nguoi_dung_id`, `quyen_id`, `nguoi_cap_id`, `thoi_diem_cap`, `trang_thai`, `kieu_ngoai_le` | Cặp người dùng/quyền duy nhất; người cấp FK quản trị viên; trạng thái `HieuLuc/DaThuHoi`; ngoại lệ `ChoPhep/TuChoi`. |
| `ma_otp` | `id`, `nguoi_dung_id`, `ma_xac_nhan`, `muc_dich`, `thoi_diem_het_han`, `da_su_dung` | FK người dùng; mục đích `DangKy/QuenMatKhau`; có hạn dùng, dùng một lần. Cài đặt nên băm OTP thay vì lưu giá trị gốc. |
| `nhat_ky_hoat_dong` | `id`, `nguoi_dung_id`, `hanh_dong`, `doi_tuong`, `doi_tuong_id`, `chi_tiet`, `thoi_diem` | FK người dùng có thể NULL cho hệ thống; `doi_tuong_id` không FK vì tham chiếu nhiều loại bảng; nhật ký chỉ đọc. |

### Thuốc, danh mục — 3 bảng

| Bảng | Các cột nguồn | Ràng buộc đáng chú ý |
| --- | --- | --- |
| `danh_muc` | `id`, `ten_danh_muc` | Tên duy nhất; không xóa khi còn thuốc tham chiếu. |
| `nha_san_xuat` | `id`, `ten_nha_san_xuat` | Tên duy nhất; không xóa khi còn thuốc tham chiếu. |
| `thuoc` | `id`, `ten_thuoc`, `hoat_chat`, `thanh_phan`, `cong_dung`, `cach_dung`, `chong_chi_dinh`, `luu_y`, `phan_loai`, `gia_ban`, `muc_ton_canh_bao`, `trang_thai`, `danh_muc_id`, `nha_san_xuat_id` | FK danh mục và nhà sản xuất; phân loại `KeDon/KhongKeDon/ThucPhamChucNang/ThietBiYTe`; trạng thái `DangBan/DaAn`; giá DECIMAL(12,2). UC08.1 yêu cầu giá >0 dù mô tả cột chỉ nói không âm. |

### Mua hàng — 10 bảng

| Bảng | Các cột nguồn | Ràng buộc đáng chú ý |
| --- | --- | --- |
| `dia_chi_giao_hang` | `id`, `khach_hang_id`, `dia_chi` | FK khách hàng; nguồn nghiệp vụ yêu cầu thêm người nhận, điện thoại, địa giới và mặc định. |
| `gio_hang` | `id`, `khach_hang_id`, `ngay_cap_nhat` | FK khách hàng duy nhất: mỗi khách một giỏ. |
| `chi_tiet_gio_hang` | `id`, `gio_hang_id`, `thuoc_id`, `so_luong` | Cặp giỏ/thuốc duy nhất; lượng nguyên >0; hai FK. |
| `khuyen_mai` | `id`, `ma_giam_gia`, `ten_chuong_trinh`, `gia_tri_giam`, `ngay_bat_dau`, `ngay_ket_thuc`, `trang_thai`, `nguoi_tao_id` | Mã duy nhất; người tạo FK quản trị viên; thời gian có thể NULL lúc chưa áp dụng; trạng thái `ChuaApDung/DangApDung/TamDung/HetHan/DaXoa`; hết sau bắt đầu. |
| `don_hang` | `id`, `khach_hang_id`, `dia_chi_giao_hang_id`, `dia_chi_giao`, `phuong_thuc_giao_hang`, `phuong_thuc_thanh_toan`, `khuyen_mai_id`, `tong_tien_hang`, `tien_giam`, `tong_thanh_toan`, `can_duyet_don_thuoc`, `trang_thai`, `trang_thai_thanh_toan`, `ngay_dat`, `ngay_cap_nhat` | FK khách, địa chỉ, khuyến mãi; `dia_chi_giao` là snapshot; địa chỉ FK có thể SET NULL khi xóa địa chỉ; thanh toán `TrucTuyen/COD`; hai state độc lập. |
| `chi_tiet_don_hang` | `id`, `don_hang_id`, `thuoc_id`, `so_luong`, `don_gia` | Hai FK; lượng >0; đơn giá là snapshot thời điểm đặt. |
| `don_thuoc` | `id`, `don_hang_id`, `duong_dan_tep`, `dinh_dang_tep`, `thoi_diem_tai_len`, `trang_thai`, `nguoi_duyet_id`, `thoi_diem_duyet`, `ly_do` | FK đơn hàng UNIQUE: tối đa một đơn thuốc/đơn hàng; người duyệt FK nhân viên; `ChoDuyet/ChoBoSung/DaDuyet/BiTuChoi`; từ chối cần lý do; tệp riêng tư. |
| `giao_dich_thanh_toan` | `id`, `don_hang_id`, `loai_giao_dich`, `ma_giao_dich`, `so_tien`, `trang_thai`, `ly_do`, `thoi_diem_tao`, `thoi_diem_xac_nhan` | FK đơn hàng; mã giao dịch duy nhất; loại `ThanhToan/HoanTien`; trạng thái `DaKhoiTao/ChoXacMinh/ThanhCong/ThatBai/DaHuy`; không có dữ liệu thẻ. |
| `yeu_cau_huy_hoan` | `id`, `don_hang_id`, `loai_yeu_cau`, `ly_do_yeu_cau`, `trang_thai`, `nguoi_xu_ly_id`, `ly_do_xu_ly`, `giao_dich_hoan_tien_id`, `thoi_diem_gui`, `thoi_diem_xu_ly` | FK đơn, nhân viên, giao dịch hoàn; giao dịch hoàn UNIQUE; loại `HuyDon/HoanTien`; trạng thái `ChoXuLy/BiTuChoi/ChoHoanTien/HoanTat`; lý do yêu cầu bắt buộc. |
| `danh_gia` | `id`, `khach_hang_id`, `thuoc_id`, `don_hang_id`, `diem_danh_gia`, `noi_dung`, `thoi_diem` | Ba FK; sao 1–5; nên đặt UNIQUE khách/thuốc/đơn để thực thi UC06.4. |

### Kho — 4 bảng

| Bảng | Các cột nguồn | Ràng buộc đáng chú ý |
| --- | --- | --- |
| `nha_cung_cap` | `id`, `ten_nha_cung_cap` | Tên duy nhất; không xóa khi đã có phiếu nhập. |
| `phieu_nhap_kho` | `id`, `nhan_vien_id`, `nha_cung_cap_id`, `thoi_diem_nhap`, `ghi_chu` | FK nhân viên và nhà cung cấp. |
| `lo_thuoc` | `id`, `thuoc_id`, `phieu_nhap_id`, `ma_lo`, `so_luong_nhap`, `so_luong_ton`, `ngay_san_xuat`, `han_su_dung`, `trang_thai` | FK thuốc và phiếu nhập; nhập >0, tồn ≥0; hạn dùng sau ngày sản xuất; trạng thái `ConHan/SapHetHan/HetHan/HetHang`; không nhập lô hết hạn. |
| `lich_su_ton_kho` | `id`, `lo_thuoc_id`, `loai_bien_dong`, `so_luong_thay_doi`, `nguoi_thuc_hien_id`, `don_hang_id`, `thoi_diem` | FK lô, người dùng có thể NULL, đơn có thể NULL; enum nguồn `NhapKho/XuatBan`; thay đổi dương khi nhập, âm khi xuất. UC đề cập hủy/hoàn cần mở rộng enum nếu hỗ trợ. |

### Chatbot, hỗ trợ — 6 bảng

| Bảng | Các cột nguồn | Ràng buộc đáng chú ý |
| --- | --- | --- |
| `cuoc_hoi_thoai` | `id`, `khach_hang_id`, `thoi_diem_bat_dau`, `thoi_diem_cap_nhat` | FK khách có thể NULL cho người chưa đăng nhập; cần cơ chế chủ sở hữu phiên ẩn danh ở cài đặt. |
| `tin_nhan` | `id`, `cuoc_hoi_thoai_id`, `nguoi_gui`, `nhan_vien_id`, `noi_dung`, `la_canh_bao_an_toan`, `thoi_diem` | FK hội thoại, nhân viên có thể NULL; người gửi `KhachHang/Chatbot/NhanVien`; nội dung nhạy cảm; đánh dấu phản hồi thay bằng cảnh báo. |
| `yeu_cau_ho_tro` | `id`, `cuoc_hoi_thoai_id`, `nhan_vien_id`, `noi_dung_dinh_kem`, `trang_thai`, `thoi_diem_tao`, `thoi_diem_phan_hoi` | FK hội thoại và nhân viên có thể NULL; trạng thái `MoiTao/ChuaGui/ChoTiepNhan/DaChuyen/DaPhanHoi`; chỉ đính kèm nội dung cần thiết. |
| `tri_thuc_chatbot` | `id`, `loai`, `chu_de`, `noi_dung`, `dang_su_dung`, `nguoi_cap_nhat_id`, `ngay_cap_nhat` | FK quản trị viên; loại `TriThuc/CauTraLoiMau`; nguồn/thông tin dược sĩ duyệt chưa có cột nguồn. |
| `quy_tac_an_toan` | `id`, `ten_quy_tac`, `noi_dung`, `hanh_dong`, `dang_ap_dung`, `nguoi_thiet_lap_id` | FK quản trị viên; hành động `ThemKhuyenCao/ThayBangCanhBao/ChuyenTiepNhanVien`; không gỡ cấm chẩn đoán/kê đơn. |
| `tu_khoa_canh_bao` | `id`, `quy_tac_id`, `tu_khoa`, `muc_rui_ro` | FK quy tắc; rủi ro `Thuong/Cao`; cao cần đề xuất chuyển nhân viên. |

## Kiểu và ràng buộc thực thi

- PK `INT` tự tăng, trừ ba bảng kế thừa dùng PK/FK của `nguoi_dung`.
- Tiền dùng `DECIMAL(12,2)` theo nguồn; với bản chạy SQLite nên lưu số nguyên VND hoặc đơn vị nhỏ nhất để tránh sai số dấu phẩy động.
- Thời gian cần lưu nhất quán và hiển thị theo `Asia/Ho_Chi_Minh`; ngày hết hạn so theo ngày nghiệp vụ địa phương.
- Bật kiểm tra FK ở môi trường SQLite; các trường trạng thái dùng CHECK nếu không có ENUM.
- Tạo chỉ mục FK; thêm chỉ mục tìm đơn theo khách/ngày/trạng thái, lô theo thuốc/hạn/tồn, hội thoại theo chủ sở hữu/cập nhật và nhật ký theo thời điểm/hành động.
- Không CASCADE xóa đơn, giao dịch, lịch sử kho hoặc nhật ký khi khóa tài khoản/ẩn thuốc. Những bản ghi lịch sử phải được giữ để đối soát.
- Xử lý xác nhận đơn, phân bổ FEFO, trừ tồn, ghi log và chuyển trạng thái trong một transaction; cập nhật có điều kiện theo trạng thái cũ để chống xử lý hai lần.
- Callback cần UNIQUE mã giao dịch và khóa idempotency. Hoàn tiền cần kiểm tra liên kết giao dịch gốc và giới hạn tổng số hoàn.

## Mở rộng cần thiết để chạy chức năng trong đặc tả

Nguồn là thiết kế phân tích nên chưa có đủ cột cho mọi nhánh use case. Các bổ sung dưới đây cần được đánh dấu là phần cài đặt, không gán ngược thành quy định đã có trong báo cáo:

| Nhóm | Dữ liệu cần bổ sung khi hỗ trợ |
| --- | --- |
| Phiên và OTP | Hash token phiên, hạn phiên, thu hồi phiên; hash OTP, số lần thử/gửi; tài khoản Google subject nếu bật OAuth. |
| Hồ sơ/địa chỉ | Ngày sinh, giới tính, avatar nếu có UI; tên/điện thoại người nhận, địa giới, địa chỉ mặc định. |
| Danh mục hiển thị | Mã SKU, slug, đơn vị/quy cách, ảnh, nội dung tìm kiếm không dấu; đây là dữ liệu trình bày/cài đặt. |
| Đơn hàng | Người nhận, điện thoại, phí giao, ghi chú; lịch sử trạng thái; phân bổ lô; dấu thu tiền COD; thời hạn thanh toán. |
| Khuyến mãi | Loại giảm cố định/phần trăm, trần giảm, đơn tối thiểu, lượt dùng, loại sản phẩm đủ điều kiện nếu triển khai. |
| Đổi trả/kho | Bằng chứng, tình trạng niêm phong/bảo quản, giá trị được hoàn, giao dịch gốc; log hoàn kho/tiêu hủy và lý do. |
| Chatbot | Token/chủ phiên ẩn danh, nguồn tri thức, dược sĩ duyệt, trạng thái duyệt; cấu hình dịch vụ và timeout. |
| Quản trị | Cấu hình nghiệp vụ, metadata sao lưu, lịch backup và khóa mã hóa từ biến môi trường. |

Tệp đơn thuốc phải nằm ngoài thư mục công khai. Cơ sở dữ liệu chỉ lưu khóa/đường dẫn nội bộ; API kiểm tra quyền trước khi trả bytes. Bản sao lưu có dữ liệu nhạy cảm cần được mã hóa và không nằm trong thư mục tĩnh hoặc kho Git.
