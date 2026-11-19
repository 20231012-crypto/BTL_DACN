import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, FolderOpen, Search } from 'lucide-react';
import { api, money } from './lib.js';

export default function ProductSearch({
  value,
  onChange,
  onSubmit,
  onChoose,
  className = 'header-search',
  prescription = 'false',
  categories = null,
}) {
  const id = useId();
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [scope, setScope] = useState({
    prescription: categories ? 'all' : prescription,
    category: '',
    label: 'Tất cả',
  });

  const effectivePrescription = categories ? scope.prescription : prescription;
  const effectiveCategory = categories ? scope.category : '';

  useEffect(() => {
    setItems([]);
    setActive(-1);
    const trimmed = value.trim();
    const shouldFetch = Boolean(
      trimmed ||
        (categories &&
          open &&
          (effectiveCategory || effectivePrescription === 'true')),
    );
    if (!shouldFetch) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const qs = new URLSearchParams();
      if (trimmed) qs.set('search', trimmed);
      qs.set('prescription', effectivePrescription);
      if (effectiveCategory) qs.set('category', effectiveCategory);
      api(`/products/suggestions?${qs}`, { signal: controller.signal })
        .then(setItems)
        .catch(() => {});
    }, trimmed ? 180 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, effectivePrescription, effectiveCategory, open, categories]);

  const choose = (product) => {
    setOpen(false);
    setMenuOpen(false);
    onChange(product.name);
    onChoose(product);
  };

  const selectScope = (nextScope) => {
    setScope(nextScope);
    setMenuOpen(false);
    setOpen(true);
    inputRef.current?.focus();
  };

  return (
    <form
      className={`${className} product-search${categories ? ' has-scope' : ''}`}
      onSubmit={(event) => {
        event.preventDefault();
        setOpen(false);
        setMenuOpen(false);
        onSubmit(value, {
          prescription: effectivePrescription,
          category: effectiveCategory,
        });
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setMenuOpen(false);
        }
      }}
    >
      {categories && (
        <div className="search-scope">
          <button
            type="button"
            className={`search-scope-trigger${menuOpen ? ' is-open' : ''}`}
            onClick={() => {
              setMenuOpen((prev) => !prev);
              setOpen(false);
            }}
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
            title="Chọn thư mục dữ liệu cần tìm"
          >
            <FolderOpen size={14} />
            <span>{scope.label}</span>
            <ChevronDown size={13} />
          </button>
          {menuOpen && (
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
                    scope.prescription === opt.prescription &&
                    scope.category === opt.category
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectScope(opt)}
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
                      aria-selected={scope.category === String(cat.id)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        selectScope({
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
        ref={inputRef}
        aria-label={
          className === 'header-search' ? 'Tìm sản phẩm' : 'Tìm trong danh mục'
        }
        placeholder={
          effectivePrescription === 'true'
            ? 'Tìm chính xác thuốc kê đơn, hoạt chất…'
            : 'Tìm tên thuốc, hoạt chất, sản phẩm…'
        }
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && items.length > 0}
        aria-controls={id}
        aria-activedescendant={
          open && active >= 0 && items[active] ? `${id}-${active}` : undefined
        }
        onFocus={() => {
          setMenuOpen(false);
          setOpen(true);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
            setMenuOpen(false);
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            setActive(
              Math.max(
                -1,
                Math.min(
                  items.length - 1,
                  active + (event.key === 'ArrowDown' ? 1 : -1),
                ),
              ),
            );
          }
          if (event.key === 'Enter' && open && active >= 0 && items[active]) {
            event.preventDefault();
            choose(items[active]);
          }
        }}
      />
      <button type="submit" className="search-submit-btn">
        Tìm kiếm
      </button>
      {open && items.length > 0 && (
        <div id={id} role="listbox" className="product-suggestions">
          {items.map((product, index) => (
            <button
              type="button"
              role="option"
              id={`${id}-${index}`}
              key={product.id}
              aria-selected={active === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(product)}
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
