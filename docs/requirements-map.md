# Đối chiếu yêu cầu website bán thuốc

Đối chiếu dựa trên báo cáo Nhóm 11 “Website bán thuốc”, bản tải ngày 18/11/2026. Bản báo cáo và bản văn bản để tra cứu nằm trong thư mục làm việc cục bộ `docs/source`.

Tài liệu này mô tả yêu cầu nguồn và tiêu chí nghiệm thu, không tự chứng nhận mọi yêu cầu đã được triển khai. Trạng thái triển khai và các giới hạn của phiên bản chạy cần được đọc trong README.

## Phạm vi và cách đọc nguồn

Hệ thống gồm ba nhóm người dùng: khách hàng, nhân viên và quản trị viên. Nhân viên có chức danh Dược sĩ, Nhân viên bán hàng hoặc Nhân viên kho. Cổng thanh toán, Google Gemini API và dịch vụ xác thực/email/SMS là các dịch vụ ngoài. Giao hàng thực tế, ứng dụng di động riêng và kết nối hệ thống quản lý nhà thuốc quốc gia nằm ngoài phạm vi đề tài.

Bảng 1.5 thực tế liệt kê **13 nhóm UC01–UC13 với 58 use case chi tiết**; có 53 bảng đặc tả UC02–UC13, còn năm mục UC01 chỉ xuất hiện ở danh sách. Các đoạn văn ghi “14 use case/52 use case chi tiết” không khớp danh sách. Khi triển khai, dùng danh sách và quy tắc chi tiết; không tự thêm UC14. FR13 về tri thức chatbot được thể hiện trong UC12.7–UC12.8.

## Danh sách chức năng

| FR / UC | Chức năng cần có | Tiêu chí chính |
| --- | --- | --- |
| FR01 / UC01.1–UC01.5 | Đăng ký; đăng nhập email/mật khẩu hoặc Google; đăng xuất; OTP kích hoạt; quên/đặt lại mật khẩu | Mật khẩu được băm; OTP có hạn dùng và dùng một lần; tài khoản bị khóa không đăng nhập được. Google, email/SMS cần cấu hình dịch vụ thật. |
| FR02 / UC02.1–UC02.3 | Hồ sơ; đổi mật khẩu; sổ địa chỉ | Không đổi email đăng nhập; điện thoại Việt Nam 10 chữ số; mật khẩu mới ≥8 ký tự có hoa, thường, số và khác mật khẩu cũ; tối đa 10 địa chỉ, đúng một mặc định nếu không rỗng. |
| FR03 / UC03.1–UC03.3 | Tìm kiếm; lọc; chi tiết thuốc | Tìm theo tên, hoạt chất, công dụng không phân biệt hoa/thường và hỗ trợ không dấu; kết hợp danh mục, giá, nhà sản xuất; chỉ hiện sản phẩm đang bán; nhãn kê đơn rõ ràng. |
| FR04 / UC04.1–UC04.3 | Thêm, xóa, sửa số lượng giỏ hàng | Chỉ giỏ của mình; số lượng nguyên dương và ≤tồn khả dụng; tạm tính bằng tổng giá × lượng; giỏ rỗng không đặt được; được thêm thuốc kê đơn nhưng chưa đủ điều kiện bán. |
| FR05 / UC05.1–UC05.5 | Địa chỉ; mã giảm giá; tải đơn thuốc; thanh toán trực tuyến; COD | Giá, giảm giá và phí do máy chủ tính; một mã/đơn; đơn thuốc riêng tư JPG/PNG/PDF ≤5 MB; không lưu thẻ/CVV; xác thực chữ ký và số tiền kết quả thanh toán. |
| FR06 / UC06.1–UC06.4 | Theo dõi; lịch sử; hủy/đổi trả/hoàn tiền; đánh giá | Khách chỉ xem đơn của mình; không gửi hai yêu cầu đang xử lý cho cùng đơn; đánh giá sau khi đã giao, 1–5 sao, một lần/thuốc/đơn. |
| FR07 / UC07.1–UC07.5 | Hỏi đáp; gợi ý; cảnh báo; chuyển dược sĩ; lịch sử chat | Không chẩn đoán hoặc kê đơn; phản hồi luôn có khuyến cáo; chỉ gợi ý hàng không kê đơn, đang bán và còn tồn; nội dung nhạy cảm được kiểm soát quyền; dịch vụ AI lỗi có thông báo và hướng chuyển nhân viên. |
| FR08 / UC08.1–UC08.6 | Thuốc; phân loại; ẩn/xóa; danh mục; nhà sản xuất; nhà cung cấp | Thuốc có danh mục, nhà sản xuất và giá >0; không xóa vật lý dữ liệu đã được đơn hàng/nhập kho tham chiếu; thuốc ẩn không tìm thấy và không được thêm giỏ. |
| FR09 / UC09.1–UC09.4 | Nhập lô; lịch sử tồn; cảnh báo thiếu hàng; cảnh báo hạn dùng | Không nhập lô hết hạn; hạn dùng sau ngày sản xuất; tồn không âm; FEFO khi xuất bán; mọi biến động có nhật ký; loại lô hết hạn khỏi tồn có thể bán. |
| FR10 / UC10.1–UC10.5 | Duyệt đơn thuốc; xác nhận đơn; đóng gói/giao; xử lý hủy/đổi trả; hoàn tiền | Duyệt cần chức danh Dược sĩ và quyền duyệt; từ chối có lý do; chỉ xác nhận online đã thanh toán; trình tự trạng thái chặt chẽ; COD đã giao cần thu đủ tiền; hoàn tiền không trùng. |
| FR11 / UC11.1–UC11.3 | Tạo; đặt thời gian; dừng/xóa khuyến mãi | Mã duy nhất; ngày kết thúc sau bắt đầu; phần trăm 1–100 nếu loại phần trăm; không đổi mức giảm đã chốt trong đơn cũ; xóa mềm khi đã có đơn áp dụng. |
| FR12 / UC12.1–UC12.6 | Tài khoản; khóa/mở; phân quyền; thanh toán/phí giao; nhật ký; sao lưu/phục hồi | Chỉ admin tạo nhân viên/phân quyền; khóa phải có lý do và hủy phiên; không tự khóa/khóa admin cuối; không tước quyền admin cuối; nhật ký chỉ đọc; phục hồi hai bước và có hoàn tác khi lỗi. |
| FR13 / UC12.7–UC12.8 | Tri thức chatbot; quy tắc an toàn | Tri thức có nguồn và được dược sĩ rà soát trước khi dùng; không chứa định danh cá nhân; không gỡ quy tắc cấm chẩn đoán/kê đơn; thay đổi có nhật ký. |
| FR14 / UC13.1–UC13.4 | Doanh thu; bán chạy; tồn/tỉ lệ hủy; hoạt động chatbot | Doanh thu theo đơn hoàn tất, trừ hoàn tiền; không tính đơn hủy; tồn chỉ lô còn hạn; tỉ lệ hủy trên tổng đơn trong kỳ; thống kê chat ẩn danh. |

