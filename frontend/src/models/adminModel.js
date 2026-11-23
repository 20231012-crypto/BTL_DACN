/**
 * Admin Model: admin API calls, order workflows, filters, permissions, and print-slip formatting.
 */
import { api } from './httpClient.js';
import {
  ACTIVE_QUEUE_STATUSES,
  DEFAULT_ROLE_PERMISSIONS,
  ORDER_STATES,
  SUPPORT_CLOSING_NOTE,
  adminLabel,
} from './constants.js';
import {
  dateTime,
  fmtDate,
  list,
  money,
  paymentLabel,
  safeJson,
  searchScore,
  vnDate,
  vnDay,
} from './formatters.js';

export const fetchAdminDashboardOverview = (days = 7) =>
  api(`/admin/dashboard?days=${days}`);

export async function fetchAdminViewData(view, tab, range, dashDays) {
  if (view === 'orders') {
    const [ordersRes, reqRes, returnsRes] = await Promise.all([
      api('/admin/orders'),
      api('/admin/requests'),
      api('/admin/return-goods'),
    ]);
    return {
      result: ordersRes,
      orderRequests: list(reqRes),
      returnGoods: list(returnsRes),
    };
  }
  if (view === 'catalog') {
    return { result: await api(`/admin/${tab}`) };
  }
  if (view === 'chatbot') {
    const endpoint =
      tab === 'knowledge'
        ? 'knowledge'
        : tab === 'rules'
          ? 'safety-rules'
          : 'support';
    return { result: await api(`/admin/${endpoint}`) };
  }
  if (view === 'reports') {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(range).filter(([, v]) => v)),
    );
    return { result: await api(`/admin/reports?${qs}`) };
  }
  if (view === 'dashboard') {
    return { result: await api(`/admin/dashboard?days=${dashDays}`) };
  }
  return { result: await api(`/admin/${view}`) };
}

export async function fetchAdminProductsAndPartners(canCatalog) {
  const safeGet = (path) => api(path).catch(() => []);
  const [p, c, s, m] = await Promise.all([
    safeGet('/admin/products'),
    canCatalog ? safeGet('/admin/categories') : Promise.resolve([]),
    safeGet('/admin/suppliers'),
    canCatalog ? safeGet('/admin/manufacturers') : Promise.resolve([]),
  ]);
  return {
    products: list(p),
    categories: list(c),
    suppliers: list(s),
    manufacturers: list(m),
  };
}

export const fetchAdminOrderDetails = (id) => api(`/admin/orders/${id}`);

export const fetchAdminPrescriptions = async () =>
  list(await api('/admin/prescriptions'));

export const fetchAdminSupportMessages = async (id, after = 0) => {
  const data = await api(`/admin/support/${id}/messages?after=${after}`);
  return list(data);
};

export const fetchAdminOrderLookup = () => api('/admin/orders/lookup');

export const saveAdminResource = (path, method = 'POST', body) =>
  api(path, { method, body });

export const toggleResourceActive = (resource, id, active) =>
  api(`/admin/${resource}/${id}`, { method: 'PATCH', body: { active } });

export const inviteAdminUser = (payload) =>
  api('/admin/users', { method: 'POST', body: payload });

export const createAdminBackup = (passphrase) =>
  api('/admin/backup', { method: 'POST', body: { passphrase } });

export const restoreAdminBackup = ({ confirm, backup, passphrase }) =>
  api('/admin/backup/restore', {
    method: 'POST',
    body: { confirm, backup, passphrase },
  });

export const updateOrderFulfillment = (orderId, payload) =>
  api(`/admin/orders/${orderId}/fulfillment`, { method: 'PATCH', body: payload });

export const expireSingleOrder = (orderId) =>
  api(`/admin/orders/${orderId}/expire`, { method: 'POST', body: {} });

export const createAdminOrderRequest = (orderId, payload) =>
  api(`/admin/orders/${orderId}/requests`, { method: 'POST', body: payload });

