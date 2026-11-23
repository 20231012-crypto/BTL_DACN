/**
 * Shared Admin UI Primitive Views (Badge, KpiGrid, FilterChips, Field, CheckField, Modal, Empty, Table, ReportChart, StatusDonut).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Package, X } from 'lucide-react';
import { STATUS_BUCKETS, adminLabel } from '../../models/constants.js';
import { compactMoney, count, money, shortDate } from '../../models/formatters.js';

export function Badge({ value, children }) {
  return (
    <span className={`adm-badge is-${value}`}>
      {children || adminLabel(value)}
    </span>
  );
}

export function KpiGrid({ cards = [] }) {
  const colsClass =
    cards.length === 4 ? 'is-cols-4' : cards.length >= 5 ? 'is-cols-5' : '';
  return (
    <div className={`adm-kpi-strip ${colsClass}`}>
      {cards.map((c) => {
        const CardIcon = c.Icon;
        const clickable = typeof c.onClick === 'function';
        return (
          <article
            key={c.key || c.label}
            className={`adm-kpi-card ${c.active ? 'is-active' : ''} ${clickable ? 'is-clickable' : ''}`}
            onClick={c.onClick}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      c.onClick();
                    }
                  }
                : undefined
            }
          >
            <div className="adm-kpi-card-top">
              <span>{c.label}</span>
              {CardIcon && (
                <span className={`adm-stat-icon ${c.tone || ''}`}>
                  <CardIcon size={17} />
                </span>
              )}
            </div>
            <strong>{c.value}</strong>
            {c.sub && <small>{c.sub}</small>}
          </article>
        );
      })}
    </div>
  );
}

export function FilterChips({ options = [], value = '', onChange }) {
  return (
    <div className="adm-ord-chips adm-filter-chips">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          className={`adm-ord-chip ${value === opt.key ? 'active' : ''}`}
          onClick={() => onChange(opt.key)}
        >
          <span>{opt.label}</span>
          {opt.count !== undefined && <b>{count(opt.count)}</b>}
        </button>
      ))}
    </div>
  );
}

export function Field({
  label: fieldLabel,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  hint,
  children,
  ...props
}) {
  const cleanProps = Object.fromEntries(
    Object.entries(props).filter(([k]) => k !== 'wide'),
  );
  return (
    <label className={`adm-field ${props.wide ? 'is-wide' : ''}`}>
      <span>
        {fieldLabel}
        {required && <i> *</i>}
      </span>
      {children ||
        (type === 'textarea' ? (
          <textarea
            name={name}
            value={value ?? ''}
            onChange={onChange}
            required={required}
            rows="3"
            {...cleanProps}
          />
        ) : (
          <input
            name={name}
            value={value ?? ''}
            onChange={onChange}
            type={type}
            required={required}
            {...cleanProps}
          />
        ))}
      {hint && <small className="adm-field-hint">{hint}</small>}
    </label>
  );
}

export function CheckField({
  name,
  value,
  onChange,
  label: fieldLabel,
  disabled = false,
  hint,
}) {
  return (
    <div className="adm-check-wrap">
      <label className={`adm-check ${disabled ? 'is-disabled' : ''}`}>
        <input
          type="checkbox"
          name={name}
          checked={!!value}
          onChange={onChange}
          disabled={disabled}
        />
        <span>{fieldLabel}</span>
      </label>
      {hint && <small className="adm-field-hint">{hint}</small>}
    </div>
  );
}

export function Modal({ title, children, onClose, wide = false }) {
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () =>
      [
        ...panel.current.querySelectorAll(
          'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
        ),
      ].filter((el) => el.offsetParent !== null);
    controls()[0]?.focus();
    const handle = (e) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const els = controls();
        const first = els[0];
        const last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handle);
    return () => {
      document.removeEventListener('keydown', handle);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  return (
    <div
      className="adm-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`adm-modal ${wide ? 'is-wide' : ''}`}
      >
        <div className="adm-modal-head">
          <div>
            <span className="adm-eyebrow">NHÀ THUỐC AN TÂM</span>
            <h2>{title}</h2>
          </div>
          <button
            className="adm-icon-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function Empty({
  title = 'Chưa có dữ liệu',
  description = 'Thông tin sẽ xuất hiện tại đây khi có phát sinh.',
}) {
  return (
    <div className="adm-empty">
      <Package size={30} />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function Table({ columns, rows, empty, children }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.length ? (
            children
          ) : (
            <tr>
              <td colSpan={columns.length}>
                <Empty title={empty} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ReportChart({ data = [] }) {
  const [metric, setMetric] = useState('both');
  const [hovered, setHovered] = useState(null);
  const peakIndex = data.reduce(
    (best, d, i) =>
      (Number(d.revenue) || 0) > (Number(data[best]?.revenue) || 0) ? i : best,
    0,
  );
  const activeIdx =
    hovered !== null && data[hovered] ? hovered : data.length ? peakIndex : -1;
  const activeDay = activeIdx >= 0 ? data[activeIdx] : null;
  const maxRev = Math.max(1, ...data.map((d) => Number(d.revenue) || 0));
  const rawMaxOrd = Math.max(1, ...data.map((d) => Number(d.orders) || 0));
  const ordTop = rawMaxOrd <= 2 ? rawMaxOrd : Math.ceil(rawMaxOrd / 4) * 4;
  const totalRev = data.reduce((n, d) => n + (Number(d.revenue) || 0), 0);
  const totalOrd = data.reduce((n, d) => n + (Number(d.orders) || 0), 0);
  const activeDays = data.filter(
    (d) => (Number(d.revenue) || 0) > 0 || (Number(d.orders) || 0) > 0,
  ).length;
  const avgRev = data.length ? Math.round(totalRev / data.length) : 0;
  const yTicks =
    metric === 'orders'
      ? ordTop === 1
        ? ['1', '', '', '', '0']
        : ordTop === 2
          ? ['2', '', '1', '', '0']
          : [ordTop, (ordTop * 3) / 4, ordTop / 2, ordTop / 4, 0]
      : [
          compactMoney(maxRev),
          compactMoney(Math.round(maxRev * 0.75)),
          compactMoney(Math.round(maxRev * 0.5)),
          compactMoney(Math.round(maxRev * 0.25)),
          '0',
        ];
  const labelStep = data.length <= 12 ? 1 : Math.ceil(data.length / 6);
  const ordPoints =
    data.length > 1
      ? data
          .map((d, i) => {
            const x = ((i + 0.5) / data.length) * 100;
            const y = 100 - Math.max(4, ((Number(d.orders) || 0) / ordTop) * 90);
            return `${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(' ')
      : '';

  if (!data.length)
    return <Empty title="Chưa có dữ liệu biểu đồ trong kỳ" />;

  return (
    <div className="adm-rp-chart-box">
      <div className="adm-rp-chart-top">
        <div
          className="adm-rp-metric-tabs"
          role="tablist"
          aria-label="Chế độ biểu đồ"
        >
          {[
            ['both', 'Kết hợp'],
            ['revenue', 'Doanh thu'],
            ['orders', 'Số đơn'],
          ].map(([key, name]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={metric === key}
              className={metric === key ? 'active' : ''}
              onClick={() => setMetric(key)}
            >
              {name}
            </button>
          ))}
        </div>
        {activeDay && (
          <div className="adm-rp-inspector">
            <span className="adm-rp-dot rev" />
            <strong>{shortDate(activeDay.date)}</strong>
            <span>Doanh thu: {money(activeDay.revenue)}</span>
            <span className="adm-rp-sep">·</span>
            <span className="adm-rp-dot ord" />
            <span>{count(activeDay.orders)} đơn hàng</span>
          </div>
        )}
      </div>

      <div className="adm-rp-canvas">
        <div className="adm-rp-yaxis" aria-hidden="true">
          {yTicks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        <div className="adm-rp-plot-scroll">
          <div
            className="adm-rp-plot"
            style={{
              minWidth: data.length > 40 ? `${data.length * 16}px` : undefined,
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="adm-rp-gridlines" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            {metric === 'both' && data.length > 1 && (
              <svg
                className="adm-rp-line-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <polyline
                  fill="none"
                  stroke="#d0943b"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  points={ordPoints}
                />
              </svg>
            )}
            <div className="adm-rp-bars">
              {data.map((d, i) => {
                const val =
                  metric === 'orders'
                    ? Number(d.orders) || 0
                    : Number(d.revenue) || 0;
                const cap = metric === 'orders' ? ordTop : maxRev;
                const h = val > 0 ? Math.max(6, (val / cap) * 100) : 2;
                const showLabel =
                  i === 0 ||
                  i === data.length - 1 ||
                  (i % labelStep === 0 &&
                    data.length - 1 - i >= Math.ceil(labelStep * 0.6));
                const edgeClass =
                  i === 0
                    ? 'is-first'
                    : i === data.length - 1
                      ? 'is-last'
                      : '';
                const isActive = i === activeIdx;
                return (
                  <div
                    key={d.date || i}
                    className={`adm-rp-col ${isActive ? 'is-active' : ''} ${val === 0 ? 'is-zero' : ''}`}
                    onMouseEnter={() => setHovered(i)}
                    onFocus={() => setHovered(i)}
                    tabIndex={0}
                    aria-label={`${shortDate(d.date)}: ${money(d.revenue)}, ${count(d.orders)} đơn`}
                  >
                    <div className="adm-rp-bar-slot">
                      <div
                        className={`adm-rp-bar ${metric === 'orders' ? 'is-orders' : ''}`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                    <span className={`adm-rp-xlabel ${edgeClass}`}>
                      {showLabel ? shortDate(d.date) : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="adm-rp-chart-foot">
        <div>
          <span>Ngày cao nhất</span>
          <strong>
            {data[peakIndex]
              ? `${money(data[peakIndex].revenue)} (${shortDate(data[peakIndex].date)})`
              : '—'}
          </strong>
        </div>
        <div>
          <span>Trung bình / ngày</span>
          <strong>{money(avgRev)}</strong>
        </div>
        <div>
          <span>Tổng đơn trong kỳ</span>
          <strong>{count(totalOrd)} đơn</strong>
        </div>
        <div>
          <span>Số ngày có đơn</span>
          <strong>
            {activeDays} trên {data.length} ngày
          </strong>
        </div>
      </div>
    </div>
  );
}

export function StatusDonut({ breakdown = [], totalOrders = 0 }) {
  const byStatus = Object.fromEntries(breakdown.map((b) => [b.status, b]));
  const groups = STATUS_BUCKETS.map(([name, codes, color]) => {
    const orders = codes.reduce((n, c) => n + (byStatus[c]?.orders || 0), 0);
    const amount = codes.reduce((n, c) => n + (byStatus[c]?.amount || 0), 0);
    return { name, color, orders, amount };
  });
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="adm-rp-donut-wrap">
      <div className="adm-rp-donut">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#eef3ec"
            strokeWidth="14"
          />
          {totalOrders > 0 &&
            groups
              .filter((g) => g.orders > 0)
              .map((g) => {
                const len = (g.orders / totalOrders) * circumference;
                const dash = `${len} ${circumference - len}`;
                const curOffset = offset;
                offset += len;
                return (
                  <circle
                    key={g.name}
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={g.color}
                    strokeWidth="14"
                    strokeDasharray={dash}
                    strokeDashoffset={-curOffset}
                    transform="rotate(-90 60 60)"
                  />
                );
              })}
        </svg>
        <div className="adm-rp-donut-center">
          <strong>{count(totalOrders)}</strong>
          <span>Đơn hàng</span>
        </div>
      </div>

      <div className="adm-rp-legend">
        {groups.map((g) => {
          const share = totalOrders
            ? ((g.orders / totalOrders) * 100).toFixed(1)
            : '0.0';
          return (
            <div key={g.name} className="adm-rp-legend-row">
              <span
                className="adm-rp-legend-dot"
                style={{ background: g.color }}
              />
              <div className="adm-rp-legend-meta">
                <strong>{g.name}</strong>
                <small>{money(g.amount)}</small>
              </div>
              <div className="adm-rp-legend-val">
                <b>{count(g.orders)}</b>
                <span>{share}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
