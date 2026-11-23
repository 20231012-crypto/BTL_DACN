/**
 * Shared Storefront UI Primitives (Spinner, Empty, Badge, Field, PasswordStrength, ErrorBox, Breadcrumb, Quantity, Modal, Toast, RequireLogin).
 */
import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  HeartPulse,
  Leaf,
  LoaderCircle,
  Minus,
  Package,
  Pill,
  Plus,
  Stethoscope,
  UserRound,
  X,
} from 'lucide-react';
import { label } from '../../models/constants.js';
import { evaluatePasswordStrength } from '../../models/formatters.js';
import { useApp } from '../../controllers/AppContext.jsx';
import Link from './Link.jsx';

export const categoryIcon = (name) =>
  /thuốc kê|thuốc không/i.test(name)
    ? Pill
    : /thiết bị|vật tư/i.test(name)
      ? Stethoscope
      : /chăm sóc/i.test(name)
        ? HeartPulse
        : Leaf;

export const Spinner = ({ text = 'Đang tải dữ liệu…' }) => (
  <div className="loading">
    <LoaderCircle className="spin" size={25} />
    <span>{text}</span>
  </div>
);

export const Empty = ({ icon: Icon = Package, title, text, children }) => (
  <div className="empty-state">
    <span className="empty-icon">
      <Icon size={31} />
    </span>
    <h2>{title}</h2>
    <p>{text}</p>
    {children}
  </div>
);

export const Badge = ({ value }) => (
  <span className={`badge status-${value}`}>{label(value)}</span>
);

export const Field = ({ label: title, children, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = !children && props.type === 'password';
  return (
    <label className="field">
      <span>{title}</span>
      {children ||
        (isPassword ? (
          <div className="password-field-wrap">
            <input {...props} type={showPassword ? 'text' : 'password'} />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        ) : (
          <input {...props} />
        ))}
    </label>
  );
};

export const PasswordStrength = ({ value }) => {
  const info = evaluatePasswordStrength(value);
  if (!info) return null;
  const { checks, passed, level, labelText } = info;
  return (
    <div className="password-strength" aria-live="polite">
      <div className="password-strength-bar">
        <span
          className={`fill ${level}`}
          style={{ width: `${(passed / 4) * 100}%` }}
        />
      </div>
      <div className="password-strength-head">
        <span>Độ mạnh mật khẩu:</span>
        <strong className={level}>{labelText}</strong>
      </div>
      <ul className="password-checks">
        {checks.map(([text, ok]) => (
          <li key={text} className={ok ? 'ok' : ''}>
            {ok ? <Check size={12} /> : <span className="dot" />} {text}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const ErrorBox = ({ error }) =>
  error ? (
    <div className="error-box" role="alert">
      <AlertCircle size={18} />
      {error}
    </div>
  ) : null;

export function Breadcrumb({ current, parent }) {
  return (
    <div className="breadcrumb">
      <Link to="/">Trang chủ</Link>
      <ChevronRight size={13} />
      {parent && (
        <>
          <Link to={parent.to}>{parent.name}</Link>
          <ChevronRight size={13} />
        </>
      )}
      <span>{current}</span>
    </div>
  );
}

export function Quantity({ value, onChange, max = 99 }) {
  return (
    <div className="quantity">
      <button
        aria-label="Giảm số lượng"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={14} />
      </button>
      <span>{value}</span>
      <button
        aria-label="Tăng số lượng"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', key);
    };
  }, []);

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            <X size={21} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  return (
    <div className={`toast toast-${toast.type}`} role="status">
      {toast.type === 'error' ? (
        <AlertCircle size={20} />
      ) : (
        <CheckCircle2 size={20} />
      )}
      <span>{toast.message}</span>
      <button
        className="icon-btn"
        onClick={onClose}
        aria-label="Đóng thông báo"
      >
        <X size={17} />
      </button>
    </div>
  );
}

export function RequireLogin({ children }) {
  const { user, ready, route } = useApp();
  if (!ready) return <Spinner />;
  if (!user)
    return (
      <main className="container page-shell">
        <Empty
          icon={UserRound}
          title="Đăng nhập để tiếp tục"
          text="Quản lý giỏ hàng, đơn thuốc và đơn hàng của bạn tại một nơi."
        >
          <Link
            className="btn btn-primary"
            to={`/login?next=${encodeURIComponent(route)}`}
          >
            Đăng nhập <ArrowRight size={16} />
          </Link>
        </Empty>
      </main>
    );
  return children;
}