export const updateAdminOrderStatus = (orderId, status) =>
  api(`/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    body: { status },
  });

export const bulkUpdateOrderStatus = (orderIds, status, note) =>
  api('/admin/orders/bulk-status', {
    method: 'POST',
    body: { orderIds, status, ...(note ? { note } : {}) },
  });

export const expireOverdueOrders = () =>
  api('/admin/orders/expire-overdue', { method: 'POST', body: {} });

export const createAdminAssistedOrder = (payload) =>
  api('/admin/orders', { method: 'POST', body: payload });

export const sendSupportReply = (supportId, message) =>
  api(`/admin/support/${supportId}/messages`, {
    method: 'POST',
    body: { message },
  });

export const resolveSupportTicket = (supportId, reply) =>
  api(`/admin/support/${supportId}`, {
    method: 'PATCH',
    body: { status: 'resolved', reply: reply || SUPPORT_CLOSING_NOTE },
  });

export const buildDefaultRolePermissions = (roleVal, titleVal) => {
  const presetKey =
    roleVal === 'admin'
      ? 'admin'
      : roleVal === 'staff'
        ? titleVal || 'sales'
        : 'customer';
  return [...(DEFAULT_ROLE_PERMISSIONS[presetKey] || [])];
};

export function prepareModalForm(type, item = {}, extraForm = {}) {
  const prepared = { ...item, ...extraForm };
  for (const k of ['startDate', 'endDate', 'manufacturedAt', 'expiresAt']) {
    if (prepared[k]) prepared[k] = String(prepared[k]).slice(0, 10);
  }
  if (Array.isArray(prepared.keywords)) {
    prepared.keywords = prepared.keywords.join(', ');
  }
  if (type === 'order' && prepared.bankAmount === undefined && item.total) {
    prepared.bankAmount = item.total;
  }
  if (type === 'prescription') {
    prepared.productIds = Array.isArray(item.approvedProductIds)
      ? [...item.approvedProductIds]
      : [];
  }
  return prepared;
}

export const isOrderOverdue = (o) =>
  o?.status === 'pending_payment' &&
  o?.paymentStatus !== 'paid' &&
  o?.paymentDeadline &&
  Date.parse(o.paymentDeadline) < Date.now();

export const hasActionableRequest = (o) =>
  (o?.requests || []).some(
    (r) =>
      r.status === 'pending' ||
      (r.status === 'approved' &&
        o.paymentStatus === 'refund_pending' &&
        !r.refundAmount),
  );

export function getQuickNextAction(order, canReviewRx) {
  if (!order) return null;
  if (
    order.status === 'pending_prescription' &&
    canReviewRx &&
    order.prescriptionId
  )
    return { kind: 'rx', label: 'Duyệt đơn' };
  if (
    order.status === 'pending_payment' &&
    order.paymentMethod === 'bank_transfer'
  )
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

export function stepperIndex(status) {
  if (['pending_prescription', 'pending_payment', 'pending'].includes(status))
    return 0;
  if (status === 'confirmed') return 1;
  if (status === 'packing') return 2;
  if (status === 'shipping' || status === 'delivery_failed') return 3;
  if (status === 'delivered' || status === 'returned') return 4;
  return 0;
}

export function computeAdminOrdersMetrics(
  ordersList,
  requestsList,
  returnGoodsList,
) {
  const statusCounts = {};
  for (const s of ORDER_STATES) statusCounts[s] = 0;
  for (const o of ordersList)
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

  const queueOrders = ordersList.filter(
    (o) =>
      ACTIVE_QUEUE_STATUSES.has(o.status) ||
      o.paymentStatus === 'refund_pending' ||
      hasActionableRequest(o),
  );
  const overdueOrders = ordersList.filter(isOrderOverdue);
  const pendingReqOnly = requestsList.filter(
    (r) => r.status === 'pending',
  ).length;
  const refundPendingOrdersCount = ordersList.filter(
    (o) => o.paymentStatus === 'refund_pending',
  ).length;
  const actionableRequestsBadge = requestsList.filter(
    (r) =>
      r.status === 'pending' ||
      (!(
        r.type === 'return' &&
        ['awaiting', 'in_transit'].includes(r.returnGoodsStatus)
      ) &&
        r.status === 'approved' &&
        ['paid', 'refund_pending'].includes(r.paymentStatus) &&
        ['cancelled', 'returned'].includes(r.orderStatus) &&
        !r.refundAmount),
  ).length;
  const activeReturnsCount = returnGoodsList.filter((g) =>
    ['awaiting', 'in_transit', 'received'].includes(g.status),
  ).length;
  const deliveredRevenue = ordersList
    .filter((o) => o.status === 'delivered' && o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);
  const inProgressCount =
    (statusCounts.confirmed || 0) +
    (statusCounts.packing || 0) +
    (statusCounts.shipping || 0);

  return {
    statusCounts,
    queueOrders,
    overdueOrders,
    pendingReqOnly,
    refundPendingOrdersCount,
    actionableRequestsBadge,
    activeReturnsCount,
    deliveredRevenue,
    inProgressCount,
  };
}

export function filterAdminOrders(
  baseOrders,
  { filter, payMethod, payStatus, rxFilter, dateRange, query, sortBy },
) {
  return baseOrders
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
      if (sortBy === 'total_desc')
        return Number(b.total || 0) - Number(a.total || 0);
      if (sortBy === 'total_asc')
        return Number(a.total || 0) - Number(b.total || 0);
      return Number(b.id) - Number(a.id);
    });
}

export function filterAdminRequests(
  requestsList,
  { filter, reqTypeFilter, query },
) {
  return requestsList.filter((r) => {
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
}

export function filterAdminReturns(returnGoodsList, { filter, query }) {
  return returnGoodsList.filter((g) => {
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
}

export const buildAdminOrdersExportUrl = ({
  filter,
  payMethod,
  payStatus,
  rxFilter,
  dateRange,
  query,
}) =>
  `/api/admin/orders/export?${new URLSearchParams(
    Object.fromEntries(
      Object.entries({
        status: filter,
        paymentMethod: payMethod,
        paymentStatus: payStatus,
        prescription:
          rxFilter === 'rx' ? 'true' : rxFilter === 'otc' ? 'false' : '',
        from: dateRange.from,
        to: dateRange.to,
        search: query,
      }).filter(([, v]) => v),
    ),
  )}`;

export const buildReportsExportUrl = (from, to) =>
  `/api/admin/reports/export?${new URLSearchParams(
    Object.fromEntries(
      Object.entries({ from, to }).filter(([, v]) => v),
    ),
  )}`;

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export function printOrderSlip(order) {
  const addr = safeJson(order?.address, {});
  const items = safeJson(order?.items, []);
  const allocsByProduct = new Map();
  for (const alloc of order?.allocations || []) {
    const arr = allocsByProduct.get(alloc.productId) || [];
    arr.push(
      `${alloc.batchNumber} (${alloc.quantity}) · HSD ${fmtDate(alloc.expiresAt)}`,
    );
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
      const batches =
        allocsByProduct.get(item.productId)?.join('<br/>') || 'Chưa xuất lô';
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
      <div>Trạng thái: <strong>${escapeHtml(adminLabel(order.status))}</strong></div>
      <div>Thanh toán: ${escapeHtml(paymentLabel(order.paymentMethod))} (${escapeHtml(adminLabel(order.paymentStatus))})</div>
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

export const triggerBackupDownload = (backup) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup)], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `antam-backup-${vnDate(0)}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
