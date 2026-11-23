/**
 * Product Search Typeahead View powered by useProductSearchController.
 */
import React from 'react';
import { ChevronDown, FolderOpen, Search } from 'lucide-react';
import { money } from '../../models/formatters.js';
import { useProductSearchController } from '../../controllers/useProductSearchController.js';

export default function ProductSearch({
  value,
  onChange,
  onSubmit,
  onChoose,
  className = 'header-search',
  prescription = 'false',
  categories = null,
}) {
  const c = useProductSearchController({
    value,
    onChange,
    onSubmit,
    onChoose,
    prescription,
    categories,
  });

  return (
    <form
      className={`${className} product-search${categories ? ' has-scope' : ''}`}
      onSubmit={c.handleSubmit}
      onBlur={c.handleBlur}
    >
      {categories && (
        <div className="search-scope">
          <button
            type="button"
            className={`search-scope-trigger${c.menuOpen ? ' is-open' : ''}`}
            onClick={() => {
              c.setMenuOpen((prev) => !prev);
              c.setOpen(false);
            }}
            aria-expanded={c.menuOpen}
            aria-haspopup="listbox"
            title="Chọn thư mục dữ liệu cần tìm"
          >
            <FolderOpen size={14} />
            <span>{c.scope.label}</span>
            <ChevronDown size={13} />
          </button>
          {c.menuOpen && (
            <div className="search-scope-menu" role="listbox">
              <div className="search-scope-group">Phân loại thuốc</div>
              {[
                { prescription: 'all', category: '', label: 'Tất cả' },
                { prescription: 'true', category: '', label: 'Thuốc kê đơn' },
                { prescription: 'false', category: '', label: 'Không kê đơn' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  role="option"
                  aria-selected={
                    c.scope.prescription === opt.prescription &&
                    c.scope.category === opt.category
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => c.selectScope(opt)}
                >
                  {opt.label}
                </button>
              ))}
              {categories.length > 0 && (
                <>
                  <div className="search-scope-group">Danh mục sản phẩm</div>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      role="option"
                      aria-selected={c.scope.category === String(cat.id)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        c.selectScope({
                          prescription: 'all',
                          category: String(cat.id),
                          label: cat.name,
                        })
                      }
                    >
                      {cat.name}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
      <Search size={18} className="search-field-icon" />
      <input
        ref={c.inputRef}
        aria-label={
          className === 'header-search' ? 'Tìm sản phẩm' : 'Tìm trong danh mục'
        }
        placeholder={
          c.effectivePrescription === 'true'
            ? 'Tìm chính xác thuốc kê đơn, hoạt chất…'
            : 'Tìm tên thuốc, hoạt chất, sản phẩm…'
        }
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={c.open && c.items.length > 0}
        aria-controls={c.id}
        aria-activedescendant={
          c.open && c.active >= 0 && c.items[c.active]
            ? `${c.id}-${c.active}`
            : undefined
        }
        onFocus={() => {
          c.setMenuOpen(false);
          c.setOpen(true);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          c.setOpen(true);
        }}
        onKeyDown={c.handleKeyDown}
      />
      <button type="submit" className="search-submit-btn">
        Tìm kiếm
      </button>
      {c.open && c.items.length > 0 && (
        <div id={c.id} role="listbox" className="product-suggestions">
          {c.items.map((product, index) => (
            <button
              type="button"
              role="option"
              id={`${c.id}-${index}`}
              key={product.id}
              aria-selected={c.active === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => c.choose(product)}
            >
              <img
                src={product.image || '/assets/products/vitamin-c.svg'}
                alt=""
                className="suggestion-thumb"
              />
              <div className="suggestion-body">
                <div className="suggestion-head">
                  <strong>{product.name}</strong>
                  {product.prescriptionRequired && (
                    <em className="suggestion-rx">Cần đơn thuốc</em>
                  )}
                </div>
                <span>
                  {product.ingredient || product.categoryName}
                  {product.categoryName && product.ingredient
                    ? ` · ${product.categoryName}`
                    : ''}
                </span>
              </div>
              {typeof product.price === 'number' && (
                <b className="suggestion-price">{money(product.price)}</b>
              )}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
