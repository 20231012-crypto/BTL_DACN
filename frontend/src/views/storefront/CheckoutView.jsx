/**
 * Checkout View powered by useCheckoutController:
 * renders selected cart items (products & combos), voucher picker modal (manual or best auto-select), and order placement.
 */
import React from 'react';
import {
  Check,
  CheckCircle2,
  CreditCard,
  Layers,
  LoaderCircle,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  TicketPercent,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { PROMOTION_SCOPE_LABELS } from '../../models/constants.js';
import { fmtDate, money } from '../../models/formatters.js';
import { useCheckoutController } from '../../controllers/useCheckoutController.js';
import AddressFields from '../components/AddressFields.jsx';
import Link from '../components/Link.jsx';
import {
  Breadcrumb,
  Empty,
  ErrorBox,
  Field,
  Modal,
  RequireLogin,
} from '../components/UiPrimitives.jsx';

export default function CheckoutView() {
  const c = useCheckoutController();

  const scopeBadgeText = (p) => {
    if (p.applyScope === 'combo') {
      return p.targetNames?.length
        ? `Combo: ${p.targetNames.join(', ')}`
        : 'Áp dụng cho Combo sản phẩm';
    }
    if (p.applyScope === 'product') {
      return p.targetNames?.length
        ? `Sản phẩm: ${p.targetNames.slice(0, 2).join(', ')}${p.targetNames.length > 2 ? ` +${p.targetNames.length - 2}` : ''}`
        : 'Áp dụng cho sản phẩm nhất định';
    }
    return PROMOTION_SCOPE_LABELS.order;
  };

  return (
    <RequireLogin>
      <main className="container page-shell">
        <Breadcrumb
          current="Đặt hàng"
          parent={{ to: '/cart', name: 'Giỏ hàng' }}
        />
        <div className="page-heading">
          <span className="eyebrow">THÊM MỘT BƯỚC ĐỂ AN TÂM</span>
          <h1>Hoàn tất đơn hàng</h1>
        </div>
        {c.checkoutItems.length ? (
          <form onSubmit={c.placeOrder} className="checkout-layout">
            <div className="checkout-panels">
              <section className="panel">
                <h2>
                  <span className="step-number">1</span> Thông tin nhận hàng
                </h2>
                {c.addresses.length > 0 && (
                  <div className="address-options">
                    {c.addresses.map((a) => (
                      <label
                        className={`address-option ${c.addressId === String(a.id) ? 'selected' : ''}`}
                        key={a.id}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={c.addressId === String(a.id)}
                          onChange={() => c.setAddressId(String(a.id))}
                        />
                        <div>
                          <strong>
                            {a.recipient} · {a.phone}
                          </strong>
                          <span>
                            {[a.line1, a.ward, a.district, a.city]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      </label>
                    ))}
                    <label className="radio-line">
                      <input
                        type="radio"
                        name="address"
                        checked={c.addressId === 'new'}
                        onChange={() => c.setAddressId('new')}
                      />{' '}
                      Dùng địa chỉ khác
                    </label>
                  </div>
                )}
                {c.addressId === 'new' && (
                  <AddressFields address={c.address} onChange={c.setAddress} />
                )}
              </section>
              {c.rx && (
                <section className="panel rx-panel">
                  <h2>
                    <span className="step-number">2</span> Đơn thuốc của bạn{' '}
                    <span className="badge">Bắt buộc</span>
                  </h2>
                  <p>
                    Dược sĩ sẽ kiểm tra đơn trước khi xử lý. Tệp được lưu riêng
                    tư và chỉ người có quyền mới xem được.
                  </p>
                  <label
                    className={`upload-zone ${c.prescription ? 'uploaded' : ''}`}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={c.upload}
                      disabled={c.uploading}
                    />
                    {c.uploading ? (
                      <LoaderCircle className="spin" />
                    ) : c.prescription ? (
                      <CheckCircle2 size={25} />
                    ) : (
                      <Upload size={25} />
                    )}
                    <strong>
                      {c.uploading
                        ? 'Đang tải lên…'
                        : c.prescription
                          ? c.prescription.fileName
                          : 'Chọn ảnh hoặc tệp đơn thuốc'}
                    </strong>
                    <span>JPG, PNG hoặc PDF · Tối đa 5 MB</span>
                  </label>
                </section>
              )}
              <section className="panel">
                <h2>
                  <span className="step-number">{c.rx ? 3 : 2}</span> Phương thức
                  thanh toán
                </h2>
                <label
                  className={`payment-option ${c.method === 'cod' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={c.method === 'cod'}
                    onChange={() => c.setMethod('cod')}
                  />
                  <Truck size={23} />
                  <div>
                    <strong>Thanh toán khi nhận hàng (COD)</strong>
                    <span>
                      Thanh toán cho nhân viên khi nhận được đơn hàng.
                    </span>
                  </div>
                </label>
                {c.onlineMethods.map((provider) => (
                  <label
                    key={provider}
                    className={`payment-option ${c.method === provider ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={c.method === provider}
                      onChange={() => c.setMethod(provider)}
                    />
                    <CreditCard size={23} />
                    <div>
                      <strong>
                        {provider === 'bank_transfer'
                          ? 'Chuyển khoản ngân hàng (VietQR)'
                          : provider === 'demo'
                            ? 'Thanh toán trực tuyến mô phỏng'
                            : 'VNPay Sandbox'}
                      </strong>
                      <span>
                        {provider === 'bank_transfer'
                          ? 'Quét mã theo số tiền của đơn. Nhà thuốc xác nhận khi nhận tiền.'
                          : provider === 'demo'
                            ? 'Chọn kết quả thành công hoặc thất bại để kiểm thử luồng.'
                            : 'Chuyển sang cổng thử nghiệm VNPay sau khi tạo đơn.'}
                      </span>
                    </div>
                  </label>
                ))}
                <Field label="Ghi chú cho nhà thuốc">
                  <textarea
                    value={c.note}
                    onChange={(e) => c.setNote(e.target.value)}
                    maxLength={1000}
                    placeholder="Điều bạn muốn nhà thuốc lưu ý…"
                    rows={3}
                  />
                </Field>
              </section>
            </div>
            <aside className="panel order-summary">
              <h2>
                Đơn hàng của bạn ({c.checkoutItems.length}/{c.cart.length} mục)
              </h2>
              <div className="checkout-items">
                {c.checkoutItems.map((item) => {
                  const isCombo = item.itemType === 'combo';
                  const unitPrice = isCombo
                    ? Number(item.combo?.price || 0)
                    : Number(item.product?.price || 0);
                  const image = isCombo
                    ? item.combo?.image
                    : item.product?.image;
                  const name = isCombo ? item.combo?.name : item.product?.name;
                  return (
                    <div key={item.id}>
                      <img
                        src={image || '/assets/products/vitamin-c.svg'}
                        alt=""
                      />
                      <span>
                        {isCombo && (
                          <em className="combo-inline-tag">
                            <Layers size={11} /> Combo
                          </em>
                        )}{' '}
                        {name}
                        <small>
                          {item.quantity} × {money(unitPrice)}
                        </small>
                      </span>
                      <strong>{money(item.quantity * unitPrice)}</strong>
                    </div>
                  );
                })}
              </div>

              <div className="voucher-summary-box">
                <div className="voucher-summary-head">
                  <span>
                    <TicketPercent size={16} /> Voucher khuyến mãi
                  </span>
                  {c.promotion && (
                    <button
                      type="button"
                      className="voucher-clear-btn"
                      onClick={c.clearPromotion}
                    >
                      <X size={13} /> Bỏ chọn
                    </button>
                  )}
                </div>
                {c.promotion ? (
                  <div className="voucher-applied-pill">
                    <div>
                      <strong>
                        {c.promotion.code}
                        {c.bestPromotion?.code === c.promotion.code && (
                          <em className="voucher-best-tag">
                            <Sparkles size={11} /> Tốt nhất
                          </em>
                        )}
                      </strong>
                      <small>{c.promotion.name}</small>
                    </div>
                    <b className="in-stock">−{money(c.promotion.discount)}</b>
                  </div>
                ) : (
                  <p className="muted small voucher-hint-text">
                    {c.bestPromotion
                      ? `Gợi ý tốt nhất: ${c.bestPromotion.code} (giảm ${money(c.bestPromotion.discount)})`
                      : 'Chọn mã ưu đãi phù hợp hoặc để hệ thống tự chọn mã tốt nhất.'}
                  </p>
                )}
                <div className="voucher-actions-row">
                  <button
                    type="button"
                    className="btn btn-outline voucher-pick-btn"
                    onClick={() => c.setVoucherModalOpen(true)}
                  >
                    <Tag size={15} /> Áp dụng voucher
                  </button>
                  {c.bestPromotion &&
                    c.promotion?.code !== c.bestPromotion.code && (
                      <button
                        type="button"
                        className="btn btn-soft voucher-best-btn"
                        onClick={c.applyBestPromotion}
                      >
                        <Sparkles size={15} /> Chọn tốt nhất
                      </button>
                    )}
                </div>
              </div>

              <div>
                <span>Tạm tính</span>
                <strong>{money(c.subtotal)}</strong>
              </div>
              {c.promotion && (
                <div>
                  <span>Ưu đãi {c.promotion.code}</span>
                  <strong className="in-stock">
                    −{money(c.promotion.discount)}
                  </strong>
                </div>
              )}
              <div>
                <span>Giao hàng</span>
                <strong>
                  {c.shippingFee === null
                    ? 'Tính khi tạo đơn'
                    : money(c.shippingFee)}
                </strong>
              </div>
              <div className="summary-total">
                <span>
                  {c.shippingFee === null ? 'Tạm tính' : 'Tổng dự kiến'}
                </span>
                <strong>
                  {money(
                    Math.max(
                      0,
                      c.subtotal -
                        (c.promotion?.discount || 0) +
                        (c.shippingFee || 0),
                    ),
                  )}
                </strong>
              </div>
              <ErrorBox error={c.error} />
              <button
                className="btn btn-primary full-width"
                disabled={c.busy || c.uploading}
                type="submit"
              >
                {c.busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <Check size={18} />
                )}{' '}
                Đặt hàng
              </button>
              <span className="summary-secure">
                <ShieldCheck size={15} /> Tổng chính xác hiển thị trong đơn đã
                tạo.
              </span>
            </aside>
          </form>
        ) : c.cart.length ? (
          <Empty
            icon={ShoppingBag}
            title="Chưa có sản phẩm nào được chọn để thanh toán"
            text="Hãy quay lại giỏ hàng và đánh dấu chọn các sản phẩm bạn muốn đặt hàng."
          >
            <Link to="/cart" className="btn btn-primary">
              Quay lại giỏ hàng
            </Link>
          </Empty>
        ) : (
          <Empty
            icon={ShoppingBag}
            title="Giỏ hàng của bạn đang trống"
            text="Thêm sản phẩm trước khi đặt hàng."
          >
            <Link to="/products" className="btn btn-primary">
              Chọn sản phẩm
            </Link>
          </Empty>
        )}

        {c.voucherModalOpen && (
          <Modal
            title="Chọn voucher ưu đãi"
            onClose={() => c.setVoucherModalOpen(false)}
          >
            <div className="voucher-modal-content">
              <div className="coupon-field">
                <input
                  aria-label="Mã ưu đãi"
                  placeholder="Nhập mã voucher thủ công…"
                  value={c.promotionCode}
                  onChange={(e) =>
                    c.setPromotionCode(e.target.value.toUpperCase())
                  }
                />
                <button
                  type="button"
                  onClick={() => c.applyCode()}
                  disabled={!c.promotionCode.trim()}
                >
                  Áp dụng
                </button>
              </div>
              {c.bestPromotion && (
                <div className="voucher-best-banner">
                  <div>
                    <strong>
                      <Sparkles size={15} /> Hệ thống gợi ý voucher tốt nhất
                    </strong>
                    <span>
                      Mã <b>{c.bestPromotion.code}</b> giúp bạn giảm tối đa{' '}
                      <b>{money(c.bestPromotion.discount)}</b> cho đơn này.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary small"
                    onClick={c.applyBestPromotion}
                  >
                    Dùng mã tốt nhất
                  </button>
                </div>
              )}
              <ErrorBox error={c.error} />
              <div className="voucher-list">
                {c.loadingPromos ? (
                  <p className="muted small">Đang kiểm tra các mã ưu đãi…</p>
                ) : c.promos.length === 0 ? (
                  <p className="muted small">
                    Hiện chưa có chương trình khuyến mãi nào đang hoạt động.
                  </p>
                ) : (
                  c.promos.map((p) => {
                    const selected = c.promotion?.code === p.code;
                    return (
                      <div
                        key={p.id || p.code}
                        className={`voucher-card ${selected ? 'is-selected' : ''} ${!p.eligible ? 'is-disabled' : ''}`}
                      >
                        <div className="voucher-card-main">
                          <div className="voucher-card-top">
                            <span className="voucher-code-chip">{p.code}</span>
                            {p.isBest && p.eligible && (
                              <span className="voucher-best-tag">
                                <Sparkles size={11} /> Tốt nhất
                              </span>
                            )}
                            <span className="voucher-scope-tag">
                              {scopeBadgeText(p)}
                            </span>
                          </div>
                          <strong>{p.name}</strong>
                          <p className="voucher-meta">
                            {p.type === 'percent'
                              ? `Giảm ${p.value}%${p.maxDiscount ? ` (tối đa ${money(p.maxDiscount)})` : ''}`
                              : `Giảm trực tiếp ${money(p.value)}`}
                            {p.minOrder > 0
                              ? ` · Tối thiểu ${money(p.minOrder)}`
                              : ''}
                            {p.endDate ? ` · HSD: ${fmtDate(p.endDate)}` : ''}
                          </p>
                          {p.eligible ? (
                            <span className="voucher-saving">
                              Giảm cho đơn này: <b>−{money(p.discount)}</b>
                            </span>
                          ) : (
                            <span className="voucher-ineligible-reason">
                              {p.reason}
                            </span>
                          )}
                        </div>
                        <div className="voucher-card-action">
                          {selected ? (
                            <button
                              type="button"
                              className="btn btn-outline small"
                              onClick={c.clearPromotion}
                            >
                              Đang dùng
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary small"
                              disabled={!p.eligible}
                              onClick={() => c.selectPromotion(p)}
                            >
                              Chọn
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Modal>
        )}
      </main>
    </RequireLogin>
  );
}
