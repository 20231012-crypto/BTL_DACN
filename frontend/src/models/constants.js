/**
 * Domain constants, status dictionaries, permissions, and navigation metadata.
 */

export const PRODUCTS_PER_PAGE = 9;
export const POLL_INTERVAL_MS = 5000;
export const ADMIN_SUPPORT_POLL_MS = 10000;

export const statusLabel = {
  bank_transfer: 'Chuyển khoản VietQR',
  pending_prescription: 'Chờ duyệt đơn thuốc',
  pending_payment: 'Chờ thanh toán',
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  returned: 'Đã trả hàng',
  return_awaiting: 'Chờ hàng về',
  return_in_transit: 'Đang gửi về',
  return_received: 'Đã nhận hàng về',
  return_restocked: 'Đã nhập lại kho',
  return_discarded: 'Đã loại bỏ',
  delivery_failed: 'Giao thất bại',
  rejected: 'Đã từ chối',
  ChoKiemDuyetDonThuoc: 'Chờ duyệt đơn thuốc',
  ChoThanhToan: 'Chờ thanh toán',
  ChoXacNhan: 'Chờ xác nhận',
  DaXacNhan: 'Đã xác nhận',
  DangDongGoi: 'Đang đóng gói',
  DangGiao: 'Đang giao',
  DaGiao: 'Đã giao',
  DaHuy: 'Đã hủy',
  BiTuChoi: 'Đã từ chối',
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền',
  refund_pending: 'Chờ hoàn tiền',
  failed: 'Thất bại',
  ChuaThanhToan: 'Chưa thanh toán',
  ChoXacMinh: 'Chờ xác minh',
  DaThanhToan: 'Đã thanh toán',
  ChoHoanTien: 'Chờ hoàn tiền',
  DaHoanTien: 'Đã hoàn tiền',
  approved: 'Đã duyệt',
  partial: 'Duyệt một phần',
  pending_review: 'Chờ duyệt',
  request_pending: 'Chờ xử lý',
  reviewed: 'Đã đánh giá',
  active: 'Đang hoạt động',
  inactive: 'Đã tắt',
  open: 'Chờ xử lý',
  resolved: 'Đã xử lý',
  customer: 'Khách hàng',
  staff: 'Nhân viên',
  admin: 'Quản trị viên',
  cod: 'Thanh toán khi nhận hàng',
  demo: 'Thanh toán mô phỏng',
  vnpay: 'VNPay Sandbox',
  in_progress: 'Đang hỗ trợ',
};

export const ADMIN_LABELS = {
  pending_prescription: 'Chờ duyệt đơn thuốc',
  pending_payment: 'Chờ thanh toán',
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói',
  shipping: 'Đang giao',
  delivery_failed: 'Giao thất bại',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  returned: 'Đã trả hàng',
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refund_pending: 'Chờ hoàn tiền',
  refunded: 'Đã hoàn tiền',
  approved: 'Đã duyệt',
  partial: 'Duyệt một phần',
  rejected: 'Từ chối',
  active: 'Đang hoạt động',
  inactive: 'Tạm ngưng',
  running: 'Đang chạy',
  upcoming: 'Sắp diễn ra',
  exhausted: 'Hết lượt',
  expired: 'Hết hạn',
  available: 'Có thể bán',
  reserved: 'Đang giữ',
  in_stock: 'Còn hàng',
  low_stock: 'Sắp hết hàng',
  out_of_stock: 'Hết hàng',
  expiring: 'Sắp hết hạn',
  verified: 'Đã xác thực',
  unverified: 'Chờ kích hoạt',
  reviewed: 'Đã rà soát',
  unreviewed: 'Chờ rà soát',
  in_progress: 'Đang hỗ trợ',
  resolved: 'Đã giải quyết',
  customer: 'Khách hàng',
  staff: 'Nhân viên',
  admin: 'Quản trị viên',
  pharmacist: 'Dược sĩ',
  sales: 'Bán hàng',
  warehouse: 'Nhân viên kho',
  receipt: 'Nhập kho',
  return_restore: 'Nhập lại hàng trả',
  cancel_restore: 'Hoàn kho hủy đơn',
  sale: 'Xuất bán',
  adjustment: 'Điều chỉnh',
  release: 'Hoàn giữ chỗ',
  reserve: 'Giữ chỗ',
  cancel: 'Hủy đơn',
  return: 'Đổi trả',
  refund: 'Hoàn tiền',
};

export const label = (value) => statusLabel[value] || value || '—';

