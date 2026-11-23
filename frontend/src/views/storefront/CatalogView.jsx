/**
 * Catalog View: renders product filters, active filter chips, product grid, and pagination.
 */
import React from 'react';
import {
  ArrowRight,
  ChevronRight,
  Leaf,
  Search,
  SlidersHorizontal,
  Stethoscope,
  X,
} from 'lucide-react';
import { useCatalogController } from '../../controllers/useCatalogController.js';
import ComboCard from '../components/ComboCard.jsx';
import Link from '../components/Link.jsx';
import Pagination from '../components/Pagination.jsx';
import ProductCard from '../components/ProductCard.jsx';
import {
  Breadcrumb,
  Empty,
  ErrorBox,
  Field,
  Spinner,
} from '../components/UiPrimitives.jsx';

export default function CatalogView() {
  const c = useCatalogController();

  return (
    <main className="container page-shell">
      <Breadcrumb current="Sản phẩm" />
      <div className="catalog-title">
        <div>
          <span className="eyebrow">KHÁM PHÁ TẠI AN TÂM</span>
          <h1>Sản phẩm chăm sóc sức khỏe</h1>
          <p>Tra cứu dễ dàng. Lựa chọn an tâm.</p>
        </div>
        <span className="catalog-title-icon">
          <Leaf size={48} strokeWidth={1} />
        </span>
      </div>
      <div className="catalog-layout">
        <aside className={`catalog-sidebar ${c.showFilters ? 'show' : ''}`}>
          <div className="catalog-sidebar-head">
            <h3>
              <SlidersHorizontal size={17} /> Bộ lọc sản phẩm
            </h3>
            {c.activeFilters.length > 0 && (
              <button
                type="button"
                className="clear-filters-btn"
                onClick={c.clearAllFilters}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
          <h4>Danh mục</h4>
          <button
            className={!c.params.get('category') ? 'chosen' : ''}
            onClick={() => c.update('category', '')}
          >
            <span>Tất cả sản phẩm</span>
            <ChevronRight size={14} />
          </button>
          {c.categories.map((cat) => (
            <button
              className={
                c.params.get('category') === String(cat.id) ? 'chosen' : ''
              }
              key={cat.id}
              onClick={() =>
                c.update(
                  'category',
                  String(cat.id),
                  cat.slug === 'thuoc-ke-don' &&
                    !c.params.has('prescription')
                    ? { prescription: 'all' }
                    : {},
                )
              }
            >
              {cat.name}
              <ChevronRight size={14} />
            </button>
          ))}
          <h4>Phân loại</h4>
          <label className="radio-line">
            <input
              type="radio"
              name="rx"
              checked={c.params.get('prescription') === 'all'}
              onChange={() => c.update('prescription', 'all')}
            />{' '}
            Tất cả
          </label>
          <label className="radio-line">
            <input
              type="radio"
              name="rx"
              checked={
                !c.params.has('prescription') ||
                c.params.get('prescription') === 'false'
              }
              onChange={() => c.update('prescription', 'false')}
            />{' '}
            Không cần đơn thuốc
          </label>
          <label className="radio-line">
            <input
              type="radio"
              name="rx"
              checked={c.params.get('prescription') === 'true'}
              onChange={() => c.update('prescription', 'true')}
            />{' '}
            Thuốc kê đơn
          </label>
          <h4>Nhà sản xuất</h4>
          <Field label="Chọn nhà sản xuất">
            <select
              value={c.params.get('manufacturer') || ''}
              onChange={(e) => c.update('manufacturer', e.target.value)}
            >
              <option value="">Tất cả nhà sản xuất</option>
              {c.manufacturers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <h4>Khoảng giá</h4>
          <form className="catalog-price-filter" onSubmit={c.applyPriceFilter}>
            <Field
              label="Từ (đ)"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={c.formatPriceInput(c.price.minPrice)}
              onChange={(e) =>
                c.setPrice({
                  ...c.price,
                  minPrice: c.digitsOnly(e.target.value),
                })
              }
            />
            <Field
              label="Đến (đ)"
              type="text"
              inputMode="numeric"
              placeholder="500.000"
              value={c.formatPriceInput(c.price.maxPrice)}
              onChange={(e) =>
                c.setPrice({
                  ...c.price,
                  maxPrice: c.digitsOnly(e.target.value),
                })
              }
            />
            <button
              type="submit"
              className="btn btn-outline btn-small full-width"
            >
              Lọc giá
            </button>
          </form>
          <label className="radio-line">
            <input
              type="checkbox"
              checked={c.params.get('inStock') === 'true'}
              onChange={(e) =>
                c.update('inStock', e.target.checked ? 'true' : '')
              }
            />{' '}
            Chỉ xem hàng có sẵn
          </label>
          <div className="sidebar-note">
            <Stethoscope size={23} />
            <strong>Cần thêm thông tin?</strong>
            <p>Dược sĩ sẽ giúp bạn hiểu rõ hơn trước khi lựa chọn.</p>
            <Link to="/chat">
              Nhận tư vấn <ArrowRight size={14} />
            </Link>
          </div>
        </aside>
        <div className="catalog-content">
          <div
            className="catalog-active-bar"
            aria-label="Danh mục và bộ lọc đang chọn"
          >
            <div className="catalog-active-main">
              <span className="catalog-active-label">
                Danh mục:{' '}
                <strong>
                  {c.selectedCat
                    ? c.selectedCat.name
                    : c.params.get('category') || 'Tất cả sản phẩm'}
                </strong>
              </span>
              {c.selectedCat && (
                <button
                  type="button"
                  className="catalog-active-reset"
                  onClick={() => c.update('category', '')}
                  aria-label="Bỏ chọn danh mục"
                  title="Bỏ chọn danh mục"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            {c.extraFilters.length > 0 && (
              <div className="active-filter-chips">
                {c.extraFilters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className="filter-chip"
                    onClick={f.clear}
                    title="Bấm để gỡ bộ lọc này"
                  >
                    <span>{f.label}</span>
                    <X size={13} />
                  </button>
                ))}
                {c.activeFilters.length > 1 && (
                  <button
                    type="button"
                    className="filter-chip-clear-all"
                    onClick={c.clearAllFilters}
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="catalog-toolbar">
            <span>
              {c.items ? (
                <>
                  {c.totalPages > 1 ? (
                    <>
                      Hiển thị{' '}
                      <strong>
                        {c.pageStart + 1}–
                        {Math.min(c.pageStart + c.perPage, c.items.length)}
                      </strong>{' '}
                      /{' '}
                    </>
                  ) : null}
                  <strong>{c.items.length}</strong> sản phẩm{' '}
                  {c.params.get('search') && (
                    <>cho “{c.params.get('search')}”</>
                  )}
                </>
              ) : (
                'Đang tìm sản phẩm…'
              )}
            </span>
            <button
              className="btn btn-outline filter-mobile"
              onClick={() => c.setShowFilters(!c.showFilters)}
            >
              <SlidersHorizontal size={16} /> Bộ lọc
            </button>
            <select
              aria-label="Sắp xếp sản phẩm"
              value={c.params.get('sort') || 'featured'}
              onChange={(e) => c.update('sort', e.target.value)}
            >
              <option value="featured">Sản phẩm nổi bật</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="name">Tên A–Z</option>
            </select>
          </div>
          <ErrorBox error={c.error} />
          {c.combos?.length > 0 && !c.activeFilters.length && (
            <section className="catalog-combos-block">
              <div className="catalog-combos-head">
                <h2>Combo tiết kiệm</h2>
                <span className="muted small">
                  {c.combos.length} gói kết hợp ưu đãi
                </span>
              </div>
              <div className="combo-grid">
                {c.combos.map((combo) => (
                  <ComboCard
                    key={combo.id}
                    combo={combo}
                    onAdd={c.addComboToCart}
                  />
                ))}
              </div>
            </section>
          )}
          {!c.items && !c.error ? (
            <Spinner />
          ) : c.pagedItems?.length ? (
            <>
              <div className="product-grid catalog-products">
                {c.pagedItems.map((p) => (
                  <ProductCard product={p} key={p.id} />
                ))}
              </div>
              <Pagination
                page={c.currentPage}
                totalItems={c.items.length}
                perPage={c.perPage}
                onChange={c.setPage}
              />
            </>
          ) : (
            <Empty
              icon={Search}
              title="Chưa tìm thấy sản phẩm"
              text="Thử tên khác, tìm theo hoạt chất hoặc bỏ bớt bộ lọc."
            >
              <button
                className="btn btn-outline"
                onClick={() => c.navigate('/products')}
              >
                Xem tất cả sản phẩm
              </button>
            </Empty>
          )}
        </div>
      </div>
    </main>
  );
}