## Quy tắc xử lý đơn hàng

### Trạng thái xử lý và thanh toán độc lập

- Xử lý: `ChoKiemDuyetDonThuoc`, `ChoThanhToan`, `ChoXacNhan`, `DaXacNhan`, `DangDongGoi`, `DangGiao`, `DaGiao`, `BiTuChoi`, `DaHuy`.
- Thanh toán: `ChuaThanhToan`, `ChoXacMinh`, `DaThanhToan`, `ChoHoanTien`, `DaHoanTien`.
- Đơn thuốc: `ChoDuyet`, `ChoBoSung`, `DaDuyet`, `BiTuChoi`.

Luồng bình thường:

1. Máy chủ đọc giỏ, kiểm tra thuốc đang bán, tồn còn hạn, địa chỉ và khuyến mãi; chụp giá bán, địa chỉ, phương thức giao và các tổng tiền vào đơn.
2. Có thuốc kê đơn: đơn hàng ở `ChoKiemDuyetDonThuoc`, đơn thuốc ở `ChoDuyet`; dược sĩ duyệt, yêu cầu bổ sung hoặc từ chối kèm lý do. Chưa được duyệt thì không xác nhận/xuất giao.
3. Không kê đơn hoặc đã duyệt: online chờ thanh toán; COD chuyển chờ xác nhận. Thanh toán online được ghi nhận khi callback hợp lệ, đúng đơn, đúng số tiền; callback trùng không ghi nhận lại.
4. Nhân viên xác nhận đơn hợp lệ, kiểm tra lại tồn, phân bổ lô FEFO và ghi lịch sử tồn trong cùng giao dịch dữ liệu. Không đủ tồn thì toàn bộ thao tác không thay đổi dữ liệu.
5. `DaXacNhan → DangDongGoi → DangGiao → DaGiao`; không bỏ bước. Đơn COD chỉ kết thúc khi xác nhận đã thu đủ tiền.
6. Đơn chờ thanh toán quá hạn cấu hình được hủy. Giao dịch chưa rõ kết quả cần đối soát, không suy diễn là đã thanh toán.

