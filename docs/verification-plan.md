# Kế hoạch kiểm chứng

Danh sách này là tiêu chí kiểm tra; không có nghĩa các kiểm thử đã chạy hoặc đã đạt. Kết quả thực tế cần ghi bằng lệnh chạy, ngày kiểm tra và đầu ra.

| Nhóm | Kịch bản cần kiểm tra | Kết quả mong đợi |
| --- | --- | --- |
| Khởi động | Cài sạch từ lockfile, build, chạy server và tải trang ở desktop/mobile | API và tài nguyên giao diện trả thành công; không lỗi JavaScript; giao diện không tràn ngang. |
| Danh mục | Tìm “dau dau”, “ĐAU ĐẦU”; kết hợp danh mục, giá, nhà sản xuất; ẩn thuốc | Tìm không dấu; bộ lọc kết hợp; thuốc ẩn không được thêm vào giỏ; nhãn kê đơn hiện rõ. |
| Tài khoản | Đăng ký, OTP sai/hết hạn/dùng lại, đăng xuất, đặt lại mật khẩu | OTP một lần; mật khẩu được băm; phiên cũ bị vô hiệu khi đổi/reset/khóa theo chính sách; không trả mật khẩu/hash. |
| Quyền riêng tư | Khách B đọc/thay đổi đơn, giỏ, đơn thuốc hoặc hội thoại khách A | Bị từ chối dù biết ID; tệp Rx không có URL tĩnh công khai. |
| Quyền dược sĩ | Khách/nhân viên kho/admin không có chức danh dược sĩ thử duyệt Rx | Bị từ chối; chỉ dược sĩ có quyền hiệu lực được duyệt. |
| Kiểm duyệt Rx | Upload chưa gắn đơn rồi cố duyệt; Rx sai định dạng/>5 MB; Rx bị từ chối | Không duyệt trước khi có đơn và sản phẩm để đối chiếu; tệp sai bị từ chối; bổ sung được tệp mới nhưng phải duyệt lại. |
| Đặt thuốc kê đơn | Đặt hàng Rx, thử thanh toán/xác nhận trước duyệt, sau đó dược sĩ duyệt | Chặn bước bán/xuất giao trước duyệt; chỉ cho luồng hợp lệ tiếp tục. |
| Giá/địa chỉ | Sửa giá/tổng/discount trong request; sửa giá sản phẩm/địa chỉ sau đặt | Máy chủ tính tiền; snapshot đơn cũ giữ nguyên; một mã/đơn, giảm không vượt tiền hàng. |
| FEFO | Đặt đơn vượt một lô; có lô hết hạn; hai đơn cạnh tranh số tồn cuối | Phân bổ lô gần hạn trước; không bán lô hết hạn; không vượt tồn, không âm; không trừ hai lần. |
| Hoàn tác | Cố xác nhận khi tồn thiếu hoặc lỗi giữa cập nhật nhiều dòng | Transaction hoàn tác toàn bộ trạng thái, phân bổ, số tồn, nhật ký liên quan. |
| Vòng đời đơn | Bỏ bước từ pending sang delivered; xác nhận online chưa paid; COD chưa thu tiền | Mọi bước sai bị từ chối; COD chỉ hoàn tất khi xác nhận đã thu đủ tiền. |
| Thanh toán demo | Thành công, thất bại, gửi lại; chế độ demo bị tắt | Giao dịch được ghi đúng và không double-pay; thất bại được thử lại; không nhận kết quả giả khi demo tắt; UI nói rõ không thu tiền thật. |
| Hủy/đổi trả | Hủy trước giao; hết thời hạn trả; nhập lại thuốc đã mở niêm phong | Đúng state/điều kiện; tồn được giải phóng/hoàn đúng một lần; chỉ hoàn kho sau kiểm tra chất lượng. |
| Hoàn tiền | Refund vượt số paid, lặp lần hai, request chưa duyệt | Bị chặn; thành công có giao dịch và trạng thái đối soát. |
| Đánh giá | Trước nhận hàng, sản phẩm không trong đơn, khách khác, sao 0/6, trùng | Bị từ chối; cho phép đánh giá hợp lệ sau nhận hàng. |
| RBAC | Thêm vai trò, allow/deny override, thu hồi quyền, admin cuối | Deny ưu tiên; hiệu lực ngay lần truy cập tiếp theo; không làm mất admin cuối hoặc tự khóa. |
| Chatbot | Câu hỏi thường, thuốc Rx, triệu chứng nguy hiểm, lỗi/timeout AI, chuyển nhân viên | Không chẩn đoán/kê đơn; có khuyến cáo; cảnh báo ưu tiên; chỉ gợi ý OTC còn hàng; lịch sử và chuyển tiếp đúng quyền. |
| Báo cáo | Đơn hoàn tất, hủy, hoàn tiền, đơn ngoài kỳ | Doanh thu/stock/tỉ lệ hủy/bán chạy đúng phạm vi; thống kê chat không lộ nội dung cá nhân. |
| Vận hành | Backup/restore với tệp hỏng hoặc thiếu xác nhận; nhật ký | Backup mã hóa và ngoài thư mục tĩnh; restore có kiểm tra và hoàn tác; nhật ký chỉ đọc. |

Chạy kiểm thử tự động trên cơ sở dữ liệu tạm, không dùng cơ sở dữ liệu đang chạy của người dùng. Kiểm tra trình duyệt với Chrome local ở ít nhất 1440×1000 và 390×844; xác nhận hành vi bằng API/dữ liệu thay vì chỉ chụp ảnh.

Các tích hợp cần thông tin ngoài (Google OAuth, SMTP/SMS, Gemini, cổng thanh toán thật) phải ghi rõ đã kiểm thử thật hay chỉ kiểm tra đường dự phòng. Build thành công và thanh toán demo không chứng minh tích hợp thanh toán thật đã hoạt động.
