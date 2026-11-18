# Nhà thuốc An Tâm

Ứng dụng web chạy local cho đề tài bán thuốc trực tuyến tích hợp chatbot của Nhóm 11. Báo cáo đã được đọc bằng bot service account và dùng để đối chiếu chức năng. Bản sao tài liệu nguồn nằm trong `docs/source`. Ứng dụng dùng React, Node.js, Express và SQLite. Schema MySQL 8.0 của báo cáo nằm trong `database/schema.mysql.sql` để mở bằng MySQL Workbench.

## Chạy trên máy

Cần Node.js 24 trở lên. Mở Terminal trong thư mục dự án và chạy:

```sh
npm ci
npm run build
npm start
```

Mở [cửa hàng Minh An](http://127.0.0.1:3001/) hoặc [trang quản trị](http://127.0.0.1:3001/admin). Lần khởi động đầu tiên sẽ tạo dữ liệu mẫu. Khi chỉnh mã nguồn, `npm run dev` mở giao diện tại [cổng 5173](http://127.0.0.1:5173/) với API chạy song song. Dừng phiên đang chiếm cổng 3001 trước khi chuyển sang `npm run dev`.

| Vai trò | Tài khoản demo |
| --- | --- |
| Khách hàng | `khach@minhan.vn` |
| Dược sĩ | `duocsi@minhan.vn` |
| Quản trị viên | `admin@minhan.vn` |
| Nhân viên kho | `kho@minhan.vn` |

Mật khẩu chung là `Demo@123`. Trang đăng nhập có nút vào nhanh theo vai trò. Dữ liệu mẫu và thanh toán mô phỏng dùng để trình diễn đồ án.

## Trình diễn nghiệp vụ

1. **Khách hàng** tìm sản phẩm, thêm vào giỏ và đặt hàng. Chọn COD hoặc thanh toán mô phỏng. Đăng ký và quên mật khẩu hiển thị mã OTP trong chế độ demo.
2. **Đơn thuốc kê đơn** yêu cầu ảnh JPG, PNG hoặc PDF tối đa 5 MB. Dược sĩ mở mục Duyệt đơn thuốc để đối chiếu tệp và sản phẩm. Nếu cần, khách tải lại hoặc điều chỉnh đơn theo phần được duyệt. Đơn chỉ đi tiếp sau khi đáp ứng kiểm duyệt.
3. **Vận hành** xác nhận đơn, đóng gói và giao hàng. Khi xác nhận, hệ thống xuất lô có hạn dùng gần nhất trong số lô còn hạn. Đơn COD cần xác nhận đã thu tiền. Khách có thể đánh giá sau khi nhận hàng và gửi yêu cầu hủy hoặc đổi trả theo trạng thái.
4. **Quản trị** quản lý sản phẩm, danh mục, nhà sản xuất, nhà cung cấp, lô, khuyến mãi, nhân viên, quyền, tri thức chatbot, cài đặt và nhật ký. Báo cáo doanh thu xuất được CSV. Dược sĩ rà soát nguồn và nội dung trước khi tri thức mới được dùng trong chatbot.

## Cấu hình và dữ liệu

Có thể chạy demo ngay với cấu hình mặc định. Khi cần đổi cổng hoặc tích hợp dịch vụ, sao chép `.env.example` thành `.env` và đặt giá trị tại máy. Các tích hợp có điều kiện được mô tả trong [hướng dẫn cấu hình](docs/integrations.md).

SQLite lưu tại `backend/storage/pharmacy.sqlite`. Tệp đơn thuốc và ảnh đổi trả lưu riêng dưới `backend/storage/prescriptions`, đọc qua API có kiểm tra quyền. Bản sao lưu tải từ trang Cấu hình được mã hóa bằng cụm mật khẩu riêng. Khi phục hồi, dùng bản sao cùng cụm mật khẩu và giữ thư mục tệp đính kèm tương ứng.

Phí giao mặc định 25.000đ, miễn phí từ 299.000đ tiền hàng. OTP có hạn 10 phút, thanh toán 30 phút, đổi trả 7 ngày, cảnh báo tồn dưới 15 và cảnh báo hạn dùng trước 60 ngày. Đây là các giá trị mẫu có thể chỉnh trong Cấu hình.

## Kiểm tra và đối chiếu

Chạy `npm test` để kiểm tra API trên cơ sở dữ liệu tạm. Kịch bản Chrome trong `tests/browser-smoke.mjs` cần Chrome và Puppeteer đã cài. Dùng `CHROME_PATH` và `PUPPETEER_MODULE` để chỉ định đường dẫn theo máy.

- [Đối chiếu chức năng theo báo cáo](docs/requirements-map.md)
- [Thiết kế cơ sở dữ liệu](docs/database-design.md)
- [Kết quả kiểm thử](docs/verification-results.md)
