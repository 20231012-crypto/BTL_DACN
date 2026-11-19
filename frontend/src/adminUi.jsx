import React, { useState } from 'react';
import { Package } from 'lucide-react';
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
  expired: 'Hết hạn',
  available: 'Có thể bán',
  reserved: 'Đang giữ',
  low_stock: 'Sắp hết hàng',
  expiring: 'Sắp hết hạn',
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
  release: 'Hoàn tồn',
  reserve: 'Giữ tồn',
  cancel: 'Hủy đơn',
  return: 'Đổi trả',
  refund: 'Hoàn tiền',
};

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
