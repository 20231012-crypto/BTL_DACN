/**
 * Customer Order Detail View powered by useOrderDetailController.
 */
import React from 'react';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  MapPin,
  RotateCcw,
  Star,
  Upload,
} from 'lucide-react';
import { label } from '../../models/constants.js';
import { dateTime, money } from '../../models/formatters.js';
import { useOrderDetailController } from '../../controllers/useOrderDetailController.js';
import BankTransfer from '../components/BankTransfer.jsx';
import ReturnShipment from '../components/ReturnShipment.jsx';
import {
  Badge,
  Breadcrumb,
  ErrorBox,
  Field,
  Modal,
  RequireLogin,
  Spinner,
} from '../components/UiPrimitives.jsx';

export default function OrderDetailView({ id }) {
  const c = useOrderDetailController(id);
  const order = c.order;

  return (
    <RequireLogin>
      <main className="container page-shell">
        <Breadcrumb
          current={order?.code || 'Chi tiết đơn hàng'}
          parent={{ to: '/orders', name: 'Đơn hàng của tôi' }}
        />
        <ErrorBox error={c.error} />
        {!order && !c.error ? (
          <Spinner />
        ) : (
          order && (
            <>
              {c.route.includes('created=1') && (
                <div className="order-success">
                  <CheckCircle2 size={31} />
                  <div>
                    <h2>An Tâm đã nhận đơn hàng của bạn</h2>
                    <p>
                      {order.prescriptionStatus &&
                      !['approved', 'DaDuyet'].includes(
                        order.prescriptionStatus,
                      )
                        ? 'Đơn thuốc sẽ được dược sĩ kiểm duyệt trước khi tiếp tục xử lý.'
                        : 'Bạn có thể theo dõi quá trình xử lý ngay tại đây.'}
                    </p>
                  </div>
                </div>
              )}
              <div className="order-title">
                <div className="order-title-info">
                  <div className="order-title-top">
                    <span className="eyebrow">CHI TIẾT ĐƠN HÀNG</span>
                    <Badge value={order.status} />
                  </div>
                  <h1>{order.code}</h1>
                  <p className="muted">Đặt lúc {dateTime(order.createdAt)}</p>
                </div>
                <div className="order-title-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-small"
                    disabled={c.busy}
                    onClick={c.handleReorder}
                  >
                    <RotateCcw size={14} /> Mua lại
                  </button>
                  <button
                    className="btn btn-outline btn-small"
                    onClick={c.load}
                  >
                    Cập nhật trạng thái
                  </button>
                </div>
              </div>
              {!c.terminal && (
                <div className="order-timeline">
                  {c.steps.map(([key, title], i) => (
                    <div className={i <= c.step ? 'complete' : ''} key={key}>
                      <span>{i < c.step ? <Check size={17} /> : i + 1}</span>
                      <strong>{title}</strong>
                    </div>
                  ))}
                </div>
              )}
              <div className="checkout-layout">
                <div className="checkout-panels">
                  <section className="panel">
                    <h2>Sản phẩm trong đơn</h2>
                    {order.items?.map((item) => (
                      <div
                        className="order-item"
                        key={item.id || item.productId}
                      >
                        <div>
                          <strong>{item.name}</strong>
                          <span>
                            {item.quantity} × {money(item.price)} · {item.unit}
                          </span>
                        </div>
                        <strong>{money(item.quantity * item.price)}</strong>
                        {c.delivered &&
                          (item.reviewed ? (
                            <Badge value="reviewed" />
                          ) : (
                            <button
                              className="btn btn-outline btn-small"
                              onClick={() => {
                                c.setRating(5);
                                c.setReview(item);
                              }}
                            >
                              Đánh giá
                            </button>
                          ))}
                      </div>
                    ))}
                  </section>
                  <section className="panel">
                    <h2>
                      <MapPin size={19} /> Địa chỉ nhận hàng
                    </h2>
                    <strong>
                      {order.address?.recipient || order.recipient} ·{' '}
                      {order.address?.phone || order.phone}
                    </strong>
                    <p className="muted">
                      {typeof order.address === 'string'
                        ? order.address
                        : [
                            order.address?.line1,
                            order.address?.ward,
                            order.address?.district,
                            order.address?.city,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                    </p>
                    {order.note && (
                      <p>
                        <strong>Ghi chú:</strong> {order.note}
                      </p>
                    )}
                  </section>
                  {order.prescriptionId && (
                    <section className="panel">
                      <h2>
                        <FileText size={19} /> Đơn thuốc đính kèm
                      </h2>
                      <Badge
                        value={
                          order.prescriptionStatus === 'pending'
                            ? 'pending_review'
                            : order.prescriptionStatus
                        }
                      />
                      {order.prescriptionNote && (
                        <p>{order.prescriptionNote}</p>
                      )}
                      <a
                        className="subtle-link"
                        href={`/api/prescriptions/${order.prescriptionId}/file`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Xem tệp đơn thuốc <ArrowUpRight size={15} />
                      </a>
                      {order.status === 'pending_prescription' &&
                        ['rejected', 'partial'].includes(
                          order.prescriptionStatus,
                        ) && (
                          <label className="upload-zone replacement-upload">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,application/pdf"
                              disabled={c.busy}
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) c.replacePrescription(file);
                                e.target.value = '';
                              }}
                            />
                            <Upload size={22} />
                            <strong>
                              {c.busy
                                ? 'Đang tải lên…'
                                : 'Bổ sung tệp đơn thuốc mới'}
                            </strong>
                            <span>JPG, PNG hoặc PDF · Tối đa 5 MB</span>
                          </label>
                        )}
                      {order.prescriptionStatus === 'partial' && (
                        <p className="muted">
                          Thuốc được duyệt:{' '}
                          {order.items
                            .filter((item) =>
                              order.prescriptionApprovedProductIds.includes(
                                item.productId,
                              ),
                            )
                            .map((item) => item.name)
                            .join(', ')}
                          .
                        </p>
                      )}
                      {order.status === 'pending_prescription' &&
                        ['rejected', 'partial'].includes(
                          order.prescriptionStatus,
                        ) && (
                          <div className="rx-adjustment-actions">
                            {order.prescriptionStatus === 'partial' && (
                              <button
                                className="btn btn-outline btn-small"
                                onClick={() =>
                                  c.setRxAdjustment('approved_only')
                                }
                              >
                                Giữ thuốc đã duyệt
                              </button>
                            )}
                            {order.items.some(
                              (item) => !item.prescriptionRequired,
                            ) && (
                              <button
                                className="btn btn-outline btn-small"
                                onClick={() => c.setRxAdjustment('remove_all')}
                              >
                                Bỏ thuốc kê đơn
                              </button>
                            )}
                          </div>
                        )}
                    </section>
                  )}
                  {order.requests?.length > 0 && (
                    <section className="panel">
                      <h2>Yêu cầu đã gửi</h2>
                      {order.requests.map((r) => (
                        <div className="request-entry" key={r.id}>
                          <strong>
                            {{
                              cancel: 'Hủy đơn',
                              return: 'Đổi trả',
                              refund: 'Hoàn tiền',
                            }[r.type] || r.type}
                          </strong>{' '}
                          <Badge
                            value={
                              r.status === 'pending'
                                ? 'request_pending'
                                : r.status
                            }
                          />
                          <p>{r.reason}</p>
                          {r.evidenceAvailable && (
                            <a
                              className="subtle-link"
                              href={`/api/orders/${id}/requests/${r.id}/evidence`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ảnh đổi trả <ArrowUpRight size={14} />
                            </a>
                          )}
                          {r.reply && (
                            <p className="muted">
                              Phản hồi của nhà thuốc · {r.reply}
                            </p>
                          )}
                          {r.refundAmount > 0 && (
                            <p>Đã hoàn {money(r.refundAmount)}</p>
                          )}
                          {r.type === 'return' && r.returnGoodsStatus && (
                            <ReturnShipment
                              orderId={id}
                              request={r}
                              notify={c.notify}
                              onSaved={c.load}
                            />
                          )}
                        </div>
                      ))}
                    </section>
                  )}
                  {order.history?.length > 0 && (
                    <section className="panel">
                      <h2>
                        <Clock3 size={18} /> Lịch sử xử lý
                      </h2>
                      <ol className="order-history">
                        {order.history.toReversed().map((entry) => (
                          <li key={entry.id}>
                            <strong>{label(entry.status)}</strong>
                            <time>{dateTime(entry.createdAt)}</time>
                            {entry.note && <p>{entry.note}</p>}
                          </li>
                        ))}
                      </ol>
                    </section>
                  )}
                </div>
                <aside className="panel order-summary">
                  <h2>Thanh toán</h2>
                  <div>
                    <span>Tạm tính</span>
                    <strong>{money(order.subtotal)}</strong>
                  </div>
                  <div>
                    <span>Giảm giá</span>
                    <strong>−{money(order.discount)}</strong>
                  </div>
                  <div>
                    <span>Phí giao hàng</span>
                    <strong>{money(order.shippingFee)}</strong>
                  </div>
                  <div className="summary-total">
                    <span>Tổng cộng</span>
                    <strong>{money(order.total)}</strong>
                  </div>
                  <div>
                    <span>Phương thức</span>
                    <strong>
                      {order.paymentMethod === 'cod'
                        ? 'COD'
                        : label(order.paymentMethod)}
                    </strong>
                  </div>
                  <div>
                    <span>Trạng thái</span>
                    <Badge value={order.paymentStatus} />
                  </div>
                  {order.paymentStatus === 'failed' && (
                    <ErrorBox error="Thanh toán chưa thành công. Bạn có thể thử lại hoặc chuyển sang COD." />
                  )}
                  {c.paymentReturn === 'waiting' &&
                    order.status === 'pending_payment' && (
                      <p className="muted small">
                        Đang chờ VNPay xác nhận. Dùng nút Cập nhật trạng thái để
                        kiểm tra lại.
                      </p>
                    )}
                  {order.status === 'pending_prescription' &&
                    order.paymentMethod !== 'cod' && (
                      <p className="muted small">
                        Thanh toán mở sau khi dược sĩ duyệt đơn thuốc.
                      </p>
                    )}
                  {order.paymentMethod === 'bank_transfer' &&
                    order.status === 'pending_payment' && (
                      <BankTransfer orderId={order.id} />
                    )}
                  {order.paymentMethod === 'vnpay' &&
                    order.status === 'pending_payment' &&
                    c.config?.paymentMethods.includes('vnpay') && (
                      <button
                        className="btn btn-primary full-width"
                        disabled={c.busy}
                        onClick={c.payVnpay}
                      >
                        <CreditCard size={17} /> Mở VNPay Sandbox
                      </button>
                    )}
                  {order.paymentMethod === 'demo' &&
                    c.config?.demoMode &&
                    order.status === 'pending_payment' && (
                      <div className="demo-payment">
                        <strong>
                          <CreditCard size={17} /> Cổng thanh toán mô phỏng
                        </strong>
                        <p>
                          Không thu tiền thật. Đơn kê đơn cần được duyệt trước
                          khi thanh toán.
                        </p>
                        <button
                          className="btn btn-primary full-width"
                          disabled={c.busy}
                          onClick={() => c.payDemo('success')}
                        >
                          Mô phỏng thành công
                        </button>
                        <button
                          className="btn btn-outline full-width"
                          disabled={c.busy}
                          onClick={() => c.payDemo('failed')}
                        >
                          Mô phỏng thất bại
                        </button>
                      </div>
                    )}
                  {order.status === 'pending_payment' &&
                    order.transactions?.every(
                      (t) => t.status !== 'pending',
                    ) && (
                      <button
                        className="btn btn-outline full-width"
                        disabled={c.busy}
                        onClick={c.switchCod}
                      >
                        Chuyển sang COD
                      </button>
                    )}
                  {(!c.terminal || c.refundAvailable) && (
                    <div className="order-request-actions">
                      {!c.delivered &&
                        !c.terminal &&
                        !c.pendingRequest('cancel') &&
                        !['shipping', 'DangGiao'].includes(order.status) && (
                          <button
                            className="btn btn-outline full-width"
                            onClick={() => c.setRequest('cancel')}
                          >
                            Yêu cầu hủy đơn
                          </button>
                        )}
                      {c.delivered && !c.pendingRequest('return') && (
                        <button
                          className="btn btn-outline full-width"
                          onClick={() => c.setRequest('return')}
                        >
                          Yêu cầu đổi trả
                        </button>
                      )}
                      {c.refundAvailable && (
                        <button
                          className="btn btn-outline full-width"
                          onClick={() => c.setRequest('refund')}
                        >
                          Yêu cầu hoàn tiền
                        </button>
                      )}
                    </div>
                  )}
                </aside>
              </div>
            </>
          )
        )}
        {c.rxAdjustment && (
          <Modal
            title="Xác nhận điều chỉnh đơn hàng"
            onClose={() => c.setRxAdjustment(null)}
          >
            <form onSubmit={c.adjustRx}>
              <p className="muted">
                {c.rxAdjustment === 'approved_only'
                  ? 'Giữ thuốc đã duyệt và sản phẩm không cần đơn thuốc.'
                  : 'Chỉ giữ sản phẩm không cần đơn thuốc.'}{' '}
                An Tâm sẽ tính lại phí giao hàng và ưu đãi trên các sản phẩm
                còn lại.
              </p>
              <button
                className="btn btn-primary full-width"
                disabled={c.busy}
              >
                Xác nhận điều chỉnh
              </button>
            </form>
          </Modal>
        )}
        {c.request && (
          <Modal
            title={
              c.request === 'cancel'
                ? 'Yêu cầu hủy đơn'
                : c.request === 'return'
                  ? 'Yêu cầu đổi trả'
                  : 'Yêu cầu hoàn tiền'
            }
            onClose={() => {
              c.setRequest(null);
              c.setReason('');
              c.setReturnEvidence(null);
            }}
          >
            <form onSubmit={c.submitRequest}>
              <p className="muted">
                Nhà thuốc sẽ kiểm tra và phản hồi yêu cầu của bạn.
              </p>
              <Field label="Lý do">
                <textarea
                  rows={4}
                  value={c.reason}
                  onChange={(e) => c.setReason(e.target.value)}
                  minLength={5}
                  maxLength={1000}
                  required
                />
              </Field>
              {c.request === 'return' && (
                <Field label="Ảnh tình trạng sản phẩm (JPG hoặc PNG, tối đa 5 MB)">
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    required
                    onChange={(e) =>
                      c.setReturnEvidence(e.target.files[0] || null)
                    }
                  />
                </Field>
              )}
              <button
                className="btn btn-primary full-width"
                disabled={c.busy}
              >
                Gửi yêu cầu
              </button>
            </form>
          </Modal>
        )}
        {c.review && (
          <Modal
            title="Chia sẻ đánh giá của bạn"
            onClose={() => c.setReview(null)}
          >
            <form onSubmit={c.submitReview}>
              <p>{c.review.name}</p>
              <div className="rating-input">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    aria-label={`${n} sao`}
                    key={n}
                    onClick={() => c.setRating(n)}
                  >
                    <Star
                      fill={n <= c.rating ? 'currentColor' : 'none'}
                      size={29}
                    />
                  </button>
                ))}
              </div>
              <Field label="Nhận xét">
                <textarea
                  value={c.comment}
                  onChange={(e) => c.setComment(e.target.value)}
                  maxLength={1000}
                  minLength={5}
                  required
                  rows={4}
                />
              </Field>
              <button
                className="btn btn-primary full-width"
                disabled={c.busy}
              >
                Gửi đánh giá
              </button>
            </form>
          </Modal>
        )}
      </main>
    </RequireLogin>
  );
}
