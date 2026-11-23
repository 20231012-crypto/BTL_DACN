/**
 * Storefront Home View powered by useHomeController.
 */
import React from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  HeartPulse,
  MessageCircle,
  ShieldCheck,
  Stethoscope,
  Truck,
} from 'lucide-react';
import { useHomeController } from '../../controllers/useHomeController.js';
import HeroBanner from '../components/HeroBanner.jsx';
import ComboCard from '../components/ComboCard.jsx';
import Link from '../components/Link.jsx';
import { LogoIcon } from '../components/Logo.jsx';
import ProductCard from '../components/ProductCard.jsx';
import {
  Empty,
  ErrorBox,
  Spinner,
  categoryIcon,
} from '../components/UiPrimitives.jsx';

export default function HomeView() {
  const c = useHomeController();

  return (
    <main>
      <section className="container hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-cross">+</span> SỨC KHỎE CỦA BẠN, SỰ QUAN TÂM
            CỦA CHÚNG TÔI
          </span>
          <h1>
            Khỏe mỗi ngày.
            <br />
            An tâm <em>mỗi lựa chọn.</em>
          </h1>
          <p>
            Từ những chăm sóc nhỏ, vun đắp sức khỏe dài lâu.
            <br className="desktop-only" /> An Tâm đồng hành cùng bạn và những
            người thân yêu.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="btn btn-primary">
              Khám phá sản phẩm <ArrowUpRight size={18} />
            </Link>
            <button className="btn btn-text" onClick={c.openChat}>
              <MessageCircle size={18} /> Nhận tư vấn
            </button>
          </div>
        </div>
        <HeroBanner />
      </section>
      <section className="container benefits" aria-label="Cam kết dịch vụ">
        {[
          [ShieldCheck, 'Thông tin minh bạch', 'Tra cứu trước mỗi lựa chọn'],
          [Stethoscope, 'Dược sĩ đồng hành', 'Kiểm duyệt thuốc kê đơn'],
          [Truck, 'Đặt hàng thuận tiện', 'Theo dõi từng bước xử lý'],
          [HeartPulse, 'Chăm sóc tận tâm', 'Lắng nghe điều bạn cần'],
        ].map(([Icon, title, text]) => (
          <div className="benefit" key={title}>
            <Icon size={26} strokeWidth={1.5} />
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </div>
        ))}
      </section>
      <section className="container category-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CHỌN ĐIỀU BẠN CẦN</span>
            <h2>Chăm sóc sức khỏe toàn diện</h2>
          </div>
          <Link to="/products" className="subtle-link">
            Tất cả danh mục <ArrowRight size={17} />
          </Link>
        </div>
        <div className="category-grid">
          {c.categories.slice(0, 6).map((cat, i) => {
            const Icon = categoryIcon(cat.name);
            const targetUrl =
              cat.slug === 'thuoc-ke-don'
                ? `/products?category=${cat.id}&prescription=all`
                : `/products?category=${cat.id}`;
            return (
              <Link
                to={targetUrl}
                className={`category-tile category-${i}`}
                key={cat.id}
              >
                <span>
                  <Icon size={29} strokeWidth={1.35} />
                </span>
                <strong>{cat.name}</strong>
                <ArrowUpRight className="category-arrow" size={15} />
              </Link>
            );
          })}
        </div>
      </section>
      <section className="container product-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ĐƯỢC QUAN TÂM TẠI AN TÂM</span>
            <h2>Lựa chọn cho mỗi ngày khỏe</h2>
          </div>
          <Link to="/products" className="subtle-link">
            Xem tất cả <ArrowRight size={17} />
          </Link>
        </div>
        <div className="filter-tabs">
          <button
            className={c.category === 'all' ? 'selected' : ''}
            onClick={() => c.setCategory('all')}
          >
            Tất cả sản phẩm
          </button>
          {c.categories.slice(0, 4).map((cat) => (
            <button
              key={cat.id}
              className={c.category === String(cat.id) ? 'selected' : ''}
              onClick={() => c.setCategory(String(cat.id))}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <ErrorBox error={c.error} />
        {!c.products && !c.error ? (
          <Spinner />
        ) : c.shown?.length ? (
          <div className="product-grid">
            {c.shown.map((p) => (
              <ProductCard product={p} key={p.id} />
            ))}
          </div>
        ) : (
          <Empty
            title="Danh mục đang được cập nhật"
            text="Bạn có thể khám phá các sản phẩm khác trong cửa hàng."
          />
        )}
      </section>
      {c.combos?.length > 0 && (
        <section className="container combo-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">TIẾT KIỆM HƠN KHI MUA CÙNG NHAU</span>
              <h2>Combo chăm sóc sức khỏe</h2>
            </div>
            <Link to="/products" className="subtle-link">
              Khám phá sản phẩm <ArrowRight size={17} />
            </Link>
          </div>
          <div className="combo-grid">
            {c.combos.slice(0, 4).map((combo) => (
              <ComboCard
                key={combo.id}
                combo={combo}
                onAdd={c.addComboToCart}
              />
            ))}
          </div>
        </section>
      )}
      <section className="container care-banner">
        <div className="care-icon">
          <LogoIcon size={64} />
        </div>
        <div>
          <span className="eyebrow">CHĂM SÓC KHÁCH HÀNG & TƯ VẤN SỨC KHỎE</span>
          <h2>Chưa biết bắt đầu từ đâu?</h2>
          <p>Trợ lý An Tâm giúp bạn tìm thông tin và kết nối với dược sĩ.</p>
        </div>
        <button className="btn btn-light" onClick={c.openChat}>
          Trò chuyện cùng An Tâm <ArrowUpRight size={18} />
        </button>
      </section>
      <section className="container story-section">
        <div className="story-visual">
          <span className="eyebrow">TỪ NHỮNG ĐIỀU NHỎ NHẤT</span>
          <HeartPulse size={75} strokeWidth={0.8} />
          <h3>
            Hiểu để chăm sóc.
            <br />
            Tận tình để an tâm.
          </h3>
          <span className="story-line" />
        </div>
        <div className="story-copy">
          <span className="eyebrow">TINH THẦN AN TÂM</span>
          <h2>
            Sức khỏe là một hành trình.
            <br />
            Chúng tôi ở đây, cùng bạn.
          </h2>
          <p>
            Chúng tôi tin rằng chăm sóc sức khỏe bắt đầu từ việc được lắng nghe
            và tiếp cận thông tin rõ ràng. Mỗi sản phẩm, mỗi cuộc trò chuyện đều
            hướng đến sự an tâm của bạn.
          </p>
          <div className="story-points">
            <span>
              <CheckCircle2 size={18} /> Tra cứu thông tin sản phẩm dễ dàng
            </span>
            <span>
              <CheckCircle2 size={18} /> Thuốc kê đơn được dược sĩ kiểm duyệt
            </span>
            <span>
              <CheckCircle2 size={18} /> Đơn hàng và dữ liệu được quản lý riêng
              tư
            </span>
          </div>
          <Link to="/chat" className="subtle-link">
            Kết nối với An Tâm <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
