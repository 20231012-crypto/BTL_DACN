/**
 * Auth View: renders Login, Register, Verify OTP, Forgot Password, and Reset Password flows.
 */
import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  LoaderCircle,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { useAuthController } from '../../controllers/useAuthController.js';
import Link from '../components/Link.jsx';
import { ErrorBox, Field, PasswordStrength } from '../components/UiPrimitives.jsx';

export default function AuthView() {
  const c = useAuthController();

  return (
    <main className="container auth-shell">
      <section className="auth-story">
        <span className="eyebrow">CHĂM SÓC TỪ SỰ THẤU HIỂU</span>
        <h1>
          Một nơi tin cậy.
          <br />
          Cho mỗi ngày
          <br />
          <em>an tâm.</em>
        </h1>
        <div className="auth-story-art">
          <HeartPulse size={132} strokeWidth={0.65} />
          <span className="auth-story-plus">+</span>
          <div className="auth-story-ring" />
        </div>
        <p>
          Tra cứu sản phẩm, theo dõi đơn hàng
          <br />
          và kết nối cùng dược sĩ An Tâm.
        </p>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <span className="eyebrow">NHÀ THUỐC AN TÂM</span>
          <h2>{c.title}</h2>
          <p className="muted">
            {c.mode === 'login'
              ? 'Đăng nhập để tiếp tục chăm sóc sức khỏe cùng chúng tôi.'
              : c.mode === 'register'
                ? 'Tạo tài khoản để quản lý đơn hàng và nhận hỗ trợ.'
                : 'Chúng tôi sẽ giúp bạn tiếp tục một cách an toàn.'}
          </p>
          <ErrorBox error={c.error} />
          {c.message && (
            <div className="success-box">
              <CheckCircle2 size={18} />
              {c.message}
            </div>
          )}
          <form onSubmit={c.submit}>
            {c.mode === 'register' && (
              <Field
                label="Họ và tên"
                value={c.name}
                onChange={(e) => c.setName(e.target.value)}
                required
                maxLength={100}
                autoComplete="name"
              />
            )}
            {c.mode !== 'reset' && (
              <Field
                label={
                  c.mode === 'register' ? 'Email' : 'Email hoặc số điện thoại'
                }
                type={c.mode === 'register' ? 'email' : 'text'}
                value={c.email}
                onChange={(e) => c.setEmail(e.target.value)}
                required={
                  c.mode !== 'register' || !c.config?.demoMode || !c.phone
                }
                autoComplete={c.mode === 'register' ? 'email' : 'username'}
              />
            )}
            {c.mode === 'register' && (
              <Field
                label="Số điện thoại"
                type="tel"
                value={c.phone}
                onChange={(e) => c.setPhone(e.target.value)}
                required={!c.email}
                maxLength={15}
                autoComplete="tel"
              />
            )}
            {['verify', 'reset'].includes(c.mode) && (
              <>
                {c.mode === 'reset' && (
                  <p className="muted">
                    Tài khoản: <strong>{c.email}</strong>
                  </p>
                )}
                {c.demoCode && (
                  <div className="demo-otp">
                    Mã xác thực trong môi trường demo:{' '}
                    <strong>{c.demoCode}</strong>
                  </div>
                )}
                <Field
                  label="Mã xác thực"
                  value={c.code}
                  onChange={(e) => c.setCode(e.target.value)}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={10}
                />
                <button
                  type="button"
                  className="subtle-link resend-otp"
                  disabled={c.busy}
                  onClick={c.resend}
                >
                  Gửi lại mã xác thực
                </button>
              </>
            )}
            {(['login', 'register', 'reset'].includes(c.mode) ||
              c.settingPassword) && (
              <>
                <Field
                  key={`pw-${c.mode}`}
                  label={
                    c.mode === 'reset' || c.settingPassword
                      ? 'Mật khẩu mới'
                      : 'Mật khẩu'
                  }
                  type="password"
                  value={c.password}
                  onChange={(e) => c.setPassword(e.target.value)}
                  required
                  minLength={c.mode === 'login' ? undefined : 8}
                  autoComplete={
                    c.mode === 'login' ? 'current-password' : 'new-password'
                  }
                />
                {c.mode !== 'login' && (
                  <>
                    <PasswordStrength value={c.password} />
                    <Field
                      key={`pw-confirm-${c.mode}`}
                      label="Nhập lại mật khẩu"
                      type="password"
                      value={c.confirmPassword}
                      onChange={(e) => c.setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    {c.confirmPassword &&
                      c.password !== c.confirmPassword && (
                        <p className="field-help field-mismatch">
                          Mật khẩu nhập lại chưa khớp.
                        </p>
                      )}
                  </>
                )}
              </>
            )}
            {c.mode === 'login' && (
              <div className="auth-forgot">
                <Link
                  to={`/verify${c.email ? `?email=${encodeURIComponent(c.email)}` : ''}`}
                >
                  Xác thực tài khoản
                </Link>
                <Link
                  to={`/forgot-password${c.email ? `?email=${encodeURIComponent(c.email)}` : ''}`}
                >
                  Quên mật khẩu?
                </Link>
              </div>
            )}
            <button className="btn btn-primary full-width" disabled={c.busy}>
              {c.busy ? <LoaderCircle className="spin" size={18} /> : null}
              {
                {
                  login: 'Đăng nhập',
                  register: 'Tạo tài khoản',
                  verify: 'Xác thực tài khoản',
                  forgot: 'Gửi mã đặt lại mật khẩu',
                  reset: 'Lưu mật khẩu mới',
                }[c.mode]
              }
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {c.mode === 'login' ? (
              <>
                Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
              </>
            ) : (
              <>
                Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
              </>
            )}
          </p>
          {c.mode === 'login' && c.config?.googleConfigured && (
            <a className="btn btn-outline full-width" href="/api/auth/google">
              Đăng nhập bằng Google
            </a>
          )}
          {c.mode === 'login' && c.config?.demoMode && (
            <div className="demo-accounts">
              <span>TRẢI NGHIỆM BẰNG TÀI KHOẢN DEMO</span>
              <div>
                <button
                  disabled={c.busy}
                  onClick={() => c.demoLogin('khach')}
                >
                  <UserRound size={16} /> Khách hàng
                </button>
                <button
                  disabled={c.busy}
                  onClick={() => c.demoLogin('duocsi')}
                >
                  <Stethoscope size={16} /> Dược sĩ
                </button>
                <button
                  disabled={c.busy}
                  onClick={() => c.demoLogin('admin')}
                >
                  <ShieldCheck size={16} /> Quản trị
                </button>
              </div>
              <small>Mật khẩu chung: Demo@123</small>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