Địa chỉ và đơn giá trong đơn hàng không thay đổi khi khách sửa sổ địa chỉ hoặc nhân viên sửa giá thuốc. Chỉ khách sở hữu mới đọc đơn, gửi yêu cầu, thanh toán hoặc đánh giá. Nhân viên phải có quyền theo chức năng.

### Hủy, đổi trả, hoàn tiền

- Lý do yêu cầu luôn bắt buộc; nếu đã có yêu cầu đang xử lý thì không tạo trùng.
- Đơn chưa xác nhận/chưa thanh toán có nhánh hủy ngay theo UC06.3. Đơn đã giao đi cần nhân viên xử lý hoặc khách từ chối nhận.
- Thời hạn đổi trả thuộc cấu hình cửa hàng; “7 ngày” trong tài liệu là ví dụ. Không tự xem đó là quy định cố định.
- Thuốc đã mở niêm phong hoặc không được bảo quản đúng không được đổi trả, trừ lỗi cửa hàng. Hàng đã giao chỉ nhập lại kho khi còn niêm phong và đảm bảo chất lượng; không tự động cộng kho mọi đơn được hoàn tiền.
- Từ chối yêu cầu phải có lý do. Đơn đã trả online được chấp nhận hủy/đổi trả phải qua bước hoàn tiền.
- Số tiền hoàn không vượt số đã thanh toán; một giao dịch chỉ hoàn một lần theo giá trị được duyệt, về đúng phương thức/tài khoản ban đầu; lưu giao dịch để đối soát.

## Phân quyền và dữ liệu nhạy cảm

Quyền hiệu lực bằng hợp quyền từ mọi vai trò và ngoại lệ `ChoPhep` đang `HieuLuc`, sau đó loại mọi quyền có ngoại lệ `TuChoi` đang `HieuLuc`. Ngoại lệ đã thu hồi không tham gia tính quyền. Mỗi tài khoản có ít nhất một vai trò.

Quyền duyệt đơn thuốc không được cấp cho nhân viên không có chức danh `DuocSi`, kể cả qua ngoại lệ tài khoản. Quản trị viên không mặc nhiên có chuyên môn dược. Mỗi lần truy cập phải kiểm tra trạng thái tài khoản và quyền hiện tại; khóa tài khoản cần vô hiệu phiên đang hoạt động. Không được khóa chính mình hoặc admin cuối, không được tước toàn bộ quyền quản trị của admin duy nhất.

Đơn thuốc không được phục vụ qua thư mục tĩnh. Người tải lên chỉ đọc đơn thuốc của đơn hàng mình; nhân viên phải có quyền xem chuyên môn phù hợp. Hội thoại thuộc khách hàng hoặc phiên ẩn danh tạo ra nó; lịch sử và nội dung chuyển tiếp chỉ hiển thị cho người có quyền. Không ghi mật khẩu, OTP gốc, số thẻ hoặc CVV trong nhật ký.

## Chatbot

- Cho phép hỏi đáp thông tin chung khi chưa đăng nhập; lưu lịch sử gắn khách hoặc phiên được kiểm soát.
- Loại bỏ thông tin định danh không cần thiết trước khi gọi Gemini; không gửi ảnh đơn thuốc hay toàn bộ hồ sơ khách để trả lời câu hỏi chung.
- Kiểm tra câu hỏi và phản hồi. Triệu chứng nguy hiểm ưu tiên cảnh báo đi khám và chuyển nhân viên, không đưa lời khuyên dùng thuốc.
- Không chẩn đoán, không kê thuốc kê đơn, luôn kèm khuyến cáo hỏi dược sĩ/bác sĩ. Các vấn đề liều dùng đặc biệt, tương tác phức tạp, thuốc kê đơn cần chuyển dược sĩ.
- Chỉ gợi ý sản phẩm không kê đơn, thực phẩm chức năng hoặc thiết bị y tế đang bán và còn tồn; trả liên kết chi tiết có thể kiểm tra.
- Mục tiêu phản hồi dưới 5 giây; AI lỗi/quá thời gian cần thông báo rõ và hỗ trợ chuyển nhân viên. Cơ chế dự phòng bằng tri thức nội bộ phải được nhận diện đúng, không trình bày như phản hồi AI trực tiếp.

## Tham số chưa được nguồn chốt

