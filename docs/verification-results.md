# Kết quả kiểm thử bản local

Kiểm tra ngày 18/11/2026 trên macOS với Node.js 26 và Chrome. Kiểm thử tạo dữ liệu tạm để có thể chạy lại.

| Kiểm tra | Kết quả |
| --- | --- |
| `npm test` | **18/18 đạt.** Bao phủ OTP, phiên đăng nhập, quyền dược sĩ, tệp đơn thuốc và ảnh đổi trả riêng tư, duyệt một phần, FEFO, đặt hàng cạnh tranh, giá và khuyến mãi, xác nhận COD, thanh toán và hoàn tiền, ký IPN VNPay, đánh giá, duyệt tri thức chatbot, khóa tài khoản và sao lưu mã hóa. |
| `npm run build` | Build thành công. Giao diện và API phục vụ từ cùng địa chỉ trên bản build. |
| Chrome 1440×1000 và 390×844 | Tra cứu không dấu, đặt đơn kê đơn, tải tệp, dược sĩ duyệt, thanh toán mô phỏng thất bại rồi thành công, xử lý tới đã giao, đánh giá, hỏi trạng thái và chuyển hỗ trợ. Đã mở 11 mục quản trị và tạo một tài khoản nhân viên thử nghiệm. Không phát hiện lỗi JavaScript, HTTP hoặc tràn ngang ở các màn được kiểm. |
| Cơ sở dữ liệu | SQLite có toàn bộ 34 bảng nghiệp vụ của báo cáo và 6 bảng kỹ thuật. Script MySQL tham chiếu có 34 bảng và 48 khóa ngoại. Đã đối chiếu cấu trúc, chưa chạy trên máy chủ MySQL. |
| Phụ thuộc | `npm audit --omit=dev` báo 0 lỗi. Audit gồm cả công cụ phát triển còn cảnh báo trong chuỗi Vite/picomatch. Server demo lắng nghe trên loopback. |

Các bài kiểm thử thanh toán và hoàn tiền dùng dữ liệu giả lập. Bài kiểm thử IPN xác minh chữ ký và số tiền bằng dữ liệu riêng của bộ test. Kết nối trực tiếp VNPay Sandbox, Google OAuth, Gemini và SMTP cần khóa riêng, chưa được kiểm thử với tài khoản dịch vụ. Chatbot mặc định dùng tri thức nội bộ. Số liệu và thông tin sản phẩm phục vụ trình diễn.

Xem ảnh kiểm thử trong `artifacts`, gồm cửa hàng, danh mục, đặt hàng, chatbot và quản trị. Hướng dẫn chạy nằm trong [README](../README.md).
