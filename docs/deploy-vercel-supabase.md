# Triển khai An Tâm với Vercel và Supabase

Vercel phục vụ giao diện React và API Express trên cùng tên miền. Supabase Postgres lưu tài khoản, đơn hàng, kho và các phiên đăng nhập. Ảnh đổi trả và đơn thuốc nằm trong một bucket riêng tư. Bản chạy local tiếp tục dùng SQLite và lưu tệp trên máy.

## Chuẩn bị Supabase

1. Tạo project Supabase. Trong **Connect**, lấy URL **Transaction pooler** trên cổng `6543`. Giữ đúng username có project ref và thay mật khẩu bằng mật khẩu cơ sở dữ liệu đã mã hóa theo URL. [Kết nối PostgreSQL trên Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)
2. Sao chép `.env.example` sang `.env`. Đặt `DATABASE_URL`, `SUPABASE_URL` và `SUPABASE_SECRET_KEY` ở máy. Dùng khóa **secret** phía máy chủ. Khóa `service_role` cũ cũng được đọc từ `SUPABASE_SERVICE_ROLE_KEY`. `SUPABASE_ATTACHMENTS_BUCKET` mặc định là `antam-private`.
3. Chạy `npm ci` rồi `npm run db:setup`. Lệnh áp dụng migration trong `supabase/migrations`, khởi tạo schema `antam`, cấu hình và vai trò, đồng thời tạo bucket riêng tư giới hạn JPG, PNG, PDF và 5 MB. Trong Supabase **Database → Tables**, chọn schema `antam` để xem các bảng.
4. Đặt `INITIAL_ADMIN_EMAIL` và `INITIAL_ADMIN_PASSWORD` trong `.env`, rồi chạy `npm run init:admin`. Nếu cần danh mục, lô và khuyến mãi mẫu, đặt `SEED_SAMPLE_CATALOG=true` trước khi tạo quản trị viên. Tài khoản quản trị dùng mật khẩu riêng bạn chọn. Xóa `INITIAL_ADMIN_PASSWORD` khỏi `.env` sau khi tạo.

### Cập nhật cấu trúc cơ sở dữ liệu sau khi có migration mới

Mỗi tệp mới trong `supabase/migrations` cần được áp dụng vào Supabase trước khi dùng chức năng tương ứng. Cách nhanh nhất là chạy lại `npm run db:setup` (an toàn khi chạy nhiều lần), hoặc mở **SQL Editor** trên Supabase và chạy nội dung tệp. Migration `20261119000100_hang_tra_ve.sql` thêm bảng `hang_tra_ve` để theo dõi hàng trả về; thiếu bảng này thì tab **Hàng trả về** trong trang quản trị sẽ báo lỗi.

## Thiết lập Vercel

Import repo sau khi commit triển khai đã có trên GitHub. Chọn thư mục gốc repo. `vercel.json` khai báo build Vite, thư mục `dist` và route đến API. Dùng Node.js 24.x. [Phiên bản Node.js trên Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

Thêm các biến môi trường sau trong **Settings → Environment Variables** của project Vercel.

| Biến | Giá trị |
| --- | --- |
| `DATABASE_URL` | URL Supabase Transaction pooler |
| `SUPABASE_URL` | URL project Supabase dạng `https://<project-ref>.supabase.co` |
| `SUPABASE_SECRET_KEY` | Khóa secret phía máy chủ |
| `SUPABASE_ATTACHMENTS_BUCKET` | Tên bucket riêng tư nếu khác `antam-private` |
| `APP_ORIGIN` | Gốc tên miền HTTPS của ứng dụng, ví dụ `https://nhathuocantam.vercel.app` |
| `DATABASE_CA_CERT` | Chứng chỉ CA dạng PEM nếu kết nối PostgreSQL cần CA riêng |

Giữ biến máy chủ ở tên như trên để Vite không đưa chúng vào JavaScript của trình duyệt. Chế độ hosted không nạp tài khoản demo hoặc OTP mô phỏng. Đăng nhập `/admin` bằng tài khoản vừa khởi tạo. Để khách hàng đăng ký hoặc mời nhân viên bằng email, bổ sung SMTP theo [hướng dẫn tích hợp](integrations.md).

## Kiểm tra sau khi triển khai

- Mở `/api/health`. `database` phải là `postgres`.
- Kiểm tra đăng nhập, danh mục và tạo đơn. Khi tải đơn thuốc, trình duyệt gửi tệp trực tiếp đến Supabase qua URL có chữ ký. API xác minh người tải rồi mới gắn tệp vào đơn. Khi xem, API kiểm tra quyền trước khi cấp URL đọc ngắn hạn. [Bucket riêng tư trên Supabase](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- Giữ bản sao dữ liệu SQLite trên máy nếu cần đối chiếu. Thiết lập Supabase tạo cơ sở dữ liệu riêng. Bản sao lưu tải từ app gồm dữ liệu bảng, tệp đính kèm được quản lý trong bucket.

Có thể chạy `ANTAM_TEST_POSTGRES_URL=postgresql://… npm test` với một PostgreSQL thử nghiệm trên loopback. Kịch bản tự tạo và dọn cơ sở dữ liệu riêng cho từng bài kiểm thử. Kết quả trên máy được ghi trong [kết quả kiểm thử](verification-results.md).