Các giá trị chạy thử phải được ghi rõ là cấu hình mẫu, tách khỏi quy tắc nguồn: TTL OTP; giới hạn gửi/sai OTP; hạn thanh toán; ngưỡng tồn và ngày sắp hết hạn; phí/phương thức giao theo khu vực; điều kiện, loại, lượt dùng khuyến mãi; trần COD; thời hạn đổi trả; thời hạn giữ đơn hàng/nhật ký/hội thoại; lịch sao lưu; thông tin merchant/callback/khóa thanh toán; khóa/model Gemini; cấu hình Google OAuth; SMTP/SMS.

## Các điểm chưa nhất quán trong thiết kế nguồn

| Nội dung | Quan sát để triển khai |
| --- | --- |
| UC01 | Có danh sách năm chức năng nhưng thiếu các bảng đặc tả chi tiết; không giả định thông số OTP/OAuth đã được chốt. |
| Địa chỉ | UC02.3 cần người nhận, điện thoại, địa giới và mặc định, còn bảng nguồn chỉ có `dia_chi`; cần bổ sung trường triển khai hoặc cấu trúc hóa nội dung, giữ snapshot khi đặt. |
| Hồ sơ | UC02.1 có ngày sinh, giới tính, avatar nhưng bảng `nguoi_dung` chưa có các cột đó. |
| Khuyến mãi | UC11 có phần trăm, điều kiện, lượt dùng nhưng bảng nguồn chỉ có `gia_tri_giam`; cần phân biệt loại giảm và giới hạn nếu triển khai các nhánh này. |
| Đơn hàng | Cần phí giao, người nhận, lịch sử trạng thái, thu tiền COD; bảng nguồn chưa mô tả hết. |
| Tồn kho | Đặc tả đề cập hủy/tiêu hủy/hoàn kho nhưng enum lịch sử chỉ có `NhapKho`, `XuatBan`; cần mở rộng có kiểm soát. |
| Đổi trả | UC có đổi trả nhưng enum yêu cầu chỉ `HuyDon`, `HoanTien`; không tự coi mọi hoàn tiền là hoàn kho. |
| Duyệt một phần | UC10.1 có nhánh duyệt một số thuốc, nhưng CSDL chưa có chi tiết duyệt theo dòng; cần bổ sung mô hình hoặc nêu giới hạn. |
| Giao thất bại | Có nhánh ở UC10.3 nhưng enum đơn hàng chưa có `GiaoThatBai`; không thêm trạng thái vào luồng chính mà không ghi nhận quyết định. |
| Tri thức | UC yêu cầu nguồn tham khảo và dược sĩ rà soát; bảng nguồn chưa lưu nguồn/người duyệt/trạng thái duyệt. |
| Sao lưu/cấu hình/phiên | Có chức năng nhưng chưa có bảng cấu hình, phiên, metadata backup; đây là phần hạ tầng cần bổ sung khi cài đặt. |

## Các kiểm thử nghiệp vụ cần ưu tiên

1. Người dùng khác không đọc được đơn hàng, đơn thuốc, hội thoại hoặc thao tác giỏ của chủ sở hữu.
2. Nhân viên bán hàng/admin không có chức danh dược sĩ không duyệt được đơn thuốc; quyền bị `TuChoi` có hiệu lực ngay.
3. Thuốc kê đơn chưa duyệt không xác nhận được; online chưa paid không xác nhận được; COD không đánh dấu đã giao khi chưa thu tiền.
4. Xác nhận đồng thời không bán vượt tồn, không trừ kho hai lần; lô gần hạn được dùng trước; lô hết hạn không được bán; lỗi giữa giao dịch không làm thay đổi một phần.
5. Giá, giảm giá, phí giao gửi từ trình duyệt không thay đổi tổng máy chủ tính; snapshot đơn cũ giữ nguyên sau khi sửa giá/địa chỉ.
6. Callback thanh toán sai chữ ký/sai số tiền bị từ chối và có nhật ký; callback trùng không thu/ghi nhận hai lần; hoàn tiền trùng/quá số tiền bị từ chối.
7. Tệp giả phần mở rộng, sai MIME/chữ ký, quá 5 MB không được lưu làm đơn thuốc; URL tệp không công khai.
8. OTP hết hạn/dùng lại bị từ chối; khóa hoặc đổi mật khẩu vô hiệu phiên cũ theo chính sách triển khai; không tự khóa hoặc làm mất admin cuối.
9. Đánh giá trước khi giao, thuốc không thuộc đơn, người không sở hữu, lần thứ hai hoặc sao ngoài 1–5 bị từ chối.
10. Chatbot không trả hướng dẫn kê đơn/chẩn đoán; câu hỏi nguy hiểm ưu tiên cảnh báo; nội dung cá nhân không truyền sang AI; lỗi tích hợp không làm ngừng tra cứu/mua hàng.
