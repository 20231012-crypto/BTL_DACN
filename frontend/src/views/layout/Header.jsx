/**
 * Site Header View powered by useHeaderController.
 */
import React from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  Headphones,
  Menu,
  Package,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react';
import { useHeaderController } from '../../controllers/useHeaderController.js';
import Link from '../components/Link.jsx';
import { LogoIcon } from '../components/Logo.jsx';
import ProductSearch from '../components/ProductSearch.jsx';
import { categoryIcon } from '../components/UiPrimitives.jsx';

export default function Header() {
  const c = useHeaderController();

  return (
    <>
      <div className="topbar">
        <div className="container">
          <span>
            <ShieldCheck size={13} /> Chăm sóc tận tâm, an tâm mỗi ngày
          </span>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-main">
          <Link
            to="/"
            className="brand"
            aria-label="Nhà thuốc An Tâm, trang chủ"
          >
            <span className="brand-mark">
              <LogoIcon size={44} />
            </span>
            <span>
              <small>NHÀ THUỐC</small>
              <strong>
                an tâm<span>.</span>
              </strong>
            </span>
          </Link>
          <ProductSearch
            value={c.search}
            onChange={c.setSearch}
            categories={c.categories}
            onSubmit={c.submitSearch}
            onChoose={(product) => c.navigate(`/products/${product.id}`)}
          />

          <div className="header-actions">
            <Link
              className="account-link"
              to={c.user ? '/account' : '/login'}
            >
              <UserRound size={23} />
              <span>
                <small>{c.user ? 'Chào bạn,' : 'Tài khoản'}</small>
                <strong>
                  {c.user?.name?.split(' ').slice(-2).join(' ') || 'Đăng nhập'}
                </strong>
              </span>
            </Link>
            <Link
              to="/cart"
              className="cart-link"
              aria-label={`Giỏ hàng ${c.cartCount} sản phẩm`}
            >
              <ShoppingBag size={23} />
              {c.cartCount > 0 && <b>{c.cartCount}</b>}
            </Link>
            <button
              className="icon-btn mobile-menu"
              onClick={() => c.setMenu(!c.menu)}
              aria-label={c.menu ? 'Đóng danh mục' : 'Mở danh mục'}
              aria-expanded={c.menu}
            >
              {c.menu ? <X size={22} /> : <Menu />}
            </button>
          </div>
        </div>
        <div
          className={`nav-backdrop ${c.menu ? 'show' : ''}`}
          onClick={() => c.setMenu(false)}
          aria-hidden="true"
        />
        <nav
          className={`container navigation ${c.menu ? 'mobile-open' : ''}`}
          aria-label="Điều hướng chính"
        >
          <div className="mobile-nav-head">
            <Link
              to="/"
              className="brand"
              onClick={() => c.setMenu(false)}
            >
              <span className="brand-mark">
                <LogoIcon size={34} />
              </span>
              <span>
                <small>NHÀ THUỐC</small>
                <strong>
                  an tâm<span>.</span>
                </strong>
              </span>
            </Link>
            <button
              type="button"
              className="icon-btn mobile-nav-close"
              onClick={() => c.setMenu(false)}
              aria-label="Đóng menu"
            >
              <X size={20} />
            </button>
          </div>
          <div
            className="nav-categories-wrap"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget))
                c.setCatMenu(false);
            }}
          >
            <button
              type="button"
              className="nav-categories"
              aria-expanded={c.catMenu}
              aria-haspopup="menu"
              onClick={() => c.setCatMenu((v) => !v)}
            >
              <Menu size={18} /> Danh mục sản phẩm <ChevronDown size={14} />
            </button>
            {c.catMenu && (
              <div className="nav-categories-dropdown" role="menu">
                <Link
                  to="/products"
                  role="menuitem"
                  onClick={() => c.setCatMenu(false)}
                >
                  <Package size={16} /> Tất cả sản phẩm
                </Link>
                {c.categories.map((cat) => {
                  const Icon = categoryIcon(cat.name);
                  const target =
                    cat.slug === 'thuoc-ke-don'
                      ? `/products?category=${cat.id}&prescription=all`
                      : `/products?category=${cat.id}`;
                  return (
                    <Link
                      key={cat.id}
                      to={target}
                      role="menuitem"
                      onClick={() => c.setCatMenu(false)}
                    >
                      <Icon size={16} /> {cat.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          <Link
            className={c.path === '/' && !c.chatOpen ? 'active' : ''}
            to="/"
          >
            Trang chủ
          </Link>
          <Link
            className={
              c.path.startsWith('/products') && !c.chatOpen ? 'active' : ''
            }
            to="/products"
          >
            Sản phẩm
          </Link>
          <Link
            className={
              c.path.startsWith('/prescription') && !c.chatOpen ? 'active' : ''
            }
            to="/prescription"
          >
            Thuốc theo đơn
          </Link>
          <Link
            className={
              c.path.startsWith('/consultation') && !c.chatOpen ? 'active' : ''
            }
            to="/consultation"
          >
            Dược sĩ tư vấn
          </Link>
          <button
            className={
              c.chatOpen || c.path.startsWith('/chat') ? 'active' : ''
            }
            onClick={c.openChatDrawer}
          >
            Góc tư vấn
          </button>
          <Link
            className={
              c.path.startsWith('/orders') && !c.chatOpen ? 'active' : ''
            }
            to="/orders"
          >
            Theo dõi đơn hàng
          </Link>
          {c.user && ['admin', 'staff'].includes(c.user.role) && (
            <Link
              to="/admin"
              className={`staff-nav${c.path.startsWith('/admin') ? ' active' : ''}`}
            >
              Quản lý nhà thuốc <ArrowUpRight size={14} />
            </Link>
          )}
          <span className="nav-help">
            <Headphones size={16} /> Luôn sẵn sàng hỗ trợ
          </span>
        </nav>
      </header>
    </>
  );
}
