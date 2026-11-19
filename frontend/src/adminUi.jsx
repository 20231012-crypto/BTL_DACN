import React, { useEffect, useRef, useState } from 'react';
import { Package, X } from 'lucide-react';
import { money, statusLabel } from './lib.js';

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

export const LABELS = {
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
  if (parsed.status) parts.push(`Trạng thái: ${label(parsed.status)}`);
  if (parsed.code) parts.push(`Mã: ${parsed.code}`);
  if (parsed.orderId) parts.push(`Đơn #${parsed.orderId}`);
  if (parsed.role) parts.push(`Vai trò: ${label(parsed.role)}`);
  if (parsed.jobTitle) parts.push(`Chức danh: ${label(parsed.jobTitle)}`);
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

export const label = (value) =>
  LABELS[value] ||
  (typeof statusLabel === 'function'
    ? statusLabel(value)
    : statusLabel?.[value]) ||
  value ||
  '—';

export const list = (value) =>
  Array.isArray(value) ? value : value?.items || value?.rows || [];

export const fmtDate = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(value))
    : '—';

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

export const vnDate = (offsetDays = 0) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + offsetDays * 86400000));

export const shortDate = (iso) =>
  iso ? String(iso).slice(5).split('-').reverse().join('/') : '—';

export const compactMoney = (value) => {
  const n = Number(value) || 0;
  if (n >= 1000000000)
    return `${(n / 1000000000).toFixed(1).replace(/\.0$/, '')}tỷ`;
  if (n >= 1000000)
    return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}tr`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
};

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
  const c = Number(current) || 0,
    p = Number(prev) || 0;
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

export function Badge({ value, children }) {
  return (
    <span className={`adm-badge is-${value}`}>{children || label(value)}</span>
  );
}

export function KpiGrid({ cards = [] }) {
  const colsClass =
    cards.length === 4 ? 'is-cols-4' : cards.length >= 5 ? 'is-cols-5' : '';
  return (
    <div className={`adm-kpi-strip ${colsClass}`}>
      {cards.map((c) => {
        const CardIcon = c.Icon;
        const clickable = typeof c.onClick === 'function';
        return (
          <article
            key={c.key || c.label}
            className={`adm-kpi-card ${c.active ? 'is-active' : ''} ${clickable ? 'is-clickable' : ''}`}
            onClick={c.onClick}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      c.onClick();
                    }
                  }
                : undefined
            }
          >
            <div className="adm-kpi-card-top">
              <span>{c.label}</span>
              {CardIcon && (
                <span className={`adm-stat-icon ${c.tone || ''}`}>
                  <CardIcon size={17} />
                </span>
              )}
            </div>
            <strong>{c.value}</strong>
            {c.sub && <small>{c.sub}</small>}
          </article>
        );
      })}
    </div>
  );
}

export function FilterChips({ options = [], value = '', onChange }) {
  return (
    <div className="adm-ord-chips adm-filter-chips">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          className={`adm-ord-chip ${value === opt.key ? 'active' : ''}`}
          onClick={() => onChange(opt.key)}
        >
          <span>{opt.label}</span>
          {opt.count !== undefined && <b>{count(opt.count)}</b>}
        </button>
      ))}
    </div>
  );
}

export function Field({
  label: fieldLabel,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  hint,
  children,
  ...props
}) {
  const cleanProps = Object.fromEntries(
    Object.entries(props).filter(([k]) => k !== 'wide'),
  );
  return (
    <label className={`adm-field ${props.wide ? 'is-wide' : ''}`}>
      <span>
        {fieldLabel}
        {required && <i> *</i>}
      </span>
      {children ||
        (type === 'textarea' ? (
          <textarea
            name={name}
            value={value ?? ''}
            onChange={onChange}
            required={required}
            rows="3"
            {...cleanProps}
          />
        ) : (
          <input
            name={name}
            value={value ?? ''}
            onChange={onChange}
            type={type}
            required={required}
            {...cleanProps}
          />
        ))}
      {hint && <small className="adm-field-hint">{hint}</small>}
    </label>
  );
}

export function CheckField({
  name,
  value,
  onChange,
  label: fieldLabel,
  disabled = false,
  hint,
}) {
  return (
    <div className="adm-check-wrap">
      <label className={`adm-check ${disabled ? 'is-disabled' : ''}`}>
        <input
          type="checkbox"
          name={name}
          checked={!!value}
          onChange={onChange}
          disabled={disabled}
        />
        <span>{fieldLabel}</span>
      </label>
      {hint && <small className="adm-field-hint">{hint}</small>}
    </div>
  );
}

export function Modal({ title, children, onClose, wide = false }) {
  const panel = useRef(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () =>
      [
        ...panel.current.querySelectorAll(
          'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
        ),
      ].filter((el) => el.offsetParent !== null);
    controls()[0]?.focus();
    const handle = (e) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const els = controls(),
          first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handle);
    return () => {
      document.removeEventListener('keydown', handle);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="adm-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`adm-modal ${wide ? 'is-wide' : ''}`}
      >
        <div className="adm-modal-head">
          <div>
            <span className="adm-eyebrow">NHÀ THUỐC AN TÂM</span>
            <h2>{title}</h2>
          </div>
          <button className="adm-icon-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function Empty({
  title = 'Chưa có dữ liệu',
  description = 'Thông tin sẽ xuất hiện tại đây khi có phát sinh.',
}) {
  return (
    <div className="adm-empty">
      <Package size={30} />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function Table({ columns, rows, empty, children }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.length ? (
            children
          ) : (
            <tr>
              <td colSpan={columns.length}>
                <Empty title={empty} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ReportChart({ data = [] }) {
  const [metric, setMetric] = useState('both');
  const [hovered, setHovered] = useState(null);
  const peakIndex = data.reduce(
    (best, d, i) =>
      (Number(d.revenue) || 0) > (Number(data[best]?.revenue) || 0) ? i : best,
    0,
  );
  const activeIdx =
    hovered !== null && data[hovered] ? hovered : data.length ? peakIndex : -1;
  const activeDay = activeIdx >= 0 ? data[activeIdx] : null;
  const maxRev = Math.max(1, ...data.map((d) => Number(d.revenue) || 0));
  const rawMaxOrd = Math.max(1, ...data.map((d) => Number(d.orders) || 0));
  const ordTop = rawMaxOrd <= 2 ? rawMaxOrd : Math.ceil(rawMaxOrd / 4) * 4;
  const totalRev = data.reduce((n, d) => n + (Number(d.revenue) || 0), 0);
  const totalOrd = data.reduce((n, d) => n + (Number(d.orders) || 0), 0);
  const activeDays = data.filter(
    (d) => (Number(d.revenue) || 0) > 0 || (Number(d.orders) || 0) > 0,
  ).length;
  const avgRev = data.length ? Math.round(totalRev / data.length) : 0;
  const yTicks =
    metric === 'orders'
      ? ordTop === 1
        ? ['1', '', '', '', '0']
        : ordTop === 2
          ? ['2', '', '1', '', '0']
          : [ordTop, (ordTop * 3) / 4, ordTop / 2, ordTop / 4, 0]
      : [
          compactMoney(maxRev),
          compactMoney(Math.round(maxRev * 0.75)),
          compactMoney(Math.round(maxRev * 0.5)),
          compactMoney(Math.round(maxRev * 0.25)),
          '0',
        ];
  const labelStep = data.length <= 12 ? 1 : Math.ceil(data.length / 6);
  const ordPoints =
    data.length > 1
      ? data
          .map((d, i) => {
            const x = ((i + 0.5) / data.length) * 100;
            const y = 100 - Math.max(4, ((Number(d.orders) || 0) / ordTop) * 90);
            return `${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(' ')
      : '';

  if (!data.length) return <Empty title="Chưa có dữ liệu biểu đồ trong kỳ" />;

  return (
    <div className="adm-rp-chart-box">
      <div className="adm-rp-chart-top">
        <div
          className="adm-rp-metric-tabs"
          role="tablist"
          aria-label="Chế độ biểu đồ"
        >
          {[
            ['both', 'Kết hợp'],
            ['revenue', 'Doanh thu'],
            ['orders', 'Số đơn'],
          ].map(([key, name]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={metric === key}
              className={metric === key ? 'active' : ''}
              onClick={() => setMetric(key)}
            >
              {name}
            </button>
          ))}
        </div>
        {activeDay && (
          <div className="adm-rp-inspector">
            <span className="adm-rp-dot rev" />
            <strong>{shortDate(activeDay.date)}</strong>
            <span>Doanh thu: {money(activeDay.revenue)}</span>
            <span className="adm-rp-sep">·</span>
            <span className="adm-rp-dot ord" />
            <span>{count(activeDay.orders)} đơn hàng</span>
          </div>
        )}
      </div>

      <div className="adm-rp-canvas">
        <div className="adm-rp-yaxis" aria-hidden="true">
          {yTicks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        <div className="adm-rp-plot-scroll">
          <div
            className="adm-rp-plot"
            style={{
              minWidth: data.length > 40 ? `${data.length * 16}px` : undefined,
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="adm-rp-gridlines" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            {metric === 'both' && data.length > 1 && (
              <svg
                className="adm-rp-line-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polyline
                  fill="none"
                  stroke="#d0943b"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  points={ordPoints}
                />
              </svg>
            )}
            <div className="adm-rp-bars">
              {data.map((d, i) => {
                const val =
                  metric === 'orders'
                    ? Number(d.orders) || 0
                    : Number(d.revenue) || 0;
                const cap = metric === 'orders' ? ordTop : maxRev;
                const h = val > 0 ? Math.max(6, (val / cap) * 100) : 2;
                const showLabel =
                  i === 0 ||
                  i === data.length - 1 ||
                  (i % labelStep === 0 &&
                    data.length - 1 - i >= Math.ceil(labelStep * 0.6));
                const edgeClass =
                  i === 0
                    ? 'is-first'
                    : i === data.length - 1
                      ? 'is-last'
                      : '';
                const isActive = i === activeIdx;
                return (
                  <div
                    key={d.date || i}
                    className={`adm-rp-col ${isActive ? 'is-active' : ''} ${val === 0 ? 'is-zero' : ''}`}
                    onMouseEnter={() => setHovered(i)}
                    onFocus={() => setHovered(i)}
                    tabIndex={0}
                    aria-label={`${shortDate(d.date)}: ${money(d.revenue)}, ${count(d.orders)} đơn`}
                  >
                    <div className="adm-rp-bar-slot">
                      <div
                        className={`adm-rp-bar ${metric === 'orders' ? 'is-orders' : ''}`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                    <span className={`adm-rp-xlabel ${edgeClass}`}>
                      {showLabel ? shortDate(d.date) : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="adm-rp-chart-foot">
        <div>
          <span>Ngày cao nhất</span>
          <strong>
            {data[peakIndex]
              ? `${money(data[peakIndex].revenue)} (${shortDate(data[peakIndex].date)})`
              : '—'}
          </strong>
        </div>
        <div>
          <span>Trung bình / ngày</span>
          <strong>{money(avgRev)}</strong>
        </div>
        <div>
          <span>Tổng đơn trong kỳ</span>
          <strong>{count(totalOrd)} đơn</strong>
        </div>
        <div>
          <span>Số ngày có đơn</span>
          <strong>
            {activeDays} trên {data.length} ngày
          </strong>
        </div>
      </div>
    </div>
  );
}
