# Cấu hình tích hợp

Giữ các khóa dịch vụ trong `.env` ở máy chủ. Bot service account trong Document BA chỉ được dùng để đọc báo cáo. Mỗi dịch vụ dưới đây dùng thông tin xác thực riêng.

| Dịch vụ | Cấu hình |
| --- | --- |
| Google Gemini | Đặt `GEMINI_API_KEY`, chọn `GEMINI_MODEL` nếu cần. Gemini chỉ diễn đạt lại phần chính sách được rà soát. Nội dung hội thoại, đơn thuốc và định danh khách hàng lưu tại máy. Khi không có khóa hoặc API lỗi, chatbot trả lời từ tri thức nội bộ. |
| Google OAuth | Tạo OAuth client dạng Web application. Thêm redirect URI bằng `APP_ORIGIN` nối với `/api/auth/google/callback`, rồi đặt `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`. Tài khoản đã có cùng email cần đăng nhập bằng mật khẩu và liên kết trong hồ sơ trước. |
| Email OTP | Tắt demo bằng `DEMO_MODE=false`, đặt `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` và thông tin xác thực SMTP nếu máy chủ yêu cầu. Dùng TLS theo cấu hình dịch vụ. Khi tắt demo, đăng ký và kích hoạt nhân viên cần email có thể nhận thư. |
| VNPay Sandbox | Đặt `VNPAY_TMN_CODE` và `VNPAY_HASH_SECRET` do Sandbox cấp. Return URL là `/api/payments/vnpay/return`, IPN là `/api/payments/vnpay/ipn`, cùng gốc `APP_ORIGIN`. VNPay cần truy cập được IPN để đơn được cập nhật. Môi trường local mặc định dùng thanh toán mô phỏng và COD. |

Đường thanh toán qua VNPay sử dụng địa chỉ Sandbox cố định. Hệ thống kiểm tra chữ ký, mã merchant, mã giao dịch và số tiền trước khi xác nhận thanh toán. Tín hiệu về từ trình duyệt chỉ hiển thị trạng thái. Khi một yêu cầu hoàn tiền Sandbox chưa nhận được xác nhận, hệ thống giữ trạng thái chờ để nhân viên đối soát trên cổng.

Để tạo một cơ sở dữ liệu riêng với tài khoản thật, đặt `DEMO_MODE=false`, `SEED_DEMO=false` và chọn một `DATABASE_PATH` mới. Đặt `INITIAL_ADMIN_EMAIL` và `INITIAL_ADMIN_PASSWORD` rồi chạy `npm run init:admin`. Xóa giá trị mật khẩu khởi tạo trong `.env` sau đó. Cơ sở dữ liệu demo đã tạo trước đây vẫn có tài khoản mẫu, nên dùng một đường dẫn cơ sở dữ liệu riêng cho cấu hình này.

- [Google Gemini API](https://ai.google.dev/gemini-api/docs/text-generation)
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [VNPay Sandbox thanh toán](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html)
- [VNPay Sandbox truy vấn và hoàn tiền](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html)

Đặt tối đa 5 khóa Gemini trong biến Secret `GEMINI_API_KEYS` trên Vercel, dạng `["key1","key2","key3","key4","key5"]`. Ứng dụng thử khóa tiếp theo khi dịch vụ hoặc khóa hiện tại tạm thời không dùng được. Google tính hạn mức theo project. Sau khi sửa biến, redeploy để áp dụng. Giá trị `[]` giữ tính năng Gemini ở trạng thái chưa cấu hình.

Chuyển khoản VietQR dùng `BANK_TRANSFER_BANK_BIN`, `BANK_TRANSFER_ACCOUNT`, `BANK_TRANSFER_NAME`, `BANK_TRANSFER_BANK_NAME`. QR chứa tổng đơn do máy chủ tính và nội dung `ANTAM<id>`. Nhân viên có quyền xử lý đơn đối soát mã giao dịch, số tiền trên sao kê trước khi xác nhận. VietQR Quick Link tạo mã QR. Việc tự động nhận trạng thái ngân hàng cần dịch vụ webhook và thông tin xác thực riêng. [VietQR Quick Link](https://www.vietqr.io/qr-dong)

Mục `/prescription` nhận ảnh/PDF đơn thuốc riêng tư, đọc qua Gemini khi người dùng đồng ý, rồi cho sửa tên thuốc trước khi tìm trong danh mục. `GEMINI_OCR_MODEL` mặc định `gemini-3.5-flash-lite`. Kết quả cùng hoạt chất cần dược sĩ đối chiếu hàm lượng và dạng bào chế. Thiếu key có thể nhập tên từ đơn để tìm thủ công. [Gemini document understanding](https://ai.google.dev/gemini-api/docs/generate-content/document-processing)