export const adminLabel = (value) =>
  ADMIN_LABELS[value] || statusLabel[value] || value || '—';

export const VIEW_PERMISSION = {
  dashboard: 'reports',
  orders: 'orders',
  prescriptions: 'prescriptions',
  products: 'catalog',
  inventory: 'inventory',
  catalog: 'catalog',
  promotions: 'promotions',
  users: 'users',
  chatbot: 'support',
  reports: 'reports',
  settings: 'settings',
  audit: 'audit',
};

export const ORDER_STATES = [
  'pending_prescription',
  'pending_payment',
  'pending',
  'confirmed',
  'packing',
  'shipping',
  'delivery_failed',
  'delivered',
  'cancelled',
  'returned',
];

export const ORDER_NEXT = {
  pending_prescription: ['cancelled'],
  pending_payment: ['cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['packing', 'cancelled'],
  packing: ['shipping', 'cancelled'],
  shipping: ['delivered', 'delivery_failed'],
  delivery_failed: ['shipping', 'cancelled'],
  delivered: [],
  cancelled: [],
  returned: [],
};

export const ACTIVE_QUEUE_STATUSES = new Set([
  'pending_prescription',
  'pending_payment',
  'pending',
  'delivery_failed',
]);

export const RETURN_GOODS_STATES = [
  'awaiting',
  'in_transit',
  'received',
  'restocked',
  'discarded',
];

export const RETURN_GOODS_NEXT = {
  awaiting: ['in_transit', 'received'],
  in_transit: ['received'],
  received: ['restocked', 'discarded'],
  restocked: [],
  discarded: [],
};

export const RETURN_GOODS_ACTION = {
  in_transit: 'Khách đang gửi hàng về',
  received: 'Đã nhận hàng trả về',
  restocked: 'Kiểm đạt, nhập lại kho',
  discarded: 'Không đạt, loại bỏ',
};

export const RETURN_SHIPMENT_STEPS = {
  awaiting: 'Nhà thuốc đang chờ bạn gửi hàng về',
  in_transit: 'Hàng đang được gửi về nhà thuốc',
  received: 'Nhà thuốc đã nhận hàng và đang kiểm tra',
  restocked: 'Nhà thuốc đã kiểm tra hàng trả về',
  discarded: 'Nhà thuốc đã kiểm tra hàng trả về',
};

export const CARRIER_SUGGESTIONS = [
  'Nội bộ An Tâm',
  'Giao Hàng Nhanh',
  'Viettel Post',
  'Giao Hàng Tiết Kiệm',
  'Ahamove',
  'Khách nhận tại quầy',
];

export const AUDIT_LABELS = {
  'system.seed': 'Khởi tạo dữ liệu mẫu',
  'auth.login': 'Đăng nhập tài khoản',
  'auth.register': 'Đăng ký tài khoản mới',
  'auth.reset_password': 'Đặt lại mật khẩu',
  'auth.google_login': 'Đăng nhập bằng Google',
  'auth.google_link': 'Liên kết tài khoản Google',
  'profile.update': 'Cập nhật hồ sơ cá nhân',
  'order.create': 'Tạo đơn hàng mới',
  'order.admin_create': 'Tạo đơn hàng tại quầy',
  'order.status': 'Cập nhật trạng thái đơn',
  'order.fulfillment': 'Cập nhật vận chuyển & mã vận đơn',
  'order.expired': 'Tự hủy đơn quá hạn thanh toán',
  'order.expire_manual': 'Thu hồi đơn quá hạn thanh toán',
  'order.self_cancel': 'Khách tự hủy đơn hàng',
  'order.request': 'Gửi yêu cầu hủy / đổi trả',
  'order.admin_request': 'Tạo yêu cầu xử lý đơn',
  'order.rx_adjustment': 'Điều chỉnh thuốc kê đơn',
  'order.export': 'Xuất danh sách đơn hàng CSV',
  'prescription.upload': 'Tải lên đơn thuốc',
  'prescription.analyze': 'Phân tích đơn thuốc bằng AI',
  'prescription.review': 'Kiểm duyệt đơn thuốc',
  'prescription.replace': 'Thay thế đơn thuốc',
  'payment.demo': 'Thanh toán thử nghiệm',
  'payment.vnpay_create': 'Tạo giao dịch VNPay',
  'payment.vnpay_result': 'Xác nhận thanh toán VNPay',
  'payment.vnpay_invalid_signature': 'Cảnh báo chữ ký VNPay không hợp lệ',
  'payment.vnpay_invalid_amount': 'Cảnh báo sai số tiền VNPay',
  'payment.bank_confirm': 'Đối soát chuyển khoản VietQR',
  'request.review': 'Xử lý yêu cầu hủy / đổi trả',
  'return_goods.update': 'Cập nhật trạng thái hàng trả về',
  'return_goods.ship': 'Khách gửi vận đơn trả hàng',
  'refund.complete': 'Hoàn tiền đơn hàng',
  'inventory.receipt': 'Nhập lô thuốc vào kho',
  'inventory.adjust': 'Điều chỉnh tồn kho lô',
  'product.create': 'Thêm sản phẩm mới',
  'product.update': 'Cập nhật sản phẩm',
  'product.hide': 'Ẩn sản phẩm khỏi cửa hàng',
  'categories.create': 'Thêm danh mục sản phẩm',
  'categories.update': 'Cập nhật danh mục sản phẩm',
  'categories.deactivate': 'Ngừng hoạt động danh mục',
  'manufacturers.create': 'Thêm nhà sản xuất',
  'manufacturers.update': 'Cập nhật nhà sản xuất',
  'manufacturers.deactivate': 'Ngừng hoạt động nhà sản xuất',
  'suppliers.create': 'Thêm nhà cung cấp',
  'suppliers.update': 'Cập nhật nhà cung cấp',
  'suppliers.deactivate': 'Ngừng hoạt động nhà cung cấp',
  'promotion.create': 'Tạo mã khuyến mãi',
  'promotion.update': 'Cập nhật khuyến mãi',
  'promotion.deactivate': 'Ngừng kích hoạt mã khuyến mãi',
  'user.invite': 'Tạo tài khoản nhân viên',
  'user.permissions': 'Cập nhật tài khoản & phân quyền',
  'settings.update': 'Cập nhật cấu hình hệ thống',
  'backup.export': 'Tạo bản sao lưu dữ liệu',
  'backup.restore': 'Phục hồi dữ liệu từ sao lưu',
  'knowledge.create': 'Thêm tri thức chatbot',
  'knowledge.update': 'Cập nhật tri thức chatbot',
  'knowledge.review': 'Dược sĩ rà soát tri thức',
  'knowledge.deactivate': 'Ngừng dùng tri thức chatbot',
  'safety_rule.update': 'Cập nhật quy tắc an toàn',
  'chatbot.safety_handoff': 'Chatbot cảnh báo chuyển dược sĩ',
  'chatbot.provider_unavailable': 'Dự phòng chatbot khi AI không phản hồi',
  'support.reply': 'Phản hồi yêu cầu tư vấn',
  'support.message': 'Dược sĩ nhắn tư vấn khách hàng',
  'consultation.create': 'Tạo cuộc tư vấn dược sĩ',
  'report.export': 'Xuất báo cáo doanh thu CSV',
};

export const ENTITY_LABELS = {
  order: 'Đơn hàng',
  prescription: 'Đơn thuốc',
  product: 'Sản phẩm',
  batch: 'Lô thuốc',
  receipt: 'Phiếu nhập',
  categories: 'Danh mục',
  manufacturers: 'Nhà sản xuất',
  suppliers: 'Nhà cung cấp',
  promotion: 'Khuyến mãi',
  user: 'Tài khoản',
  settings: 'Cấu hình',
  request: 'Yêu cầu đơn',
  return_goods: 'Hàng trả về',
  knowledge: 'Tri thức AI',
  rule: 'Quy tắc an toàn',
  support: 'Tư vấn',
  report: 'Báo cáo',
  database: 'CSDL',
  payment: 'Thanh toán',
  system: 'Hệ thống',
  chat: 'Hội thoại AI',
  session: 'Hội thoại AI',
};

export const PERMISSION_LABELS = {
  catalog: 'Quản lý sản phẩm & danh mục',
  inventory: 'Quản lý kho',
  orders: 'Xử lý đơn hàng',
  prescriptions: 'Duyệt đơn thuốc',
  promotions: 'Quản lý khuyến mãi',
  reports: 'Xem báo cáo',
  support: 'Hỗ trợ khách hàng',
  users: 'Quản trị tài khoản',
  settings: 'Cấu hình hệ thống',
  knowledge: 'Tri thức chatbot',
  audit: 'Nhật ký hệ thống',
  backup: 'Sao lưu dữ liệu',
};

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: Object.keys(PERMISSION_LABELS),
  pharmacist: [
    'catalog',
    'inventory',
    'orders',
    'prescriptions',
    'promotions',
    'reports',
    'support',
  ],
  sales: ['catalog', 'orders', 'promotions', 'reports', 'support'],
  warehouse: ['catalog', 'inventory', 'orders', 'reports'],
  customer: [],
};

