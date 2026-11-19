import { useEffect, useId, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from './lib.js';

export default function ProductSearch({ value, onChange, onSubmit, onChoose, className = 'header-search', prescription = 'false' }) {
  const id = useId();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  useEffect(() => {
    setItems([]); setActive(-1);
    if (!value.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api(`/products/suggestions?search=${encodeURIComponent(value)}&prescription=${prescription}`, { signal: controller.signal })
        .then(setItems).catch(() => {});
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, prescription]);
  const choose = (product) => { setOpen(false); onChange(product.name); onChoose(product); };
  return <form className={`${className} product-search`} onSubmit={(event) => {
    event.preventDefault(); setOpen(false); onSubmit(value);
  }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <Search size={19} />
    <input aria-label={className === 'header-search' ? 'Tìm sản phẩm' : 'Tìm trong danh mục'} placeholder="Tìm tên thuốc, hoạt chất, sản phẩm…"
      value={value} role="combobox" aria-autocomplete="list" aria-expanded={open && items.length > 0} aria-controls={id}
      aria-activedescendant={open && active >= 0 && items[active] ? `${id}-${active}` : undefined}
      onFocus={() => setOpen(true)} onChange={(event) => { onChange(event.target.value); setOpen(true); }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive(Math.max(-1, Math.min(items.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1)))); }
        if (event.key === 'Enter' && open && active >= 0 && items[active]) { event.preventDefault(); choose(items[active]); }
      }} />
    <button type="submit">Tìm kiếm</button>
    {open && items.length > 0 && <div id={id} role="listbox" className="product-suggestions">
      {items.map((product, index) => <button type="button" role="option" id={`${id}-${index}`} key={product.id} aria-selected={active === index}
        onMouseDown={(event) => event.preventDefault()} onClick={() => choose(product)}>
        <strong>{product.name}</strong><span>{product.ingredient}</span>
      </button>)}
    </div>}
  </form>;
}
