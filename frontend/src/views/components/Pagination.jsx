/**
 * Pagination View Component.
 */
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { paginationItems } from '../../models/formatters.js';

export default function Pagination({
  page,
  totalItems,
  perPage = 9,
  onChange,
  className = 'pagination',
  noun = 'sản phẩm',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  if (totalPages <= 1) return null;
  const current = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (current - 1) * perPage + 1;
  const end = Math.min(current * perPage, totalItems);
  const items = paginationItems(current, totalPages);

  return (
    <nav className={className} aria-label={`Phân trang ${noun}`}>
      <span className={`${className}-info`}>
        Trang <strong>{current}</strong> / {totalPages} · {start}–{end} trong{' '}
        {totalItems} {noun}
      </span>
      <div className={`${className}-controls`}>
        <button
          type="button"
          className={`${className}-btn`}
          disabled={current <= 1}
          aria-label="Trang trước"
          onClick={() => onChange(current - 1)}
        >
          <ChevronLeft size={15} />
          <span>Trước</span>
        </button>
        {items.map((item) =>
          typeof item === 'string' ? (
            <span
              className={`${className}-ellipsis`}
              key={item}
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              type="button"
              key={item}
              className={`${className}-btn ${item === current ? 'is-active' : ''}`}
              aria-current={item === current ? 'page' : undefined}
              onClick={() => onChange(item)}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          className={`${className}-btn`}
          disabled={current >= totalPages}
          aria-label="Trang sau"
          onClick={() => onChange(current + 1)}
        >
          <span>Sau</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </nav>
  );
}
