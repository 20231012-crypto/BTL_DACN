import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  History,
  LoaderCircle,
  MapPin,
  Package,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { searchScore } from '../../shared/search.js';
import Pagination from './Pagination.jsx';
import {
  ORDER_NEXT,
  ORDER_STATES,
  RETURN_GOODS_STATES,
  Badge,
  Empty,
  Table,
  count,
  fmtDate,
  label,
  list,
  paymentLabel,
  paymentShortLabel,
  safeJson,
  text,
} from './adminUi.jsx';
import { api, dateTime, money } from './lib.js';

const CARRIER_SUGGESTIONS = [
  'Nội bộ An Tâm',
  'Giao Hàng Nhanh',
  'Viettel Post',
  'Giao Hàng Tiết Kiệm',
  'Ahamove',
  'Khách nhận tại quầy',
];

const ACTIVE_QUEUE_STATUSES = new Set([
  'pending_prescription',
  'pending_payment',
  'pending',
  'delivery_failed',
]);

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const fmtTime = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(new Date(value))
    : '';

const vnDay = (value) =>
  value
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value))
    : '';

const isOrderOverdue = (o) =>
  o?.status === 'pending_payment' &&
  o?.paymentStatus !== 'paid' &&
  o?.paymentDeadline &&
  Date.parse(o.paymentDeadline) < Date.now();

const hasActionableRequest = (o) =>
  (o?.requests || []).some(
    (r) =>
      r.status === 'pending' ||
      (r.status === 'approved' &&
        o.paymentStatus === 'refund_pending' &&
        !r.refundAmount),
  );

