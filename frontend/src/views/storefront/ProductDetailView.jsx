/**
 * Product Detail View powered by useProductDetailController.
 */
import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  FileText,
  Heart,
  MessageCircle,
  Package,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { dateTime, money } from '../../models/formatters.js';
import { useProductDetailController } from '../../controllers/useProductDetailController.js';
import Link from '../components/Link.jsx';
import ProductCard from '../components/ProductCard.jsx';
import {
  Breadcrumb,
  ErrorBox,
  Quantity,
  Spinner,
} from '../components/UiPrimitives.jsx';

export default function ProductDetailView({ id }) {
  const c = useProductDetailController(id);
  const p = c.product;

  if (c.error)
    return (
      <main className="container page-shell">
        <ErrorBox error={c.error} />
        <Link to="/products">Quay lại sản phẩm</Link>
      </main>
    );
  if (!p) return <Spinner />;

  return (
    <main className="container page-shell">
      <Breadcrumb
        current={p.name}
        parent={{ to: '/products', name: 'Sản phẩm' }}
      />
      <section className="product-detail">
        <div className="detail-image">
          <img src={p.image} alt={p.name} />
          <span>Hình ảnh minh họa cho đồ án</span>
        </div>
        <div className="detail-copy">
          <span className="eyebrow">
            {p.categoryName || 'CHĂM SÓC SỨC KHỎE'}
          </span>
          <h1>{p.name}</h1>
          <div className="detail-meta">
            <span>{p.manufacturer}</span>
            <i />
            {p.stock > 0 ? (
              <span className="in-stock">
                <CheckCircle2 size={14} /> Còn {p.stock} sản phẩm
              </span>
            ) : (
              <span>Tạm hết hàng</span>
            )}
          </div>
          <div className="detail-price">
            <strong>{money(p.price)}</strong>
            <span>/ {p.unit}</span>
            {p.oldPrice > p.price && <del>{money(p.oldPrice)}</del>}
          </div>
          <p>{p.description}</p>
          {p.prescriptionRequired && (
            <div className="rx-notice">
              <FileText size={23} />
              <div>
                <strong>Sản phẩm cần đơn thuốc</strong>
                <p>
                  Tải đơn thuốc khi đặt hàng. Dược sĩ sẽ kiểm duyệt trước khi
                  đơn được xác nhận hoặc thanh toán.
                </p>
              </div>
            </div>
          )}
          <div className="detail-quantity-row">
            <span className="quantity-label">Số lượng</span>
            <Quantity
              value={c.quantity}
              max={p.stock}
              onChange={c.setQuantity}
            />
          </div>
          <div className="detail-actions">
            <button
              className="btn btn-primary"
              disabled={p.stock <= 0}
              onClick={() => c.addToCart(p.id, c.quantity)}
            >
              <ShoppingBag size={18} /> Thêm vào giỏ hàng
            </button>
            <button
              type="button"
              className={`btn btn-outline detail-wish-btn${c.isWishlisted(p.id) ? ' active' : ''}`}
              onClick={() => c.toggleWishlist(p)}
              aria-label={
                c.isWishlisted(p.id) ? 'Bỏ khỏi yêu thích' : 'Lưu vào yêu thích'
              }
            >
              <Heart
                size={18}
                fill={c.isWishlisted(p.id) ? 'currentColor' : 'none'}
              />
              {c.isWishlisted(p.id) ? 'Đã lưu' : 'Yêu thích'}
            </button>
          </div>
          <button className="detail-consult" onClick={c.openChat}>
            <MessageCircle size={18} /> Hỏi thêm về sản phẩm này{' '}
            <ArrowRight size={16} />
          </button>
          <div className="detail-assurances">
            <span>
              <ShieldCheck size={17} /> Thông tin rõ ràng
            </span>
            <span>
              <Package size={17} /> Quản lý theo lô, hạn dùng
            </span>
          </div>
        </div>
      </section>
      <section className="detail-lower">
        <div className="panel">
          <h2>Thông tin sản phẩm</h2>
          <dl className="product-specs">
            <dt>Hoạt chất / Thành phần</dt>
            <dd>{p.ingredient || 'Xem thông tin trên nhãn sản phẩm.'}</dd>
            <dt>Quy cách</dt>
            <dd>{p.unit}</dd>
            <dt>Nhà sản xuất</dt>
            <dd>{p.manufacturer}</dd>
            <dt>Thông tin sử dụng</dt>
            <dd>
              {p.usage ||
                'Đọc kỹ nhãn và hướng dẫn của nhà sản xuất. Hỏi dược sĩ khi cần.'}
            </dd>
            <dt>Lưu ý</dt>
            <dd>
              {p.warning ||
                'Thông tin trong bản demo chỉ để minh họa chức năng, không dùng làm chỉ dẫn điều trị.'}
            </dd>
          </dl>
        </div>
        <aside className="panel demo-note">
          <CircleHelp size={25} />
          <h3>Thông tin dành cho bạn</h3>
          <p>
            Dữ liệu sản phẩm là dữ liệu mẫu cho đồ án. Chatbot cung cấp thông
            tin tham khảo và hỗ trợ kết nối dược sĩ.
          </p>
          <button className="btn btn-outline" onClick={c.openChat}>
            Trao đổi cùng An Tâm
          </button>
        </aside>
      </section>
      <section className="panel reviews">
        <h2>
          Đánh giá sản phẩm <span>({p.reviews?.length || 0})</span>
        </h2>
        {p.reviews?.length ? (
          p.reviews.map((r) => (
            <div className="review" key={r.id}>
              <span className="review-avatar">
                {(r.userName || r.name || 'K')[0]}
              </span>
              <div>
                <strong>{r.userName || r.name || 'Khách hàng'}</strong>
                <div className="stars">
                  {'★'.repeat(r.rating)}
                  {'☆'.repeat(5 - r.rating)}
                </div>
                <p>{r.comment}</p>
                <small>{dateTime(r.createdAt)}</small>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">
            Chưa có đánh giá. Sau khi nhận hàng, bạn có thể đánh giá sản phẩm từ
            chi tiết đơn hàng.
          </p>
        )}
      </section>
      {c.related.length > 0 && (
        <section className="related-products-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">GỢI Ý CHO BẠN</span>
              <h2>Sản phẩm cùng danh mục</h2>
            </div>
            <Link
              to={`/products?category=${p.categoryId}`}
              className="subtle-link"
            >
              Xem thêm <ArrowRight size={16} />
            </Link>
          </div>
          <div className="product-grid">
            {c.related.map((item) => (
              <ProductCard product={item} key={item.id} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
