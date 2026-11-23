/**
 * Admin Dashboard Overview View.
 */
import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CreditCard,
  MessageSquare,
  Pill,
  ShieldCheck,
  ShoppingBag,
  TicketPercent,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import {
  AUDIT_LABELS,
  DASHBOARD_PERIOD_OPTIONS,
} from '../../models/constants.js';
import {
  count,
  dateTime,
  deltaInfo,
  fmtDate,
  list,
  money,
  paymentLabel,
  shortDate,
  vnDate,
} from '../../models/formatters.js';
import { Badge, Empty, ReportChart, Table } from './adminUi.jsx';

const periodText = (days) =>
  days === 1 ? 'hôm nay' : `${days || 7} ngày`;

export default function AdminDashboardView({
  data,
  dashDays,
  refreshing,
  onChangeDays,
  onNavigate,
  orderTable,
  hasPermission,
  isAdmin,
}) {
  const days = data?.days || dashDays || 7;
  const periodLabel = periodText(days);
  const allTime = data?.allTime || {};
  const pipeline = data?.pipeline || { activeOrders: 0, stages: [] };
  const queues = data?.queues || {};
  const catalog = data?.catalog || {};
  const ops = data?.opsSettings || {};
  const stageMap = Object.fromEntries(
    list(pipeline.stages).map((s) => [s.status, s]),
  );
  const stageOf = (status) => stageMap[status] || { count: 0, amount: 0 };

  const canOrders = hasPermission('orders');
  const canPrescriptions = hasPermission('prescriptions');
  const canInventory = hasPermission('inventory');
  const canProducts = hasPermission('catalog');
  const canPromotions = hasPermission('promotions');
  const canSupport = hasPermission('support');
  const canKnowledge = hasPermission('knowledge') || canPrescriptions;
  const canUsers = isAdmin && hasPermission('users');
  const canAudit = isAdmin && hasPermission('audit');

  const revDelta = deltaInfo(data?.revenue, data?.previous?.revenue);
  const ordDelta = deltaInfo(data?.orderCount, data?.previous?.orderCount);

  const pendingReqCount = Number(queues.pendingRequests?.total || 0);
  const refundPendingCount = Number(queues.refundPendingOrders || 0);
  const immediateOrderActions =
    Number(queues.pendingPrescriptions || 0) +
    Number(queues.waitingPaymentOrders || 0) +
    Number(queues.waitingConfirmOrders || 0) +
    Number(queues.deliveryFailedOrders || 0);
  const totalInvAlerts =
    Number(queues.expiredBatches || 0) +
    Number(queues.expiringBatches || 0) +
    Number(queues.lowStockProducts || 0);

  const kpiCards = [
    {
      title: `Doanh thu thuần (${periodLabel})`,
      value: money(data?.revenue),
      Icon: Wallet,
      tone: 'tone-0',
      badge: revDelta.text,
      badgeTone: revDelta.tone,
      dir: revDelta.dir,
      sub: `Lũy kế hệ thống: ${money(allTime.revenue)} · ${count(data?.completedOrders)}/${count(data?.orderCount)} đơn giao xong${Number(data?.refundTotal) > 0 ? ` · Hoàn -${money(data.refundTotal)}` : ''}`,
    },
    {
      title: `Đơn phát sinh (${periodLabel})`,
      value: count(data?.orderCount),
      Icon: ShoppingBag,
      tone: 'tone-1',
      badge: ordDelta.text,
      badgeTone: ordDelta.tone,
      dir: ordDelta.dir,
      sub: `Tổng toàn hệ thống: ${count(allTime.orderCount)} đơn · Hoàn tất ${Number(data?.completionRate || 0).toFixed(1)}% · TB ${money(data?.averageOrder)}/đơn`,
    },
    {
      title: 'Đơn đang vận hành (Hiện tại)',
      value: count(pipeline.activeOrders),
      Icon: Truck,
      tone: 'tone-2',
      badge:
        Number(queues.deliveryFailedOrders || 0) > 0
          ? `${count(queues.deliveryFailedOrders)} đơn giao thất bại`
          : immediateOrderActions > 0
            ? `${count(immediateOrderActions)} đơn chờ duyệt / xác nhận`
            : Number(pipeline.activeOrders || 0) > 0
              ? `${count(pipeline.activeOrders)} đơn đang xử lý giao`
              : 'Không có đơn tồn đọng',
      badgeTone:
        Number(queues.deliveryFailedOrders || 0) > 0
          ? 'down'
          : immediateOrderActions > 0
            ? 'warn'
            : Number(pipeline.activeOrders || 0) > 0
              ? 'flat'
              : 'up',
      dir: 'flat',
      sub: `Giá trị luân chuyển ${money(allTime.inFlightAmount)} · Trả trước ${money(allTime.prepaidInFlightAmount)} · COD chờ thu ${money(allTime.codPendingAmount)}`,
    },
    {
      title: 'Tồn kho khả dụng (Hiện tại)',
      value: count(data?.inventory?.sellable),
      Icon: Boxes,
      tone: 'tone-3',
      badge:
        Number(queues.expiredBatches || 0) > 0 ||
        Number(queues.outOfStockProducts || 0) > 0
          ? `${count(totalInvAlerts)} cảnh báo cần xử lý`
          : totalInvAlerts > 0
            ? `${count(totalInvAlerts)} cảnh báo kho`
            : 'Kho đạt chuẩn an toàn',
      badgeTone:
        Number(queues.expiredBatches || 0) > 0 ||
        Number(queues.outOfStockProducts || 0) > 0
          ? 'down'
          : totalInvAlerts > 0
            ? 'warn'
            : 'up',
      dir: 'flat',
      sub: `${count(queues.expiredBatches)} lô hết hạn · ${count(queues.expiringBatches)} sắp hết hạn · ${count(queues.outOfStockProducts)} SP hết hàng · Giữ ${count(data?.inventory?.reserved)}`,
    },
  ];

  const miniStats = [
    {
      label: 'Khách hàng hoạt động',
      value: count(catalog.activeCustomers ?? data?.customerCount),
      note:
        Number(queues.pendingPrescriptions || 0) > 0
          ? `${count(queues.pendingPrescriptions)} đơn thuốc chờ duyệt`
          : 'Tài khoản khách hàng đang mở',
      Icon: Users,
      tone: 'teal',
      onClick: canUsers
        ? () => onNavigate('users', { filter: 'customer' })
        : undefined,
    },
    {
      label: 'Sản phẩm đang bán',
      value: count(catalog.activeProducts),
      note: `${count(catalog.rxProducts)} kê đơn · ${count(catalog.otcProducts)} không kê đơn${Number(catalog.hiddenProducts) > 0 ? ` · ${count(catalog.hiddenProducts)} ẩn` : ''}`,
      Icon: Pill,
      tone: 'blue',
      onClick: canProducts ? () => onNavigate('products') : undefined,
    },
    {
      label: 'Khuyến mãi đang chạy',
      value: count(catalog.activePromotions),
      note: 'Còn hiệu lực & còn lượt áp dụng',
      Icon: TicketPercent,
      tone: 'amber',
      onClick: canPromotions ? () => onNavigate('promotions') : undefined,
    },
    {
      label: `Chatbot & Tư vấn (${periodLabel})`,
      value: `${count(data?.chatCount)} phiên`,
      note: `${count(data?.handoffCount)} chuyển dược sĩ · ${count(queues.openSupport)} đang chờ xử lý`,
      Icon: MessageSquare,
      tone: 'purple',
      onClick: canSupport
        ? () => onNavigate('chatbot', { tab: 'support' })
        : undefined,
    },
  ];

  const pipelineSteps = [
    {
      step: '01',
      title: 'Duyệt đơn thuốc',
      count: stageOf('pending_prescription').count,
      amount: stageOf('pending_prescription').amount,
      note:
        Number(queues.pendingPrescriptions || 0) > 0
          ? `${count(queues.pendingPrescriptions)} chờ dược sĩ duyệt`
          : Number(queues.customerActionPrescriptions || 0) > 0
            ? `${count(queues.customerActionPrescriptions)} chờ khách bổ sung`
            : 'Chưa có đơn kê đơn chờ',
      tone: Number(queues.pendingPrescriptions || 0) > 0 ? 'warn' : 'idle',
      onClick: canPrescriptions
        ? () => onNavigate('prescriptions', { filter: 'pending' })
        : canOrders
          ? () => onNavigate('orders', { filter: 'pending_prescription' })
          : undefined,
    },
    {
      step: '02',
      title: 'Chờ thanh toán',
      count: stageOf('pending_payment').count,
      amount: stageOf('pending_payment').amount,
      note:
        Number(queues.waitingBankTransfers || 0) > 0
          ? `${count(queues.waitingBankTransfers)} chờ đối soát VietQR`
          : `Hạn ${ops.paymentTimeoutMinutes || 30} phút trước tự hủy`,
      tone: stageOf('pending_payment').count > 0 ? 'warn' : 'idle',
      onClick: canOrders
        ? () => onNavigate('orders', { filter: 'pending_payment' })
        : undefined,
    },
    {
      step: '03',
      title: 'Chờ xác nhận (FEFO)',
      count: stageOf('pending').count,
      amount: stageOf('pending').amount,
      note:
        stageOf('pending').count > 0
          ? 'Sẵn sàng xác nhận & xuất lô'
          : 'Không có đơn chờ xác nhận',
      tone: stageOf('pending').count > 0 ? 'warn' : 'idle',
      onClick: canOrders
        ? () => onNavigate('orders', { filter: 'pending' })
        : undefined,
    },
    {
      step: '04',
      title: 'Xác nhận & Đóng gói',
      count: stageOf('confirmed').count + stageOf('packing').count,
      amount: stageOf('confirmed').amount + stageOf('packing').amount,
      note: `${count(stageOf('confirmed').count)} đã xác nhận · ${count(stageOf('packing').count)} đang đóng gói`,
      tone:
        stageOf('confirmed').count + stageOf('packing').count > 0
          ? 'info'
          : 'idle',
      onClick: canOrders
        ? () =>
            onNavigate('orders', {
              filter:
                stageOf('packing').count > 0
                  ? 'packing'
                  : stageOf('confirmed').count > 0
                    ? 'confirmed'
                    : '',
            })
        : undefined,
    },
    {
      step: '05',
      title: 'Đang giao / Giao lại',
      count: stageOf('shipping').count + stageOf('delivery_failed').count,
      amount: stageOf('shipping').amount + stageOf('delivery_failed').amount,
      note:
        stageOf('delivery_failed').count > 0
          ? `${count(stageOf('shipping').count)} đang giao · ${count(stageOf('delivery_failed').count)} thất bại`
          : 'Thu đủ COD khi giao thành công',
      tone:
        stageOf('delivery_failed').count > 0
          ? 'danger'
          : stageOf('shipping').count > 0
            ? 'info'
            : 'idle',
      onClick: canOrders
        ? () =>
            onNavigate('orders', {
              filter:
                stageOf('delivery_failed').count > 0
                  ? 'delivery_failed'
                  : 'shipping',
            })
        : undefined,
    },
    {
      step: '06',
      title: 'Đã giao hoàn tất',
      count: stageOf('delivered').count,
      amount: stageOf('delivered').amount,
      note: 'Đã thu tiền & ghi nhận doanh thu',
      tone: 'done',
      onClick: canOrders
        ? () => onNavigate('orders', { filter: 'delivered' })
        : undefined,
    },
  ];

  const actionItems = [
    {
      key: 'rx',
      Icon: ClipboardCheck,
      title: 'Đơn thuốc chờ dược sĩ kiểm duyệt',
      subtitle:
        Number(queues.customerActionPrescriptions || 0) > 0
          ? `${count(queues.customerActionPrescriptions)} đơn đang chờ khách bổ sung/điều chỉnh`
          : canPrescriptions
            ? 'Kiểm tra ảnh/PDF đơn thuốc trước khi bán'
            : 'Đơn kê đơn cần tài khoản Dược sĩ kiểm duyệt',
      countValue: queues.pendingPrescriptions || 0,
      tone: Number(queues.pendingPrescriptions || 0) > 0 ? 'warn' : 'ok',
      allowed: canPrescriptions || canOrders,
      onClick: () =>
        canPrescriptions
          ? onNavigate('prescriptions', { filter: 'pending' })
          : onNavigate('orders', { filter: 'pending_prescription' }),
    },
    {
      key: 'bank',
      Icon: CreditCard,
      title: 'Đơn chờ thanh toán / đối soát VietQR',
      subtitle:
        Number(queues.waitingBankTransfers || 0) > 0
          ? `${count(queues.waitingBankTransfers)} đơn chuyển khoản cần đối soát sao kê`
          : 'Theo dõi giao dịch online chưa hoàn tất',
      countValue: queues.waitingPaymentOrders || 0,
      tone: Number(queues.waitingPaymentOrders || 0) > 0 ? 'warn' : 'ok',
      allowed: canOrders,
      onClick: () => onNavigate('orders', { filter: 'pending_payment' }),
    },
    {
      key: 'confirm',
      Icon: ShoppingBag,
      title: 'Đơn hàng chờ xác nhận xuất kho',
      subtitle: 'Kiểm tra tồn & tự động xuất lô FEFO khi xác nhận',
      countValue: queues.waitingConfirmOrders || 0,
      tone: Number(queues.waitingConfirmOrders || 0) > 0 ? 'warn' : 'ok',
      allowed: canOrders,
      onClick: () => onNavigate('orders', { filter: 'pending' }),
    },
    ...(Number(queues.deliveryFailedOrders || 0) > 0
      ? [
          {
            key: 'failed',
            Icon: AlertTriangle,
            title: 'Đơn giao thất bại cần xử lý lại',
            subtitle: 'Liên hệ giao lại hoặc hủy & hoàn kho theo quy trình',
            countValue: queues.deliveryFailedOrders,
            tone: 'danger',
            allowed: canOrders,
            onClick: () => onNavigate('orders', { filter: 'delivery_failed' }),
          },
        ]
      : []),
    {
      key: 'fulfill',
      Icon: Truck,
      title: 'Đơn đang đóng gói & vận chuyển',
      subtitle: `${count(queues.confirmedOrders)} đã xác nhận · ${count(queues.packingOrders)} đang đóng gói · ${count(queues.shippingOrders)} đang giao`,
      countValue:
        Number(queues.confirmedOrders || 0) +
        Number(queues.packingOrders || 0) +
        Number(queues.shippingOrders || 0),
      tone:
        Number(queues.confirmedOrders || 0) +
          Number(queues.packingOrders || 0) +
          Number(queues.shippingOrders || 0) >
        0
          ? 'info'
          : 'ok',
      allowed: canOrders,
      onClick: () =>
        onNavigate('orders', {
          filter:
            Number(queues.packingOrders || 0) > 0
              ? 'packing'
              : Number(queues.shippingOrders || 0) > 0
                ? 'shipping'
                : '',
        }),
    },
    {
      key: 'requests',
      Icon: Wallet,
      title: 'Yêu cầu hủy, đổi trả & hoàn tiền',
      subtitle: `${count(pendingReqCount)} yêu cầu chờ duyệt · ${count(refundPendingCount)} đơn chờ hoàn tiền`,
      countValue: pendingReqCount + refundPendingCount,
      tone: pendingReqCount + refundPendingCount > 0 ? 'danger' : 'ok',
      allowed: canOrders,
      onClick: () =>
        onNavigate('orders', {
          tab: 'requests',
          filter: pendingReqCount > 0 ? 'pending' : 'approved',
        }),
    },
    ...(Number(queues.activeReturnGoods || 0) > 0
      ? [
          {
            key: 'returnGoods',
            Icon: Boxes,
            title: 'Hàng trả về chờ nhận & kiểm tra',
            subtitle:
              'Chỉ hoàn tiền đổi trả sau khi nhà thuốc xác nhận đã nhận hàng',
            countValue: queues.activeReturnGoods,
            tone: 'warn',
            allowed: canOrders,
            onClick: () => onNavigate('orders', { tab: 'returns' }),
          },
        ]
      : []),
    {
      key: 'support',
      Icon: MessageSquare,
      title: 'Yêu cầu tư vấn dược sĩ đang mở',
      subtitle: `${count(queues.pendingSupport)} mới tiếp nhận · ${count(queues.inProgressSupport)} đang hỗ trợ`,
      countValue: queues.openSupport || 0,
      tone: Number(queues.openSupport || 0) > 0 ? 'warn' : 'ok',
      allowed: canSupport,
      onClick: () =>
        onNavigate('chatbot', {
          tab: 'support',
          filter: Number(queues.pendingSupport || 0) > 0 ? 'pending' : '',
        }),
    },
    ...(canKnowledge && Number(queues.unreviewedKnowledge || 0) > 0
      ? [
          {
            key: 'knowledge',
            Icon: ShieldCheck,
            title: 'Tri thức chatbot chờ dược sĩ rà soát',
            subtitle: 'Tri thức mới cần rà soát nguồn trước khi chatbot sử dụng',
            countValue: queues.unreviewedKnowledge,
            tone: 'warn',
            allowed: canKnowledge,
            onClick: () => onNavigate('chatbot', { tab: 'knowledge' }),
          },
        ]
      : []),
    {
      key: 'expiry',
      Icon: Clock,
      title: 'Lô thuốc hết hạn & sắp hết hạn',
      subtitle: `${count(queues.expiredBatches)} lô hết hạn (không bán) · ${count(queues.expiringBatches)} lô còn ≤ ${ops.expiryWarningDays || 60} ngày`,
      countValue:
        Number(queues.expiredBatches || 0) + Number(queues.expiringBatches || 0),
      tone:
        Number(queues.expiredBatches || 0) > 0
          ? 'danger'
          : Number(queues.expiringBatches || 0) > 0
            ? 'warn'
            : 'ok',
      allowed: canInventory,
      onClick: () => onNavigate('inventory', { tab: 'alerts' }),
    },
    {
      key: 'lowstock',
      Icon: AlertTriangle,
      title: 'Sản phẩm hết hàng & dưới ngưỡng tồn',
      subtitle: `${count(queues.outOfStockProducts)} hết hàng · ${count(queues.lowStockOnlyProducts)} dưới ${ops.lowStockThreshold || 15} đơn vị`,
      countValue: queues.lowStockProducts || 0,
      tone:
        Number(queues.outOfStockProducts || 0) > 0
          ? 'danger'
          : Number(queues.lowStockProducts || 0) > 0
            ? 'warn'
            : 'ok',
      allowed: canInventory,
      onClick: () => onNavigate('inventory', { tab: 'alerts' }),
    },
    ...(canUsers && Number(queues.unverifiedStaff || 0) > 0
      ? [
          {
            key: 'staff',
            Icon: Users,
            title: 'Nhân viên chờ kích hoạt tài khoản',
            subtitle: 'Tài khoản đã mời chưa xác nhận OTP kích hoạt',
            countValue: queues.unverifiedStaff,
            tone: 'info',
            allowed: true,
            onClick: () => onNavigate('users', { filter: 'staff' }),
          },
        ]
      : []),
  ].filter((item) => item.allowed);

  const urgentCount = actionItems.filter(
    (item) => Number(item.countValue) > 0 && item.tone !== 'info',
  ).length;

  const paymentList = list(data?.paymentBreakdown);
  const maxPayVal = Math.max(
    1,
    ...paymentList.map((m) =>
      Number(m.revenue) > 0 ? Number(m.revenue) : Number(m.orders) || 0,
    ),
  );
  const hasPayRev = paymentList.some((m) => Number(m.revenue) > 0);
  const alerts = list(data?.inventoryAlerts);
  const topProducts = list(data?.topProducts);
  const recentOrders = list(data?.recentOrders);
  const recentAudit = list(data?.recentAudit);

  return (
    <div className="adm-dash">
      <div className="adm-dash-bar">
        <div className="adm-dash-bar-meta">
          <span className="adm-dash-pill">
            <i />
            Kỳ đối chiếu: <strong>{fmtDate(data?.from)}</strong> →{' '}
            <strong>{fmtDate(data?.to)}</strong>
          </span>
          <span className="adm-dash-today">
            Hôm nay ({shortDate(vnDate(0))}):{' '}
            <strong>{count(allTime.todayOrders)} đơn mới</strong> ·{' '}
            <strong>{money(allTime.todayRevenue)}</strong> đã hoàn tất
          </span>
        </div>
        <div
          className="adm-rp-presets"
          role="group"
          aria-label="Chọn khoảng thời gian tổng quan"
        >
          {DASHBOARD_PERIOD_OPTIONS.map(([d, textLabel]) => (
            <button
              key={d}
              type="button"
              disabled={refreshing}
              className={`adm-rp-preset ${days === d ? 'active' : ''}`}
              onClick={() => onChangeDays(d)}
            >
              {textLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-rp-kpis">
        {kpiCards.map(
          ({ title, value, Icon, tone, badge, badgeTone, dir, sub }) => (
            <article className="adm-rp-kpi" key={title}>
              <div className="adm-rp-kpi-top">
                <span>{title}</span>
                <span className={`adm-stat-icon ${tone}`}>
                  <Icon size={19} />
                </span>
              </div>
              <strong>{value}</strong>
              <div className="adm-rp-kpi-meta">
                <span className={`adm-rp-delta is-${badgeTone}`}>
                  {dir === 'up' && <TrendingUp size={12} />}
                  {dir === 'down' && <TrendingDown size={12} />}
                  {badge}
                </span>
              </div>
              <small>{sub}</small>
            </article>
          ),
        )}
      </div>

      <div className="adm-dash-strip">
        {miniStats.map(
          ({ label: title, value, note, Icon, tone, onClick }) => {
            const Tag = onClick ? 'button' : 'div';
            return (
              <Tag
                key={title}
                type={onClick ? 'button' : undefined}
                className={`adm-dash-mini ${onClick ? 'is-clickable' : ''}`}
                onClick={onClick}
              >
                <span className={`adm-dash-mini-ico is-${tone}`}>
                  <Icon size={18} />
                </span>
                <div>
                  <span>{title}</span>
                  <strong>{value}</strong>
                  <small>{note}</small>
                </div>
                {onClick && (
                  <ChevronRight size={15} className="adm-dash-mini-go" />
                )}
              </Tag>
            );
          },
        )}
      </div>

      <section className="adm-panel adm-dash-pipeline">
        <div className="adm-panel-head">
          <div>
            <h3>Luồng xử lý đơn hàng toàn hệ thống</h3>
            <p>
              Phân bổ {count(allTime.orderCount)} đơn theo đúng trình tự kiểm
              duyệt đơn thuốc, thanh toán, xuất kho FEFO và giao thu tiền
            </p>
          </div>
          <div className="adm-dash-pipe-tags">
            {Number(allTime.refundPendingCount || 0) > 0 && (
              <button
                type="button"
                className="adm-badge is-refund_pending"
                onClick={() =>
                  canOrders &&
                  onNavigate('orders', { tab: 'requests', filter: 'approved' })
                }
              >
                Chờ hoàn tiền: {count(allTime.refundPendingCount)} (
                {money(allTime.refundPendingAmount)})
              </button>
            )}
            <button
              type="button"
              className="adm-badge is-returned"
              disabled={!canOrders}
              onClick={() =>
                canOrders && onNavigate('orders', { filter: 'returned' })
              }
            >
              Đã trả hàng: {count(allTime.returnedOrders)}
            </button>
            <button
              type="button"
              className="adm-badge is-cancelled"
              disabled={!canOrders}
              onClick={() =>
                canOrders && onNavigate('orders', { filter: 'cancelled' })
              }
            >
              Đã hủy: {count(allTime.cancelledOrders)}
            </button>
          </div>
        </div>
        <div className="adm-pipe-grid">
          {pipelineSteps.map((s) => {
            const Tag = s.onClick ? 'button' : 'div';
            return (
              <Tag
                key={s.step}
                type={s.onClick ? 'button' : undefined}
                onClick={s.onClick}
                className={`adm-pipe-step is-${s.tone} ${s.onClick ? 'is-clickable' : ''}`}
              >
                <div className="adm-pipe-top">
                  <span className="adm-pipe-num">{s.step}</span>
                  <strong>{count(s.count)}</strong>
                </div>
                <div className="adm-pipe-title">{s.title}</div>
                <div className="adm-pipe-amt">{money(s.amount)}</div>
                <small>{s.note}</small>
              </Tag>
            );
          })}
        </div>
      </section>

      <div className="adm-dashboard-grid">
        <div className="adm-dash-col">
          <section className="adm-panel">
            <div className="adm-panel-head">
              <div>
                <h3>Doanh thu & đơn hàng ({periodLabel})</h3>
                <p>
                  Doanh thu tính theo đơn đã giao (trừ hoàn tiền), không tính
                  đơn hủy
                </p>
              </div>
              <button
                type="button"
                className="adm-text-btn"
                onClick={() => onNavigate('reports')}
              >
                Báo cáo chi tiết
                <ArrowUpRight size={15} />
              </button>
            </div>
            <ReportChart data={data?.dailyRevenue || []} />
          </section>

          <section className="adm-panel adm-rp-subpanel">
            <div className="adm-panel-head">
              <div>
                <h3>Kênh thanh toán ({periodLabel})</h3>
                <p>
                  Đối chiếu lượng đơn phát sinh và doanh thu đã chốt theo phương
                  thức
                </p>
              </div>
              <span className="adm-stat-icon tone-1">
                <CreditCard size={17} />
              </span>
            </div>
            <div className="adm-rp-bars-list">
              {paymentList.length ? (
                paymentList.map((m) => {
                  const metricVal = hasPayRev
                    ? Number(m.revenue) || 0
                    : Number(m.orders) || 0;
                  const pct =
                    metricVal > 0
                      ? Math.max(3, (metricVal / maxPayVal) * 100)
                      : 0;
                  return (
                    <div className="adm-rp-bar-row" key={m.method}>
                      <div className="adm-rp-bar-head">
                        <strong>{paymentLabel(m.method)}</strong>
                        <span>{money(m.revenue)}</span>
                      </div>
                      <div className="adm-rp-progress">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <small>
                        {count(m.orders)} đơn phát sinh ·{' '}
                        {count(m.completedOrders)} đơn đã giao & thu tiền
                      </small>
                    </div>
                  );
                })
              ) : (
                <Empty title="Chưa có đơn phát sinh trong kỳ này" />
              )}
            </div>
          </section>
        </div>

        <section className="adm-panel adm-work-card adm-dash-queue">
          <div className="adm-panel-head">
            <div>
              <h3>Việc cần xử lý ngay</h3>
              <p>Cập nhật theo dữ liệu hiện tại của nhà thuốc</p>
            </div>
            <span
              className={`adm-rp-delta ${urgentCount > 0 ? 'is-warn' : 'is-up'}`}
            >
              {urgentCount > 0
                ? `${count(urgentCount)} mục có phát sinh`
                : 'Đã xử lý gọn'}
            </span>
          </div>
          <div className="adm-dash-task-list">
            {actionItems.map((item) => {
              const Icon = item.Icon;
              const num = Number(item.countValue || 0);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onClick}
                  className={`adm-dash-task is-${num > 0 ? item.tone : 'ok'}`}
                >
                  <span className="adm-dash-task-ico">
                    <Icon size={17} />
                  </span>
                  <span className="adm-dash-task-body">
                    <strong>{item.title}</strong>
                    <small>{item.subtitle}</small>
                  </span>
                  <b>{count(num)}</b>
                  <ChevronRight size={15} />
                </button>
              );
            })}
          </div>
          <div className="adm-work-note">
            <ShieldCheck size={18} />
            <p>
              Ngưỡng cấu hình hiện hành: cảnh báo tồn &lt;{' '}
              <strong>{count(ops.lowStockThreshold || 15)}</strong> · cảnh báo
              hạn dùng ≤ <strong>{count(ops.expiryWarningDays || 60)}</strong>{' '}
              ngày · hủy thanh toán sau{' '}
              <strong>{count(ops.paymentTimeoutMinutes || 30)}</strong> phút ·
              đổi trả trong{' '}
              <strong>{count(ops.returnWindowDays || 7)}</strong> ngày.
            </p>
          </div>
        </section>
      </div>

      {canOrders && (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div>
              <h3>Đơn hàng mới nhất</h3>
              <p>
                Hiển thị {count(recentOrders.length)} đơn gần nhất trên tổng{' '}
                {count(allTime.orderCount)} đơn trong hệ thống
              </p>
            </div>
            <button
              type="button"
              className="adm-text-btn"
              onClick={() => onNavigate('orders')}
            >
              Tất cả đơn hàng
              <ArrowUpRight size={16} />
            </button>
          </div>
          {orderTable(recentOrders)}
        </section>
      )}

      <div className="adm-rp-bottom-grid">
        {canInventory && (
          <section className="adm-panel adm-rp-alerts-panel">
            <div className="adm-panel-head">
              <div>
                <h3>Cảnh báo kho & hạn dùng ưu tiên</h3>
                <p>
                  Lô hết hạn đã tự động loại khỏi tồn có thể bán trên cửa hàng
                </p>
              </div>
              <button
                type="button"
                className="adm-btn"
                onClick={() => onNavigate('inventory', { tab: 'alerts' })}
              >
                Xử lý trong kho
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="adm-rp-alert-pills">
              <span className="adm-badge is-expired">
                Lô hết hạn: {count(queues.expiredBatches)}
              </span>
              <span className="adm-badge is-expiring">
                Sắp hết hạn: {count(queues.expiringBatches)}
              </span>
              <span className="adm-badge is-inactive">
                Hết hàng (0): {count(queues.outOfStockProducts)}
              </span>
              <span className="adm-badge is-low_stock">
                Dưới {count(ops.lowStockThreshold || 15)}:{' '}
                {count(queues.lowStockOnlyProducts)}
              </span>
            </div>
            <div className="adm-rp-alert-list">
              {alerts.length ? (
                alerts.map((a, idx) => (
                  <div
                    key={`${a.type}-${a.productId}-${a.batchId || idx}`}
                    className="adm-rp-alert-row"
                  >
                    <div>
                      <strong>{a.productName}</strong>
                      <small>
                        {a.batchNumber ? `Lô ${a.batchNumber} · ` : ''}
                        {a.expiresAt ? `HSD ${fmtDate(a.expiresAt)} · ` : ''}
                        {a.type === 'low_stock' && Number(a.quantity) === 0
                          ? 'Đã hết tồn khả dụng'
                          : `Số lượng: ${count(a.quantity)}`}
                      </small>
                    </div>
                    <Badge value={a.type}>
                      {a.type === 'low_stock' && Number(a.quantity) === 0
                        ? 'Hết hàng'
                        : undefined}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="adm-rp-all-good">
                  <CheckCircle2 size={22} />
                  <div>
                    <strong>Kho hàng ổn định</strong>
                    <p>
                      Chưa ghi nhận lô hết hạn hay sản phẩm dưới ngưỡng cảnh
                      báo.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <div className="adm-dash-col">
          <section className="adm-panel adm-dash-top-products">
            <div className="adm-panel-head">
              <div>
                <h3>Sản phẩm bán chạy ({periodLabel})</h3>
                <p>Tính trên đơn đã giao và thu tiền trong kỳ</p>
              </div>
              <button
                type="button"
                className="adm-text-btn"
                onClick={() => onNavigate('reports')}
              >
                Xem xếp hạng
                <ArrowUpRight size={15} />
              </button>
            </div>
            <Table
              columns={['Sản phẩm', 'SL bán', 'Doanh thu']}
              rows={topProducts.slice(0, 5)}
              empty={`Chưa có đơn hoàn tất trong ${periodLabel}`}
            >
              {topProducts.slice(0, 5).map((p, i) => (
                <tr key={p.id || i}>
                  <td>
                    <div className="adm-rp-prod-cell">
                      <span className={`adm-rp-medal is-top-${i + 1}`}>
                        {i + 1}
                      </span>
                      {p.image ? (
                        <img
                          src={p.image}
                          alt=""
                          className="adm-rp-prod-thumb"
                        />
                      ) : (
                        <span className="adm-rp-prod-fallback">
                          <Pill size={14} />
                        </span>
                      )}
                      <div>
                        <strong>{p.name}</strong>
                        <small>
                          {[p.categoryName, p.unit].filter(Boolean).join(' · ')}
                          {p.orderCount ? ` · ${count(p.orderCount)} đơn` : ''}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>{count(p.quantity)}</td>
                  <td className="adm-amount">{money(p.revenue)}</td>
                </tr>
              ))}
            </Table>
          </section>

          {canAudit && (
            <section className="adm-panel">
              <div className="adm-panel-head">
                <div>
                  <h3>Nhật ký vận hành gần đây</h3>
                  <p>Các thao tác hệ thống mới nhất được ghi nhận</p>
                </div>
                <button
                  type="button"
                  className="adm-text-btn"
                  onClick={() => onNavigate('audit')}
                >
                  Toàn bộ nhật ký
                  <ArrowUpRight size={15} />
                </button>
              </div>
              <div className="adm-dash-audit">
                {recentAudit.length ? (
                  recentAudit.map((item) => (
                    <div key={item.id} className="adm-dash-audit-row">
                      <Activity size={15} />
                      <div>
                        <strong>
                          {AUDIT_LABELS[item.action] || item.action}
                        </strong>
                        <small>
                          {item.userName || 'Hệ thống'} ·{' '}
                          {dateTime(item.createdAt)}
                        </small>
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty title="Chưa có nhật ký hoạt động" />
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
