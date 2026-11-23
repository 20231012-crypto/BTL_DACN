/**
 * Pure formatting, parsing, search normalization, and domain computation helpers.
 */
import { adminLabel } from './constants.js';
export { searchScore } from '../../../shared/search.js';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
});

export const money = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const compactMoney = (value) => {
  const n = Number(value) || 0;
  if (n >= 1000000000)
    return `${(n / 1000000000).toFixed(1).replace(/\.0$/, '')}tỷ`;
  if (n >= 1000000)
    return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}tr`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
};

export const dateTime = (value) => {
  if (!value) return '—';
  const date = new Date(
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d\d:/.test(value)
      ? `${value.replace(' ', 'T')}Z`
      : value,
  );
  return Number.isFinite(+date) ? dateFormat.format(date) : '—';
};

export const fmtDate = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(value))
    : '—';

export const fmtTime = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(new Date(value))
    : '';

export const vnDate = (offsetDays = 0) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + offsetDays * 86400000));

export const vnDay = (value) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
};

export const shortDate = (iso) =>
  iso ? String(iso).slice(5).split('-').reverse().join('/') : '—';

export const daysBetweenIso = (targetIso, baseIso = vnDate(0)) => {
  if (!targetIso) return null;
  const t = Date.parse(`${String(targetIso).slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${String(baseIso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(t) || Number.isNaN(b)) return null;
  return Math.round((t - b) / 86400000);
};

export const list = (value) =>
  Array.isArray(value) ? value : value?.items || value?.rows || [];

export const safeJson = (value, fallback = []) => {
  try {
    return typeof value === 'string' ? JSON.parse(value) : value || fallback;
  } catch {
    return fallback;
  }
};

export const text = (value) =>
  value == null || value === '' ? '—' : String(value);

export const count = (value) =>
  new Intl.NumberFormat('vi-VN').format(Number(value) || 0);

export const digitsOnly = (value) =>
  String(value || '')
    .replace(/\D/g, '')
    .slice(0, 12);

export const formatPriceInput = (value) => {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString('vi-VN') : '';
};

export const normalizeSearch = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();

export const paymentLabel = (method) =>
  ({
    cod: 'Thanh toán khi nhận hàng (COD)',
    bank_transfer: 'Chuyển khoản VietQR',
    vnpay: 'Cổng thanh toán VNPay',
    demo: 'Thanh toán thử nghiệm',
  })[method] || text(method);

export const paymentShortLabel = (method) =>
  ({
    cod: 'COD',
    bank_transfer: 'VietQR',
    vnpay: 'VNPay',
    demo: 'Mô phỏng',
  })[method] || text(method);

export const deltaInfo = (current, prev, inverse = false) => {
  const c = Number(current) || 0;
  const p = Number(prev) || 0;
  if (p === 0 && c === 0)
    return { text: 'Không đổi so với kỳ trước', tone: 'flat', dir: 'flat' };
  if (p === 0)
    return {
      text: 'Mới phát sinh trong kỳ',
      tone: inverse ? 'down' : 'up',
      dir: 'up',
    };
  const pct = ((c - p) / p) * 100;
  const rounded = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
  const good = inverse ? pct <= 0 : pct >= 0;
  return {
    text: `${rounded} so với kỳ trước`,
    tone: Math.abs(pct) < 0.05 ? 'flat' : good ? 'up' : 'down',
    dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
  };
};

export function promoRuntimeStatus(p, todayStr = vnDate(0)) {
  if (!p?.active) return 'inactive';
  if (p.endDate && String(p.endDate).slice(0, 10) < todayStr) return 'expired';
  if (p.startDate && String(p.startDate).slice(0, 10) > todayStr)
    return 'upcoming';
  if (
    Number(p.usageLimit) > 0 &&
    Number(p.usedCount || 0) >= Number(p.usageLimit)
  )
    return 'exhausted';
  return 'running';
}

export function formatAuditDetail(detail) {
  if (detail == null || detail === '') return '—';
  const parsed =
    typeof detail === 'object'
      ? detail
      : (() => {
          const trimmed = String(detail).trim();
          if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
          try {
            return JSON.parse(trimmed);
          } catch {
            return null;
          }
        })();
  if (!parsed) return String(detail);
  if (Array.isArray(parsed)) return `${parsed.length} mục`;
  const parts = [];
  if (parsed.status) parts.push(`Trạng thái: ${adminLabel(parsed.status)}`);
  if (parsed.code) parts.push(`Mã: ${parsed.code}`);
  if (parsed.orderId) parts.push(`Đơn #${parsed.orderId}`);
  if (parsed.role) parts.push(`Vai trò: ${adminLabel(parsed.role)}`);
  if (parsed.jobTitle) parts.push(`Chức danh: ${adminLabel(parsed.jobTitle)}`);
  if (parsed.quantity !== undefined) parts.push(`SL: ${parsed.quantity}`);
  if (parsed.amount !== undefined) parts.push(`Số tiền: ${money(parsed.amount)}`);
  if (parsed.reason) parts.push(`Lý do: ${parsed.reason}`);
  if (parsed.lockReason) parts.push(`Khóa: ${parsed.lockReason}`);
  if (parsed.note) parts.push(`Ghi chú: ${parsed.note}`);
  if (Array.isArray(parsed.permissions))
    parts.push(`${parsed.permissions.length} quyền`);
  if (parts.length) return parts.join(' · ');
  const keys = Object.entries(parsed).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (!keys.length) return '—';
  return keys
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' · ');
}

export function evaluatePasswordStrength(value) {
  if (!value) return null;
  const checks = [
    ['Ít nhất 8 ký tự', value.length >= 8],
    ['Chữ hoa (A–Z)', /[A-Z]/.test(value)],
    ['Chữ thường (a–z)', /[a-z]/.test(value)],
    ['Chữ số (0–9)', /\d/.test(value)],
  ];
  const passed = checks.filter(([, ok]) => ok).length;
  const level = passed <= 1 ? 'weak' : passed < 4 ? 'medium' : 'strong';
  const labelText =
    level === 'weak'
      ? 'Yếu'
      : level === 'medium'
        ? 'Trung bình'
        : 'Đạt chuẩn';
  return { checks, passed, level, labelText };
}

export function paginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) pages.push('ellipsis-left');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push('ellipsis-right');
  pages.push(totalPages);
  return pages;
}
