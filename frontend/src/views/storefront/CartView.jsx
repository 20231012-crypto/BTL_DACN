/**
 * Cart View powered by useCartController.
 */
import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
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
              <div className="cart-table-head">
                <span>Sản phẩm</span>
                <span>Số lượng</span>
                <span>Thành tiền</span>
              </div>
              {c.cart.map((item) => (
                <div
                  className={`cart-row ${c.busy === item.id ? 'is-busy' : ''}`}
                  key={item.id}
                >
                  <Link
                    to={`/products/${item.productId}`}
                    className="cart-product"
                  >
                    <img src={item.product.image} alt="" />
                    <div>
                      <strong>{item.product.name}</strong>
                      <span>{item.product.unit}</span>
                      {item.product.prescriptionRequired && (
                        <small className="rx-text">Cần đơn thuốc</small>
                      )}
                      <span>{money(item.product.price)}</span>
                    </div>
                  </Link>
                  <Quantity
                    value={item.quantity}
                    max={item.product.stock}
                    onChange={(quantity) => c.changeQuantity(item.id, quantity)}
                  />
                  <div className="cart-row-total">
                    <strong>{money(item.quantity * item.product.price)}</strong>
                    <button
                      className="remove-item"
                      onClick={() => c.changeQuantity(item.id, 0)}
                      disabled={c.busy === item.id}
                    >
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                </div>
              ))}
              <Link to="/products" className="subtle-link">
                <ArrowLeft size={16} /> Tiếp tục mua sắm
              </Link>
            </section>
            <aside className="panel order-summary">
              <h2>Tóm tắt giỏ hàng</h2>
              <div>
                <span>Tạm tính</span>
                <strong>{money(c.subtotal)}</strong>
              </div>
              <p className="muted small">
                Phí giao hàng và mã ưu đãi được tính ở bước đặt hàng.
              </p>
              <div className="summary-total">
                <span>Tạm tính</span>
                <strong>{money(c.subtotal)}</strong>
              </div>
              <Link to="/checkout" className="btn btn-primary full-width">
                Tiến hành đặt hàng <ArrowRight size={17} />
              </Link>
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
