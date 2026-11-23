/**
 * Searchable Select Combobox View powered by useSearchSelectController.
 */
import React from 'react';
import { useSearchSelectController } from '../../controllers/useSearchSelectController.js';

export default function SearchSelect({
  label,
  value = '',
  options,
  onChange,
  disabled,
  required,
  loading,
}) {
  const c = useSearchSelectController({ value, options, onChange });

  return (
    <div className="field search-select" onBlur={c.handleBlur}>
      <label htmlFor={c.id}>{label}</label>
      <input
        id={c.id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={c.open}
        aria-controls={`${c.id}-list`}
        aria-activedescendant={
          c.open && c.matches[c.active] ? `${c.id}-${c.active}` : undefined
        }
        value={c.query}
        disabled={disabled || loading}
        required={required}
        autoComplete="off"
        placeholder={loading ? 'Đang tải…' : `Chọn ${label.toLowerCase()}`}
        onFocus={() => c.setOpen(true)}
        onChange={(event) => {
          c.setQuery(event.target.value);
          c.setOpen(true);
          c.setActive(0);
        }}
        onKeyDown={c.handleKeyDown}
      />
      {c.open && (
        <div className="search-options" role="listbox" id={`${c.id}-list`}>
          {c.matches.map((row, index) => (
            <button
              key={row.code}
              type="button"
              role="option"
              id={`${c.id}-${index}`}
              aria-selected={index === c.active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => c.choose(row)}
            >
              {row.name}
            </button>
          ))}
          {!c.matches.length && <span>Không tìm thấy địa danh.</span>}
        </div>
      )}
    </div>
  );
}