export function printOrderSlip(order) {
  const addr = safeJson(order?.address, {});
  const items = safeJson(order?.items, []);
  const allocsByProduct = new Map();
  for (const alloc of order?.allocations || []) {
    const arr = allocsByProduct.get(alloc.productId) || [];
    arr.push(`${alloc.batchNumber} (${alloc.quantity}) · HSD ${fmtDate(alloc.expiresAt)}`);
    allocsByProduct.set(alloc.productId, arr);
  }
  const codToCollect =
    order?.paymentMethod === 'cod' && order?.paymentStatus !== 'paid'
      ? Number(order.total || 0)
      : 0;
  const fullAddress = [addr.line1, addr.ward, addr.district, addr.city]
    .filter(Boolean)
    .join(', ');

  const rowsHtml = items
    .map((item, idx) => {
      const batches = allocsByProduct.get(item.productId)?.join('<br/>') || 'Chưa xuất lô';
      return `<tr>
        <td style="text-align:center">${idx + 1}</td>
        <td>
          <strong>${escapeHtml(item.name)}</strong>
          ${item.prescriptionRequired ? '<span class="rx">Kê đơn</span>' : ''}
          <div class="muted">${escapeHtml(item.unit)}</div>
        </td>
        <td class="muted">${batches}</td>
        <td style="text-align:right">${escapeHtml(money(item.price))}</td>
        <td style="text-align:center">${Number(item.quantity || 0)}</td>
        <td style="text-align:right"><strong>${escapeHtml(money(item.price * item.quantity))}</strong></td>
      </tr>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Phiếu đơn hàng ${escapeHtml(order.code)} - Nhà thuốc An Tâm</title>
  <style>
    body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1d352d; margin: 24px; font-size: 13px; line-height: 1.5; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #166454; padding-bottom: 14px; margin-bottom: 18px; }
    .brand { font-size: 20px; font-weight: 700; color: #166454; }
    .muted { color: #647770; font-size: 11px; }
    .code { font-size: 18px; font-weight: 700; text-align: right; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
    .box { border: 1px solid #d7e2dc; border-radius: 8px; padding: 12px 14px; background: #fbfdfb; }
    .box h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .6px; color: #5f766d; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #dce6df; padding: 8px 10px; vertical-align: top; }
    th { background: #f2f7f4; font-size: 11px; text-align: left; color: #365247; }
    .rx { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 4px; background: #fbf4e4; color: #9c7921; font-size: 10px; font-weight: 600; }
    .totals { width: 320px; margin-left: auto; border: 1px solid #dce6df; border-radius: 8px; padding: 10px 14px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { border-top: 1px solid #cfe0d6; margin-top: 6px; padding-top: 8px; font-size: 15px; font-weight: 700; color: #166454; }
    .cod { margin-top: 10px; padding: 10px 12px; background: #eef6f0; border: 1px dashed #2e7a56; border-radius: 6px; font-weight: 600; display: flex; justify-content: space-between; }
    .signs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 28px; text-align: center; }
    .signs span { display: block; margin-top: 44px; font-size: 11px; color: #647770; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">NHÀ THUỐC AN TÂM</div>
      <div class="muted">Phiếu đóng gói &amp; giao nhận đơn hàng</div>
    </div>
    <div>
      <div class="code">${escapeHtml(order.code)}</div>
      <div class="muted">Ngày đặt: ${escapeHtml(dateTime(order.createdAt))}</div>
    </div>
  </div>
  <div class="grid">
    <div class="box">
      <h4>Thông tin người nhận</h4>
      <div><strong>${escapeHtml(addr.recipient || order.userName || 'Khách hàng')}</strong> · ${escapeHtml(addr.phone || order.phone || '—')}</div>
      <div>${escapeHtml(fullAddress || '—')}</div>
      ${order.note ? `<div class="muted" style="margin-top:4px">Ghi chú khách: ${escapeHtml(order.note)}</div>` : ''}
    </div>
    <div class="box">
      <h4>Vận chuyển &amp; Thanh toán</h4>
      <div>Trạng thái: <strong>${escapeHtml(label(order.status))}</strong></div>
      <div>Thanh toán: ${escapeHtml(paymentLabel(order.paymentMethod))} (${escapeHtml(label(order.paymentStatus))})</div>
      <div>Đơn vị VC: ${escapeHtml(order.shippingCarrier || 'Chưa phân công')} ${order.trackingCode ? `· Mã VĐ: <strong>${escapeHtml(order.trackingCode)}</strong>` : ''}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:36px;text-align:center">#</th>
        <th>Sản phẩm</th>
        <th>Lô xuất FEFO</th>
        <th style="text-align:right">Đơn giá</th>
        <th style="width:52px;text-align:center">SL</th>
        <th style="text-align:right">Thành tiền</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="totals">
    <div><span>Tiền hàng</span><span>${escapeHtml(money(order.subtotal))}</span></div>
    <div><span>Phí giao hàng</span><span>${escapeHtml(money(order.shippingFee))}</span></div>
    <div><span>Giảm giá ${order.promotionCode ? `(${escapeHtml(order.promotionCode)})` : ''}</span><span>−${escapeHtml(money(order.discount))}</span></div>
    <div class="grand"><span>Tổng thanh toán</span><span>${escapeHtml(money(order.total))}</span></div>
  </div>
  <div class="cod">
    <span>Tiền cần thu khi giao (COD):</span>
    <span>${escapeHtml(money(codToCollect))}</span>
  </div>
  <div class="signs">
    <div><strong>Người kiểm đơn / Dược sĩ</strong><span>(Ký và ghi rõ họ tên)</span></div>
    <div><strong>Nhân viên đóng gói</strong><span>(Ký và ghi rõ họ tên)</span></div>
    <div><strong>Khách hàng nhận hàng</strong><span>(Xác nhận đã nhận đủ)</span></div>
  </div>
</body>
</html>`;
  const win = window.open('', '_blank', 'width=880,height=900');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
  return true;
}

function getQuickNextAction(order, canReviewRx) {
  if (!order) return null;
  if (order.status === 'pending_prescription' && canReviewRx && order.prescriptionId)
    return { kind: 'rx', label: 'Duyệt đơn' };
  if (order.status === 'pending_payment' && order.paymentMethod === 'bank_transfer')
    return { kind: 'reconcile', label: 'Đối soát' };
  if (
    order.status === 'pending' &&
    (!order.prescriptionStatus || order.prescriptionStatus === 'approved') &&
    (order.paymentMethod === 'cod' || order.paymentStatus === 'paid')
  )
    return { kind: 'status', status: 'confirmed', label: 'Xác nhận' };
  if (order.status === 'confirmed')
    return { kind: 'status', status: 'packing', label: 'Đóng gói' };
  if (order.status === 'packing')
    return { kind: 'status', status: 'shipping', label: 'Giao hàng' };
  if (order.status === 'shipping' && order.paymentMethod !== 'cod')
    return { kind: 'status', status: 'delivered', label: 'Hoàn tất' };
  if (order.status === 'shipping' && order.paymentMethod === 'cod')
    return { kind: 'collect_cod', label: 'Thu COD' };
  if (hasActionableRequest(order))
    return { kind: 'open', label: 'Xử lý YC' };
  return null;
}

export default function AdminOrders({
  orders = [],
  requests = [],
  returnGoods = [],
  tab,
  setTab,
  query,
  setQuery,
  filter,
  setFilter,
  page,
  setPage,
  onOpenOrder,
  onOpenRequest,
  onOpenReturnGoods,
  onOpenPrescription,
  onOpenCreateOrder,
  onReload,
  notify,
  hasPermission,
}) {
  const [payMethod, setPayMethod] = useState('');
  const [payStatus, setPayStatus] = useState('');
  const [rxFilter, setRxFilter] = useState('');
  const [reqTypeFilter, setReqTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sortBy, setSortBy] = useState('newest');
  const [selectedIds, setSelectedIds] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const canReviewRx = hasPermission('prescriptions');
  const ordersList = list(orders);
  const requestsList = list(requests);
  const returnGoodsList = list(returnGoods);
  const activeReturnsCount = returnGoodsList.filter((g) =>
    ['awaiting', 'in_transit', 'received'].includes(g.status),
  ).length;

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => ordersList.some((o) => o.id === id)));
  }, [ordersList.length]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [tab, payMethod, payStatus, rxFilter, reqTypeFilter, dateRange.from, dateRange.to, sortBy]);

  const statusCounts = {};
  for (const s of ORDER_STATES) statusCounts[s] = 0;
  for (const o of ordersList) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

  const queueOrders = ordersList.filter(
    (o) => ACTIVE_QUEUE_STATUSES.has(o.status) || o.paymentStatus === 'refund_pending' || hasActionableRequest(o),
  );
  const overdueOrders = ordersList.filter(isOrderOverdue);
  const pendingReqOnly = requestsList.filter((r) => r.status === 'pending').length;
  const refundPendingOrdersCount = ordersList.filter((o) => o.paymentStatus === 'refund_pending').length;
  const actionableRequestsBadge = requestsList.filter(
    (r) =>
      r.status === 'pending' ||
      (!(r.type === 'return' && ['awaiting', 'in_transit'].includes(r.returnGoodsStatus)) &&
        r.status === 'approved' &&
        ['paid', 'refund_pending'].includes(r.paymentStatus) &&
        ['cancelled', 'returned'].includes(r.orderStatus) &&
        !r.refundAmount),
  ).length;

  const deliveredRevenue = ordersList
    .filter((o) => o.status === 'delivered' && o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const inProgressCount =
    (statusCounts.confirmed || 0) +
    (statusCounts.packing || 0) +
    (statusCounts.shipping || 0);

  const hasOrderFilters = Boolean(
    query || filter || payMethod || payStatus || rxFilter || dateRange.from || dateRange.to || sortBy !== 'newest',
  );

  const clearFilters = () => {
    setQuery('');
    setFilter('');
    setPayMethod('');
    setPayStatus('');
    setRxFilter('');
    setReqTypeFilter('');
    setDateRange({ from: '', to: '' });
    setSortBy('newest');
  };

  const baseOrders = tab === 'queue' ? queueOrders : ordersList;
  const filteredOrders = baseOrders
    .filter((o) => {
      if (filter && o.status !== filter) return false;
      if (payMethod && o.paymentMethod !== payMethod) return false;
      if (payStatus && o.paymentStatus !== payStatus) return false;
      if (rxFilter === 'rx' && !o.requiresPrescription) return false;
      if (rxFilter === 'otc' && o.requiresPrescription) return false;
      const day = vnDay(o.createdAt);
      if (dateRange.from && day < dateRange.from) return false;
      if (dateRange.to && day > dateRange.to) return false;
      if (query) {
        const addr = safeJson(o.address, {});
        const haystack = [
          o.code,
          o.userName,
          o.customerName,
          o.email,
          o.phone,
          o.trackingCode,
          o.shippingCarrier,
          o.promotionCode,
          addr.recipient,
          addr.phone,
          addr.line1,
          addr.city,
          ...(o.items || []).map((i) => i.name),
        ]
          .filter(Boolean)
          .join(' ');
        if (searchScore(haystack, query) <= 0) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') return Number(a.id) - Number(b.id);
      if (sortBy === 'total_desc') return Number(b.total || 0) - Number(a.total || 0);
      if (sortBy === 'total_asc') return Number(a.total || 0) - Number(b.total || 0);
      return Number(b.id) - Number(a.id);
    });

  const filteredRequests = requestsList.filter((r) => {
    if (filter && r.status !== filter) return false;
    if (reqTypeFilter && r.type !== reqTypeFilter) return false;
    if (query) {
      const haystack = [r.orderCode, r.userName, r.userPhone, r.reason, r.reply]
        .filter(Boolean)
        .join(' ');
      if (searchScore(haystack, query) <= 0) return false;
    }
    return true;
  });

  const filteredReturns = returnGoodsList.filter((g) => {
    if (filter && g.status !== filter) return false;
    if (query) {
      const haystack = [
        g.orderCode,
        g.userName,
        g.userPhone,
        g.trackingCode,
        g.carrier,
        g.reason,
        ...(g.items || []).map((i) => i.name),
      ]
        .filter(Boolean)
        .join(' ');
      if (searchScore(haystack, query) <= 0) return false;
    }
    return true;
  });

  const perPage = 10;
  const activeRows =
    tab === 'returns'
      ? filteredReturns
      : tab === 'requests'
        ? filteredRequests
        : filteredOrders;
  const totalPages = Math.max(1, Math.ceil(activeRows.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = activeRows.slice((currentPage - 1) * perPage, currentPage * perPage);

  const visibleIds = visibleRows.map((o) => o.id);
  const allVisibleSelected =
    tab !== 'requests' &&
    tab !== 'returns' &&
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds.includes(id));

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const quickStatusChange = async (order, nextStatus) => {
    setBusyId(order.id);
    try {
      await api(`/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });
      notify(`Đơn ${order.code} đã chuyển sang "${label(nextStatus)}".`);
      await onReload(true);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const runBulkTransition = async (targetStatus) => {
    if (!selectedIds.length) return;
    if (targetStatus === 'cancelled') {
      const reason = window.prompt('Nhập lý do hủy hàng loạt (tối thiểu 5 ký tự):', 'Hủy đơn hàng theo yêu cầu xử lý');
      if (reason === null) return;
      if (reason.trim().length < 5) {
        notify('Lý do hủy hàng loạt cần ít nhất 5 ký tự.', 'error');
        return;
      }
      setBulkBusy(true);
      try {
        const res = await api('/admin/orders/bulk-status', {
          method: 'POST',
          body: { orderIds: selectedIds, status: targetStatus, note: reason.trim() },
        });
        notify(
          res.failed?.length
            ? `Đã hủy ${res.updated.length} đơn; ${res.failed.length} đơn không hợp lệ (${res.failed[0].code}: ${res.failed[0].error}).`
            : `Đã hủy ${res.updated.length} đơn hàng.`,
          res.updated.length ? 'success' : 'error',
        );
        setSelectedIds([]);
        await onReload(true);
      } catch (err) {
        notify(err.message, 'error');
      } finally {
        setBulkBusy(false);
      }
      return;
    }
    setBulkBusy(true);
    try {
      const res = await api('/admin/orders/bulk-status', {
        method: 'POST',
        body: { orderIds: selectedIds, status: targetStatus },
      });
      notify(
        res.failed?.length
          ? `Đã cập nhật ${res.updated.length} đơn; bỏ qua ${res.failed.length} đơn (${res.failed[0].code}: ${res.failed[0].error}).`
          : `Đã chuyển ${res.updated.length} đơn sang "${label(targetStatus)}".`,
        res.updated.length ? 'success' : 'error',
      );
      setSelectedIds([]);
      await onReload(true);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleExpireOverdue = async () => {
    setBulkBusy(true);
    try {
      const res = await api('/admin/orders/expire-overdue', { method: 'POST', body: {} });
      notify(
        res.expiredCount > 0
          ? `Đã tự động hủy ${res.expiredCount} đơn quá hạn thanh toán và hoàn tồn giữ chỗ.`
          : 'Hiện chưa có đơn thanh toán quá hạn đủ điều kiện hủy.',
      );
      await onReload(true);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const exportUrl = `/api/admin/orders/export?${new URLSearchParams(
    Object.fromEntries(
      Object.entries({
        status: filter,
        paymentMethod: payMethod,
        paymentStatus: payStatus,
        prescription: rxFilter === 'rx' ? 'true' : rxFilter === 'otc' ? 'false' : '',
        from: dateRange.from,
        to: dateRange.to,
        search: query,
      }).filter(([, v]) => v),
    ),
  )}`;

  const handleQuickButton = async (order, action) => {
    if (action.kind === 'status') {
      await quickStatusChange(order, action.status);
    } else if (action.kind === 'collect_cod') {
      await onOpenOrder(order, { nextStatus: 'delivered' });
    } else if (action.kind === 'rx') {
      await onOpenPrescription(order.prescriptionId);
    } else {
      await onOpenOrder(order);
    }
  };

  return (
    <div className="adm-ord-wrap">
      <div className="adm-stats">
        <button
          type="button"
          className="adm-stat adm-stat-btn"
          onClick={() => {
            setTab('orders');
            setFilter('');
          }}
        >
          <div className="adm-stat-top">
            <span>Tổng đơn hàng</span>
            <span className="adm-stat-icon tone-0">
              <ShoppingBag size={20} />
            </span>
          </div>
          <strong>{count(ordersList.length)}</strong>
          <small>
            {count(statusCounts.delivered)} hoàn tất · {money(deliveredRevenue)}
          </small>
        </button>

        <button
          type="button"
          className="adm-stat adm-stat-btn"
          onClick={() => {
            setTab('queue');
            setFilter('');
          }}
        >
          <div className="adm-stat-top">
            <span>Cần xử lý ngay</span>
            <span className="adm-stat-icon tone-2">
              <Clock size={20} />
            </span>
          </div>
          <strong>{count(queueOrders.length)}</strong>
          <small>
            {count(statusCounts.pending_prescription)} duyệt đơn ·{' '}
            {count(statusCounts.pending)} xác nhận ·{' '}
            {count(statusCounts.delivery_failed)} giao lại
          </small>
        </button>

        <button
          type="button"
          className="adm-stat adm-stat-btn"
          onClick={() => {
            setTab('orders');
            setFilter('shipping');
          }}
        >
          <div className="adm-stat-top">
            <span>Đang đóng gói &amp; giao</span>
            <span className="adm-stat-icon tone-1">
              <Truck size={20} />
            </span>
          </div>
          <strong>{count(inProgressCount)}</strong>
          <small>
            {count(statusCounts.confirmed)} đã XN · {count(statusCounts.packing)}{' '}
            đóng gói · {count(statusCounts.shipping)} đang giao
          </small>
        </button>

        <button
          type="button"
          className="adm-stat adm-stat-btn"
          onClick={() => {
            setTab('requests');
            setFilter('');
          }}
        >
          <div className="adm-stat-top">
            <span>Yêu cầu &amp; hoàn tiền</span>
            <span className="adm-stat-icon tone-3">
              <Wallet size={20} />
            </span>
          </div>
          <strong>{count(pendingReqOnly + refundPendingOrdersCount)}</strong>
          <small>
            {count(pendingReqOnly)} yêu cầu chờ · {count(refundPendingOrdersCount)}{' '}
            chờ hoàn tiền
          </small>
        </button>
      </div>

      {overdueOrders.length > 0 && (
        <div className="adm-info-banner adm-ord-alert">
          <AlertTriangle size={19} />
          <div>
            <strong>
              Có {overdueOrders.length} đơn chờ thanh toán đã quá hạn cấu hình
            </strong>
            <p>
              Thu hồi các đơn quá hạn để giải phóng tồn kho đang giữ cho khách
              hàng khác.
            </p>
          </div>
          <button
            type="button"
            className="adm-btn small"
            disabled={bulkBusy}
            onClick={handleExpireOverdue}
          >
            <RotateCcw size={14} />
            Thu hồi đơn quá hạn
          </button>
        </div>
      )}

      <section className="adm-panel">
        <div className="adm-tabs">
          <button
            type="button"
            className={tab === 'orders' ? 'active' : ''}
            onClick={() => {
              setTab('orders');
              setFilter('');
            }}
          >
            Tất cả đơn hàng
            <span>{ordersList.length}</span>
          </button>
          <button
            type="button"
            className={tab === 'queue' ? 'active' : ''}
            onClick={() => {
              setTab('queue');
              setFilter('');
            }}
          >
            Cần xử lý
            {queueOrders.length > 0 && <span>{queueOrders.length}</span>}
          </button>
          <button
            type="button"
            className={tab === 'requests' ? 'active' : ''}
            onClick={() => {
              setTab('requests');
              setFilter('');
            }}
          >
            Yêu cầu hủy, đổi trả &amp; hoàn tiền
            {actionableRequestsBadge > 0 && <span>{actionableRequestsBadge}</span>}
          </button>
          <button
            type="button"
            className={tab === 'returns' ? 'active' : ''}
            onClick={() => {
              setTab('returns');
              setFilter('');
            }}
          >
            Hàng trả về
            {activeReturnsCount > 0 && <span>{activeReturnsCount}</span>}
          </button>
        </div>

        {tab === 'orders' && (
          <div className="adm-ord-chips" role="group" aria-label="Lọc nhanh trạng thái">
            <button
              type="button"
              className={`adm-ord-chip ${!filter ? 'active' : ''}`}
              onClick={() => setFilter('')}
            >
              Tất cả <b>{ordersList.length}</b>
            </button>
            {ORDER_STATES.map((state) => {
              const n = statusCounts[state] || 0;
              return (
                <button
                  type="button"
                  key={state}
                  className={`adm-ord-chip ${filter === state ? 'active' : ''} ${n === 0 ? 'is-muted' : ''}`}
                  onClick={() => setFilter(filter === state ? '' : state)}
                >
                  {label(state)} <b>{n}</b>
                </button>
              );
            })}
          </div>
        )}

        <div className="adm-toolbar adm-ord-toolbar">
          <div className="adm-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === 'returns'
                  ? 'Tìm mã đơn, tên khách, mã vận đơn...'
                  : tab === 'requests'
                    ? 'Tìm mã đơn, tên khách, lý do yêu cầu...'
                    : 'Tìm mã đơn, khách, SĐT, sản phẩm, vận đơn...'
              }
              aria-label="Tìm kiếm đơn hàng"
            />
          </div>

          <div className="adm-toolbar-right adm-ord-filters">
            {tab === 'returns' ? (
              <select
                className="adm-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Trạng thái hàng trả về"
              >
                <option value="">Tất cả trạng thái</option>
                {RETURN_GOODS_STATES.map((v) => (
                  <option key={v} value={v}>
                    {label(`return_${v}`)}
                  </option>
                ))}
              </select>
            ) : tab === 'requests' ? (
              <>
                <select
                  className="adm-select"
                  value={reqTypeFilter}
                  onChange={(e) => setReqTypeFilter(e.target.value)}
                  aria-label="Loại yêu cầu"
                >
                  <option value="">Tất cả loại yêu cầu</option>
                  <option value="cancel">Hủy đơn</option>
                  <option value="return">Đổi trả</option>
                  <option value="refund">Hoàn tiền</option>
                </select>
                <select
                  className="adm-select"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  aria-label="Trạng thái yêu cầu"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="pending">Chờ xử lý</option>
                  <option value="approved">Đã duyệt</option>
                  <option value="rejected">Từ chối</option>
                </select>
              </>
            ) : (
              <>
                <select
                  className="adm-select"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  aria-label="Phương thức thanh toán"
                >
                  <option value="">Tất cả PTTT</option>
                  <option value="cod">COD</option>
                  <option value="bank_transfer">Chuyển khoản VietQR</option>
                  <option value="vnpay">VNPay</option>
                  <option value="demo">Mô phỏng</option>
                </select>
                <select
                  className="adm-select"
                  value={payStatus}
                  onChange={(e) => setPayStatus(e.target.value)}
                  aria-label="Trạng thái thanh toán"
                >
                  <option value="">Tất cả TT</option>
                  <option value="unpaid">Chưa thanh toán</option>
                  <option value="paid">Đã thanh toán</option>
                  <option value="refund_pending">Chờ hoàn tiền</option>
                  <option value="refunded">Đã hoàn tiền</option>
                  <option value="failed">Thất bại</option>
                </select>
                <select
                  className="adm-select"
                  value={rxFilter}
                  onChange={(e) => setRxFilter(e.target.value)}
                  aria-label="Loại đơn hàng"
                >
                  <option value="">Tất cả loại đơn</option>
                  <option value="rx">Có thuốc kê đơn</option>
                  <option value="otc">Không kê đơn</option>
                </select>
                <select
                  className="adm-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sắp xếp"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="oldest">Cũ nhất</option>
                  <option value="total_desc">Giá trị cao → thấp</option>
                  <option value="total_asc">Giá trị thấp → cao</option>
                </select>
                <input
                  type="date"
                  className="adm-select adm-ord-date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
                  aria-label="Từ ngày"
                  title="Từ ngày"
                />
                <input
                  type="date"
                  className="adm-select adm-ord-date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
                  aria-label="Đến ngày"
                  title="Đến ngày"
                />
                {hasOrderFilters && (
                  <button type="button" className="adm-btn small" onClick={clearFilters}>
                    <X size={13} />
                    Xóa lọc
                  </button>
                )}
                <a className="adm-btn" href={exportUrl} download>
                  <FileText size={15} />
                  Xuất CSV
                </a>
                <button
                  type="button"
                  className="adm-btn primary"
                  onClick={onOpenCreateOrder}
                >
                  <Plus size={16} />
                  Tạo đơn hộ khách
                </button>
              </>
            )}
          </div>
        </div>

        {tab !== 'requests' && tab !== 'returns' && selectedIds.length > 0 && (
          <div className="adm-ord-bulkbar">
            <span>
              Đã chọn <strong>{selectedIds.length}</strong> đơn hàng
            </span>
            <div className="adm-ord-bulk-actions">
              <button
                type="button"
                className="adm-btn small primary"
                disabled={bulkBusy}
                onClick={() => runBulkTransition('confirmed')}
              >
                <Check size={14} />
                Xác nhận
              </button>
              <button
                type="button"
                className="adm-btn small"
                disabled={bulkBusy}
                onClick={() => runBulkTransition('packing')}
              >
                <Boxes size={14} />
                Đóng gói
              </button>
              <button
                type="button"
                className="adm-btn small"
                disabled={bulkBusy}
                onClick={() => runBulkTransition('shipping')}
              >
                <Truck size={14} />
                Giao hàng
              </button>
              <button
                type="button"
                className="adm-btn small"
                disabled={bulkBusy}
                onClick={() => runBulkTransition('cancelled')}
              >
                <Ban size={14} />
                Hủy đơn
              </button>
              <button
                type="button"
                className="adm-text-btn"
                onClick={() => setSelectedIds([])}
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {tab === 'returns' ? (
          <Table
            columns={[
              'Đơn hàng',
              'Khách hàng',
              'Sản phẩm trả về',
              'Vận chuyển',
              'Cập nhật',
              'Trạng thái',
              'Thao tác',
            ]}
            rows={visibleRows}
            empty="Chưa có hàng trả về"
          >
            {visibleRows.map((g) => (
              <tr key={g.id}>
                <td>
                  <button
                    type="button"
                    className="adm-code"
                    onClick={() => onOpenOrder({ id: g.orderId, code: g.orderCode })}
                  >
                    {g.orderCode || `#${g.orderId}`}
                  </button>
                  <small>{money(g.total)}</small>
                </td>
                <td>
                  <strong>{g.userName}</strong>
                  <small>{g.userPhone || g.userEmail || ''}</small>
                </td>
                <td className="adm-truncate">
                  {(g.items || [])
                    .map((item) => `${item.name} × ${item.quantity}`)
                    .join(', ')}
                </td>
                <td>
                  {g.trackingCode ? (
                    <>
                      <strong>{g.trackingCode}</strong>
                      <small>{g.carrier || 'Đơn vị vận chuyển'}</small>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{fmtDate(g.updatedAt || g.createdAt)}</td>
                <td>
                  <Badge value={`return_${g.status}`} />
                </td>
                <td>
                  <button
                    type="button"
                    className="adm-btn small"
                    onClick={() => onOpenReturnGoods?.(g)}
                  >
                    <Eye size={14} />
                    Xử lý
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        ) : tab === 'requests' ? (
          <Table
            columns={[
              'Đơn hàng',
              'Khách hàng',
              'Loại yêu cầu',
              'Lý do & Minh chứng',
              'Ngày gửi',
              'Trạng thái',
              'Thao tác',
            ]}
            rows={visibleRows}
            empty="Không có yêu cầu hủy, đổi trả hoặc hoàn tiền nào"
          >
            {visibleRows.map((r) => {
              const waitingGoods =
                r.type === 'return' &&
                ['awaiting', 'in_transit'].includes(r.returnGoodsStatus);
              const needsRefund =
                !waitingGoods &&
                r.status === 'approved' &&
                ['paid', 'refund_pending'].includes(r.paymentStatus) &&
                ['cancelled', 'returned'].includes(r.orderStatus) &&
                !r.refundAmount;
              return (
                <tr key={r.id}>
                  <td>
                    <button
                      type="button"
                      className="adm-code"
                      onClick={() => onOpenOrder({ id: r.orderId, code: r.orderCode })}
                    >
                      {r.orderCode || `#${r.orderId}`}
                    </button>
                    <small>
                      {money(r.total)} · {paymentShortLabel(r.paymentMethod)}
                    </small>
                  </td>
                  <td>
                    <strong>{r.userName}</strong>
                    <small>{r.userPhone || r.userEmail || ''}</small>
                  </td>
                  <td>
                    <Badge value={r.type} />
                    <small>{label(r.orderStatus)}</small>
                  </td>
                  <td className="adm-truncate" title={r.reason}>
                    <span>{r.reason}</span>
                    <small>
                      {r.evidenceAvailable ? 'Có ảnh minh chứng · ' : ''}
                      {r.reply || (r.handlerName ? `Xử lý: ${r.handlerName}` : 'Chờ kiểm tra')}
                    </small>
                  </td>
                  <td>
                    {fmtDate(r.createdAt)}
                    <small>{fmtTime(r.createdAt)}</small>
                  </td>
                  <td>
                    <Badge value={r.status} />
                    {r.returnGoodsStatus && (
                      <div style={{ marginTop: 4 }}>
                        <Badge value={`return_${r.returnGoodsStatus}`} />
                      </div>
                    )}
                    {needsRefund && <small className="adm-ord-warn-text">Cần hoàn tiền</small>}
                    {r.refundAmount > 0 && (
                      <small className="adm-green">Đã hoàn {money(r.refundAmount)}</small>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`adm-btn small ${needsRefund || r.status === 'pending' ? 'primary' : ''}`}
                      onClick={() => onOpenRequest(r)}
                    >
                      <Eye size={14} />
                      {needsRefund ? 'Hoàn tiền' : r.status === 'pending' ? 'Xử lý' : 'Chi tiết'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <div className="adm-ord-orders-table">
            <Table
              columns={[
                <input
                  key="all"
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  aria-label="Chọn tất cả đơn hàng trên trang"
                />,
                'Đơn hàng',
                'Khách hàng',
                'Ngày tạo',
                'Tổng tiền',
                'Thanh toán',
                'Trạng thái',
                'Thao tác',
              ]}
              rows={visibleRows}
              empty="Không tìm thấy đơn hàng phù hợp bộ lọc"
            >
              {visibleRows.map((o) => {
                const addr = safeJson(o.address, {});
                const items = o.items || [];
                const firstItem = items[0]?.name;
                const quick = getQuickNextAction(o, canReviewRx);
                const pendingReq = hasActionableRequest(o);
                const overdue = isOrderOverdue(o);
                const recipientDiffers =
                  addr.recipient && o.userName && addr.recipient !== o.userName;

                return (
                  <tr key={o.id} className={selectedIds.includes(o.id) ? 'is-selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(o.id)}
                        onChange={() => toggleSelect(o.id)}
                        aria-label={`Chọn đơn ${o.code}`}
                      />
                    </td>
                    <td>
                      <button className="adm-code" onClick={() => onOpenOrder(o)}>
                        {o.code}
                      </button>
                      <small className="adm-ord-subline">
                        {o.itemCount || items.length || 0} SP
                        {firstItem ? ` · ${firstItem}` : ''}
                        {items.length > 1 ? ` (+${items.length - 1})` : ''}
                      </small>
                      <div className="adm-ord-tags">
                        {o.requiresPrescription && (
                          <span className="adm-ord-tag is-rx">Kê đơn</span>
                        )}
                        {o.promotionCode && (
                          <span className="adm-ord-tag is-promo">{o.promotionCode}</span>
                        )}
                        {pendingReq && (
                          <span className="adm-ord-tag is-req">Có yêu cầu</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <strong>{o.userName || o.customerName || addr.recipient || 'Khách hàng'}</strong>
                      <small className="adm-ord-subline">
                        {o.phone || addr.phone || o.email || '—'}
                        {recipientDiffers ? ` · Nhận: ${addr.recipient}` : ''}
                      </small>
                    </td>
                    <td>
                      {fmtDate(o.createdAt)}
                      <small>{fmtTime(o.createdAt)}</small>
                    </td>
                    <td className="adm-amount">
                      {money(o.total)}
                      <small>
                        {paymentShortLabel(o.paymentMethod)}
                        {o.discount > 0 ? ` · −${money(o.discount)}` : ''}
                      </small>
                    </td>
                    <td>
                      <Badge value={o.paymentStatus} />
                      {overdue && <small className="adm-ord-warn-text">Quá hạn thanh toán</small>}
                    </td>
                    <td>
                      <Badge value={o.status} />
                      {o.trackingCode && (
                        <small className="adm-ord-subline">
                          {o.shippingCarrier ? `${o.shippingCarrier} · ` : ''}
                          {o.trackingCode}
                        </small>
                      )}
                    </td>
                    <td>
                      <div className="adm-ord-row-actions">
                        {quick && (
                          <button
                            type="button"
                            className="adm-btn small"
                            disabled={busyId === o.id}
                            onClick={() => handleQuickButton(o, quick)}
                          >
                            {busyId === o.id ? (
                              <LoaderCircle size={13} className="adm-spin" />
                            ) : null}
                            {quick.label}
                          </button>
                        )}
                        <button
                          type="button"
                          className="adm-icon-btn"
                          onClick={() => onOpenOrder(o)}
                          aria-label="Xem đơn hàng"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </Table>
          </div>
        )}

        <Pagination
          page={currentPage}
          totalItems={activeRows.length}
          perPage={perPage}
          onChange={setPage}
          className="adm-pagination"
          noun={
            tab === 'returns'
              ? 'hàng trả về'
              : tab === 'requests'
                ? 'yêu cầu'
                : 'đơn hàng'
          }
        />
      </section>
    </div>
  );
}

const STEPPER_STEPS = [
  ['created', 'Tiếp nhận'],
  ['confirmed', 'Xác nhận'],
  ['packing', 'Đóng gói'],
  ['shipping', 'Đang giao'],
  ['delivered', 'Đã giao'],
];

function stepperIndex(status) {
  if (['pending_prescription', 'pending_payment', 'pending'].includes(status)) return 0;
  if (status === 'confirmed') return 1;
  if (status === 'packing') return 2;
  if (status === 'shipping' || status === 'delivery_failed') return 3;
  if (status === 'delivered' || status === 'returned') return 4;
  return 0;
}

export function OrderDetailContent({
  item,
  form,
  setForm,
  change,
  saving,
  setSaving,
  onSubmitStatus,
  onBankReconcile,
  onOrderUpdated,
  onClose,
  onOpenPrescription,
  onOpenRequest,
  hasPermission,
  notify,
}) {
  const [detailTab, setDetailTab] = useState('history');
  const [editingAddress, setEditingAddress] = useState(false);
  const [recordingRequest, setRecordingRequest] = useState(null);
  const [fulfillDraft, setFulfillDraft] = useState({
    shippingCarrier: item.shippingCarrier || '',
    trackingCode: item.trackingCode || '',
    internalNote: item.internalNote || '',
  });
  const addr = safeJson(item.address, {});
  const [addrDraft, setAddrDraft] = useState({
    recipient: addr.recipient || '',
    phone: addr.phone || '',
    line1: addr.line1 || '',
    ward: addr.ward || '',
    district: addr.district || '',
    city: addr.city || '',
  });
  const [reqDraft, setReqDraft] = useState({
    reason: '',
    reply: '',
    sealed: false,
    storeFault: false,
    restock: false,
  });

  useEffect(() => {
    const a = safeJson(item.address, {});
    setFulfillDraft({
      shippingCarrier: item.shippingCarrier || '',
      trackingCode: item.trackingCode || '',
      internalNote: item.internalNote || '',
    });
    setAddrDraft({
      recipient: a.recipient || '',
      phone: a.phone || '',
      line1: a.line1 || '',
      ward: a.ward || '',
      district: a.district || '',
      city: a.city || '',
    });
    setEditingAddress(false);
    setRecordingRequest(null);
  }, [item.id, item.updatedAt, item.status]);

  const items = safeJson(item.items, []);
  const allocations = list(item.allocations);
  const history = list(item.history);
  const transactions = list(item.transactions);
  const requests = list(item.requests);
  const canEditAddress = [
    'pending_prescription',
    'pending_payment',
    'pending',
    'confirmed',
  ].includes(item.status);
  const canRecordCancel =
    [
      'pending_prescription',
      'pending_payment',
      'pending',
      'confirmed',
      'packing',
      'delivery_failed',
    ].includes(item.status) &&
    !requests.some((r) => r.status === 'pending' || (r.status === 'approved' && r.type === 'cancel'));
  const canRecordReturn =
    item.status === 'delivered' &&
    !requests.some((r) => r.status === 'pending' || (r.status === 'approved' && r.type === 'return'));
  const overdue = isOrderOverdue(item);
  const stepPos = stepperIndex(item.status);
  const isTerminalCancel = item.status === 'cancelled';

  const allocsByProduct = new Map();
  for (const a of allocations) {
    const arr = allocsByProduct.get(a.productId) || [];
    arr.push(a);
    allocsByProduct.set(a.productId, arr);
  }

  const saveFulfillment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api(`/admin/orders/${item.id}/fulfillment`, {
        method: 'PATCH',
        body: fulfillDraft,
      });
      notify('Đã cập nhật thông tin vận chuyển & ghi chú nội bộ.');
      await onOrderUpdated(updated);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api(`/admin/orders/${item.id}/fulfillment`, {
        method: 'PATCH',
        body: { address: addrDraft },
      });
      setEditingAddress(false);
      notify('Đã cập nhật địa chỉ giao hàng.');
      await onOrderUpdated(updated);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const expireNow = async () => {
    setSaving(true);
    try {
      const updated = await api(`/admin/orders/${item.id}/expire`, {
        method: 'POST',
        body: {},
      });
      notify('Đã hủy đơn quá hạn thanh toán và hoàn tồn giữ chỗ.');
      await onOrderUpdated(updated);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitAdminRequest = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api(`/admin/orders/${item.id}/requests`, {
        method: 'POST',
        body: {
          type: recordingRequest,
          ...reqDraft,
        },
      });
      setRecordingRequest(null);
      setReqDraft({ reason: '', reply: '', sealed: false, storeFault: false, restock: false });
      notify(
        recordingRequest === 'cancel'
          ? 'Đã ghi nhận hủy đơn hàng.'
          : 'Đã ghi nhận đổi trả đơn hàng.',
      );
      await onOrderUpdated(updated);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const actionableReq = requests.find(
    (r) =>
      r.status === 'pending' ||
      (!(r.type === 'return' && ['awaiting', 'in_transit'].includes(r.returnGoodsStatus)) &&
        r.status === 'approved' &&
        ['paid', 'refund_pending'].includes(item.paymentStatus) &&
        ['cancelled', 'returned'].includes(item.status) &&
        !r.refundAmount),
  );
  const waitingReturnReq = requests.find(
    (r) =>
      r.status === 'approved' &&
      r.type === 'return' &&
      ['awaiting', 'in_transit'].includes(r.returnGoodsStatus),
  );

  return (
    <>
      <div className="adm-modal-body">
        <div className="adm-order-top">
          <Badge value={item.status} />
          <Badge value={item.paymentStatus} />
          {item.requiresPrescription && (
            <Badge value={item.prescriptionStatus || 'pending_prescription'}>
              {item.prescriptionStatus
                ? `Đơn thuốc: ${label(item.prescriptionStatus)}`
                : 'Thuốc kê đơn'}
            </Badge>
          )}
          <span className="adm-ord-time-meta">
            Tạo: {dateTime(item.createdAt)}
            {item.updatedAt && item.updatedAt !== item.createdAt
              ? ` · Cập nhật: ${dateTime(item.updatedAt)}`
              : ''}
          </span>
          <button
            type="button"
            className="adm-btn small"
            onClick={() => {
              if (!printOrderSlip(item))
                notify('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép pop-up.', 'error');
            }}
          >
            <Printer size={14} />
            In phiếu đơn
          </button>
        </div>

        <div className={`adm-ord-stepper ${isTerminalCancel ? 'is-cancelled' : ''}`}>
          {STEPPER_STEPS.map(([key, title], idx) => (
            <div
              key={key}
              className={`adm-ord-step ${!isTerminalCancel && idx <= stepPos ? 'is-done' : ''} ${
                !isTerminalCancel && idx === stepPos ? 'is-current' : ''
              }`}
            >
              <span>{!isTerminalCancel && idx < stepPos ? <Check size={12} /> : idx + 1}</span>
              <b>{title}</b>
            </div>
          ))}
        </div>

        {item.status === 'pending_prescription' && (
          <div className="adm-info-banner compact">
            <AlertTriangle size={18} />
            <p>
              <strong>Đơn chờ kiểm duyệt thuốc kê đơn:</strong>{' '}
              {item.prescriptionStatus === 'rejected'
                ? `Đơn thuốc đã bị từ chối (${item.prescriptionNote || 'chưa đạt'}). Chờ khách bổ sung đơn mới hoặc điều chỉnh bỏ thuốc kê đơn.`
                : item.prescriptionStatus === 'partial'
                  ? 'Dược sĩ đã duyệt một phần. Chờ khách xác nhận giữ thuốc được duyệt hoặc bỏ thuốc kê đơn.'
                  : 'Cần dược sĩ có chuyên môn kiểm duyệt trước khi thanh toán/xác nhận.'}
            </p>
            {item.prescriptionId && hasPermission('prescriptions') && (
              <button
                type="button"
                className="adm-btn small primary"
                onClick={() => onOpenPrescription(item.prescriptionId)}
              >
                Kiểm duyệt đơn
              </button>
            )}
          </div>
        )}

        {item.status === 'pending_payment' && (
          <div className={`adm-info-banner compact ${overdue ? 'danger' : ''}`}>
            <Clock size={18} />
            <p>
              <strong>
                {overdue ? 'Đơn đã quá hạn thanh toán!' : 'Đang chờ khách hàng thanh toán'}
              </strong>{' '}
              {item.paymentDeadline ? `Hạn thanh toán: ${dateTime(item.paymentDeadline)}.` : ''}
            </p>
            {overdue && (
              <button
                type="button"
                className="adm-btn small"
                disabled={saving}
                onClick={expireNow}
              >
                Hủy đơn quá hạn
              </button>
            )}
          </div>
        )}

        {actionableReq && (
          <div className="adm-info-banner compact danger">
            <AlertTriangle size={18} />
            <p>
              <strong>
                {actionableReq.status === 'pending'
                  ? `Khách hàng đang gửi yêu cầu ${label(actionableReq.type).toLowerCase()}:`
                  : 'Đơn hàng đang chờ hoàn tiền:'}
              </strong>{' '}
              {actionableReq.reason}
            </p>
            <button
              type="button"
              className="adm-btn small primary"
              onClick={() =>
                onOpenRequest({
                  ...actionableReq,
                  orderId: item.id,
                  orderCode: item.code,
                  orderStatus: item.status,
                  paymentStatus: item.paymentStatus,
                  paymentMethod: item.paymentMethod,
                  total: item.total,
                  userName: item.userName,
                })
              }
            >
              {actionableReq.status === 'pending' ? 'Xử lý ngay' : 'Hoàn tiền ngay'}
            </button>
          </div>
        )}

        {!actionableReq && waitingReturnReq && (
          <div className="adm-info-banner compact">
            <Package size={18} />
            <p>
              <strong>Đang chờ hàng trả về ({label(`return_${waitingReturnReq.returnGoodsStatus}`)}):</strong>{' '}
              Hoàn tiền sẽ mở khóa sau khi kho xác nhận đã nhận hàng trả về.
            </p>
          </div>
        )}

        <div className="adm-ord-detail-grid">
          <div className="adm-ord-card">
            <div className="adm-ord-card-head">
              <span>
                <User size={13} /> Tài khoản đặt hàng
              </span>
              {item.customerOrderCount > 0 && (
                <small>{item.customerOrderCount} đơn tại An Tâm</small>
              )}
            </div>
            <strong>{item.userName || item.customerName || 'Khách hàng'}</strong>
            <p>{item.phone || 'Chưa có SĐT tài khoản'}</p>
            <p>{item.email || 'Chưa có email'}</p>
            <p className="adm-ord-note-line">
              Ghi chú khách: {item.note || 'Không có ghi chú'}
            </p>
          </div>

          <div className="adm-ord-card">
            <div className="adm-ord-card-head">
              <span>
                <MapPin size={13} /> Thông tin giao nhận
              </span>
              {canEditAddress && (
                <button
                  type="button"
                  className="adm-text-btn"
                  onClick={() => setEditingAddress((v) => !v)}
                >
                  <Pencil size={12} />
                  {editingAddress ? 'Hủy sửa' : 'Sửa địa chỉ'}
                </button>
              )}
            </div>
            {editingAddress ? (
              <form className="adm-ord-inline-form" onSubmit={saveAddress}>
                <div className="adm-ord-inline-2">
                  <input
                    placeholder="Người nhận"
                    value={addrDraft.recipient}
                    onChange={(e) => setAddrDraft((a) => ({ ...a, recipient: e.target.value }))}
                    required
                  />
                  <input
                    placeholder="SĐT (10 số)"
                    value={addrDraft.phone}
                    onChange={(e) => setAddrDraft((a) => ({ ...a, phone: e.target.value }))}
                    required
                  />
                </div>
                <input
                  placeholder="Số nhà, tên đường"
                  value={addrDraft.line1}
                  onChange={(e) => setAddrDraft((a) => ({ ...a, line1: e.target.value }))}
                  required
                />
                <div className="adm-ord-inline-3">
                  <input
                    placeholder="Phường/Xã"
                    value={addrDraft.ward}
                    onChange={(e) => setAddrDraft((a) => ({ ...a, ward: e.target.value }))}
                    required
                  />
                  <input
                    placeholder="Quận/Huyện"
                    value={addrDraft.district}
                    onChange={(e) => setAddrDraft((a) => ({ ...a, district: e.target.value }))}
                  />
                  <input
                    placeholder="Tỉnh/Thành"
                    value={addrDraft.city}
                    onChange={(e) => setAddrDraft((a) => ({ ...a, city: e.target.value }))}
                    required
                  />
                </div>
                <button className="adm-btn small primary" disabled={saving} type="submit">
                  Lưu địa chỉ
                </button>
              </form>
            ) : (
              <>
                <strong>{addr.recipient || item.userName || '—'}</strong>
                <p>{addr.phone || item.phone || '—'}</p>
                <p>
                  {[addr.line1, addr.ward, addr.district, addr.city]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
              </>
            )}
          </div>

          <div className="adm-ord-card">
            <div className="adm-ord-card-head">
              <span>
                <CreditCard size={13} /> Thanh toán &amp; Kho FEFO
              </span>
              <Badge value={item.stockReleased ? 'available' : item.stockDeducted ? 'sale' : 'reserved'}>
                {item.stockReleased
                  ? 'Đã hoàn kho'
                  : item.stockDeducted
                    ? 'Đã xuất FEFO'
                    : 'Đang giữ tồn'}
              </Badge>
            </div>
            <strong>{paymentLabel(item.paymentMethod)}</strong>
            <p>Trạng thái TT: {label(item.paymentStatus)}</p>
            {item.promotionCode && (
              <p>
                Mã KM: <strong>{item.promotionCode}</strong> ({item.promotionName})
              </p>
            )}
            {item.prescriptionId && (
              <p>
                Đơn thuốc #{item.prescriptionId} ({label(item.prescriptionStatus)})
                {item.prescriptionReviewerName ? ` · Duyệt: ${item.prescriptionReviewerName}` : ''}
              </p>
            )}
          </div>
        </div>

        <form className="adm-ord-fulfill-box" onSubmit={saveFulfillment}>
          <div className="adm-ord-card-head">
            <span>
              <Truck size={13} /> Vận chuyển &amp; Ghi chú nội bộ
            </span>
          </div>
          <div className="adm-ord-fulfill-grid">
            <label className="adm-field">
              <span>Đơn vị vận chuyển</span>
              <input
                list="adm-carrier-list"
                value={fulfillDraft.shippingCarrier}
                onChange={(e) =>
                  setFulfillDraft((d) => ({ ...d, shippingCarrier: e.target.value }))
                }
                placeholder="VD: Nội bộ An Tâm, GHN..."
              />
              <datalist id="adm-carrier-list">
                {CARRIER_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="adm-field">
              <span>Mã vận đơn</span>
              <input
                value={fulfillDraft.trackingCode}
                onChange={(e) =>
                  setFulfillDraft((d) => ({ ...d, trackingCode: e.target.value }))
                }
                placeholder="VD: AT-VD-00109"
              />
            </label>
            <label className="adm-field is-wide">
              <span>Ghi chú nội bộ (chỉ nhân viên xem)</span>
              <input
                value={fulfillDraft.internalNote}
                onChange={(e) =>
                  setFulfillDraft((d) => ({ ...d, internalNote: e.target.value }))
                }
                placeholder="Lưu ý đóng gói, liên hệ giao hàng, lịch hẹn khách..."
              />
            </label>
          </div>
          <div className="adm-ord-fulfill-actions">
            <button type="submit" className="adm-btn small" disabled={saving}>
              <Check size={14} />
              Lưu vận chuyển &amp; ghi chú
            </button>
          </div>
        </form>

        <Table
          columns={['Sản phẩm', 'Lô FEFO', 'Đơn giá', 'SL', 'Thành tiền']}
          rows={items}
        >
          {items.map((p, i) => {
            const pAllocs = allocsByProduct.get(p.productId) || [];
            return (
              <tr key={p.id || i}>
                <td>
                  <strong>{p.name || p.productName}</strong>
                  <small>
                    {p.unit}
                    {p.prescriptionRequired ? ' · Thuốc kê đơn' : ''}
                  </small>
                </td>
                <td>
                  {pAllocs.length ? (
                    pAllocs.map((a) => (
                      <div key={a.id} className="adm-ord-batch-line">
                        <code>{a.batchNumber}</code> · {a.quantity} · HSD {fmtDate(a.expiresAt)}
                      </div>
                    ))
                  ) : (
                    <span className="adm-muted-text">—</span>
                  )}
                </td>
                <td>{money(p.price)}</td>
                <td>{p.quantity}</td>
                <td className="adm-amount">{money(p.price * p.quantity)}</td>
              </tr>
            );
          })}
        </Table>

        <div className="adm-order-totals">
          <div>
            <span>Tiền hàng ({item.itemCount || items.length} SP)</span>
            <span>{money(item.subtotal)}</span>
          </div>
          <div>
            <span>Phí giao hàng</span>
            <span>{money(item.shippingFee)}</span>
          </div>
          <div>
            <span>
              Giảm giá{item.promotionCode ? ` (${item.promotionCode})` : ''}
            </span>
            <span>−{money(item.discount)}</span>
          </div>
          <div className="total">
            <strong>Tổng thanh toán</strong>
            <strong>{money(item.total)}</strong>
          </div>
        </div>

        {item.paymentMethod === 'bank_transfer' && item.status === 'pending_payment' && (
          <form className="adm-ord-bank-box" onSubmit={onBankReconcile}>
            <h3>Đối soát chuyển khoản VietQR</h3>
            <div className="adm-form-grid">
              <label className="adm-field">
                <span>
                  Mã giao dịch trên sao kê <i>*</i>
                </span>
                <input
                  name="bankReference"
                  value={form.bankReference || ''}
                  onChange={change}
                  required
                  minLength={6}
                  placeholder="VD: FT26323001928"
                />
              </label>
              <label className="adm-field">
                <span>
                  Số tiền đã nhận (đ) <i>*</i>
                </span>
                <input
                  type="number"
                  name="bankAmount"
                  value={form.bankAmount ?? item.total}
                  onChange={change}
                  required
                />
              </label>
            </div>
            <label className="adm-check">
              <input
                type="checkbox"
                name="bankConfirmed"
                checked={!!form.bankConfirmed}
                onChange={change}
              />
              <span>Đã kiểm tra sao kê ngân hàng khớp nội dung ANTAM{item.id}</span>
            </label>
            <button className="adm-btn primary" disabled={saving}>
              Xác nhận đã nhận tiền
            </button>
          </form>
        )}

        {(ORDER_NEXT[item.status] || []).length > 0 && (
          <form onSubmit={onSubmitStatus}>
            <div className="adm-order-update">
              <label className="adm-field">
                <span>Chuyển trạng thái</span>
                <select
                  name="nextStatus"
                  value={form.nextStatus || ''}
                  onChange={change}
                  required
                >
                  <option value="">Chọn trạng thái tiếp theo</option>
                  {ORDER_NEXT[item.status].map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
              </label>

              {form.nextStatus === 'delivered' && item.paymentMethod === 'cod' && (
                <label className="adm-check">
                  <input
                    type="checkbox"
                    name="collected"
                    checked={!!form.collected}
                    onChange={change}
                  />
                  <span>Đã thu đủ tiền COD ({money(item.total)})</span>
                </label>
              )}

              {form.nextStatus === 'shipping' && (
                <>
                  <label className="adm-field">
                    <span>Đơn vị vận chuyển</span>
                    <input
                      name="shippingCarrier"
                      list="adm-carrier-list"
                      value={form.shippingCarrier ?? item.shippingCarrier ?? ''}
                      onChange={change}
                      placeholder="VD: Nội bộ An Tâm"
                    />
                  </label>
                  <label className="adm-field">
                    <span>Mã vận đơn</span>
                    <input
                      name="trackingCode"
                      value={form.trackingCode ?? item.trackingCode ?? ''}
                      onChange={change}
                      placeholder="VD: AT-VD-..."
                    />
                  </label>
                </>
              )}

              {form.nextStatus && (
                <label className="adm-field">
                  <span>
                    {form.nextStatus === 'delivery_failed'
                      ? 'Lý do giao thất bại *'
                      : 'Ghi chú xử lý'}
                  </span>
                  <input
                    name="statusNote"
                    value={form.statusNote || ''}
                    onChange={change}
                    minLength={form.nextStatus === 'delivery_failed' ? 5 : undefined}
                    required={form.nextStatus === 'delivery_failed'}
                    placeholder={
                      form.nextStatus === 'delivery_failed'
                        ? 'Nhập lý do tối thiểu 5 ký tự...'
                        : 'Ghi chú thêm (không bắt buộc)'
                    }
                  />
                </label>
              )}

              <button
                className="adm-btn primary"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <LoaderCircle className="adm-spin" size={16} />
                ) : (
                  <Check size={16} />
                )}
                Cập nhật đơn hàng
              </button>
            </div>
          </form>
        )}

        {(canRecordCancel || canRecordReturn) && (
          <div className="adm-ord-assist-bar">
            {canRecordCancel && (
              <button
                type="button"
                className="adm-btn small"
                onClick={() =>
                  setRecordingRequest((cur) => (cur === 'cancel' ? null : 'cancel'))
                }
              >
                <Ban size={14} />
                Ghi nhận khách hủy đơn
              </button>
            )}
            {canRecordReturn && (
              <button
                type="button"
                className="adm-btn small"
                onClick={() =>
                  setRecordingRequest((cur) => (cur === 'return' ? null : 'return'))
                }
              >
                <RotateCcw size={14} />
                Ghi nhận đổi trả tại quầy
              </button>
            )}
          </div>
        )}

        {recordingRequest && (
          <form className="adm-ord-record-box" onSubmit={submitAdminRequest}>
            <h4>
              {recordingRequest === 'cancel'
                ? 'Ghi nhận yêu cầu hủy đơn'
                : 'Ghi nhận đổi trả sản phẩm'}
            </h4>
            <label className="adm-field">
              <span>
                Lý do <i>*</i>
              </span>
              <textarea
                rows="2"
                required
                minLength={5}
                value={reqDraft.reason}
                onChange={(e) => setReqDraft((d) => ({ ...d, reason: e.target.value }))}
                placeholder="Nhập lý do tối thiểu 5 ký tự..."
              />
            </label>
            {recordingRequest === 'return' && (
              <div className="adm-ord-return-checks">
                <label className="adm-check">
                  <input
                    type="checkbox"
                    checked={reqDraft.sealed}
                    onChange={(e) => setReqDraft((d) => ({ ...d, sealed: e.target.checked }))}
                  />
                  <span>Thuốc còn nguyên niêm phong và bảo quản đúng</span>
                </label>
                <label className="adm-check">
                  <input
                    type="checkbox"
                    checked={reqDraft.storeFault}
                    onChange={(e) => setReqDraft((d) => ({ ...d, storeFault: e.target.checked }))}
                  />
                  <span>Đổi trả do lỗi từ phía nhà thuốc</span>
                </label>
                <label className="adm-check">
                  <input
                    type="checkbox"
                    checked={reqDraft.restock}
                    onChange={(e) => setReqDraft((d) => ({ ...d, restock: e.target.checked }))}
                  />
                  <span>Nhập lại hàng vào kho (yêu cầu còn niêm phong)</span>
                </label>
              </div>
            )}
            <div className="adm-ord-fulfill-actions">
              <button
                type="button"
                className="adm-btn small"
                onClick={() => setRecordingRequest(null)}
              >
                Hủy
              </button>
              <button type="submit" className="adm-btn small primary" disabled={saving}>
                Xác nhận ghi nhận
              </button>
            </div>
          </form>
        )}

        <div className="adm-ord-subtabs">
          <button
            type="button"
            className={detailTab === 'history' ? 'active' : ''}
            onClick={() => setDetailTab('history')}
          >
            <History size={14} />
            Lịch sử xử lý ({history.length})
          </button>
          <button
            type="button"
            className={detailTab === 'transactions' ? 'active' : ''}
            onClick={() => setDetailTab('transactions')}
          >
            <Wallet size={14} />
            Giao dịch ({transactions.length})
          </button>
          <button
            type="button"
            className={detailTab === 'requests' ? 'active' : ''}
            onClick={() => setDetailTab('requests')}
          >
            <AlertTriangle size={14} />
            Yêu cầu hủy/hoàn ({requests.length})
          </button>
        </div>

        {detailTab === 'history' && (
          <div className="adm-ord-timeline">
            {history.length ? (
              history.map((h) => (
                <div key={h.id} className="adm-ord-timeline-item">
                  <Badge value={h.status} />
                  <div>
                    <strong>{h.note || label(h.status)}</strong>
                    <small>
                      {dateTime(h.createdAt)} · {h.userName || 'Hệ thống'}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="adm-muted-text">Chưa có lịch sử trạng thái.</p>
            )}
          </div>
        )}

        {detailTab === 'transactions' && (
          <Table
            columns={['Mã tham chiếu', 'Loại', 'Kênh', 'Số tiền', 'Trạng thái', 'Thời gian']}
            rows={transactions}
            empty="Chưa phát sinh giao dịch thanh toán"
          >
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>
                  <code>{t.reference}</code>
                  {t.providerReference && <small>Ref: {t.providerReference}</small>}
                </td>
                <td>{t.type === 'refund' ? 'Hoàn tiền' : 'Thanh toán'}</td>
                <td>{paymentShortLabel(t.provider)}</td>
                <td className="adm-amount">{money(t.amount)}</td>
                <td>
                  <Badge value={t.status === 'success' ? 'paid' : t.status} />
                </td>
                <td>{dateTime(t.createdAt)}</td>
              </tr>
            ))}
          </Table>
        )}

        {detailTab === 'requests' && (
          <div className="adm-order-requests">
            {requests.length ? (
              requests.map((r) => {
                const waitingGoods =
                  r.type === 'return' &&
                  ['awaiting', 'in_transit'].includes(r.returnGoodsStatus);
                const canProcess =
                  r.status === 'pending' ||
                  (!waitingGoods &&
                    r.status === 'approved' &&
                    ['paid', 'refund_pending'].includes(item.paymentStatus) &&
                    ['cancelled', 'returned'].includes(item.status) &&
                    !r.refundAmount);
                return (
                  <div key={r.id}>
                    <div>
                      <p>
                        <strong>{label(r.type)}</strong> — {r.reason}
                      </p>
                      <small>
                        {dateTime(r.createdAt)}
                        {r.handlerName ? ` · Xử lý: ${r.handlerName}` : ''}
                        {r.reply ? ` · ${r.reply}` : ''}
                        {r.refundAmount > 0 ? ` · Đã hoàn ${money(r.refundAmount)}` : ''}
                      </small>
                    </div>
                    <div className="adm-ord-req-right">
                      <Badge value={r.status} />
                      {r.returnGoodsStatus && (
                        <Badge value={`return_${r.returnGoodsStatus}`} />
                      )}
                      {canProcess && (
                        <button
                          type="button"
                          className="adm-btn small primary"
                          onClick={() =>
                            onOpenRequest({
                              ...r,
                              orderId: item.id,
                              orderCode: item.code,
                              orderStatus: item.status,
                              paymentStatus: item.paymentStatus,
                              paymentMethod: item.paymentMethod,
                              total: item.total,
                              userName: item.userName,
                            })
                          }
                        >
                          {r.status === 'pending' ? 'Xử lý' : 'Hoàn tiền'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="adm-muted-text">Đơn hàng chưa có yêu cầu hủy hoặc đổi trả.</p>
            )}
          </div>
        )}
      </div>

      <div className="adm-modal-footer">
        <button type="button" className="adm-btn" onClick={onClose}>
          Đóng chi tiết
        </button>
      </div>
    </>
  );
}

export function CreateOrderContent({ config, onClose, onCreated, notify }) {
  const [lookup, setLookup] = useState(null);
  const [loadingLookup, setLoadingLookup] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState('');
  const [addressId, setAddressId] = useState('');
  const [address, setAddress] = useState({
    recipient: '',
    phone: '',
    line1: '',
    ward: '',
    district: '',
    city: '',
  });
  const [productQuery, setProductQuery] = useState('');
  const [items, setItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [promoCode, setPromoCode] = useState('');
  const [promoPreview, setPromoPreview] = useState(null);
  const [note, setNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [autoConfirm, setAutoConfirm] = useState(true);

  useEffect(() => {
    api('/admin/orders/lookup')
      .then((res) => {
        setLookup(res);
        const firstCustomer = res.customers?.[0];
        if (firstCustomer) {
          setUserId(String(firstCustomer.id));
          const defAddr = firstCustomer.addresses?.[0];
          if (defAddr) {
            setAddressId(String(defAddr.id));
            setAddress({
              recipient: defAddr.recipient || '',
              phone: defAddr.phone || '',
              line1: defAddr.line1 || '',
              ward: defAddr.ward || '',
              district: defAddr.district || '',
              city: defAddr.city || '',
            });
          } else {
            setAddress((a) => ({
              ...a,
              recipient: firstCustomer.name || '',
              phone: firstCustomer.phone || '',
            }));
          }
        }
      })
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoadingLookup(false));
  }, []);

  const selectedCustomer = lookup?.customers?.find((c) => String(c.id) === userId);
  const selectCustomer = (nextId) => {
    setUserId(nextId);
    const cust = lookup?.customers?.find((c) => String(c.id) === nextId);
    const defAddr = cust?.addresses?.[0];
    if (defAddr) {
      setAddressId(String(defAddr.id));
      setAddress({
        recipient: defAddr.recipient || '',
        phone: defAddr.phone || '',
        line1: defAddr.line1 || '',
        ward: defAddr.ward || '',
        district: defAddr.district || '',
        city: defAddr.city || '',
      });
    } else {
      setAddressId('');
      setAddress({
        recipient: cust?.name || '',
        phone: cust?.phone || '',
        line1: '',
        ward: '',
        district: '',
        city: '',
      });
    }
  };

  const selectSavedAddress = (nextAddrId) => {
    setAddressId(nextAddrId);
    const found = selectedCustomer?.addresses?.find((a) => String(a.id) === nextAddrId);
    if (found) {
      setAddress({
        recipient: found.recipient || '',
        phone: found.phone || '',
        line1: found.line1 || '',
        ward: found.ward || '',
        district: found.district || '',
        city: found.city || '',
      });
    }
  };

  const filteredProducts = (lookup?.products || [])
    .filter((p) => !productQuery || searchScore(`${p.name} ${p.ingredient}`, productQuery) > 0)
    .slice(0, 8);

  const addItem = (product) => {
    setItems((prev) => {
      const existing = prev.find((x) => x.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((x) =>
          x.productId === product.id ? { ...x, quantity: x.quantity + 1 } : x,
        );
      }
      return [...prev, { productId: product.id, product, quantity: 1 }];
    });
    setPromoPreview(null);
  };

  const subtotal = items.reduce((sum, x) => sum + x.product.price * x.quantity, 0);
  const freeThreshold = Number(lookup?.settings?.freeShippingThreshold || 299000);
  const shippingFee =
    items.length === 0 ? 0 : subtotal >= freeThreshold ? 0 : Number(lookup?.settings?.shippingFee || 25000);
  const discount = promoPreview?.discount || 0;
  const total = Math.max(0, subtotal + shippingFee - discount);

  const checkPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      const res = await api('/promotions/validate', {
        method: 'POST',
        body: { code: promoCode.trim(), subtotal },
      });
      setPromoPreview(res);
      notify(`Áp dụng mã ${res.code}: giảm ${money(res.discount)}.`);
    } catch (err) {
      setPromoPreview(null);
      notify(err.message, 'error');
    }
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    if (!items.length) {
      notify('Vui lòng thêm ít nhất 1 sản phẩm vào đơn.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const created = await api('/admin/orders', {
        method: 'POST',
        body: {
          userId: Number(userId),
          ...(addressId ? { addressId: Number(addressId) } : { address }),
          items: items.map((x) => ({ productId: x.productId, quantity: x.quantity })),
          paymentMethod,
          promotionCode: promoCode.trim() || undefined,
          note,
          internalNote,
          autoConfirm: paymentMethod === 'cod' && autoConfirm,
        },
      });
      notify(`Đã tạo đơn hàng ${created.code} thành công.`);
      await onCreated(created);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingLookup) {
    return (
      <div className="adm-modal-body">
        <div className="adm-loading">
          <LoaderCircle size={26} className="adm-spin" />
          <p>Đang tải danh sách khách hàng và sản phẩm...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submitOrder}>
      <div className="adm-modal-body adm-ord-create-body">
        <div className="adm-info-banner compact">
          <Package size={18} />
          <p>
            Đơn tạo hộ hỗ trợ sản phẩm không kê đơn còn tồn kho. Giá bán, khuyến
            mãi và phân bổ lô FEFO do máy chủ tự động tính.
          </p>
        </div>

        <div className="adm-form-grid">
          <label className="adm-field">
            <span>
              Khách hàng <i>*</i>
            </span>
            <select
              value={userId}
              onChange={(e) => selectCustomer(e.target.value)}
              required
            >
              <option value="">Chọn khách hàng</option>
              {(lookup?.customers || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || c.email})
                </option>
              ))}
            </select>
          </label>

          <label className="adm-field">
            <span>Địa chỉ đã lưu</span>
            <select
              value={addressId}
              onChange={(e) => selectSavedAddress(e.target.value)}
            >
              <option value="">Nhập địa chỉ mới</option>
              {(selectedCustomer?.addresses || []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.recipient} · {a.line1}, {a.city}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!addressId && (
          <div className="adm-form-grid" style={{ marginTop: 12 }}>
            <label className="adm-field">
              <span>Người nhận *</span>
              <input
                required
                value={address.recipient}
                onChange={(e) => setAddress((a) => ({ ...a, recipient: e.target.value }))}
              />
            </label>
            <label className="adm-field">
              <span>SĐT nhận hàng *</span>
              <input
                required
                value={address.phone}
                onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))}
              />
            </label>
            <label className="adm-field is-wide">
              <span>Số nhà, tên đường *</span>
              <input
                required
                value={address.line1}
                onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
              />
            </label>
            <label className="adm-field">
              <span>Phường/Xã *</span>
              <input
                required
                value={address.ward}
                onChange={(e) => setAddress((a) => ({ ...a, ward: e.target.value }))}
              />
            </label>
            <label className="adm-field">
              <span>Tỉnh/Thành phố *</span>
              <input
                required
                value={address.city}
                onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
              />
            </label>
          </div>
        )}

        <div className="adm-ord-picker">
          <label className="adm-field">
            <span>Tìm &amp; thêm sản phẩm không kê đơn</span>
            <input
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Gõ tên thuốc, hoạt chất..."
            />
          </label>
          <div className="adm-ord-picker-list">
            {filteredProducts.map((p) => (
              <div key={p.id} className="adm-ord-picker-row">
                <div>
                  <strong>{p.name}</strong>
                  <small>
                    {money(p.price)} / {p.unit} · Tồn: {count(p.stock)}
                  </small>
                </div>
                <button
                  type="button"
                  className="adm-btn small"
                  onClick={() => addItem(p)}
                >
                  <Plus size={13} />
                  Thêm
                </button>
              </div>
            ))}
          </div>
        </div>

        {items.length > 0 && (
          <Table
            columns={['Sản phẩm đã chọn', 'Đơn giá', 'Số lượng', 'Thành tiền', '']}
            rows={items}
          >
            {items.map((row) => (
              <tr key={row.productId}>
                <td>
                  <strong>{row.product.name}</strong>
                  <small>{row.product.unit} · Tồn {row.product.stock}</small>
                </td>
                <td>{money(row.product.price)}</td>
                <td>
                  <input
                    type="number"
                    className="adm-ord-qty-input"
                    min="1"
                    max={row.product.stock}
                    value={row.quantity}
                    onChange={(e) => {
                      const val = Math.max(
                        1,
                        Math.min(row.product.stock, Number(e.target.value) || 1),
                      );
                      setItems((prev) =>
                        prev.map((x) =>
                          x.productId === row.productId ? { ...x, quantity: val } : x,
                        ),
                      );
                      setPromoPreview(null);
                    }}
                  />
                </td>
                <td className="adm-amount">{money(row.product.price * row.quantity)}</td>
                <td>
                  <button
                    type="button"
                    className="adm-icon-btn danger"
                    onClick={() => {
                      setItems((prev) => prev.filter((x) => x.productId !== row.productId));
                      setPromoPreview(null);
                    }}
                    aria-label="Xóa dòng"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}

        <div className="adm-form-grid" style={{ marginTop: 14 }}>
          <label className="adm-field">
            <span>Phương thức thanh toán</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {(config?.paymentMethods || ['cod'])
                .filter((m) => m !== 'vnpay')
                .map((m) => (
                  <option key={m} value={m}>
                    {paymentLabel(m)}
                  </option>
                ))}
            </select>
          </label>

          <div className="adm-field">
            <span>Mã khuyến mãi</span>
            <div className="adm-ord-promo-row">
              <input
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value);
                  setPromoPreview(null);
                }}
                placeholder="VD: KHOEMANH10"
              />
              <button type="button" className="adm-btn small" onClick={checkPromo}>
                Kiểm tra
              </button>
            </div>
          </div>

          <label className="adm-field">
            <span>Ghi chú đơn hàng</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Giao giờ hành chính..."
            />
          </label>

          <label className="adm-field">
            <span>Ghi chú nội bộ</span>
            <input
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Khách đặt qua điện thoại..."
            />
          </label>
        </div>

        {paymentMethod === 'cod' && (
          <label className="adm-check">
            <input
              type="checkbox"
              checked={autoConfirm}
              onChange={(e) => setAutoConfirm(e.target.checked)}
            />
            <span>Xác nhận và xuất kho FEFO ngay sau khi tạo đơn COD</span>
          </label>
        )}

        <div className="adm-order-totals">
          <div>
            <span>Tạm tính</span>
            <span>{money(subtotal)}</span>
          </div>
          <div>
            <span>Phí giao hàng</span>
            <span>{money(shippingFee)}</span>
          </div>
          <div>
            <span>Giảm giá</span>
            <span>−{money(discount)}</span>
          </div>
          <div className="total">
            <strong>Tổng thanh toán</strong>
            <strong>{money(total)}</strong>
          </div>
        </div>
      </div>

      <div className="adm-modal-footer">
        <button type="button" className="adm-btn" onClick={onClose}>
          Đóng
        </button>
        <button
          type="submit"
          className="adm-btn primary"
          disabled={submitting || !items.length}
        >
          {submitting ? (
            <LoaderCircle size={16} className="adm-spin" />
          ) : (
            <CheckCircle2 size={16} />
          )}
          Tạo đơn hàng
        </button>
      </div>
    </form>
  );
}
