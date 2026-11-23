/**
 * Admin Orders, Requests & Return Goods Management View powered by useAdminOrdersController.
 */
import React from 'react';
import {
  AlertTriangle,
  Ban,
  Boxes,
  Check,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  LoaderCircle,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import {
  ORDER_STATES,
  RETURN_GOODS_STATES,
  adminLabel,
} from '../../models/constants.js';
import {
  count,
  fmtDate,
  fmtTime,
  money,
  paymentShortLabel,
  safeJson,
} from '../../models/formatters.js';
import {
  hasActionableRequest,
  isOrderOverdue,
} from '../../models/adminModel.js';
import { useAdminOrdersController } from '../../controllers/admin/useAdminOrdersController.js';
import Pagination from '../components/Pagination.jsx';
import { Badge, Table } from './adminUi.jsx';

export default function AdminOrdersView(props) {
  const {
    tab,
    setTab,
    query,
    setQuery,
    filter,
    setFilter,
    setPage,
    onOpenOrder,
    onOpenRequest,
    onOpenReturnGoods,
    onOpenCreateOrder,
  } = props;
  const c = useAdminOrdersController(props);

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
          <strong>{count(c.ordersList.length)}</strong>
          <small>
            {count(c.statusCounts.delivered)} hoàn tất ·{' '}
            {money(c.deliveredRevenue)}
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
          <strong>{count(c.queueOrders.length)}</strong>
          <small>
            {count(c.statusCounts.pending_prescription)} duyệt đơn ·{' '}
            {count(c.statusCounts.pending)} xác nhận ·{' '}
            {count(c.statusCounts.delivery_failed)} giao lại
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
          <strong>{count(c.inProgressCount)}</strong>
          <small>
            {count(c.statusCounts.confirmed)} đã XN ·{' '}
            {count(c.statusCounts.packing)} đóng gói ·{' '}
            {count(c.statusCounts.shipping)} đang giao
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
          <strong>
            {count(c.pendingReqOnly + c.refundPendingOrdersCount)}
          </strong>
          <small>
            {count(c.pendingReqOnly)} yêu cầu chờ ·{' '}
            {count(c.refundPendingOrdersCount)} chờ hoàn tiền
          </small>
        </button>
      </div>

      {c.overdueOrders.length > 0 && (
        <div className="adm-info-banner adm-ord-alert">
          <AlertTriangle size={19} />
          <div>
            <strong>
              Có {c.overdueOrders.length} đơn chờ thanh toán đã quá hạn cấu hình
            </strong>
            <p>
              Thu hồi các đơn quá hạn để giải phóng tồn kho đang giữ cho khách
              hàng khác.
            </p>
          </div>
          <button
            type="button"
            className="adm-btn small"
            disabled={c.bulkBusy}
            onClick={c.handleExpireOverdue}
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
            <span>{c.ordersList.length}</span>
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
            {c.queueOrders.length > 0 && <span>{c.queueOrders.length}</span>}
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
            {c.actionableRequestsBadge > 0 && (
              <span>{c.actionableRequestsBadge}</span>
            )}
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
            {c.activeReturnsCount > 0 && <span>{c.activeReturnsCount}</span>}
          </button>
        </div>

        {tab === 'orders' && (
          <div
            className="adm-ord-chips"
            role="group"
            aria-label="Lọc nhanh trạng thái"
          >
            <button
              type="button"
              className={`adm-ord-chip ${!filter ? 'active' : ''}`}
              onClick={() => setFilter('')}
            >
              Tất cả <b>{c.ordersList.length}</b>
            </button>
            {ORDER_STATES.map((state) => {
              const n = c.statusCounts[state] || 0;
              return (
                <button
                  type="button"
                  key={state}
                  className={`adm-ord-chip ${filter === state ? 'active' : ''} ${n === 0 ? 'is-muted' : ''}`}
                  onClick={() => setFilter(filter === state ? '' : state)}
                >
                  {adminLabel(state)} <b>{n}</b>
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
                    {adminLabel(`return_${v}`)}
                  </option>
                ))}
              </select>
            ) : tab === 'requests' ? (
              <>
                <select
                  className="adm-select"
                  value={c.reqTypeFilter}
                  onChange={(e) => c.setReqTypeFilter(e.target.value)}
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
                  value={c.payMethod}
                  onChange={(e) => c.setPayMethod(e.target.value)}
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
                  value={c.payStatus}
                  onChange={(e) => c.setPayStatus(e.target.value)}
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
                  value={c.rxFilter}
                  onChange={(e) => c.setRxFilter(e.target.value)}
                  aria-label="Loại đơn hàng"
                >
                  <option value="">Tất cả loại đơn</option>
                  <option value="rx">Có thuốc kê đơn</option>
                  <option value="otc">Không kê đơn</option>
                </select>
                <select
                  className="adm-select"
                  value={c.sortBy}
                  onChange={(e) => c.setSortBy(e.target.value)}
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
                  value={c.dateRange.from}
                  onChange={(e) =>
                    c.setDateRange((r) => ({ ...r, from: e.target.value }))
                  }
                  aria-label="Từ ngày"
                  title="Từ ngày"
                />
                <input
                  type="date"
                  className="adm-select adm-ord-date"
                  value={c.dateRange.to}
                  onChange={(e) =>
                    c.setDateRange((r) => ({ ...r, to: e.target.value }))
                  }
                  aria-label="Đến ngày"
                  title="Đến ngày"
                />
                {c.hasOrderFilters && (
                  <button
                    type="button"
                    className="adm-btn small"
                    onClick={c.clearFilters}
                  >
                    <X size={13} />
                    Xóa lọc
                  </button>
                )}
                <a className="adm-btn" href={c.exportUrl} download>
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

        {tab !== 'requests' && tab !== 'returns' && c.selectedIds.length > 0 && (
          <div className="adm-ord-bulkbar">
            <span>
              Đã chọn <strong>{c.selectedIds.length}</strong> đơn hàng
            </span>
            <div className="adm-ord-bulk-actions">
              <button
                type="button"
                className="adm-btn small primary"
                disabled={c.bulkBusy}
                onClick={() => c.runBulkTransition('confirmed')}
              >
                <Check size={14} />
                Xác nhận
              </button>
              <button
                type="button"
                className="adm-btn small"
                disabled={c.bulkBusy}
                onClick={() => c.runBulkTransition('packing')}
              >
                <Boxes size={14} />
                Đóng gói
              </button>
              <button
                type="button"
                className="adm-btn small"
                disabled={c.bulkBusy}
                onClick={() => c.runBulkTransition('shipping')}
              >
                <Truck size={14} />
                Giao hàng
              </button>
              <button
                type="button"
                className="adm-btn small"
                disabled={c.bulkBusy}
                onClick={() => c.runBulkTransition('cancelled')}
              >
                <Ban size={14} />
                Hủy đơn
              </button>
              <button
                type="button"
                className="adm-text-btn"
                onClick={() => c.setSelectedIds([])}
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
            rows={c.visibleRows}
            empty="Chưa có hàng trả về"
          >
            {c.visibleRows.map((g) => (
              <tr key={g.id}>
                <td>
                  <button
                    type="button"
                    className="adm-code"
                    onClick={() =>
                      onOpenOrder({ id: g.orderId, code: g.orderCode })
                    }
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
            rows={c.visibleRows}
            empty="Không có yêu cầu hủy, đổi trả hoặc hoàn tiền nào"
          >
            {c.visibleRows.map((r) => {
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
                      onClick={() =>
                        onOpenOrder({ id: r.orderId, code: r.orderCode })
                      }
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
                    <small>{adminLabel(r.orderStatus)}</small>
                  </td>
                  <td className="adm-truncate" title={r.reason}>
                    <span>{r.reason}</span>
                    <small>
                      {r.evidenceAvailable ? 'Có ảnh minh chứng · ' : ''}
                      {r.reply ||
                        (r.handlerName
                          ? `Xử lý: ${r.handlerName}`
                          : 'Chờ kiểm tra')}
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
                    {needsRefund && (
                      <small className="adm-ord-warn-text">
                        Cần hoàn tiền
                      </small>
                    )}
                    {r.refundAmount > 0 && (
                      <small className="adm-green">
                        Đã hoàn {money(r.refundAmount)}
                      </small>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`adm-btn small ${needsRefund || r.status === 'pending' ? 'primary' : ''}`}
                      onClick={() => onOpenRequest(r)}
                    >
                      <Eye size={14} />
                      {needsRefund
                        ? 'Hoàn tiền'
                        : r.status === 'pending'
                          ? 'Xử lý'
                          : 'Chi tiết'}
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
                  checked={c.allVisibleSelected}
                  onChange={c.toggleSelectAll}
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
              rows={c.visibleRows}
              empty="Không tìm thấy đơn hàng phù hợp bộ lọc"
            >
              {c.visibleRows.map((o) => {
                const addr = safeJson(o.address, {});
                const items = o.items || [];
                const firstItem = items[0]?.name;
                const quick = c.getQuickNextAction(o);
                const pendingReq = hasActionableRequest(o);
                const overdue = isOrderOverdue(o);
                const recipientDiffers =
                  addr.recipient && o.userName && addr.recipient !== o.userName;

                return (
                  <tr
                    key={o.id}
                    className={
                      c.selectedIds.includes(o.id) ? 'is-selected' : ''
                    }
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={c.selectedIds.includes(o.id)}
                        onChange={() => c.toggleSelect(o.id)}
                        aria-label={`Chọn đơn ${o.code}`}
                      />
                    </td>
                    <td>
                      <button
                        className="adm-code"
                        onClick={() => onOpenOrder(o)}
                      >
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
                          <span className="adm-ord-tag is-promo">
                            {o.promotionCode}
                          </span>
                        )}
                        {pendingReq && (
                          <span className="adm-ord-tag is-req">Có yêu cầu</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <strong>
                        {o.userName ||
                          o.customerName ||
                          addr.recipient ||
                          'Khách hàng'}
                      </strong>
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
                      {overdue && (
                        <small className="adm-ord-warn-text">
                          Quá hạn thanh toán
                        </small>
                      )}
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
                            disabled={c.busyId === o.id}
                            onClick={() => c.handleQuickButton(o, quick)}
                          >
                            {c.busyId === o.id ? (
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
          page={c.currentPage}
          totalItems={c.activeRows.length}
          perPage={c.perPage}
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
