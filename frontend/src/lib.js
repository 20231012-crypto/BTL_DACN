export async function api(path, options = {}) {
  const headers = { ...options.headers };
  let body = options.body;
  if (body !== undefined && !(body instanceof FormData)) {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(
    path.startsWith('/api/') ? path : `/api${path}`,
    { ...options, headers, body, credentials: 'same-origin' },
  );
  const type = response.headers.get('content-type') || '';
  const result = type.includes('json')
    ? await response.json()
    : await response.text();
  if (!response.ok)
    throw new Error(
      result.error ||
        result.message ||
        'Không thể thực hiện yêu cầu. Vui lòng thử lại.',
    );
  return result && typeof result === 'object' && 'data' in result
    ? result.data
    : result;
}

export const money = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
});
export const dateTime = (value) => {
  if (!value) return '—';
  const date = new Date(
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d\d:/.test(value)
      ? `${value.replace(' ', 'T')}Z`
      : value,
  );
  return Number.isFinite(+date) ? dateFormat.format(date) : '—';
};

export async function uploadToStorage(file, kind) {
  const { uploadId, uploadUrl } = await api('/uploads/intents', {
    method: 'POST',
    body: { kind, fileName: file.name, mimeType: file.type, size: file.size },
  });
  const form = new FormData();
  form.append('cacheControl', '0');
  form.append('', file);
  const uploaded = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'x-upsert': 'false' },
    body: form,
    credentials: 'omit',
  });
  if (!uploaded.ok) throw new Error('Chưa tải được tệp. Vui lòng thử lại.');
  return uploadId;
}

export async function uploadPrescription(file, mode) {
  if (!file) throw new Error('Chọn tệp đơn thuốc.');
  if (
    file.size > 5 * 1024 * 1024 ||
    !['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)
  ) {
    throw new Error('Chọn ảnh JPG, PNG hoặc PDF có dung lượng tối đa 5 MB.');
  }
  if (mode === 'signed') {
    const uploadId = await uploadToStorage(file, 'prescription');
    return api('/prescriptions', { method: 'POST', body: { uploadId } });
  }
  const form = new FormData();
  form.append('file', file);
  return api('/prescriptions', { method: 'POST', body: form });
}
export const statusLabel = {
  pending_prescription: 'Chờ duyệt đơn thuốc',
  pending_payment: 'Chờ thanh toán',
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  returned: 'Đã trả hàng',
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

export const label = (value) => statusLabel[value] || value || '—';
