/**
 * Checkout View powered by useCheckoutController.
 */
import React from 'react';
import {
  Check,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Upload,
} from 'lucide-react';
import { money } from '../../models/formatters.js';
import { useCheckoutController } from '../../controllers/useCheckoutController.js';
import AddressFields from '../components/AddressFields.jsx';
import Link from '../components/Link.jsx';
import {
  Breadcrumb,
  Empty,
  ErrorBox,
  Field,
  RequireLogin,
} from '../components/UiPrimitives.jsx';

export default function CheckoutView() {
  const c = useCheckoutController();

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
        {c.cart.length ? (
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
              <h2>Đơn hàng của bạn</h2>
              <div className="checkout-items">
                {c.cart.map((item) => (
                  <div key={item.id}>
                    <img src={item.product.image} alt="" />
                    <span>
                      {item.product.name}
                      <small>
                        {item.quantity} × {money(item.product.price)}
                      </small>
                    </span>
                    <strong>{money(item.quantity * item.product.price)}</strong>
                  </div>
                ))}
              </div>
              <div className="coupon-field">
                <input
                  aria-label="Mã ưu đãi"
                  placeholder="Nhập mã ưu đãi"
                  value={c.promotionCode}
                  onChange={(e) =>
                    c.setPromotionCode(e.target.value.toUpperCase())
                  }
                />
                <button
                  type="button"
                  onClick={c.applyCode}
                  disabled={!c.promotionCode}
                >
                  Áp dụng
                </button>
              </div>
              {c.promos.length > 0 && (
                <div className="available-coupons">
                  {c.promos.slice(0, 2).map((p) => (
                    <button
                      type="button"
                      key={p.id || p.code}
                      onClick={() => c.setPromotionCode(p.code)}
                    >
                      {p.code}
                    </button>
                  ))}
                </div>
              )}
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
                    c.subtotal -
                      (c.promotion?.discount || 0) +
                      (c.shippingFee || 0),
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
      </main>
    </RequireLogin>
  );
}
