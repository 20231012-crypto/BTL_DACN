/**
 * Admin Reports & Analytics View.
 */
import React from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  Layers,
  Pill,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { buildReportsExportUrl } from '../../models/adminModel.js';
import {
  count,
  deltaInfo,
  fmtDate,
  list,
  money,
  paymentLabel,
  vnDate,
} from '../../models/formatters.js';
import { Badge, Empty, ReportChart, StatusDonut, Table } from './adminUi.jsx';

export default function AdminReportsView({
  data,
  range,
  setRange,
  onApplyPreset,
  onReload,
  hasPermission,
  onNavigate,
}) {
  const activeFrom = range.from || data?.from || '';
  const activeTo = range.to || data?.to || '';
  const todayIso = vnDate(0);
  const presets = [
    ['7 ngày', vnDate(-6), todayIso],
    ['14 ngày', vnDate(-13), todayIso],
    ['30 ngày', vnDate(-29), todayIso],
    ['Tháng này', `${todayIso.slice(0, 8)}01`, todayIso],
  ];

  const revDelta = deltaInfo(data?.revenue, data?.previous?.revenue);
  const ordDelta = deltaInfo(data?.orderCount, data?.previous?.orderCount);
  const cancelDelta = deltaInfo(
    data?.cancellationRate,
    data?.previous?.cancellationRate,
    true,
  );
  const alertTotal =
    (data?.inventory?.lowStockCount || 0) +
    (data?.inventory?.expiringCount || 0) +
    (data?.inventory?.expiredCount || 0);

  const kpiCards = [
    {
      title: 'Doanh thu thuần trong kỳ',
      value: money(data?.revenue),
      Icon: Wallet,
      tone: 'tone-0',
      badge: revDelta.text,
      badgeTone: revDelta.tone,
      dir: revDelta.dir,
      sub: `Tiền hàng ${money(data?.grossRevenue)} · Giảm giá ${money(data?.totalDiscount)}${data?.refundTotal > 0 ? ` · Hoàn ${money(data?.refundTotal)}` : ''}`,
    },
    {
      title: 'Tổng đơn hàng',
      value: count(data?.orderCount),
      Icon: ShoppingBag,
      tone: 'tone-1',
      badge: ordDelta.text,
      badgeTone: ordDelta.tone,
      dir: ordDelta.dir,
      sub: `${count(data?.completedOrders)} hoàn tất · TB ${money(data?.averageOrder)}/đơn`,
    },
    {
      title: 'Tỷ lệ hủy đơn',
      value: `${Number(data?.cancellationRate || 0).toFixed(1)}%`,
      Icon: AlertTriangle,
      tone: 'tone-2',
      badge: `Hoàn tất ${Number(data?.completionRate || 0).toFixed(1)}%`,
      badgeTone:
        Number(data?.cancellationRate || 0) > 25
          ? 'down'
          : Number(data?.completionRate || 0) >= 60
            ? 'up'
            : 'flat',
      dir: cancelDelta.dir,
      sub: `${count(data?.cancelledOrders)} đơn hủy / ${count(data?.orderCount)} đơn trong kỳ`,
    },
    {
      title: 'Tồn kho khả dụng',
      value: count(data?.inventory?.sellable),
      Icon: Boxes,
      tone: 'tone-3',
      badge: alertTotal > 0 ? `${count(alertTotal)} cảnh báo kho` : 'Kho ổn định',
      badgeTone: alertTotal > 0 ? 'warn' : 'up',
      dir: 'flat',
      sub: `Giá trị vốn ${money(data?.inventory?.value)} · Giữ ${count(data?.inventory?.reserved)}`,
    },
  ];

  const topProducts = list(data?.topProducts);
  const paymentList = list(data?.paymentBreakdown);
  const categoryList = list(data?.categoryBreakdown);
  const topRevSum = Math.max(
    1,
    Number(data?.grossRevenue) ||
      categoryList.reduce((n, c) => n + (Number(c.revenue) || 0), 0) ||
      topProducts.reduce((n, p) => n + (Number(p.revenue) || 0), 0),
  );
  const maxCatRev = Math.max(
    1,
    ...categoryList.map((c) => Number(c.revenue) || 0),
  );
  const hasPayRev = paymentList.some((m) => (Number(m.revenue) || 0) > 0);
  const maxPayMetric = Math.max(
    1,
    ...paymentList.map((m) =>
      hasPayRev ? Number(m.revenue) || 0 : Number(m.orders) || 0,
    ),
  );
  const alerts = list(data?.inventoryAlerts);
  const exportUrl = buildReportsExportUrl(activeFrom, activeTo);

  return (
    <div className="adm-rp">
      <form
        className="adm-rp-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          onReload(false, { from: activeFrom, to: activeTo });
        }}
      >
        <div className="adm-rp-title-block">
          <div className="adm-rp-eyebrow">
            <BarChart3 size={14} />
            <span>BÁO CÁO & PHÂN TÍCH KINH DOANH</span>
          </div>
          <h3>Hiệu quả vận hành Nhà thuốc An Tâm</h3>
          <p>
            <Calendar size={13} />
            <span>
              Kỳ báo cáo: <strong>{fmtDate(data?.from || activeFrom)}</strong> →{' '}
              <strong>{fmtDate(data?.to || activeTo)}</strong>
              {data?.spanDays ? ` (${data.spanDays} ngày)` : ''}
            </span>
          </p>
        </div>

        <div className="adm-rp-controls">
          <div
            className="adm-rp-presets"
            role="group"
            aria-label="Chọn nhanh khoảng ngày"
          >
            {presets.map(([name, f, t]) => {
              const active = activeFrom === f && activeTo === t;
              return (
                <button
                  key={name}
                  type="button"
                  className={`adm-rp-preset ${active ? 'active' : ''}`}
                  onClick={() => onApplyPreset(f, t)}
                >
                  {name}
                </button>
              );
            })}
          </div>
          <div className="adm-rp-dates">
            <label>
              Từ ngày
              <input
                aria-label="Từ ngày"
                type="date"
                value={activeFrom}
                onChange={(e) =>
                  setRange((r) => ({ ...r, from: e.target.value }))
                }
              />
            </label>
            <label>
              Đến ngày
              <input
                aria-label="Đến ngày"
                type="date"
                value={activeTo}
                onChange={(e) =>
                  setRange((r) => ({ ...r, to: e.target.value }))
                }
              />
            </label>
            <button className="adm-btn primary" type="submit">
              Xem báo cáo
            </button>
            <a className="adm-btn" href={exportUrl} download>
              <Download size={15} />
              Xuất CSV
            </a>
          </div>
        </div>
      </form>

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

      <div className="adm-rp-main-grid">
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div>
              <h3>Xu hướng doanh thu & đơn hàng</h3>
              <p>
                Theo dõi biến động thu tiền và lượng đơn phát sinh từng ngày
              </p>
            </div>
            <span className="adm-soft-label">
              Kỳ {data?.spanDays || 30} ngày
            </span>
          </div>
          <ReportChart data={data?.dailyRevenue || []} />
        </section>

        <section className="adm-panel">
          <div className="adm-panel-head">
            <div>
              <h3>Cơ cấu trạng thái đơn</h3>
              <p>Tỷ trọng đơn hoàn tất, đang xử lý và hủy trong kỳ</p>
            </div>
            <span className="adm-soft-label">
              {count(data?.orderCount)} đơn
            </span>
          </div>
          <StatusDonut
            breakdown={data?.statusBreakdown || []}
            totalOrders={data?.orderCount || 0}
          />
        </section>
      </div>

      <div className="adm-rp-grid-3">
        <section className="adm-panel adm-rp-subpanel">
          <div className="adm-panel-head">
            <div>
              <h3>Kênh thanh toán</h3>
              <p>Phân bổ đơn hàng và dòng tiền theo phương thức</p>
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
                    ? Math.max(2, (metricVal / maxPayMetric) * 100)
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
                      {count(m.completedOrders)} đơn thu tiền
                    </small>
                  </div>
                );
              })
            ) : (
              <Empty title="Chưa có giao dịch trong kỳ" />
            )}
          </div>
        </section>

        <section className="adm-panel adm-rp-subpanel">
          <div className="adm-panel-head">
            <div>
              <h3>Doanh thu theo danh mục</h3>
              <p>Nhóm sản phẩm đóng góp doanh thu cao nhất</p>
            </div>
            <span className="adm-stat-icon">
              <Layers size={17} />
            </span>
          </div>
          <div className="adm-rp-bars-list">
            {categoryList.length ? (
              categoryList.slice(0, 6).map((c) => {
                const rev = Number(c.revenue) || 0;
                const pct = rev > 0 ? Math.max(2, (rev / maxCatRev) * 100) : 0;
                return (
                  <div className="adm-rp-bar-row" key={c.id || c.name}>
                    <div className="adm-rp-bar-head">
                      <strong>{c.name}</strong>
                      <span>{money(c.revenue)}</span>
                    </div>
                    <div className="adm-rp-progress is-teal">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <small>
                      Đã bán {count(c.quantity)} sản phẩm ·{' '}
                      {count(c.orderCount)} đơn hàng
                    </small>
                  </div>
                );
              })
            ) : (
              <Empty
                title="Chưa có doanh thu danh mục"
                description="Dữ liệu sẽ hiển thị khi có đơn hàng giao thành công và thanh toán."
              />
            )}
          </div>
        </section>

        <section className="adm-panel adm-rp-subpanel">
          <div className="adm-panel-head">
            <div>
              <h3>Vận hành dược sĩ & tư vấn</h3>
              <p>Đơn thuốc, chatbot và chăm sóc khách hàng trong kỳ</p>
            </div>
            <span className="adm-stat-icon tone-3">
              <Activity size={17} />
            </span>
          </div>
          <div className="adm-rp-ops-list">
            <div>
              <span>Đơn thuốc gửi trong kỳ</span>
              <strong>{count(data?.prescriptionStats?.total)}</strong>
              <small>
                Duyệt {count(data?.prescriptionStats?.approved)} · Chờ{' '}
                {count(data?.prescriptionStats?.pending)} · Từ chối{' '}
                {count(data?.prescriptionStats?.rejected)}
              </small>
            </div>
            <div>
              <span>Phiên hỏi đáp Chatbot</span>
              <strong>{count(data?.chatCount)}</strong>
              <small>Tổng cuộc hội thoại tạo mới trong kỳ</small>
            </div>
            <div>
              <span>Yêu cầu tư vấn dược sĩ</span>
              <strong>{count(data?.handoffCount)}</strong>
              <small>Khách cần dược sĩ hỗ trợ trực tiếp</small>
            </div>
            <div>
              <span>Khách hàng hoạt động</span>
              <strong>{count(data?.customerCount)}</strong>
              <small>
                Phí vận chuyển đã thu: {money(data?.totalShipping)}
              </small>
            </div>
          </div>
        </section>
      </div>

      <div className="adm-rp-bottom-grid">
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div>
              <h3>Top sản phẩm bán chạy</h3>
              <p>
                Xếp hạng theo tiền hàng ({money(data?.grossRevenue)}) và tỷ
                trọng đóng góp
              </p>
            </div>
            <span className="adm-soft-label">Top {topProducts.length}</span>
          </div>
          <Table
            columns={['Hạng & Sản phẩm', 'SL bán', 'Doanh thu', 'Tỷ trọng']}
            rows={topProducts}
            empty="Chưa có sản phẩm bán hoàn tất trong khoảng thời gian này"
          >
            {topProducts.map((p, i) => {
              const share = Math.min(
                100,
                Math.round(((Number(p.revenue) || 0) / topRevSum) * 100),
              );
              return (
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
                  <td>
                    <div className="adm-rp-share">
                      <div className="adm-rp-progress">
                        <span
                          style={{
                            width: `${share > 0 ? Math.max(2, share) : 0}%`,
                          }}
                        />
                      </div>
                      <span>{share}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        </section>

        <section className="adm-panel adm-rp-alerts-panel">
          <div className="adm-panel-head">
            <div>
              <h3>Sức khỏe kho & Cảnh báo</h3>
              <p>Theo dõi lô thuốc hết hạn, sắp hết hạn và sắp hết hàng</p>
            </div>
            {hasPermission('inventory') && (
              <button
                type="button"
                className="adm-btn"
                onClick={() => onNavigate('inventory', { tab: 'alerts' })}
              >
                Xem kho
                <ChevronRight size={14} />
              </button>
            )}
          </div>
          <div className="adm-rp-alert-pills">
            <span className="adm-badge is-expired">
              Hết hạn: {count(data?.inventory?.expiredCount)}
            </span>
            <span className="adm-badge is-expiring">
              Sắp hết hạn: {count(data?.inventory?.expiringCount)}
            </span>
            <span className="adm-badge is-low_stock">
              Sắp hết hàng: {count(data?.inventory?.lowStockCount)}
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
                      SL: {count(a.quantity)}
                    </small>
                  </div>
                  <Badge value={a.type} />
                </div>
              ))
            ) : (
              <div className="adm-rp-all-good">
                <CheckCircle2 size={22} />
                <div>
                  <strong>Kho hàng an toàn</strong>
                  <p>
                    Không có lô hết hạn hay sản phẩm dưới ngưỡng cảnh báo.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