export const EDITABLE_SETTINGS_KEYS = [
  'storeName',
  'shippingFee',
  'freeShippingThreshold',
  'lowStockThreshold',
  'expiryWarningDays',
  'returnWindowDays',
  'otpTtlMinutes',
  'paymentTimeoutMinutes',
  'chatbotEnabled',
];

export const ADMIN_SUBTITLES = {
  orders:
    'Quản lý đơn hàng xuyên suốt từ tiếp nhận, kiểm hàng đến giao thành công.',
  prescriptions:
    'Đảm bảo mỗi đơn thuốc kê đơn được kiểm tra đúng chuyên môn dược sĩ.',
  products:
    'Quản lý thông tin, giá bán, tồn kho và hiển thị danh mục sản phẩm.',
  inventory: 'Kiểm soát tồn kho theo lô, hạn dùng FEFO và lịch sử xuất nhập.',
  catalog: 'Quản lý danh mục thuốc, nhà cung cấp và nhà sản xuất đối tác.',
  promotions: 'Thiết lập mã giảm giá, hạn mức sử dụng và thời gian hiệu lực.',
  users: 'Quản lý tài khoản khách hàng, nhân sự và phân quyền theo chức danh.',
  chatbot:
    'Tiếp nhận tư vấn trực tuyến, duyệt tri thức y khoa và quy tắc an toàn.',
  reports:
    'Theo dõi doanh thu, cơ cấu đơn hàng, sản phẩm bán chạy và cảnh báo kho.',
  settings:
    'Thiết lập thông số vận hành, chính sách đổi trả, tích hợp và sao lưu.',
  audit:
    'Tra cứu chi tiết lịch sử thao tác quản trị và thay đổi dữ liệu hệ thống.',
};

