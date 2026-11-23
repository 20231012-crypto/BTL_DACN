/**
 * Account View: renders personal profile, wishlist, delivery addresses, and password change tabs.
 */
import React from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardList,
  Heart,
  LogOut,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAccountController } from '../../controllers/useAccountController.js';
import AddressFields from '../components/AddressFields.jsx';
import Link from '../components/Link.jsx';
import ProductCard from '../components/ProductCard.jsx';
import {
  Breadcrumb,
  Empty,
  ErrorBox,
  Field,
  Modal,
  PasswordStrength,
  RequireLogin,
} from '../components/UiPrimitives.jsx';

export default function AccountView() {
  const c = useAccountController();

  return (
    <RequireLogin>
      <main className="container page-shell">
        <Breadcrumb current="Tài khoản của tôi" />
        <div className="page-heading">
          <span className="eyebrow">
            CHÀO BẠN, {c.user?.name?.toUpperCase()}
          </span>
          <h1>Tài khoản của tôi</h1>
        </div>
        <div className="account-layout">
          <aside className="panel account-sidebar">
            <div className="account-avatar">{c.user?.name?.slice(0, 1)}</div>
            <strong>{c.user?.name}</strong>
            <span className="muted small">{c.user?.email}</span>
            {[
              ['profile', 'Thông tin cá nhân', UserRound],
              ['wishlist', `Sản phẩm yêu thích (${c.wishlist.length})`, Heart],
              ['addresses', 'Địa chỉ nhận hàng', MapPin],
              ['password', 'Đổi mật khẩu', ShieldCheck],
            ].map(([value, title, Icon]) => (
              <button
                key={value}
                className={c.tab === value ? 'selected' : ''}
                onClick={() => c.setTab(value)}
              >
                <Icon size={17} />
                {title}
              </button>
            ))}
            <Link to="/orders">
              <Package size={17} /> Đơn hàng của tôi
            </Link>
            {['admin', 'staff'].includes(c.user?.role) && (
              <Link to="/admin">
                <ClipboardList size={17} /> Quản lý nhà thuốc
              </Link>
            )}
            <button onClick={c.logout}>
              <LogOut size={17} /> Đăng xuất
            </button>
          </aside>
          <section className="panel account-content">
            {c.tab === 'profile' && (
              <>
                <h2>Thông tin cá nhân</h2>
                {c.googleStatus === 'linked' && (
                  <div className="success-box">
                    <CheckCircle2 size={18} /> Đã liên kết tài khoản Google.
                  </div>
                )}
                {c.googleStatus === 'error' && (
                  <ErrorBox error="Không thể liên kết. Hãy chọn tài khoản Google cùng email với hồ sơ." />
                )}
                <p className="muted">
                  Cập nhật thông tin để nhà thuốc hỗ trợ bạn thuận tiện hơn.
                </p>
                <form onSubmit={c.saveProfile} className="narrow-form">
                  <Field label="Email" value={c.user?.email || ''} disabled />
                  <Field
                    label="Họ và tên"
                    value={c.profile.name}
                    onChange={(e) =>
                      c.setProfile({ ...c.profile, name: e.target.value })
                    }
                    required
                    maxLength={100}
                  />
                  <Field
                    label="Số điện thoại"
                    value={c.profile.phone}
                    onChange={(e) =>
                      c.setProfile({ ...c.profile, phone: e.target.value })
                    }
                    type="tel"
                    required
                    maxLength={15}
                  />
                  <div className="profile-row">
                    <Field
                      label="Ngày sinh"
                      type="date"
                      value={c.profile.birthDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) =>
                        c.setProfile({
                          ...c.profile,
                          birthDate: e.target.value,
                        })
                      }
                    />
                    <Field label="Giới tính">
                      <select
                        value={c.profile.gender}
                        onChange={(e) =>
                          c.setProfile({ ...c.profile, gender: e.target.value })
                        }
                      >
                        <option value="">Chọn giới tính</option>
                        <option value="male">Nam</option>
                        <option value="female">Nữ</option>
                        <option value="other">Khác</option>
                      </select>
                    </Field>
                  </div>
                  <button className="btn btn-primary" disabled={c.busy}>
                    Lưu thay đổi <Check size={17} />
                  </button>
                </form>
                {c.config?.googleConfigured && (
                  <a
                    className="btn btn-outline btn-small"
                    href="/api/auth/google?link=1"
                  >
                    Liên kết tài khoản Google
                  </a>
                )}
              </>
            )}
            {c.tab === 'wishlist' && (
              <>
                <h2>Sản phẩm yêu thích ({c.wishlist.length})</h2>
                <p className="muted">
                  Các sản phẩm bạn đã lưu để dễ dàng tra cứu và đặt mua lại.
                </p>
                {c.wishlist.length > 0 ? (
                  <div className="product-grid wishlist-grid">
                    {c.wishlist.map((item) => (
                      <ProductCard product={item} key={item.id} />
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon={Heart}
                    title="Chưa có sản phẩm yêu thích"
                    text="Bấm vào biểu tượng trái tim trên sản phẩm để lưu vào danh sách của bạn."
                  >
                    <Link to="/products" className="btn btn-outline">
                      Khám phá sản phẩm
                    </Link>
                  </Empty>
                )}
              </>
            )}
            {c.tab === 'addresses' && (
              <>
                <div className="panel-title-row">
                  <h2>Địa chỉ nhận hàng</h2>
                  <button
                    className="btn btn-primary btn-small"
                    onClick={c.openNewAddress}
                  >
                    <Plus size={16} /> Thêm địa chỉ
                  </button>
                </div>
                {c.addresses.length ? (
                  <div className="address-list">
                    {c.addresses.map((a) => (
                      <div key={a.id} className="address-card">
                        <strong>
                          {a.recipient} · {a.phone}
                        </strong>
                        {a.isDefault ? (
                          <span className="badge">Mặc định</span>
                        ) : null}
                        <p>
                          {[a.line1, a.ward, a.district, a.city]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                        <div>
                          <button
                            className="subtle-link"
                            onClick={() => c.openEditAddress(a)}
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            className="remove-item"
                            onClick={() => c.removeAddress(a.id)}
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">
                    Chưa có địa chỉ nhận hàng. Thêm địa chỉ để đặt hàng nhanh
                    hơn.
                  </p>
                )}
              </>
            )}
            {c.tab === 'password' && (
              <>
                <h2>Đổi mật khẩu</h2>
                <form onSubmit={c.changePassword} className="narrow-form">
                  <Field
                    label="Mật khẩu hiện tại"
                    type="password"
                    value={c.passwords.currentPassword}
                    onChange={(e) =>
                      c.setPasswords({
                        ...c.passwords,
                        currentPassword: e.target.value,
                      })
                    }
                    required
                    autoComplete="current-password"
                  />
                  <Field
                    label="Mật khẩu mới"
                    type="password"
                    value={c.passwords.newPassword}
                    onChange={(e) =>
                      c.setPasswords({
                        ...c.passwords,
                        newPassword: e.target.value,
                      })
                    }
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <PasswordStrength value={c.passwords.newPassword} />
                  <Field
                    label="Nhập lại mật khẩu mới"
                    type="password"
                    value={c.passwords.confirmPassword}
                    onChange={(e) =>
                      c.setPasswords({
                        ...c.passwords,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  {c.passwords.confirmPassword &&
                    c.passwords.newPassword !== c.passwords.confirmPassword && (
                      <p className="field-help field-mismatch">
                        Mật khẩu nhập lại chưa khớp.
                      </p>
                    )}
                  <button className="btn btn-primary" disabled={c.busy}>
                    Đổi mật khẩu
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
        {c.editing && (
          <Modal
            title={
              c.editing === 'new'
                ? 'Thêm địa chỉ nhận hàng'
                : 'Chỉnh sửa địa chỉ'
            }
            onClose={() => c.setEditing(null)}
          >
            <form onSubmit={c.saveAddress}>
              <AddressFields address={c.address} onChange={c.setAddress} />
              <label className="radio-line">
                <input
                  type="checkbox"
                  checked={!!c.address.isDefault}
                  onChange={(e) =>
                    c.setAddress({ ...c.address, isDefault: e.target.checked })
                  }
                />{' '}
                Đặt làm địa chỉ mặc định
              </label>
              <button className="btn btn-primary full-width" disabled={c.busy}>
                Lưu địa chỉ
              </button>
            </form>
          </Modal>
        )}
      </main>
    </RequireLogin>
  );
}
