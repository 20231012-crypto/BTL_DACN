/**
 * Admin Order Detail Modal Content View powered by useAdminOrderDetailController.
 */
import React from 'react';
import {
  AlertTriangle,
  Ban,
  Check,
  Clock,
  CreditCard,
  History,
  LoaderCircle,
  MapPin,
  Package,
  Pencil,
  Printer,
  RotateCcw,
  Truck,
  User,
  Wallet,
} from 'lucide-react';
import {
  CARRIER_SUGGESTIONS,
  ORDER_NEXT,
  adminLabel,
} from '../../models/constants.js';
import {
  dateTime,
  fmtDate,
  money,
  paymentLabel,
  paymentShortLabel,
} from '../../models/formatters.js';
import { printOrderSlip } from '../../models/adminModel.js';
import { useAdminOrderDetailController } from '../../controllers/admin/useAdminOrderDetailController.js';
import { Badge, Table } from './adminUi.jsx';

const STEPPER_STEPS = [
  ['created', 'Tiếp nhận'],
  ['confirmed', 'Xác nhận'],
  ['packing', 'Đóng gói'],
  ['shipping', 'Đang giao'],
  ['delivered', 'Đã giao'],
];

export default function AdminOrderDetailModal({
  item,
  form,
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
  const c = useAdminOrderDetailController({
    item,
    setSaving,
    onOrderUpdated,
    notify,
  });

  return (
    <>
      <div className="adm-modal-body">
        <div className="adm-order-top">
          <Badge value={item.status} />
          <Badge value={item.paymentStatus} />
          {item.requiresPrescription && (
            <Badge value={item.prescriptionStatus || 'pending_prescription'}>
              {item.prescriptionStatus
                ? `Đơn thuốc: ${adminLabel(item.prescriptionStatus)}`
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
                notify(
                  'Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép pop-up.',
                  'error',
                );
            }}
          >
            <Printer size={14} />
            In phiếu đơn
          </button>
        </div>

        <div
          className={`adm-ord-stepper ${c.isTerminalCancel ? 'is-cancelled' : ''}`}
        >
          {STEPPER_STEPS.map(([key, title], idx) => (
            <div
              key={key}
              className={`adm-ord-step ${!c.isTerminalCancel && idx <= c.stepPos ? 'is-done' : ''} ${
                !c.isTerminalCancel && idx === c.stepPos ? 'is-current' : ''
              }`}
            >
              <span>
                {!c.isTerminalCancel && idx < c.stepPos ? (
                  <Check size={12} />
                ) : (
                  idx + 1
                )}
              </span>
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
          <div
            className={`adm-info-banner compact ${c.overdue ? 'danger' : ''}`}
          >
            <Clock size={18} />
            <p>
              <strong>
                {c.overdue
                  ? 'Đơn đã quá hạn thanh toán!'
                  : 'Đang chờ khách hàng thanh toán'}
              </strong>{' '}
              {item.paymentDeadline
                ? `Hạn thanh toán: ${dateTime(item.paymentDeadline)}.`
                : ''}
            </p>
            {c.overdue && (
              <button
                type="button"
                className="adm-btn small"
                disabled={saving}
                onClick={c.expireNow}
              >
                Hủy đơn quá hạn
              </button>
            )}
          </div>
        )}

        {c.actionableReq && (
          <div className="adm-info-banner compact danger">
            <AlertTriangle size={18} />
            <p>
              <strong>
                {c.actionableReq.status === 'pending'
                  ? `Khách hàng đang gửi yêu cầu ${adminLabel(c.actionableReq.type).toLowerCase()}:`
                  : 'Đơn hàng đang chờ hoàn tiền:'}
              </strong>{' '}
              {c.actionableReq.reason}
            </p>
            <button
              type="button"
              className="adm-btn small primary"
              onClick={() =>
                onOpenRequest({
                  ...c.actionableReq,
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
              {c.actionableReq.status === 'pending'
                ? 'Xử lý ngay'
                : 'Hoàn tiền ngay'}
            </button>
          </div>
        )}

        {!c.actionableReq && c.waitingReturnReq && (
          <div className="adm-info-banner compact">
            <Package size={18} />
            <p>
              <strong>
                Đang chờ hàng trả về (
                {adminLabel(`return_${c.waitingReturnReq.returnGoodsStatus}`)}):
              </strong>{' '}
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
            <strong>
              {item.userName || item.customerName || 'Khách hàng'}
            </strong>
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
              {c.canEditAddress && (
                <button
                  type="button"
                  className="adm-text-btn"
                  onClick={() => c.setEditingAddress((v) => !v)}
                >
                  <Pencil size={12} />
                  {c.editingAddress ? 'Hủy sửa' : 'Sửa địa chỉ'}
                </button>
              )}
            </div>
            {c.editingAddress ? (
              <form className="adm-ord-inline-form" onSubmit={c.saveAddress}>
                <div className="adm-ord-inline-2">
                  <input
                    placeholder="Người nhận"
                    value={c.addrDraft.recipient}
                    onChange={(e) =>
                      c.setAddrDraft((a) => ({
                        ...a,
                        recipient: e.target.value,
                      }))
                    }
                    required
                  />
                  <input
                    placeholder="SĐT (10 số)"
                    value={c.addrDraft.phone}
                    onChange={(e) =>
                      c.setAddrDraft((a) => ({ ...a, phone: e.target.value }))
                    }
                    required
                  />
                </div>
                <input
                  placeholder="Số nhà, tên đường"
                  value={c.addrDraft.line1}
                  onChange={(e) =>
                    c.setAddrDraft((a) => ({ ...a, line1: e.target.value }))
                  }
                  required
                />
                <div className="adm-ord-inline-3">
                  <input
                    placeholder="Phường/Xã"
                    value={c.addrDraft.ward}
                    onChange={(e) =>
                      c.setAddrDraft((a) => ({ ...a, ward: e.target.value }))
                    }
                    required
                  />
                  <input
                    placeholder="Quận/Huyện"
                    value={c.addrDraft.district}
                    onChange={(e) =>
                      c.setAddrDraft((a) => ({
                        ...a,
                        district: e.target.value,
                      }))
                    }
                  />
                  <input
                    placeholder="Tỉnh/Thành"
                    value={c.addrDraft.city}
                    onChange={(e) =>
                      c.setAddrDraft((a) => ({ ...a, city: e.target.value }))
                    }
                    required
                  />
                </div>
                <button
                  className="adm-btn small primary"
                  disabled={saving}
                  type="submit"
                >
                  Lưu địa chỉ
                </button>
              </form>
            ) : (
              <>
                <strong>{c.addr.recipient || item.userName || '—'}</strong>
                <p>{c.addr.phone || item.phone || '—'}</p>
                <p>
                  {[c.addr.line1, c.addr.ward, c.addr.district, c.addr.city]
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
              <Badge
                value={
                  item.stockReleased
                    ? 'available'
                    : item.stockDeducted
                      ? 'sale'
                      : 'reserved'
                }
              >
                {item.stockReleased
                  ? 'Đã hoàn kho'
                  : item.stockDeducted
                    ? 'Đã xuất FEFO'
                    : 'Đang giữ tồn'}
              </Badge>
            </div>
            <strong>{paymentLabel(item.paymentMethod)}</strong>
            <p>Trạng thái TT: {adminLabel(item.paymentStatus)}</p>
            {item.promotionCode && (
              <p>
                Mã KM: <strong>{item.promotionCode}</strong> (
                {item.promotionName})
              </p>
            )}
            {item.prescriptionId && (
              <p>
                Đơn thuốc #{item.prescriptionId} (
                {adminLabel(item.prescriptionStatus)})
                {item.prescriptionReviewerName
                  ? ` · Duyệt: ${item.prescriptionReviewerName}`
                  : ''}
              </p>
            )}
          </div>
        </div>

        <form className="adm-ord-fulfill-box" onSubmit={c.saveFulfillment}>
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
                value={c.fulfillDraft.shippingCarrier}
                onChange={(e) =>
                  c.setFulfillDraft((d) => ({
                    ...d,
                    shippingCarrier: e.target.value,
                  }))
                }
                placeholder="VD: Nội bộ An Tâm, GHN..."
              />
              <datalist id="adm-carrier-list">
                {CARRIER_SUGGESTIONS.map((carrier) => (
                  <option key={carrier} value={carrier} />
                ))}
              </datalist>
            </label>
            <label className="adm-field">
              <span>Mã vận đơn</span>
              <input
                value={c.fulfillDraft.trackingCode}
                onChange={(e) =>
                  c.setFulfillDraft((d) => ({
                    ...d,
                    trackingCode: e.target.value,
                  }))
                }
                placeholder="VD: AT-VD-00109"
              />
            </label>
            <label className="adm-field is-wide">
              <span>Ghi chú nội bộ (chỉ nhân viên xem)</span>
              <input
                value={c.fulfillDraft.internalNote}
                onChange={(e) =>
                  c.setFulfillDraft((d) => ({
                    ...d,
                    internalNote: e.target.value,
                  }))
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
          rows={c.items}
        >
          {c.items.map((p, i) => {
            const pAllocs = c.allocsByProduct.get(p.productId) || [];
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
                        <code>{a.batchNumber}</code> · {a.quantity} · HSD{' '}
                        {fmtDate(a.expiresAt)}
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
            <span>Tiền hàng ({item.itemCount || c.items.length} SP)</span>
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

        {item.paymentMethod === 'bank_transfer' &&
          item.status === 'pending_payment' && (
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
                <span>
                  Đã kiểm tra sao kê ngân hàng khớp nội dung ANTAM{item.id}
                </span>
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
                      {adminLabel(s)}
                    </option>
                  ))}
                </select>
              </label>

              {form.nextStatus === 'delivered' &&
                item.paymentMethod === 'cod' && (
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
                      value={
                        form.shippingCarrier ?? item.shippingCarrier ?? ''
                      }
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
                    minLength={
                      form.nextStatus === 'delivery_failed' ? 5 : undefined
                    }
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

        {(c.canRecordCancel || c.canRecordReturn) && (
          <div className="adm-ord-assist-bar">
            {c.canRecordCancel && (
              <button
                type="button"
                className="adm-btn small"
                onClick={() =>
                  c.setRecordingRequest((cur) =>
                    cur === 'cancel' ? null : 'cancel',
                  )
                }
              >
                <Ban size={14} />
                Ghi nhận khách hủy đơn
              </button>
            )}
            {c.canRecordReturn && (
              <button
                type="button"
                className="adm-btn small"
                onClick={() =>
                  c.setRecordingRequest((cur) =>
                    cur === 'return' ? null : 'return',
                  )
                }
              >
                <RotateCcw size={14} />
                Ghi nhận đổi trả tại quầy
              </button>
            )}
          </div>
        )}

        {c.recordingRequest && (
          <form className="adm-ord-record-box" onSubmit={c.submitAdminRequest}>
            <h4>
              {c.recordingRequest === 'cancel'
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
                value={c.reqDraft.reason}
                onChange={(e) =>
                  c.setReqDraft((d) => ({ ...d, reason: e.target.value }))
                }
                placeholder="Nhập lý do tối thiểu 5 ký tự..."
              />
            </label>
            {c.recordingRequest === 'return' && (
              <div className="adm-ord-return-checks">
                <label className="adm-check">
                  <input
                    type="checkbox"
                    checked={c.reqDraft.sealed}
                    onChange={(e) =>
                      c.setReqDraft((d) => ({ ...d, sealed: e.target.checked }))
                    }
                  />
                  <span>Thuốc còn nguyên niêm phong và bảo quản đúng</span>
                </label>
                <label className="adm-check">
                  <input
                    type="checkbox"
                    checked={c.reqDraft.storeFault}
                    onChange={(e) =>
                      c.setReqDraft((d) => ({
                        ...d,
                        storeFault: e.target.checked,
                      }))
                    }
                  />
                  <span>Đổi trả do lỗi từ phía nhà thuốc</span>
                </label>
                <label className="adm-check">
                  <input
                    type="checkbox"
                    checked={c.reqDraft.restock}
                    onChange={(e) =>
                      c.setReqDraft((d) => ({
                        ...d,
                        restock: e.target.checked,
                      }))
                    }
                  />
                  <span>Nhập lại hàng vào kho (yêu cầu còn niêm phong)</span>
                </label>
              </div>
            )}
            <div className="adm-ord-fulfill-actions">
              <button
                type="button"
                className="adm-btn small"
                onClick={() => c.setRecordingRequest(null)}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="adm-btn small primary"
                disabled={saving}
              >
                Xác nhận ghi nhận
              </button>
            </div>
          </form>
        )}

        <div className="adm-ord-subtabs">
          <button
            type="button"
            className={c.detailTab === 'history' ? 'active' : ''}
            onClick={() => c.setDetailTab('history')}
          >
            <History size={14} />
            Lịch sử xử lý ({c.history.length})
          </button>
          <button
            type="button"
            className={c.detailTab === 'transactions' ? 'active' : ''}
            onClick={() => c.setDetailTab('transactions')}
          >
            <Wallet size={14} />
            Giao dịch ({c.transactions.length})
          </button>
          <button
            type="button"
            className={c.detailTab === 'requests' ? 'active' : ''}
            onClick={() => c.setDetailTab('requests')}
          >
            <AlertTriangle size={14} />
            Yêu cầu hủy/hoàn ({c.requests.length})
          </button>
        </div>

        {c.detailTab === 'history' && (
          <div className="adm-ord-timeline">
            {c.history.length ? (
              c.history.map((h) => (
                <div key={h.id} className="adm-ord-timeline-item">
                  <Badge value={h.status} />
                  <div>
                    <strong>{h.note || adminLabel(h.status)}</strong>
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

        {c.detailTab === 'transactions' && (
          <Table
            columns={[
              'Mã tham chiếu',
              'Loại',
              'Kênh',
              'Số tiền',
              'Trạng thái',
              'Thời gian',
            ]}
            rows={c.transactions}
            empty="Chưa phát sinh giao dịch thanh toán"
          >
            {c.transactions.map((t) => (
              <tr key={t.id}>
                <td>
                  <code>{t.reference}</code>
                  {t.providerReference && (
                    <small>Ref: {t.providerReference}</small>
                  )}
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

        {c.detailTab === 'requests' && (
          <div className="adm-order-requests">
            {c.requests.length ? (
              c.requests.map((r) => {
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
                        <strong>{adminLabel(r.type)}</strong> — {r.reason}
                      </p>
                      <small>
                        {dateTime(r.createdAt)}
                        {r.handlerName ? ` · Xử lý: ${r.handlerName}` : ''}
                        {r.reply ? ` · ${r.reply}` : ''}
                        {r.refundAmount > 0
                          ? ` · Đã hoàn ${money(r.refundAmount)}`
                          : ''}
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
              <p className="adm-muted-text">
                Đơn hàng chưa có yêu cầu hủy hoặc đổi trả.
              </p>
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
