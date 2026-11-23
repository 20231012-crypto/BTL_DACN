/**
 * Cart View powered by useCartController: supports per-item checkbox selection and product combos.
 */
import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Layers,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { money } from '../../models/formatters.js';
import { useCartController } from '../../controllers/useCartController.js';
import Link from '../components/Link.jsx';
import {
  Breadcrumb,
  Empty,
  Quantity,
  RequireLogin,
} from '../components/UiPrimitives.jsx';

export default function CartView() {
  const c = useCartController();

  return (
    <RequireLogin>
      <main className="container page-shell">
        <Breadcrumb current="Giỏ hàng" />
        <div className="page-heading">
          <span className="eyebrow">CHỌN LỰA CHO SỨC KHỎE</span>
          <h1>
            Giỏ hàng của bạn{' '}
            <span className="title-count">{c.cart.length}</span>
          </h1>
        </div>
        {!c.cart.length ? (
          <Empty
            icon={ShoppingBag}
            title="Giỏ hàng đang chờ bạn"
            text="Khám phá những sản phẩm chăm sóc sức khỏe dành cho bạn và gia đình."
          >
            <Link to="/products" className="btn btn-primary">
              Khám phá sản phẩm <ArrowRight size={17} />
            </Link>
          </Empty>
        ) : (
          <div className="checkout-layout">
            <section className="panel cart-panel">
              <div className="cart-table-head cart-table-head-check">
                <label className="cart-select-all">
                  <input
                    type="checkbox"
                    checked={c.allSelected}
                    disabled={c.busy === '__all__'}
                    onChange={(e) => c.toggleAll(e.target.checked)}
                  />
                  <span>
                    Chọn tất cả ({c.selectedItems.length}/{c.cart.length})
                  </span>
                </label>
                <span>Số lượng</span>
                <span>Thành tiền</span>
              </div>
              {c.cart.map((item) => {
                const isCombo = item.itemType === 'combo';
                const checked = item.selected !== false;
                const unitPrice = isCombo
                  ? Number(item.combo?.price || 0)
                  : Number(item.product?.price || 0);
                const maxStock = isCombo
                  ? Number(item.combo?.stock || 0)
                  : Number(item.product?.stock || 0);
                const title = isCombo ? item.combo?.name : item.product?.name;
                const image = isCombo
                  ? item.combo?.image
                  : item.product?.image;
                const requiresRx = isCombo
                  ? item.combo?.prescriptionRequired
                  : item.product?.prescriptionRequired;

                return (
                  <div
                    className={`cart-row cart-row-check ${c.busy === item.id ? 'is-busy' : ''} ${!checked ? 'is-unselected' : ''}`}
                    key={item.id}
                  >
                    <div className="cart-product-wrap">
                      <label className="cart-item-check">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={c.busy === item.id || c.busy === '__all__'}
                          onChange={(e) => c.toggleItem(item, e.target.checked)}
                          aria-label={`Chọn ${title} để thanh toán`}
                        />
                      </label>
                      {isCombo ? (
                        <div className="cart-product">
                          <img
                            src={image || '/assets/products/vitamin-c.svg'}
                            alt=""
                          />
                          <div>
                            <div className="cart-combo-head">
                              <span className="combo-pill">
                                <Layers size={12} /> Combo
                              </span>
                              <strong>{title}</strong>
                            </div>
                            <span className="cart-combo-items">
                              {(item.combo?.items || [])
                                .map(
                                  (ci) =>
                                    `${ci.quantity}× ${ci.product?.name || ''}`,
                                )
                                .join(' + ')}
                            </span>
                            {requiresRx && (
                              <small className="rx-text">Cần đơn thuốc</small>
                            )}
                            <span className="cart-price-pair">
                              <b>{money(unitPrice)}</b>
                              {item.combo?.originalPrice > unitPrice && (
                                <del>{money(item.combo.originalPrice)}</del>
                              )}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <Link
                          to={`/products/${item.productId}`}
                          className="cart-product"
                        >
                          <img src={image} alt="" />
                          <div>
                            <strong>{title}</strong>
                            <span>{item.product?.unit}</span>
                            {requiresRx && (
                              <small className="rx-text">Cần đơn thuốc</small>
                            )}
                            <span>{money(unitPrice)}</span>
                          </div>
                        </Link>
                      )}
                    </div>
                    <Quantity
                      value={item.quantity}
                      max={maxStock}
                      onChange={(quantity) => c.changeQuantity(item, quantity)}
                    />
                    <div className="cart-row-total">
                      <strong>{money(item.quantity * unitPrice)}</strong>
                      <button
                        className="remove-item"
                        onClick={() => c.changeQuantity(item, 0)}
                        disabled={c.busy === item.id}
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
              <Link to="/products" className="subtle-link">
                <ArrowLeft size={16} /> Tiếp tục mua sắm
              </Link>
            </section>
            <aside className="panel order-summary">
              <h2>Tóm tắt giỏ hàng</h2>
              <div>
                <span>Sản phẩm đã chọn</span>
                <strong>
                  {c.selectedItems.length} mục ({c.selectedCount} sản phẩm)
                </strong>
              </div>
              <div>
                <span>Tạm tính</span>
                <strong>{money(c.subtotal)}</strong>
              </div>
              <p className="muted small">
                Chỉ các sản phẩm được đánh dấu chọn mới được thanh toán. Các sản
                phẩm còn lại vẫn được giữ nguyên trong giỏ hàng.
              </p>
              <div className="summary-total">
                <span>Tạm tính thanh toán</span>
                <strong>{money(c.subtotal)}</strong>
              </div>
              <button
                type="button"
                onClick={c.proceedToCheckout}
                disabled={!c.selectedItems.length}
                className="btn btn-primary full-width"
              >
                Tiến hành đặt hàng ({c.selectedItems.length}){' '}
                <ArrowRight size={17} />
              </button>
              <span className="summary-secure">
                <ShieldCheck size={15} /> Thông tin của bạn được bảo vệ
              </span>
            </aside>
          </div>
        )}
      </main>
    </RequireLogin>
  );
}