export const STATUS_BUCKETS = [
  ['Hoàn tất (đã giao)', ['delivered'], '#2d7a55'],
  [
    'Đang xử lý & giao',
    [
      'pending',
      'pending_payment',
      'pending_prescription',
      'confirmed',
      'packing',
      'shipping',
    ],
    '#4c86b6',
  ],
  ['Giao thất bại / Trả hàng', ['delivery_failed', 'returned'], '#d0943b'],
  ['Đã hủy', ['cancelled'], '#cf6a5e'],
];

export const DASHBOARD_PERIOD_OPTIONS = [
  [1, 'Hôm nay'],
  [7, '7 ngày'],
  [14, '14 ngày'],
  [30, '30 ngày'],
];

export const SUPPORT_STATUS_TEXT = {
  pending: 'Chờ nhận tư vấn',
  in_progress: 'Đang tư vấn',
  resolved: 'Đã kết thúc',
};

export const SUPPORT_CLOSING_NOTE =
  'Cuộc tư vấn đã kết thúc. Nếu cần hỗ trợ thêm, bạn cứ nhắn tiếp tại đây nhé.';

export const SUPPORT_QUICK_REPLIES = [
  'Dược sĩ đã tiếp nhận yêu cầu. Bạn vui lòng mô tả rõ triệu chứng, độ tuổi và thuốc đang dùng nhé.',
  'Với thuốc kê đơn, bạn cần tải ảnh đơn thuốc hợp lệ để dược sĩ đối chiếu trước khi xuất thuốc.',
  'Nếu có dấu hiệu khó thở, sốt cao không hạ hoặc dị ứng, bạn cần ngưng thuốc và tới cơ sở y tế gần nhất ngay.',
];

export const RX_QUICK_NOTES = [
  [
    'Đúng chỉ định',
    'Đơn thuốc hợp lệ, đã đối chiếu khớp hoạt chất, hàm lượng và số lượng chỉ định.',
  ],
  [
    'Duyệt một phần',
    'Chỉ duyệt thuốc có trong toa bác sĩ; các thuốc kê đơn còn lại chưa có chỉ định trên đơn.',
  ],
  [
    'Ảnh mờ / thiếu thông tin',
    'Ảnh đơn thuốc bị mờ hoặc thiếu chữ ký bác sĩ / ngày kê đơn. Vui lòng tải lại ảnh rõ nét.',
  ],
];
