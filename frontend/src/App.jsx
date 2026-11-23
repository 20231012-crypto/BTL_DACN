/**
 * Root MVC Application Entry: connects AppContext with useAppController and dispatches Views by route.
 */
import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import { AppContext } from './controllers/AppContext.jsx';
import { useAppController } from './controllers/useAppController.js';
import AccountView from './views/account/AccountView.jsx';
import AdminLayout from './views/admin/AdminLayout.jsx';
import AuthView from './views/auth/AuthView.jsx';
import Link from './views/components/Link.jsx';
import { LogoIcon } from './views/components/Logo.jsx';
import ProductCard from './views/components/ProductCard.jsx';
import {
  Empty,
  RequireLogin,
  Spinner,
  Toast,
} from './views/components/UiPrimitives.jsx';
import Footer from './views/layout/Footer.jsx';
import Header from './views/layout/Header.jsx';
import CartView from './views/storefront/CartView.jsx';
import CatalogView from './views/storefront/CatalogView.jsx';
import ChatPanelView from './views/storefront/ChatPanelView.jsx';
import CheckoutView from './views/storefront/CheckoutView.jsx';
import ConsultationView from './views/storefront/ConsultationView.jsx';
import HomeView from './views/storefront/HomeView.jsx';
import OrderDetailView from './views/storefront/OrderDetailView.jsx';
import OrdersView from './views/storefront/OrdersView.jsx';
import PrescriptionCatalogView from './views/storefront/PrescriptionCatalogView.jsx';
import ProductDetailView from './views/storefront/ProductDetailView.jsx';

export default function App() {
  const app = useAppController();
  const { path, route, user, ready, config, chatOpen, setChatOpen, toast } =
    app;

  if (
    path.startsWith('/admin') &&
    ready &&
    (user?.role === 'admin' || user?.role === 'staff')
  ) {
    return (
      <AppContext.Provider value={app}>
        <AdminLayout
          user={user}
          config={config}
          onExit={() => app.navigate('/')}
          onLogout={app.logout}
        />
        {toast && <Toast toast={toast} onClose={app.clearToast} />}
      </AppContext.Provider>
    );
  }

  let content;
  if (path.startsWith('/admin') && !ready) {
    content = <Spinner />;
  } else if (
    path.startsWith('/admin') ||
    ['/login', '/register', '/forgot-password', '/verify'].includes(path)
  ) {
    content = <AuthView />;
  } else if (path === '/prescription') {
    content = (
      <RequireLogin>
        <PrescriptionCatalogView
          config={config}
          onUpload={(file) =>
            app.setSelectedPrescription({ ...file, userId: user.id })
          }
          onOrder={async (product, quantity) => {
            if (await app.addToCart(product.id, quantity))
              app.navigate('/checkout');
          }}
          renderProduct={(product) => (
            <ProductCard key={product.id} product={product} />
          )}
        />
      </RequireLogin>
    );
  } else if (path === '/consultation') {
    content = <ConsultationView />;
  } else if (path === '/products') {
    content = <CatalogView key={route} />;
  } else if (/^\/products\/[^/]+$/.test(path)) {
    content = (
      <ProductDetailView
        key={path}
        id={decodeURIComponent(path.split('/')[2])}
      />
    );
  } else if (path === '/cart') {
    content = <CartView />;
  } else if (path === '/checkout') {
    content = <CheckoutView />;
  } else if (path === '/orders') {
    content = <OrdersView />;
  } else if (/^\/orders\/[^/]+$/.test(path)) {
    content = <OrderDetailView key={path} id={path.split('/')[2]} />;
  } else if (path === '/account') {
    content = <AccountView />;
  } else if (path === '/chat') {
    content = (
      <main className="container page-shell">
        <div className="page-heading">
          <span className="eyebrow">LUÔN SẴN SÀNG LẮNG NGHE</span>
          <h1>Trợ lý sức khỏe An Tâm</h1>
          <p>Tra cứu thông tin và kết nối với dược sĩ của bạn.</p>
        </div>
        <ChatPanelView full />
      </main>
    );
  } else if (path === '/') {
    content = <HomeView />;
  } else {
    content = (
      <main className="container">
        <Empty
          title="Không tìm thấy trang"
          text="Đường dẫn này không tồn tại."
        >
          <Link className="btn btn-primary" to="/">
            Về trang chủ <ArrowRight size={17} />
          </Link>
        </Empty>
      </main>
    );
  }

  return (
    <AppContext.Provider value={app}>
      <Header />
      {content}
      <Footer />
      {path !== '/chat' && (
        <button
          className="chat-fab"
          onClick={() => setChatOpen(!chatOpen)}
          aria-label={chatOpen ? 'Đóng tư vấn' : 'Mở tư vấn'}
        >
          {chatOpen ? <X size={23} /> : <LogoIcon size={24} />}
          <span>{chatOpen ? 'Đóng' : 'Tư vấn cùng An Tâm'}</span>
          {!chatOpen && <i />}
        </button>
      )}
      {chatOpen && (
        <div className="chat-popover">
          <ChatPanelView onClose={() => setChatOpen(false)} />
        </div>
      )}
      {toast && <Toast toast={toast} onClose={app.clearToast} />}
    </AppContext.Provider>
  );
}
