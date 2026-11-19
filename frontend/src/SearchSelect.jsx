import { useEffect, useId, useState } from 'react';

export const normalizeSearch = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

export default function SearchSelect({ label, value = '', options, onChange, disabled, required, loading }) {
  const id = useId();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => setQuery(value), [value]);
  const matches = options.filter((row) => normalizeSearch(row.name).includes(normalizeSearch(query === value ? '' : query)));
  const choose = (row) => { onChange(row); setQuery(row.name); setOpen(false); };
  return (
    <div className="field search-select" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(value); }
    }}>
      <label htmlFor={id}>{label}</label>
      <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`}
        aria-activedescendant={open && matches[active] ? `${id}-${active}` : undefined}
        value={query} disabled={disabled || loading} required={required} autoComplete="off"
        placeholder={loading ? 'Đang tải…' : `Chọn ${label.toLowerCase()}`}
        onFocus={() => setOpen(true)}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { setOpen(false); setQuery(value); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true);
            setActive((index) => Math.max(0, Math.min(matches.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
          }
          if (event.key === 'Enter' && open) { event.preventDefault(); if (matches[active]) choose(matches[active]); }
        }} />
      {open && <div className="search-options" role="listbox" id={`${id}-list`}>
        {matches.map((row, index) => <button key={row.code} type="button" role="option" id={`${id}-${index}`}
          aria-selected={index === active} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(row)}>{row.name}</button>)}
        {!matches.length && <span>Không tìm thấy địa danh.</span>}
      </div>}
    </div>
  );
}
