import React, {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
} from 'react';
import {
  Plus,
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  Search,
  ShoppingBag,
  UserRound,
  ShieldCheck,
  Truck,
  Headphones,
  MessageCircle,
  HeartPulse,
  Pill,
  Leaf,
  Stethoscope,
  Package,
  X,
  Minus,
  Check,
  ChevronDown,
  ChevronRight,
  LogOut,
  MapPin,
  Clock3,
  CreditCard,
  Upload,
  LoaderCircle,
  Send,
  Menu,
  CheckCircle2,
  AlertCircle,
  Star,
  Trash2,
  FileText,
  SlidersHorizontal,
  ClipboardList,
  CircleHelp,
} from 'lucide-react';
import Admin from './Admin.jsx';
import { LogoIcon } from './Logo.jsx';
import { api, money, dateTime, label, uploadPrescription } from './lib.js';

const AppContext = createContext(null);
const useApp = () => useContext(AppContext);
const pathNow = () => `${location.pathname}${location.search}`;
function Link({ to, children, onClick, ...rest }) {
  const { navigate } = useApp();
  return (
    <a
      href={to}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented && !e.ctrlKey && !e.metaKey && e.button === 0) {
          e.preventDefault();
          navigate(to);
        }
      }}
    >
      {children}
    </a>
  );
}
const Spinner = ({ text = 'Đang tải dữ liệu…' }) => (
  <div className="loading">
    <LoaderCircle className="spin" size={25} />
    <span>{text}</span>
  </div>
);
const Empty = ({ icon: Icon = Package, title, text, children }) => (
  <div className="empty-state">
    <span className="empty-icon">
      <Icon size={31} />
    </span>
    <h2>{title}</h2>
    <p>{text}</p>
    {children}
  </div>
);
const Badge = ({ value }) => (
  <span className={`badge status-${value}`}>{label(value)}</span>
);
const Field = ({ label: title, children, ...props }) => (
  <label className="field">
    <span>{title}</span>
    {children || <input {...props} />}
  </label>
);
const ErrorBox = ({ error }) =>
  error ? (
    <div className="error-box" role="alert">
      <AlertCircle size={18} />
      {error}
    </div>
  ) : null;
const categoryIcon = (name) =>
  /thuốc kê|thuốc không/i.test(name)
    ? Pill
    : /thiết bị|vật tư/i.test(name)
      ? Stethoscope
      : /chăm sóc/i.test(name)
        ? HeartPulse
        : Leaf;

export default function App() {
  const [route, setRoute] = useState(pathNow);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [config, setConfig] = useState(null);
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const notify = useCallback(
    (message, type = 'success') => setToast({ message, type, id: Date.now() }),
    [],
  );
  const navigate = useCallback((to) => {
    history.pushState({}, '', to);
    setRoute(pathNow());
    setChatOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  useEffect(() => {
    const change = () => {
      setRoute(pathNow());
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', change);
    return () => window.removeEventListener('popstate', change);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);
  const refreshCart = useCallback(async () => {
    try {
      const result = await api('/cart');
      setCart(Array.isArray(result) ? result : result.items || []);
    } catch {
      setCart([]);
    }
  }, []);
  useEffect(() => {
    Promise.allSettled([
      api('/auth/me'),
      api('/categories'),
      api('/manufacturers'),
      api('/config'),
    ]).then(([me, cats, makers, settings]) => {
      if (me.status === 'fulfilled') setUser(me.value?.user || me.value);
      if (cats.status === 'fulfilled')
        setCategories(
          Array.isArray(cats.value) ? cats.value : cats.value.items || [],
        );
      if (makers.status === 'fulfilled') setManufacturers(makers.value);
      if (settings.status === 'fulfilled') setConfig(settings.value);
      setReady(true);
    });
  }, []);
  useEffect(() => {
    if (user) refreshCart();
    else setCart([]);
  }, [user, refreshCart]);
  const addToCart = async (productId, quantity = 1) => {
    if (!user) {
      notify('Đăng nhập để thêm sản phẩm vào giỏ hàng.', 'info');
      navigate(`/login?next=${encodeURIComponent(route)}`);
      return;
    }
    try {
      await api('/cart', { method: 'POST', body: { productId, quantity } });
      await refreshCart();
      notify('Đã thêm sản phẩm vào giỏ hàng.');
    } catch (e) {
      notify(e.message, 'error');
    }
  };
  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      setCart([]);
      navigate('/');
      notify('Bạn đã đăng xuất.');
    } catch (e) {
      notify(e.message, 'error');
    }
  };
  const value = {
    user,
    setUser,
    ready,
    route,
    categories,
    manufacturers,
    config,
    cart,
    refreshCart,
    navigate,
    notify,
    addToCart,
    logout,
    setChatOpen,
  };
  const path = route.split('?')[0];
  let content;
  if (path.startsWith('/admin') && !ready) content = <Spinner />;
  else if (
    path.startsWith('/admin') &&
    (user?.role === 'admin' || user?.role === 'staff')
  )
    return (
      <AppContext.Provider value={value}>
        <Admin
          user={user}
          config={config}
          onExit={() => navigate('/')}
          onLogout={logout}
        />
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </AppContext.Provider>
    );
  else if (path.startsWith('/admin')) content = <AuthPage />;
  else if (
    ['/login', '/register', '/forgot-password', '/verify'].includes(path)
  )
    content = <AuthPage />;
  else if (path === '/products') content = <Catalog key={route} />;
  else if (/^\/products\/[^/]+$/.test(path))
    content = (
      <ProductDetail key={path} id={decodeURIComponent(path.split('/')[2])} />
    );
  else if (path === '/cart') content = <Cart />;
  else if (path === '/checkout') content = <Checkout />;
  else if (path === '/orders') content = <Orders />;
  else if (/^\/orders\/[^/]+$/.test(path))
    content = <OrderDetail key={path} id={path.split('/')[2]} />;
  else if (path === '/account') content = <Account />;
  else if (path === '/chat')
    content = (
      <main className="container page-shell">
        <div className="page-heading">
          <span className="eyebrow">LUÔN SẴN SÀNG LẮNG NGHE</span>
          <h1>Trợ lý sức khỏe An Tâm</h1>
          <p>Tra cứu thông tin và kết nối với dược sĩ của bạn.</p>
        </div>
        <ChatPanel full />
      </main>
    );
  else if (path === '/') content = <Home />;
  else
    content = (
      <main className="container">
        <Empty title="Không tìm thấy trang" text="Đường dẫn này không tồn tại.">
          <Link className="btn btn-primary" to="/">
            Về trang chủ <ArrowRight size={17} />
          </Link>
        </Empty>
      </main>
    );
  return (
    <AppContext.Provider value={value}>
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
          <ChatPanel onClose={() => setChatOpen(false)} />
        </div>
      )}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </AppContext.Provider>
  );
}

function Toast({ toast, onClose }) {
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

function Header() {
  const { user, cart, route, navigate, categories, logout, setChatOpen } =
    useApp();
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState(false);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  useEffect(() => setMenu(false), [route]);
  return (
    <>
      <div className="topbar">
        <div className="container">
          <span>
            <ShieldCheck size={13} /> Chăm sóc tận tâm, an tâm mỗi ngày
          </span>
          <span className="top-right">
            Đồ án Nhóm 11 <i /> Môi trường trình diễn
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
          <form
            className="header-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/products?search=${encodeURIComponent(search)}`);
            }}
          >
            <Search size={19} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên thuốc, hoạt chất, sản phẩm…"
              aria-label="Tìm sản phẩm"
            />
            <button type="submit">Tìm kiếm</button>
          </form>
          <div className="header-actions">
            <Link className="account-link" to={user ? '/account' : '/login'}>
              <UserRound size={23} />
              <span>
                <small>{user ? 'Chào bạn,' : 'Tài khoản'}</small>
                <strong>
                  {user?.name?.split(' ').slice(-2).join(' ') || 'Đăng nhập'}
                </strong>
              </span>
            </Link>
            <Link
              to="/cart"
              className="cart-link"
              aria-label={`Giỏ hàng ${count} sản phẩm`}
            >
              <ShoppingBag size={23} />
              {count > 0 && <b>{count}</b>}
            </Link>
            <button
              className="icon-btn mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-label="Mở danh mục"
            >
              <Menu />
            </button>
          </div>
        </div>
        <nav
          className={`container navigation ${menu ? 'mobile-open' : ''}`}
          aria-label="Điều hướng chính"
        >
          <Link to="/products" className="nav-categories">
            <Menu size={18} /> Danh mục sản phẩm <ChevronDown size={14} />
          </Link>
          <Link className={route === '/' ? 'active' : ''} to="/">
            Trang chủ
          </Link>
          <Link
            className={route.startsWith('/products') ? 'active' : ''}
            to="/products"
          >
            Sản phẩm
          </Link>
          <Link to="/products?prescription=false">Thuốc không kê đơn</Link>
          <button onClick={() => setChatOpen(true)}>Góc tư vấn</button>
          <Link to="/orders">Theo dõi đơn hàng</Link>
          {user && ['admin', 'staff'].includes(user.role) && (
            <Link to="/admin" className="staff-nav">
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

function Home() {
  const { categories, setChatOpen } = useApp();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  useEffect(() => {
    api('/products?sort=featured')
      .then((data) =>
        setProducts(
          Array.isArray(data) ? data : data.items || data.products || [],
        ),
      )
      .catch((e) => setError(e.message));
  }, []);
  const shown = products
    ?.filter((p) => category === 'all' || String(p.categoryId) === category)
    .slice(0, 8);
  return (
    <main>
      <section className="container hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-cross">+</span> SỨC KHỎE CỦA BẠN, SỰ QUAN TÂM
            CỦA CHÚNG TÔI
          </span>
          <h1>
            Khỏe mỗi ngày.
            <br />
            An tâm <em>mỗi lựa chọn.</em>
          </h1>
          <p>
            Từ những chăm sóc nhỏ, vun đắp sức khỏe dài lâu.
            <br className="desktop-only" /> An Tâm đồng hành cùng bạn và những
            người thân yêu.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="btn btn-primary">
              Khám phá sản phẩm <ArrowUpRight size={18} />
            </Link>
            <button className="btn btn-text" onClick={() => setChatOpen(true)}>
              <MessageCircle size={18} /> Nhận tư vấn
            </button>
          </div>
        </div>
        <figure className="hero-photo">
          <img
            src="/assets/pharmacy-hero.webp"
            alt="Bao bì sản phẩm chăm sóc sức khỏe An Tâm minh họa"
            width="1200"
            height="900"
            fetchPriority="high"
          />
        </figure>
      </section>
      <section className="container benefits" aria-label="Cam kết dịch vụ">
        {[
          [ShieldCheck, 'Thông tin minh bạch', 'Tra cứu trước mỗi lựa chọn'],
          [Stethoscope, 'Dược sĩ đồng hành', 'Kiểm duyệt thuốc kê đơn'],
          [Truck, 'Đặt hàng thuận tiện', 'Theo dõi từng bước xử lý'],
          [HeartPulse, 'Chăm sóc tận tâm', 'Lắng nghe điều bạn cần'],
        ].map(([Icon, title, text]) => (
          <div className="benefit" key={title}>
            <Icon size={26} strokeWidth={1.5} />
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </div>
        ))}
      </section>
      <section className="container category-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CHỌN ĐIỀU BẠN CẦN</span>
            <h2>Chăm sóc sức khỏe toàn diện</h2>
          </div>
          <Link to="/products" className="subtle-link">
            Tất cả danh mục <ArrowRight size={17} />
          </Link>
        </div>
        <div className="category-grid">
          {categories.slice(0, 6).map((cat, i) => {
            const Icon = categoryIcon(cat.name);
            return (
              <Link
                to={`/products?category=${cat.id}`}
                className={`category-tile category-${i}`}
                key={cat.id}
              >
                <span>
                  <Icon size={29} strokeWidth={1.35} />
                </span>
                <strong>{cat.name}</strong>
                <ArrowUpRight className="category-arrow" size={15} />
              </Link>
            );
          })}
        </div>
      </section>
      <section className="container product-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ĐƯỢC QUAN TÂM TẠI AN TÂM</span>
            <h2>Lựa chọn cho mỗi ngày khỏe</h2>
          </div>
          <Link to="/products" className="subtle-link">
            Xem tất cả <ArrowRight size={17} />
          </Link>
        </div>
        <div className="filter-tabs">
          <button
            className={category === 'all' ? 'selected' : ''}
            onClick={() => setCategory('all')}
          >
            Tất cả sản phẩm
          </button>
          {categories.slice(0, 4).map((cat) => (
            <button
              key={cat.id}
              className={category === String(cat.id) ? 'selected' : ''}
              onClick={() => setCategory(String(cat.id))}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <ErrorBox error={error} />
        {!products && !error ? (
          <Spinner />
        ) : shown?.length ? (
          <div className="product-grid">
            {shown.map((p) => (
              <ProductCard product={p} key={p.id} />
            ))}
          </div>
        ) : (
          <Empty
            title="Danh mục đang được cập nhật"
            text="Bạn có thể khám phá các sản phẩm khác trong cửa hàng."
          />
        )}
      </section>
      <section className="container care-banner">
        <div className="care-icon">
          <LogoIcon size={64} />
        </div>
        <div>
          <span className="eyebrow">CHĂM SÓC KHÁCH HÀNG & TƯ VẤN SỨC KHỎE</span>
          <h2>Chưa biết bắt đầu từ đâu?</h2>
          <p>Trợ lý An Tâm giúp bạn tìm thông tin và kết nối với dược sĩ.</p>
        </div>
        <button className="btn btn-light" onClick={() => setChatOpen(true)}>
          Trò chuyện cùng An Tâm <ArrowUpRight size={18} />
        </button>
      </section>
      <section className="container story-section">
        <div className="story-visual">
          <span className="eyebrow">TỪ NHỮNG ĐIỀU NHỎ NHẤT</span>
          <HeartPulse size={75} strokeWidth={0.8} />
          <h3>
            Hiểu để chăm sóc.
            <br />
            Tận tình để an tâm.
          </h3>
          <span className="story-line" />
        </div>
        <div className="story-copy">
          <span className="eyebrow">TINH THẦN AN TÂM</span>
          <h2>
            Sức khỏe là một hành trình.
            <br />
            Chúng tôi ở đây, cùng bạn.
          </h2>
          <p>
            Chúng tôi tin rằng chăm sóc sức khỏe bắt đầu từ việc được lắng nghe
            và tiếp cận thông tin rõ ràng. Mỗi sản phẩm, mỗi cuộc trò chuyện đều
            hướng đến sự an tâm của bạn.
          </p>
          <div className="story-points">
            <span>
              <CheckCircle2 size={18} /> Tra cứu thông tin sản phẩm dễ dàng
            </span>
            <span>
              <CheckCircle2 size={18} /> Thuốc kê đơn được dược sĩ kiểm duyệt
            </span>
            <span>
              <CheckCircle2 size={18} /> Đơn hàng và dữ liệu được quản lý riêng
              tư
            </span>
          </div>
          <Link to="/chat" className="subtle-link">
            Kết nối với An Tâm <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}

function ProductCard({ product: p }) {
  const { addToCart } = useApp();
  return (
    <article className="product-card">
      <Link to={`/products/${p.id}`} className="product-picture">
        {p.prescriptionRequired ? (
          <span className="product-tag rx-tag">Cần đơn thuốc</span>
        ) : p.oldPrice > p.price ? (
          <span className="product-tag">
            −{Math.round((1 - p.price / p.oldPrice) * 100)}%
          </span>
        ) : p.featured ? (
          <span className="product-tag neutral-tag">Được quan tâm</span>
        ) : null}
        <img
          src={p.image || '/assets/products/vitamin-c.svg'}
          alt={p.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '/assets/products/vitamin-c.svg';
          }}
        />
      </Link>
      <div className="product-info">
        <span className="product-category">
          {p.categoryName || p.manufacturer || 'Chăm sóc sức khỏe'}
        </span>
        <Link to={`/products/${p.id}`} className="product-name">
          {p.name}
        </Link>
        <span className="product-unit">{p.unit}</span>
        <div className="price-row">
          <strong>{money(p.price)}</strong>
          {p.oldPrice > p.price && <del>{money(p.oldPrice)}</del>}
        </div>
        <button
          className="product-add"
          disabled={p.stock <= 0}
          onClick={() => addToCart(p.id)}
        >
          {p.stock > 0 ? (
            <>
              <Plus size={16} /> Thêm vào giỏ
            </>
          ) : (
            'Tạm hết hàng'
          )}
        </button>
      </div>
    </article>
  );
}

function Catalog() {
  const { route, categories, manufacturers, navigate } = useApp();
  const params = new URLSearchParams(route.split('?')[1]);
  const [search, setSearch] = useState(params.get('search') || '');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [price, setPrice] = useState({
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
  });
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    navigate(`/products?${next}`);
  };
  useEffect(() => {
    api(`/products?${params}`)
      .then((result) =>
        setItems(
          Array.isArray(result)
            ? result
            : result.items || result.products || [],
        ),
      )
      .catch((e) => setError(e.message));
  }, []);
  return (
    <main className="container page-shell">
      <Breadcrumb current="Sản phẩm" />
      <div className="catalog-title">
        <div>
          <span className="eyebrow">KHÁM PHÁ TẠI AN TÂM</span>
          <h1>Sản phẩm chăm sóc sức khỏe</h1>
          <p>Tra cứu dễ dàng. Lựa chọn an tâm.</p>
        </div>
        <span className="catalog-title-icon">
          <Leaf size={48} strokeWidth={1} />
        </span>
      </div>
      <div className="catalog-layout">
        <aside className={`catalog-sidebar ${showFilters ? 'show' : ''}`}>
          <h3>
            <SlidersHorizontal size={17} /> Bộ lọc sản phẩm
          </h3>
          <h4>Danh mục</h4>
          <button
            className={!params.get('category') ? 'chosen' : ''}
            onClick={() => update('category', '')}
          >
            <span>Tất cả sản phẩm</span>
            <ChevronRight size={14} />
          </button>
          {categories.map((cat) => (
            <button
              className={
                params.get('category') === String(cat.id) ? 'chosen' : ''
              }
              key={cat.id}
              onClick={() => update('category', String(cat.id))}
            >
              {cat.name}
              <ChevronRight size={14} />
            </button>
          ))}
          <h4>Phân loại</h4>
          <label className="radio-line">
            <input
              type="radio"
              name="rx"
              checked={!params.has('prescription')}
              onChange={() => update('prescription', '')}
            />{' '}
            Tất cả
          </label>
          <label className="radio-line">
            <input
              type="radio"
              name="rx"
              checked={params.get('prescription') === 'false'}
              onChange={() => update('prescription', 'false')}
            />{' '}
            Không cần đơn thuốc
          </label>
          <label className="radio-line">
            <input
              type="radio"
              name="rx"
              checked={params.get('prescription') === 'true'}
              onChange={() => update('prescription', 'true')}
            />{' '}
            Thuốc kê đơn
          </label>
          <h4>Nhà sản xuất</h4>
          <Field label="Chọn nhà sản xuất">
            <select
              value={params.get('manufacturer') || ''}
              onChange={(e) => update('manufacturer', e.target.value)}
            >
              <option value="">Tất cả nhà sản xuất</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <h4>Khoảng giá</h4>
          <form
            className="catalog-price-filter"
            onSubmit={(e) => {
              e.preventDefault();
              const next = new URLSearchParams(params);
              for (const [key, value] of Object.entries(price))
                value ? next.set(key, value) : next.delete(key);
              navigate(`/products?${next}`);
            }}
          >
            <Field
              label="Từ (đ)"
              type="number"
              min="0"
              max={price.maxPrice || undefined}
              value={price.minPrice}
              onChange={(e) => setPrice({ ...price, minPrice: e.target.value })}
            />
            <Field
              label="Đến (đ)"
              type="number"
              min={price.minPrice || '0'}
              value={price.maxPrice}
              onChange={(e) => setPrice({ ...price, maxPrice: e.target.value })}
            />
            <button
              type="submit"
              className="btn btn-outline btn-small full-width"
            >
              Lọc giá
            </button>
          </form>
          <label className="radio-line">
            <input
              type="checkbox"
              checked={params.get('inStock') === 'true'}
              onChange={(e) =>
                update('inStock', e.target.checked ? 'true' : '')
              }
            />{' '}
            Chỉ xem hàng có sẵn
          </label>
          <div className="sidebar-note">
            <Stethoscope size={23} />
            <strong>Cần thêm thông tin?</strong>
            <p>Dược sĩ sẽ giúp bạn hiểu rõ hơn trước khi lựa chọn.</p>
            <Link to="/chat">
              Nhận tư vấn <ArrowRight size={14} />
            </Link>
          </div>
        </aside>
        <div className="catalog-content">
          <form
            className="catalog-search"
            onSubmit={(e) => {
              e.preventDefault();
              update('search', search);
            }}
          >
            <Search size={19} />
            <input
              aria-label="Tìm trong danh mục"
              placeholder="Tìm tên sản phẩm, hoạt chất…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-primary" type="submit">
              Tìm kiếm
            </button>
          </form>
          <div className="catalog-toolbar">
            <span>
              {items ? (
                <>
                  <strong>{items.length}</strong> sản phẩm{' '}
                  {params.get('search') && <>cho “{params.get('search')}”</>}
                </>
              ) : (
                'Đang tìm sản phẩm…'
              )}
            </span>
            <button
              className="btn btn-outline filter-mobile"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={16} /> Bộ lọc
            </button>
            <select
              aria-label="Sắp xếp sản phẩm"
              value={params.get('sort') || 'featured'}
              onChange={(e) => update('sort', e.target.value)}
            >
              <option value="featured">Sản phẩm nổi bật</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="name">Tên A–Z</option>
            </select>
          </div>
          <ErrorBox error={error} />
          {!items && !error ? (
            <Spinner />
          ) : items?.length ? (
            <div className="product-grid catalog-products">
              {items.map((p) => (
                <ProductCard product={p} key={p.id} />
              ))}
            </div>
          ) : (
            <Empty
              icon={Search}
              title="Chưa tìm thấy sản phẩm"
              text="Thử tên khác, tìm theo hoạt chất hoặc bỏ bớt bộ lọc."
            >
              <button
                className="btn btn-outline"
                onClick={() => navigate('/products')}
              >
                Xem tất cả sản phẩm
              </button>
            </Empty>
          )}
        </div>
      </div>
    </main>
  );
}

function Breadcrumb({ current, parent }) {
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
function ProductDetail({ id }) {
  const { addToCart, setChatOpen, user, notify } = useApp();
  const [p, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    api(`/products/${id}`)
      .then(setProduct)
      .catch((e) => setError(e.message));
  }, [id]);
  if (error)
    return (
      <main className="container page-shell">
        <ErrorBox error={error} />
        <Link to="/products">Quay lại sản phẩm</Link>
      </main>
    );
  if (!p) return <Spinner />;
  return (
    <main className="container page-shell">
      <Breadcrumb
        current={p.name}
        parent={{ to: '/products', name: 'Sản phẩm' }}
      />
      <section className="product-detail">
        <div className="detail-image">
          <img src={p.image} alt={p.name} />
          <span>Hình ảnh minh họa cho đồ án</span>
        </div>
        <div className="detail-copy">
          <span className="eyebrow">
            {p.categoryName || 'CHĂM SÓC SỨC KHỎE'}
          </span>
          <h1>{p.name}</h1>
          <div className="detail-meta">
            <span>{p.manufacturer}</span>
            <i />
            {p.stock > 0 ? (
              <span className="in-stock">
                <CheckCircle2 size={14} /> Còn {p.stock} sản phẩm
              </span>
            ) : (
              <span>Tạm hết hàng</span>
            )}
          </div>
          <div className="detail-price">
            <strong>{money(p.price)}</strong>
            <span>/ {p.unit}</span>
            {p.oldPrice > p.price && <del>{money(p.oldPrice)}</del>}
          </div>
          <p>{p.description}</p>
          {p.prescriptionRequired && (
            <div className="rx-notice">
              <FileText size={23} />
              <div>
                <strong>Sản phẩm cần đơn thuốc</strong>
                <p>
                  Tải đơn thuốc khi đặt hàng. Dược sĩ sẽ kiểm duyệt trước khi
                  đơn được xác nhận hoặc thanh toán.
                </p>
              </div>
            </div>
          )}
          <div className="quantity-label">Số lượng</div>
          <div className="detail-actions">
            <Quantity value={quantity} max={p.stock} onChange={setQuantity} />
            <button
              className="btn btn-primary"
              disabled={p.stock <= 0}
              onClick={() => addToCart(p.id, quantity)}
            >
              <ShoppingBag size={19} /> Thêm vào giỏ hàng
            </button>
          </div>
          <button className="detail-consult" onClick={() => setChatOpen(true)}>
            <MessageCircle size={18} /> Hỏi thêm về sản phẩm này{' '}
            <ArrowRight size={16} />
          </button>
          <div className="detail-assurances">
            <span>
              <ShieldCheck size={17} /> Thông tin rõ ràng
            </span>
            <span>
              <Package size={17} /> Quản lý theo lô, hạn dùng
            </span>
          </div>
        </div>
      </section>
      <section className="detail-lower">
        <div className="panel">
          <h2>Thông tin sản phẩm</h2>
          <dl className="product-specs">
            <dt>Hoạt chất / Thành phần</dt>
            <dd>{p.ingredient || 'Xem thông tin trên nhãn sản phẩm.'}</dd>
            <dt>Quy cách</dt>
            <dd>{p.unit}</dd>
            <dt>Nhà sản xuất</dt>
            <dd>{p.manufacturer}</dd>
            <dt>Thông tin sử dụng</dt>
            <dd>
              {p.usage ||
                'Đọc kỹ nhãn và hướng dẫn của nhà sản xuất. Hỏi dược sĩ khi cần.'}
            </dd>
            <dt>Lưu ý</dt>
            <dd>
              {p.warning ||
                'Thông tin trong bản demo chỉ để minh họa chức năng, không dùng làm chỉ dẫn điều trị.'}
            </dd>
          </dl>
        </div>
        <aside className="panel demo-note">
          <CircleHelp size={25} />
          <h3>Thông tin dành cho bạn</h3>
          <p>
            Dữ liệu sản phẩm là dữ liệu mẫu cho đồ án. Chatbot cung cấp thông
            tin tham khảo và hỗ trợ kết nối dược sĩ.
          </p>
          <button className="btn btn-outline" onClick={() => setChatOpen(true)}>
            Trao đổi cùng An Tâm
          </button>
        </aside>
      </section>
      <section className="panel reviews">
        <h2>
          Đánh giá sản phẩm <span>({p.reviews?.length || 0})</span>
        </h2>
        {p.reviews?.length ? (
          p.reviews.map((r) => (
            <div className="review" key={r.id}>
              <span className="review-avatar">
                {(r.userName || r.name || 'K')[0]}
              </span>
              <div>
                <strong>{r.userName || r.name || 'Khách hàng'}</strong>
                <div className="stars">
                  {'★'.repeat(r.rating)}
                  {'☆'.repeat(5 - r.rating)}
                </div>
                <p>{r.comment}</p>
                <small>{dateTime(r.createdAt)}</small>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">
            Chưa có đánh giá. Sau khi nhận hàng, bạn có thể đánh giá sản phẩm từ
            chi tiết đơn hàng.
          </p>
        )}
      </section>
    </main>
  );
}
function Quantity({ value, onChange, max = 99 }) {
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

function RequireLogin({ children }) {
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
function Cart() {
  const { cart, refreshCart, notify } = useApp();
  const [busy, setBusy] = useState(null);
  const change = async (id, quantity) => {
    setBusy(id);
    try {
      await api(`/cart/${id}`, {
        method: quantity ? 'PATCH' : 'DELETE',
        ...(quantity ? { body: { quantity } } : {}),
      });
      await refreshCart();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  return (
    <RequireLogin>
      <main className="container page-shell">
        <Breadcrumb current="Giỏ hàng" />
        <div className="page-heading">
          <span className="eyebrow">CHỌN LỰA CHO SỨC KHỎE</span>
          <h1>
            Giỏ hàng của bạn <span className="title-count">{cart.length}</span>
          </h1>
        </div>
        {!cart.length ? (
          <Empty
            icon={ShoppingBag}
            title="Giỏ hàng đang chờ bạn"
            text="Khám phá những sản phẩm chăm sóc sức khỏe dành cho bạn và gia đình."
          >
            <Link to="/products" className="btn btn-primary">
              Khám phá sản phẩm <ArrowRight size={17} />
            </Link>
          </Empty>
        ) : (
          <div className="checkout-layout">
            <section className="panel cart-panel">
              <div className="cart-table-head">
                <span>Sản phẩm</span>
                <span>Số lượng</span>
                <span>Thành tiền</span>
              </div>
              {cart.map((item) => (
                <div
                  className={`cart-row ${busy === item.id ? 'is-busy' : ''}`}
                  key={item.id}
                >
                  <Link
                    to={`/products/${item.productId}`}
                    className="cart-product"
                  >
                    <img src={item.product.image} alt="" />
                    <div>
                      <strong>{item.product.name}</strong>
                      <span>{item.product.unit}</span>
                      {item.product.prescriptionRequired && (
                        <small className="rx-text">Cần đơn thuốc</small>
                      )}
                      <span>{money(item.product.price)}</span>
                    </div>
                  </Link>
                  <Quantity
                    value={item.quantity}
                    max={item.product.stock}
                    onChange={(quantity) => change(item.id, quantity)}
                  />
                  <div className="cart-row-total">
                    <strong>{money(item.quantity * item.product.price)}</strong>
                    <button
                      className="remove-item"
                      onClick={() => change(item.id, 0)}
                      disabled={busy === item.id}
                    >
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                </div>
              ))}
              <Link to="/products" className="subtle-link">
                <ArrowLeft size={16} /> Tiếp tục mua sắm
              </Link>
            </section>
            <aside className="panel order-summary">
              <h2>Tóm tắt giỏ hàng</h2>
              <div>
                <span>Tạm tính</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <p className="muted small">
                Phí giao hàng và mã ưu đãi được tính ở bước đặt hàng.
              </p>
              <div className="summary-total">
                <span>Tạm tính</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <Link to="/checkout" className="btn btn-primary full-width">
                Tiến hành đặt hàng <ArrowRight size={17} />
              </Link>
              <span className="summary-secure">
                <ShieldCheck size={15} /> Thông tin của bạn được bảo vệ
              </span>
            </aside>
          </div>
        )}
      </main>
    </RequireLogin>
  );
}

function Checkout() {
  const { user, cart, refreshCart, navigate, notify, config } = useApp();
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState('new');
  const [address, setAddress] = useState({
    recipient: user?.name || '',
    phone: user?.phone || '',
    line1: '',
    ward: '',
    district: '',
    city: '',
  });
  const [method, setMethod] = useState('cod');
  const [promotionCode, setPromotionCode] = useState('');
  const [promotion, setPromotion] = useState(null);
  const [prescription, setPrescription] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [promos, setPromos] = useState([]);
  const rx = cart.some((item) => item.product.prescriptionRequired);
  const subtotal = cart.reduce(
    (sum, i) => sum + i.quantity * i.product.price,
    0,
  );
  const shippingFee = config
    ? subtotal >= config.freeShippingThreshold
      ? 0
      : config.shippingFee
    : null;
  const onlineMethods = (config?.paymentMethods || []).filter(
    (value) => value !== 'cod',
  );
  useEffect(() => {
    if (!user) return;
    api('/addresses')
      .then((data) => {
        const arr = Array.isArray(data) ? data : data.items || [];
        setAddresses(arr);
        const def = arr.find((a) => a.isDefault);
        if (def) setAddressId(String(def.id));
      })
      .catch(() => {});
    api('/promotions')
      .then((data) => setPromos(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [user]);
  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await uploadPrescription(file);
      setPrescription({ ...result, fileName: file.name });
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };
  const applyCode = async () => {
    try {
      setError('');
      const result = await api('/promotions/validate', {
        method: 'POST',
        body: { code: promotionCode, subtotal },
      });
      setPromotion(result);
      notify('Đã kiểm tra mã ưu đãi.');
    } catch (e) {
      setPromotion(null);
      setError(e.message);
    }
  };
  const place = async (e) => {
    e.preventDefault();
    setError('');
    if (rx && !prescription)
      return setError('Vui lòng tải đơn thuốc để dược sĩ kiểm duyệt.');
    setBusy(true);
    try {
      const order = await api('/orders', {
        method: 'POST',
        body: {
          ...(addressId === 'new'
            ? { address }
            : { addressId: Number(addressId) }),
          paymentMethod: method,
          ...(prescription ? { prescriptionId: prescription.id } : {}),
          promotionCode: promotion?.code || undefined,
          note,
        },
      });
      await refreshCart();
      navigate(`/orders/${order.id}?created=1`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <RequireLogin>
      <main className="container page-shell">
        <Breadcrumb
          current="Đặt hàng"
          parent={{ to: '/cart', name: 'Giỏ hàng' }}
        />
        <div className="page-heading">
          <span className="eyebrow">THÊM MỘT BƯỚC ĐỂ AN TÂM</span>
          <h1>Hoàn tất đơn hàng</h1>
        </div>
        {cart.length ? (
          <form onSubmit={place} className="checkout-layout">
            <div className="checkout-panels">
              <section className="panel">
                <h2>
                  <span className="step-number">1</span> Thông tin nhận hàng
                </h2>
                {addresses.length > 0 && (
                  <div className="address-options">
                    {addresses.map((a) => (
                      <label
                        className={`address-option ${addressId === String(a.id) ? 'selected' : ''}`}
                        key={a.id}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={addressId === String(a.id)}
                          onChange={() => setAddressId(String(a.id))}
                        />
                        <div>
                          <strong>
                            {a.recipient} · {a.phone}
                          </strong>
                          <span>
                            {[a.line1, a.ward, a.district, a.city]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      </label>
                    ))}
                    <label className="radio-line">
                      <input
                        type="radio"
                        name="address"
                        checked={addressId === 'new'}
                        onChange={() => setAddressId('new')}
                      />{' '}
                      Dùng địa chỉ khác
                    </label>
                  </div>
                )}
                {addressId === 'new' && (
                  <div className="form-grid">
                    {[
                      ['recipient', 'Họ tên người nhận'],
                      ['phone', 'Số điện thoại'],
                      ['city', 'Tỉnh / Thành phố'],
                      ['district', 'Quận / Huyện'],
                      ['ward', 'Phường / Xã'],
                      ['line1', 'Số nhà, tên đường'],
                    ].map(([key, title]) => (
                      <Field
                        key={key}
                        label={title}
                        required
                        value={address[key]}
                        maxLength={key === 'phone' ? 15 : 200}
                        autoComplete={key === 'phone' ? 'tel' : undefined}
                        onChange={(e) =>
                          setAddress({ ...address, [key]: e.target.value })
                        }
                      />
                    ))}
                  </div>
                )}
              </section>
              {rx && (
                <section className="panel rx-panel">
                  <h2>
                    <span className="step-number">2</span> Đơn thuốc của bạn{' '}
                    <span className="badge">Bắt buộc</span>
                  </h2>
                  <p>
                    Dược sĩ sẽ kiểm tra đơn trước khi xử lý. Tệp được lưu riêng
                    tư và chỉ người có quyền mới xem được.
                  </p>
                  <label
                    className={`upload-zone ${prescription ? 'uploaded' : ''}`}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={upload}
                      disabled={uploading}
                    />
                    {uploading ? (
                      <LoaderCircle className="spin" />
                    ) : prescription ? (
                      <CheckCircle2 size={25} />
                    ) : (
                      <Upload size={25} />
                    )}
                    <strong>
                      {uploading
                        ? 'Đang tải lên…'
                        : prescription
                          ? prescription.fileName
                          : 'Chọn ảnh hoặc tệp đơn thuốc'}
                    </strong>
                    <span>JPG, PNG hoặc PDF · Tối đa 5 MB</span>
                  </label>
                </section>
              )}
              <section className="panel">
                <h2>
                  <span className="step-number">{rx ? 3 : 2}</span> Phương thức
                  thanh toán
                </h2>
                <label
                  className={`payment-option ${method === 'cod' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={method === 'cod'}
                    onChange={() => setMethod('cod')}
                  />
                  <Truck size={23} />
                  <div>
                    <strong>Thanh toán khi nhận hàng (COD)</strong>
                    <span>
                      Thanh toán cho nhân viên khi nhận được đơn hàng.
                    </span>
                  </div>
                </label>
                {onlineMethods.map((provider) => (
                  <label
                    key={provider}
                    className={`payment-option ${method === provider ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={method === provider}
                      onChange={() => setMethod(provider)}
                    />
                    <CreditCard size={23} />
                    <div>
                      <strong>
                        {provider === 'demo'
                          ? 'Thanh toán trực tuyến mô phỏng'
                          : 'VNPay Sandbox'}
                      </strong>
                      <span>
                        {provider === 'demo'
                          ? 'Chọn kết quả thành công hoặc thất bại để kiểm thử luồng.'
                          : 'Chuyển sang cổng thử nghiệm VNPay sau khi tạo đơn.'}
                      </span>
                    </div>
                  </label>
                ))}
                <Field label="Ghi chú cho nhà thuốc">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={1000}
                    placeholder="Điều bạn muốn nhà thuốc lưu ý…"
                    rows={3}
                  />
                </Field>
              </section>
            </div>
            <aside className="panel order-summary">
              <h2>Đơn hàng của bạn</h2>
              <div className="checkout-items">
                {cart.map((item) => (
                  <div key={item.id}>
                    <img src={item.product.image} alt="" />
                    <span>
                      {item.product.name}
                      <small>
                        {item.quantity} × {money(item.product.price)}
                      </small>
                    </span>
                    <strong>{money(item.quantity * item.product.price)}</strong>
                  </div>
                ))}
              </div>
              <div className="coupon-field">
                <input
                  aria-label="Mã ưu đãi"
                  placeholder="Nhập mã ưu đãi"
                  value={promotionCode}
                  onChange={(e) => {
                    setPromotionCode(e.target.value.toUpperCase());
                    setPromotion(null);
                  }}
                />
                <button
                  type="button"
                  onClick={applyCode}
                  disabled={!promotionCode}
                >
                  Áp dụng
                </button>
              </div>
              {promos.length > 0 && (
                <div className="available-coupons">
                  {promos.slice(0, 2).map((p) => (
                    <button
                      type="button"
                      key={p.id || p.code}
                      onClick={() => {
                        setPromotionCode(p.code);
                        setPromotion(null);
                      }}
                    >
                      {p.code}
                    </button>
                  ))}
                </div>
              )}
              <div>
                <span>Tạm tính</span>
                <strong>{money(subtotal)}</strong>
              </div>
              {promotion && (
                <div>
                  <span>Ưu đãi {promotion.code}</span>
                  <strong className="in-stock">
                    −{money(promotion.discount)}
                  </strong>
                </div>
              )}
              <div>
                <span>Giao hàng</span>
                <strong>
                  {shippingFee === null
                    ? 'Tính khi tạo đơn'
                    : money(shippingFee)}
                </strong>
              </div>
              <div className="summary-total">
                <span>
                  {shippingFee === null ? 'Tạm tính' : 'Tổng dự kiến'}
                </span>
                <strong>
                  {money(
                    subtotal - (promotion?.discount || 0) + (shippingFee || 0),
                  )}
                </strong>
              </div>
              <ErrorBox error={error} />
              <button
                className="btn btn-primary full-width"
                disabled={busy || uploading}
                type="submit"
              >
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <Check size={18} />
                )}{' '}
                Đặt hàng
              </button>
              <span className="summary-secure">
                <ShieldCheck size={15} /> Tổng chính xác hiển thị trong đơn đã
                tạo.
              </span>
            </aside>
          </form>
        ) : (
          <Empty
            icon={ShoppingBag}
            title="Giỏ hàng của bạn đang trống"
            text="Thêm sản phẩm trước khi đặt hàng."
          >
            <Link to="/products" className="btn btn-primary">
              Chọn sản phẩm
            </Link>
          </Empty>
        )}
      </main>
    </RequireLogin>
  );
}

function Orders() {
  const { user } = useApp();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    if (user)
      api('/orders')
        .then((data) =>
          setOrders(Array.isArray(data) ? data : data.items || []),
        )
        .catch((e) => setError(e.message));
  }, [user]);
  const shown = orders?.filter(
    (o) =>
      filter === 'all' ||
      (filter === 'done'
        ? ['delivered', 'DaGiao'].includes(o.status)
        : ![
            'delivered',
            'DaGiao',
            'cancelled',
            'DaHuy',
            'rejected',
            'BiTuChoi',
          ].includes(o.status)),
  );
  return (
    <RequireLogin>
      <main className="container page-shell">
        <Breadcrumb current="Đơn hàng của tôi" />
        <div className="page-heading">
          <span className="eyebrow">MỖI ĐƠN HÀNG, MỘT SỰ QUAN TÂM</span>
          <h1>Đơn hàng của tôi</h1>
          <p>Theo dõi và quản lý đơn hàng tại An Tâm.</p>
        </div>
        <div className="filter-tabs">
          {[
            ['all', 'Tất cả đơn hàng'],
            ['pending', 'Đang xử lý'],
            ['done', 'Đã nhận hàng'],
          ].map(([value, title]) => (
            <button
              className={filter === value ? 'selected' : ''}
              key={value}
              onClick={() => setFilter(value)}
            >
              {title}
            </button>
          ))}
        </div>
        <ErrorBox error={error} />
        {!orders && !error ? (
          <Spinner />
        ) : shown?.length ? (
          <div className="orders-list">
            {shown.map((o) => (
              <Link
                to={`/orders/${o.id}`}
                className="panel order-card"
                key={o.id}
              >
                <div className="order-card-header">
                  <strong>{o.code}</strong>
                  <span>{dateTime(o.createdAt)}</span>
                  <Badge value={o.status} />
                </div>
                <div className="order-card-body">
                  <span className="order-box-icon">
                    <Package size={29} />
                  </span>
                  <div>
                    <strong>
                      {o.items?.map((i) => i.name).join(', ') ||
                        `${o.itemCount || ''} sản phẩm chăm sóc sức khỏe`}
                    </strong>
                    <span>
                      {label(o.paymentMethod)} · {label(o.paymentStatus)}
                    </span>
                  </div>
                  <strong>{money(o.total)}</strong>
                  <ChevronRight size={19} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            icon={ClipboardList}
            title="Chưa có đơn hàng trong mục này"
            text="Các đơn mua sắm của bạn sẽ xuất hiện tại đây."
          >
            <Link to="/products" className="btn btn-primary">
              Khám phá sản phẩm <ArrowRight size={17} />
            </Link>
          </Empty>
        )}
      </main>
    </RequireLogin>
  );
}

function OrderDetail({ id }) {
  const { user, route, notify, config } = useApp();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState(null);
  const [reason, setReason] = useState('');
  const [returnEvidence, setReturnEvidence] = useState(null);
  const [review, setReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [rxAdjustment, setRxAdjustment] = useState(null);
  const paymentReturn = new URLSearchParams(route.split('?')[1]).get('payment');
  const load = useCallback(
    () =>
      api(`/orders/${id}`)
        .then((value) => {
          setOrder(value);
          setError('');
        })
        .catch((e) => setError(e.message)),
    [id],
  );
  useEffect(() => {
    if (user) load();
  }, [user, load]);
  const perform = async (action) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const pay = (result) =>
    perform(async () => {
      await api(`/orders/${id}/payment`, {
        method: 'POST',
        body: { result },
      });
      await load();
      notify(
        result === 'success'
          ? 'Thanh toán mô phỏng thành công.'
          : 'Đã mô phỏng giao dịch thất bại.',
        result === 'success' ? 'success' : 'info',
      );
    });
  const replacePrescription = (file) =>
    perform(async () => {
      const attachment = await uploadPrescription(file);
      setOrder(
        await api(`/orders/${id}/prescription`, {
          method: 'POST',
          body: { prescriptionId: attachment.id },
        }),
      );
      notify('Đã gửi tệp mới để dược sĩ duyệt.');
    });
  const adjustRx = (e) => {
    e.preventDefault();
    perform(async () => {
      setOrder(
        await api(`/orders/${id}/rx-adjustment`, {
          method: 'POST',
          body: { mode: rxAdjustment },
        }),
      );
      setRxAdjustment(null);
      notify('Đã điều chỉnh đơn hàng và tính lại tổng tiền.');
    });
  };
  const payVnpay = () =>
    perform(async () => {
      const { url } = await api(`/orders/${id}/vnpay`, { method: 'POST' });
      location.assign(url);
    });
  const switchCod = () =>
    perform(async () => {
      setOrder(
        await api(`/orders/${id}/payment-method`, {
          method: 'POST',
          body: { paymentMethod: 'cod' },
        }),
      );
      notify('Đã chuyển sang thanh toán khi nhận hàng.');
    });
  const submitRequest = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      let payload = { type: request, reason };
      if (request === 'return') {
        if (
          !returnEvidence ||
          returnEvidence.size > 5 * 1024 * 1024 ||
          !['image/jpeg', 'image/png'].includes(returnEvidence.type)
        ) {
          throw new Error('Chọn ảnh JPG hoặc PNG của sản phẩm, tối đa 5 MB.');
        }
        payload = new FormData();
        payload.append('type', request);
        payload.append('reason', reason);
        payload.append('evidence', returnEvidence);
      }
      const result = await api(`/orders/${id}/requests`, {
        method: 'POST',
        body: payload,
      });
      setRequest(null);
      setReason('');
      setReturnEvidence(null);
      await load();
      notify(
        result.type === 'cancel' && result.status === 'approved'
          ? 'Đã hủy đơn và giải phóng sản phẩm giữ trong kho.'
          : 'Đã gửi yêu cầu đến nhà thuốc.',
      );
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const submitReview = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/reviews', {
        method: 'POST',
        body: {
          orderId: Number(id),
          productId: review.productId,
          rating,
          comment,
        },
      });
      setReview(null);
      setComment('');
      await load();
      notify('Cảm ơn bạn đã chia sẻ đánh giá.');
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const delivered = ['delivered', 'DaGiao'].includes(order?.status);
  const terminal = [
    'cancelled',
    'returned',
    'DaHuy',
    'rejected',
    'BiTuChoi',
  ].includes(order?.status);
  const pendingRequest = (type) =>
    order?.requests?.some((r) => r.type === type && r.status !== 'rejected');
  const refundAvailable =
    ['cancelled', 'returned'].includes(order?.status) &&
    ['paid', 'refund_pending'].includes(order?.paymentStatus) &&
    !order?.requests?.some(
      (r) =>
        r.status === 'approved' ||
        (r.type === 'refund' && r.status === 'pending'),
    );
  const steps = [
    ['pending', 'Chờ xác nhận'],
    ['confirmed', 'Đã xác nhận'],
    ['packing', 'Đóng gói'],
    ['shipping', 'Đang giao'],
    ['delivered', 'Đã giao'],
  ];
  const statusMap = {
    ChoXacNhan: 'pending',
    DaXacNhan: 'confirmed',
    DangDongGoi: 'packing',
    DangGiao: 'shipping',
    DaGiao: 'delivered',
  };
  const step = steps.findIndex(
    (s) => s[0] === (statusMap[order?.status] || order?.status),
  );
  return (
    <RequireLogin>
      <main className="container page-shell">
        <Breadcrumb
          current={order?.code || 'Chi tiết đơn hàng'}
          parent={{ to: '/orders', name: 'Đơn hàng của tôi' }}
        />
        <ErrorBox error={error} />
        {!order && !error ? (
          <Spinner />
        ) : (
          order && (
            <>
              {route.includes('created=1') && (
                <div className="order-success">
                  <CheckCircle2 size={31} />
                  <div>
                    <h2>An Tâm đã nhận đơn hàng của bạn</h2>
                    <p>
                      {order.prescriptionStatus &&
                      !['approved', 'DaDuyet'].includes(
                        order.prescriptionStatus,
                      )
                        ? 'Đơn thuốc sẽ được dược sĩ kiểm duyệt trước khi tiếp tục xử lý.'
                        : 'Bạn có thể theo dõi quá trình xử lý ngay tại đây.'}
                    </p>
                  </div>
                </div>
              )}
              <div className="order-title">
                <div>
                  <span className="eyebrow">CHI TIẾT ĐƠN HÀNG</span>
                  <h1>{order.code}</h1>
                  <p className="muted">Đặt lúc {dateTime(order.createdAt)}</p>
                </div>
                <div className="order-title-actions">
                  <Badge value={order.status} />
                  <button className="btn btn-outline btn-small" onClick={load}>
                    Cập nhật trạng thái
                  </button>
                </div>
              </div>
              {!terminal && (
                <div className="order-timeline">
                  {steps.map(([key, title], i) => (
                    <div className={i <= step ? 'complete' : ''} key={key}>
                      <span>{i < step ? <Check size={17} /> : i + 1}</span>
                      <strong>{title}</strong>
                    </div>
                  ))}
                </div>
              )}
              <div className="checkout-layout">
                <div className="checkout-panels">
                  <section className="panel">
                    <h2>Sản phẩm trong đơn</h2>
                    {order.items?.map((item) => (
                      <div
                        className="order-item"
                        key={item.id || item.productId}
                      >
                        <div>
                          <strong>{item.name}</strong>
                          <span>
                            {item.quantity} × {money(item.price)} · {item.unit}
                          </span>
                        </div>
                        <strong>{money(item.quantity * item.price)}</strong>
                        {delivered &&
                          (item.reviewed ? (
                            <Badge value="reviewed" />
                          ) : (
                            <button
                              className="btn btn-outline btn-small"
                              onClick={() => {
                                setRating(5);
                                setReview(item);
                              }}
                            >
                              Đánh giá
                            </button>
                          ))}
                      </div>
                    ))}
                  </section>
                  <section className="panel">
                    <h2>
                      <MapPin size={19} /> Địa chỉ nhận hàng
                    </h2>
                    <strong>
                      {order.address?.recipient || order.recipient} ·{' '}
                      {order.address?.phone || order.phone}
                    </strong>
                    <p className="muted">
                      {typeof order.address === 'string'
                        ? order.address
                        : [
                            order.address?.line1,
                            order.address?.ward,
                            order.address?.district,
                            order.address?.city,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                    </p>
                    {order.note && (
                      <p>
                        <strong>Ghi chú:</strong> {order.note}
                      </p>
                    )}
                  </section>
                  {order.prescriptionId && (
                    <section className="panel">
                      <h2>
                        <FileText size={19} /> Đơn thuốc đính kèm
                      </h2>
                      <Badge
                        value={
                          order.prescriptionStatus === 'pending'
                            ? 'pending_review'
                            : order.prescriptionStatus
                        }
                      />
                      {order.prescriptionNote && (
                        <p>{order.prescriptionNote}</p>
                      )}
                      <a
                        className="subtle-link"
                        href={`/api/prescriptions/${order.prescriptionId}/file`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Xem tệp đơn thuốc <ArrowUpRight size={15} />
                      </a>
                      {order.status === 'pending_prescription' &&
                        ['rejected', 'partial'].includes(
                          order.prescriptionStatus,
                        ) && (
                          <label className="upload-zone replacement-upload">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,application/pdf"
                              disabled={busy}
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) replacePrescription(file);
                                e.target.value = '';
                              }}
                            />
                            <Upload size={22} />
                            <strong>
                              {busy
                                ? 'Đang tải lên…'
                                : 'Bổ sung tệp đơn thuốc mới'}
                            </strong>
                            <span>JPG, PNG hoặc PDF · Tối đa 5 MB</span>
                          </label>
                        )}
                      {order.prescriptionStatus === 'partial' && (
                        <p className="muted">
                          Thuốc được duyệt:{' '}
                          {order.items
                            .filter((item) =>
                              order.prescriptionApprovedProductIds.includes(
                                item.productId,
                              ),
                            )
                            .map((item) => item.name)
                            .join(', ')}
                          .
                        </p>
                      )}
                      {order.status === 'pending_prescription' &&
                        ['rejected', 'partial'].includes(
                          order.prescriptionStatus,
                        ) && (
                          <div className="rx-adjustment-actions">
                            {order.prescriptionStatus === 'partial' && (
                              <button
                                className="btn btn-outline btn-small"
                                onClick={() => setRxAdjustment('approved_only')}
                              >
                                Giữ thuốc đã duyệt
                              </button>
                            )}
                            {order.items.some(
                              (item) => !item.prescriptionRequired,
                            ) && (
                              <button
                                className="btn btn-outline btn-small"
                                onClick={() => setRxAdjustment('remove_all')}
                              >
                                Bỏ thuốc kê đơn
                              </button>
                            )}
                          </div>
                        )}
                    </section>
                  )}
                  {order.requests?.length > 0 && (
                    <section className="panel">
                      <h2>Yêu cầu đã gửi</h2>
                      {order.requests.map((r) => (
                        <div className="request-entry" key={r.id}>
                          <strong>
                            {{
                              cancel: 'Hủy đơn',
                              return: 'Đổi trả',
                              refund: 'Hoàn tiền',
                            }[r.type] || r.type}
                          </strong>{' '}
                          <Badge
                            value={
                              r.status === 'pending'
                                ? 'request_pending'
                                : r.status
                            }
                          />
                          <p>{r.reason}</p>
                          {r.evidenceAvailable && (
                            <a
                              className="subtle-link"
                              href={`/api/orders/${id}/requests/${r.id}/evidence`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ảnh đổi trả <ArrowUpRight size={14} />
                            </a>
                          )}
                          {r.reply && (
                            <p className="muted">
                              Phản hồi của nhà thuốc · {r.reply}
                            </p>
                          )}
                          {r.refundAmount > 0 && (
                            <p>Đã hoàn {money(r.refundAmount)}</p>
                          )}
                        </div>
                      ))}
                    </section>
                  )}
                  {order.history?.length > 0 && (
                    <section className="panel">
                      <h2>
                        <Clock3 size={18} /> Lịch sử xử lý
                      </h2>
                      <ol className="order-history">
                        {order.history.toReversed().map((entry) => (
                          <li key={entry.id}>
                            <strong>{label(entry.status)}</strong>
                            <time>{dateTime(entry.createdAt)}</time>
                            {entry.note && <p>{entry.note}</p>}
                          </li>
                        ))}
                      </ol>
                    </section>
                  )}
                </div>
                <aside className="panel order-summary">
                  <h2>Thanh toán</h2>
                  <div>
                    <span>Tạm tính</span>
                    <strong>{money(order.subtotal)}</strong>
                  </div>
                  <div>
                    <span>Giảm giá</span>
                    <strong>−{money(order.discount)}</strong>
                  </div>
                  <div>
                    <span>Phí giao hàng</span>
                    <strong>{money(order.shippingFee)}</strong>
                  </div>
                  <div className="summary-total">
                    <span>Tổng cộng</span>
                    <strong>{money(order.total)}</strong>
                  </div>
                  <div>
                    <span>Phương thức</span>
                    <strong>
                      {order.paymentMethod === 'cod'
                        ? 'COD'
                        : label(order.paymentMethod)}
                    </strong>
                  </div>
                  <div>
                    <span>Trạng thái</span>
                    <Badge value={order.paymentStatus} />
                  </div>
                  {order.paymentStatus === 'failed' && (
                    <ErrorBox error="Thanh toán chưa thành công. Bạn có thể thử lại hoặc chuyển sang COD." />
                  )}
                  {paymentReturn === 'waiting' &&
                    order.status === 'pending_payment' && (
                      <p className="muted small">
                        Đang chờ VNPay xác nhận. Dùng nút Cập nhật trạng thái để
                        kiểm tra lại.
                      </p>
                    )}
                  {order.status === 'pending_prescription' &&
                    order.paymentMethod !== 'cod' && (
                      <p className="muted small">
                        Thanh toán mở sau khi dược sĩ duyệt đơn thuốc.
                      </p>
                    )}
                  {order.paymentMethod === 'vnpay' &&
                    order.status === 'pending_payment' &&
                    config?.paymentMethods.includes('vnpay') && (
                      <button
                        className="btn btn-primary full-width"
                        disabled={busy}
                        onClick={payVnpay}
                      >
                        <CreditCard size={17} /> Mở VNPay Sandbox
                      </button>
                    )}
                  {order.paymentMethod === 'demo' &&
                    config?.demoMode &&
                    order.status === 'pending_payment' && (
                      <div className="demo-payment">
                        <strong>
                          <CreditCard size={17} /> Cổng thanh toán mô phỏng
                        </strong>
                        <p>
                          Không thu tiền thật. Đơn kê đơn cần được duyệt trước
                          khi thanh toán.
                        </p>
                        <button
                          className="btn btn-primary full-width"
                          disabled={busy}
                          onClick={() => pay('success')}
                        >
                          Mô phỏng thành công
                        </button>
                        <button
                          className="btn btn-outline full-width"
                          disabled={busy}
                          onClick={() => pay('failed')}
                        >
                          Mô phỏng thất bại
                        </button>
                      </div>
                    )}
                  {order.status === 'pending_payment' &&
                    order.transactions?.every(
                      (t) => t.status !== 'pending',
                    ) && (
                      <button
                        className="btn btn-outline full-width"
                        disabled={busy}
                        onClick={switchCod}
                      >
                        Chuyển sang COD
                      </button>
                    )}
                  {(!terminal || refundAvailable) && (
                    <div className="order-request-actions">
                      {!delivered &&
                        !terminal &&
                        !pendingRequest('cancel') &&
                        !['shipping', 'DangGiao'].includes(order.status) && (
                          <button
                            className="btn btn-outline full-width"
                            onClick={() => setRequest('cancel')}
                          >
                            Yêu cầu hủy đơn
                          </button>
                        )}
                      {delivered && !pendingRequest('return') && (
                        <button
                          className="btn btn-outline full-width"
                          onClick={() => setRequest('return')}
                        >
                          Yêu cầu đổi trả
                        </button>
                      )}
                      {refundAvailable && (
                        <button
                          className="btn btn-outline full-width"
                          onClick={() => setRequest('refund')}
                        >
                          Yêu cầu hoàn tiền
                        </button>
                      )}
                    </div>
                  )}
                </aside>
              </div>
            </>
          )
        )}
        {rxAdjustment && (
          <Modal
            title="Xác nhận điều chỉnh đơn hàng"
            onClose={() => setRxAdjustment(null)}
          >
            <form onSubmit={adjustRx}>
              <p className="muted">
                {rxAdjustment === 'approved_only'
                  ? 'Giữ thuốc đã duyệt và sản phẩm không cần đơn thuốc.'
                  : 'Chỉ giữ sản phẩm không cần đơn thuốc.'}{' '}
                An Tâm sẽ tính lại phí giao hàng và ưu đãi trên các sản phẩm
                còn lại.
              </p>
              <button className="btn btn-primary full-width" disabled={busy}>
                Xác nhận điều chỉnh
              </button>
            </form>
          </Modal>
        )}
        {request && (
          <Modal
            title={
              request === 'cancel'
                ? 'Yêu cầu hủy đơn'
                : request === 'return'
                  ? 'Yêu cầu đổi trả'
                  : 'Yêu cầu hoàn tiền'
            }
            onClose={() => {
              setRequest(null);
              setReason('');
              setReturnEvidence(null);
            }}
          >
            <form onSubmit={submitRequest}>
              <p className="muted">
                Nhà thuốc sẽ kiểm tra và phản hồi yêu cầu của bạn.
              </p>
              <Field label="Lý do">
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  minLength={5}
                  maxLength={1000}
                  required
                />
              </Field>
              {request === 'return' && (
                <Field label="Ảnh tình trạng sản phẩm (JPG hoặc PNG, tối đa 5 MB)">
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    required
                    onChange={(e) =>
                      setReturnEvidence(e.target.files[0] || null)
                    }
                  />
                </Field>
              )}
              <button className="btn btn-primary full-width" disabled={busy}>
                Gửi yêu cầu
              </button>
            </form>
          </Modal>
        )}
        {review && (
          <Modal
            title="Chia sẻ đánh giá của bạn"
            onClose={() => setReview(null)}
          >
            <form onSubmit={submitReview}>
              <p>{review.name}</p>
              <div className="rating-input">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    aria-label={`${n} sao`}
                    key={n}
                    onClick={() => setRating(n)}
                  >
                    <Star
                      fill={n <= rating ? 'currentColor' : 'none'}
                      size={29}
                    />
                  </button>
                ))}
              </div>
              <Field label="Nhận xét">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  minLength={5}
                  required
                  rows={4}
                />
              </Field>
              <button className="btn btn-primary full-width" disabled={busy}>
                Gửi đánh giá
              </button>
            </form>
          </Modal>
        )}
      </main>
    </RequireLogin>
  );
}

function Modal({ title, onClose, children }) {
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

function AuthPage() {
  const { route, setUser, navigate, notify, config } = useApp();
  const path = route.split('?')[0];
  const params = new URLSearchParams(route.split('?')[1]);
  const initialMode =
    path === '/register'
      ? 'register'
      : path === '/forgot-password'
        ? 'forgot'
        : path === '/verify'
          ? 'verify'
          : 'login';
  const [mode, setMode] = useState(initialMode);
  const settingPassword = mode === 'verify' && params.get('invite') === '1';
  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setMode(initialMode);
    setError('');
    setMessage('');
  }, [initialMode]);
  const signedIn = (result) => {
    const person = result.user || result;
    setUser(person);
    const next = params.get('next');
    navigate(
      next?.startsWith('/') && !next.startsWith('//') && !next.includes('\\')
        ? next
        : ['admin', 'staff'].includes(person.role)
          ? '/admin'
          : '/',
    );
    notify(`Chào mừng ${person.name || 'bạn'} đến với An Tâm.`);
  };
  const login = async (em, pw) =>
    signedIn(
      await api('/auth/login', {
        method: 'POST',
        body: { email: em, password: pw },
      }),
    );
  const resend = async () => {
    if (!email.trim())
      return setError('Nhập email hoặc số điện thoại để nhận mã.');
    setBusy(true);
    setError('');
    try {
      const result = await api(
        mode === 'reset' ? '/auth/forgot-password' : '/auth/resend-otp',
        { method: 'POST', body: { email } },
      );
      setCode('');
      setDemoCode(result.demoCode || '');
      setMessage(result.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      if (mode === 'register') {
        const data = await api('/auth/register', {
          method: 'POST',
          body: { email, password, name, phone },
        });
        setEmail(data.email);
        setDemoCode(data.demoCode || '');
        setMode('verify');
        setMessage(
          data.message ||
            'Tài khoản đã được tạo. Nhập mã xác thực để kích hoạt.',
        );
      }
      if (mode === 'verify') {
        signedIn(
          await api('/auth/verify', {
            method: 'POST',
            body: { email, code, ...(settingPassword ? { password } : {}) },
          }),
        );
      }
      if (mode === 'forgot') {
        const data = await api('/auth/forgot-password', {
          method: 'POST',
          body: { email },
        });
        setDemoCode(data.demoCode || data.otp || data.code || '');
        setMode('reset');
        setMessage(
          data.message ||
            'Nếu tài khoản tồn tại, mã đặt lại mật khẩu đã được gửi.',
        );
      }
      if (mode === 'reset') {
        await api('/auth/reset-password', {
          method: 'POST',
          body: { email, code, password },
        });
        setMode('login');
        setMessage('Đã đặt lại mật khẩu. Vui lòng đăng nhập.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const demoLogin = async (role) => {
    setBusy(true);
    setError('');
    const em = `${role}@antam.vn`;
    setEmail(em);
    setPassword('Demo@123');
    try {
      await login(em, 'Demo@123');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const titles = {
    login: 'Chào bạn, lại là An Tâm.',
    register: 'Bắt đầu hành trình khỏe.',
    verify: 'Xác thực tài khoản',
    forgot: 'Tìm lại mật khẩu',
    reset: 'Tạo mật khẩu mới',
  };
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
          <h2>{titles[mode]}</h2>
          <p className="muted">
            {mode === 'login'
              ? 'Đăng nhập để tiếp tục chăm sóc sức khỏe cùng chúng tôi.'
              : mode === 'register'
                ? 'Tạo tài khoản để quản lý đơn hàng và nhận hỗ trợ.'
                : 'Chúng tôi sẽ giúp bạn tiếp tục một cách an toàn.'}
          </p>
          <ErrorBox
            error={
              error ||
              (params.get('google') === 'error'
                ? 'Không thể đăng nhập bằng Google. Vui lòng thử lại.'
                : params.get('google') === 'link'
                  ? 'Email này đã có tài khoản. Đăng nhập bằng mật khẩu và liên kết Google trong hồ sơ.'
                  : '')
            }
          />
          {message && (
            <div className="success-box">
              <CheckCircle2 size={18} />
              {message}
            </div>
          )}
          <form onSubmit={submit}>
            {mode === 'register' && (
              <Field
                label="Họ và tên"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                autoComplete="name"
              />
            )}
            {mode !== 'reset' && (
              <Field
                label={
                  mode === 'register' ? 'Email' : 'Email hoặc số điện thoại'
                }
                type={mode === 'register' ? 'email' : 'text'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={mode !== 'register' || !config?.demoMode || !phone}
                autoComplete={mode === 'register' ? 'email' : 'username'}
              />
            )}
            {mode === 'register' && (
              <Field
                label="Số điện thoại"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required={!email}
                maxLength={15}
                autoComplete="tel"
              />
            )}
            {['verify', 'reset'].includes(mode) && (
              <>
                {mode === 'reset' && (
                  <p className="muted">
                    Tài khoản: <strong>{email}</strong>
                  </p>
                )}
                {demoCode && (
                  <div className="demo-otp">
                    Mã xác thực trong môi trường demo:{' '}
                    <strong>{demoCode}</strong>
                  </div>
                )}
                <Field
                  label="Mã xác thực"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={10}
                />
                <button
                  type="button"
                  className="subtle-link resend-otp"
                  disabled={busy}
                  onClick={resend}
                >
                  Gửi lại mã xác thực
                </button>
              </>
            )}
            {(['login', 'register', 'reset'].includes(mode) ||
              settingPassword) && (
              <>
                <Field
                  label={
                    mode === 'reset' || settingPassword
                      ? 'Mật khẩu mới'
                      : 'Mật khẩu'
                  }
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === 'login' ? undefined : 8}
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                />
                {mode !== 'login' && (
                  <p className="field-help">
                    Ít nhất 8 ký tự, có chữ hoa, chữ thường và số.
                  </p>
                )}
              </>
            )}
            {mode === 'login' && (
              <div className="auth-forgot">
                <Link
                  to={`/verify${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                >
                  Xác thực tài khoản
                </Link>
                <Link
                  to={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                >
                  Quên mật khẩu?
                </Link>
              </div>
            )}
            <button className="btn btn-primary full-width" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={18} /> : null}
              {
                {
                  login: 'Đăng nhập',
                  register: 'Tạo tài khoản',
                  verify: 'Xác thực tài khoản',
                  forgot: 'Gửi mã đặt lại mật khẩu',
                  reset: 'Lưu mật khẩu mới',
                }[mode]
              }
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {mode === 'login' ? (
              <>
                Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
              </>
            ) : (
              <>
                Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
              </>
            )}
          </p>
          {mode === 'login' && config?.googleConfigured && (
            <a className="btn btn-outline full-width" href="/api/auth/google">
              Đăng nhập bằng Google
            </a>
          )}
          {mode === 'login' && config?.demoMode && (
            <div className="demo-accounts">
              <span>TRẢI NGHIỆM BẰNG TÀI KHOẢN DEMO</span>
              <div>
                <button disabled={busy} onClick={() => demoLogin('khach')}>
                  <UserRound size={16} /> Khách hàng
                </button>
                <button disabled={busy} onClick={() => demoLogin('duocsi')}>
                  <Stethoscope size={16} /> Dược sĩ
                </button>
                <button disabled={busy} onClick={() => demoLogin('admin')}>
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

function Account() {
  const { user, setUser, logout, notify, navigate, config, route } = useApp();
  const googleStatus = new URLSearchParams(route.split('?')[1]).get('google');
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [addresses, setAddresses] = useState([]);
  const [editing, setEditing] = useState(null);
  const [address, setAddress] = useState({
    recipient: '',
    phone: '',
    line1: '',
    ward: '',
    district: '',
    city: '',
    isDefault: false,
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [busy, setBusy] = useState(false);
  const loadAddresses = () =>
    api('/addresses')
      .then((data) =>
        setAddresses(Array.isArray(data) ? data : data.items || []),
      )
      .catch((e) => notify(e.message, 'error'));
  useEffect(() => {
    if (user) {
      setProfile({ name: user.name || '', phone: user.phone || '' });
      loadAddresses();
    }
  }, [user]);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await api('/profile', { method: 'PATCH', body: profile });
      setUser(result.user || result);
      notify('Đã cập nhật thông tin của bạn.');
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const saveAddress = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/addresses${editing === 'new' ? '' : `/${editing}`}`, {
        method: editing === 'new' ? 'POST' : 'PATCH',
        body: address,
      });
      setEditing(null);
      loadAddresses();
      notify('Đã lưu địa chỉ nhận hàng.');
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const removeAddress = async (id) => {
    try {
      await api(`/addresses/${id}`, { method: 'DELETE' });
      loadAddresses();
      notify('Đã xóa địa chỉ.');
    } catch (e) {
      notify(e.message, 'error');
    }
  };
  const changePassword = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/profile/password', { method: 'POST', body: passwords });
      setPasswords({ currentPassword: '', newPassword: '' });
      setUser(null);
      navigate('/login');
      notify('Đã đổi mật khẩu. Vui lòng đăng nhập lại.');
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <RequireLogin>
      <main className="container page-shell">
        <Breadcrumb current="Tài khoản của tôi" />
        <div className="page-heading">
          <span className="eyebrow">CHÀO BẠN, {user?.name?.toUpperCase()}</span>
          <h1>Tài khoản của tôi</h1>
        </div>
        <div className="account-layout">
          <aside className="panel account-sidebar">
            <div className="account-avatar">{user?.name?.slice(0, 1)}</div>
            <strong>{user?.name}</strong>
            <span className="muted small">{user?.email}</span>
            {[
              ['profile', 'Thông tin cá nhân', UserRound],
              ['addresses', 'Địa chỉ nhận hàng', MapPin],
              ['password', 'Đổi mật khẩu', ShieldCheck],
            ].map(([value, title, Icon]) => (
              <button
                key={value}
                className={tab === value ? 'selected' : ''}
                onClick={() => setTab(value)}
              >
                <Icon size={17} />
                {title}
              </button>
            ))}
            <Link to="/orders">
              <Package size={17} /> Đơn hàng của tôi
            </Link>
            {['admin', 'staff'].includes(user?.role) && (
              <Link to="/admin">
                <ClipboardList size={17} /> Quản lý nhà thuốc
              </Link>
            )}
            <button onClick={logout}>
              <LogOut size={17} /> Đăng xuất
            </button>
          </aside>
          <section className="panel account-content">
            {tab === 'profile' && (
              <>
                <h2>Thông tin cá nhân</h2>
                {googleStatus === 'linked' && (
                  <div className="success-box">
                    <CheckCircle2 size={18} /> Đã liên kết tài khoản Google.
                  </div>
                )}
                {googleStatus === 'error' && (
                  <ErrorBox error="Không thể liên kết. Hãy chọn tài khoản Google cùng email với hồ sơ." />
                )}
                <p className="muted">
                  Cập nhật thông tin để nhà thuốc hỗ trợ bạn thuận tiện hơn.
                </p>
                <form onSubmit={save} className="narrow-form">
                  <Field label="Email" value={user?.email || ''} disabled />
                  <Field
                    label="Họ và tên"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    required
                    maxLength={100}
                  />
                  <Field
                    label="Số điện thoại"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                    type="tel"
                    required
                    maxLength={15}
                  />
                  <button className="btn btn-primary" disabled={busy}>
                    Lưu thay đổi <Check size={17} />
                  </button>
                </form>
                {config?.googleConfigured && (
                  <a
                    className="btn btn-outline btn-small"
                    href="/api/auth/google?link=1"
                  >
                    Liên kết tài khoản Google
                  </a>
                )}
              </>
            )}
            {tab === 'addresses' && (
              <>
                <div className="panel-title-row">
                  <h2>Địa chỉ nhận hàng</h2>
                  <button
                    className="btn btn-primary btn-small"
                    onClick={() => {
                      setAddress({
                        recipient: user.name,
                        phone: user.phone || '',
                        line1: '',
                        ward: '',
                        district: '',
                        city: '',
                        isDefault: !addresses.length,
                      });
                      setEditing('new');
                    }}
                  >
                    <Plus size={16} /> Thêm địa chỉ
                  </button>
                </div>
                {addresses.length ? (
                  <div className="address-list">
                    {addresses.map((a) => (
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
                            onClick={() => {
                              setAddress(a);
                              setEditing(a.id);
                            }}
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            className="remove-item"
                            onClick={() => removeAddress(a.id)}
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
            {tab === 'password' && (
              <>
                <h2>Đổi mật khẩu</h2>
                <form onSubmit={changePassword} className="narrow-form">
                  <Field
                    label="Mật khẩu hiện tại"
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        currentPassword: e.target.value,
                      })
                    }
                    required
                    autoComplete="current-password"
                  />
                  <Field
                    label="Mật khẩu mới"
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        newPassword: e.target.value,
                      })
                    }
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <p className="field-help">
                    Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.
                  </p>
                  <button className="btn btn-primary" disabled={busy}>
                    Đổi mật khẩu
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
        {editing && (
          <Modal
            title={
              editing === 'new' ? 'Thêm địa chỉ nhận hàng' : 'Chỉnh sửa địa chỉ'
            }
            onClose={() => setEditing(null)}
          >
            <form onSubmit={saveAddress}>
              <div className="form-grid">
                {[
                  ['recipient', 'Họ tên người nhận'],
                  ['phone', 'Số điện thoại'],
                  ['city', 'Tỉnh / Thành phố'],
                  ['district', 'Quận / Huyện'],
                  ['ward', 'Phường / Xã'],
                  ['line1', 'Số nhà, tên đường'],
                ].map(([key, title]) => (
                  <Field
                    key={key}
                    label={title}
                    required
                    value={address[key] || ''}
                    onChange={(e) =>
                      setAddress({ ...address, [key]: e.target.value })
                    }
                  />
                ))}
              </div>
              <label className="radio-line">
                <input
                  type="checkbox"
                  checked={!!address.isDefault}
                  onChange={(e) =>
                    setAddress({ ...address, isDefault: e.target.checked })
                  }
                />{' '}
                Đặt làm địa chỉ mặc định
              </label>
              <button className="btn btn-primary full-width" disabled={busy}>
                Lưu địa chỉ
              </button>
            </form>
          </Modal>
        )}
      </main>
    </RequireLogin>
  );
}

function ChatPanel({ onClose, full = false }) {
  const { user, notify, config, navigate } = useApp();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('knowledge');
  const [sessions, setSessions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  useEffect(() => {
    if (user)
      api('/chat/sessions')
        .then((data) => setSessions(Array.isArray(data) ? data : []))
        .catch(() => {});
  }, [user, sessionId]);
  useEffect(() => {
    const box = document.querySelector(
      full ? '.chat-full .chat-messages' : '.chat-popover .chat-messages',
    );
    box?.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);
  const send = async (text) => {
    if (!text.trim() || busy) return;
    setMessages((old) => [...old, { role: 'user', content: text }]);
    setMessage('');
    setBusy(true);
    try {
      const result = await api('/chat', {
        method: 'POST',
        body: { ...(sessionId ? { sessionId } : {}), message: text },
      });
      setSessionId(result.sessionId);
      setMode(result.mode || 'knowledge');
      setMessages((old) => [
        ...old,
        {
          role: 'assistant',
          content: result.reply,
          products: result.products,
          handoff: result.handoff,
        },
      ]);
    } catch (e) {
      setMessages((old) => [
        ...old,
        { role: 'assistant', content: e.message, error: true },
      ]);
    } finally {
      setBusy(false);
    }
  };
  const openSession = async (id) => {
    try {
      const data = await api(`/chat/sessions/${id}/messages`);
      setSessionId(id);
      setMessages(
        (Array.isArray(data) ? data : data.messages || []).map((m) => ({
          ...m,
          content: m.content || m.message || m.text,
        })),
      );
      setShowHistory(false);
    } catch (e) {
      notify(e.message, 'error');
    }
  };
  const handoff = async () => {
    if (!user) {
      navigate('/login?next=%2Fchat');
      return;
    }
    setBusy(true);
    try {
      const id =
        sessionId ||
        (
          await api('/chat/sessions', {
            method: 'POST',
            body: { title: 'Yêu cầu tư vấn dược sĩ' },
          })
        ).id;
      setSessionId(id);
      await api(`/chat/sessions/${id}/handoff`, {
        method: 'POST',
        body: { message: 'Khách hàng yêu cầu kết nối với dược sĩ.' },
      });
      setMessages((old) => [
        ...old,
        {
          role: 'assistant',
          content:
            'Yêu cầu đã được chuyển đến nhân viên. Bạn có thể xem phản hồi trong lịch sử cuộc hội thoại.',
        },
      ]);
      notify('Đã gửi yêu cầu hỗ trợ dược sĩ.');
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={`chat-panel ${full ? 'chat-full' : ''}`}>
      <div className="chat-header">
        <span className="chat-avatar" style={{ background: 'transparent', padding: 0 }}>
          <LogoIcon size={36} />
        </span>
        <div>
          <strong>An Tâm luôn lắng nghe</strong>
          <span>
            <i /> Trợ lý thông tin sức khỏe
          </span>
        </div>
        {user && (
          <button
            className="icon-btn"
            onClick={() => setShowHistory(!showHistory)}
            aria-label="Lịch sử tư vấn"
          >
            <Clock3 size={20} />
          </button>
        )}
        {onClose && (
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Đóng tư vấn"
          >
            <X size={20} />
          </button>
        )}
      </div>
      <div className="chat-mode">
        <ShieldCheck size={13} />
        {{
          gemini: 'Gemini AI',
          safety: 'Thông tin an toàn',
          knowledge_fallback: 'Dùng tri thức nội bộ khi AI gián đoạn',
        }[mode] || 'Tra cứu cơ sở tri thức'}
        <span>Thông tin tham khảo</span>
      </div>
      {showHistory ? (
        <div className="chat-messages">
          <button
            className="btn btn-outline"
            onClick={() => {
              setMessages([]);
              setSessionId(null);
              setShowHistory(false);
            }}
          >
            <Plus size={15} /> Cuộc trò chuyện mới
          </button>
          {!sessions.length && (
            <p className="muted">
              {user
                ? 'Chưa có cuộc hội thoại.'
                : 'Đăng nhập để lưu lịch sử cuộc hội thoại.'}
            </p>
          )}
          {sessions.map((s) => (
            <button
              className="chat-history-item"
              key={s.id}
              onClick={() => openSession(s.id)}
            >
              <MessageCircle size={17} />
              <span>
                {s.title || 'Cuộc trò chuyện'}
                <small>{dateTime(s.createdAt)}</small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      ) : (
        <div className="chat-messages">
          <div className="chat-bubble assistant">
            <strong>Chào bạn, An Tâm đây 🌿</strong>
            <p>
              Mình có thể giúp bạn tìm thông tin sản phẩm, chính sách mua hàng
              hoặc kết nối với dược sĩ. Bạn đang cần hỗ trợ điều gì?
            </p>
          </div>
          {!user && (
            <p className="muted small">
              Bạn có thể hỏi thông tin chung. Đăng nhập để lưu lịch sử hoặc tra
              cứu đơn hàng.
            </p>
          )}
          {config?.chatbotEnabled === false && (
            <p className="muted">
              Trợ lý đang tạm dừng. Bạn vẫn có thể gửi yêu cầu đến dược sĩ.
            </p>
          )}
          {config?.chatbotEnabled !== false && !messages.length && (
            <div className="chat-suggestions">
              {[
                'Nhà thuốc có sản phẩm nào?',
                'Làm thế nào để mua thuốc kê đơn?',
                'Theo dõi đơn hàng của tôi',
              ].map((text) => (
                <button disabled={busy} key={text} onClick={() => send(text)}>
                  {text}
                  <ArrowUpRight size={13} />
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={m.id || i}
              className={`chat-bubble ${m.role === 'user' ? 'user' : 'assistant'} ${m.error ? 'chat-error' : ''}`}
            >
              <p>{m.content}</p>
              {m.products?.length > 0 && (
                <div className="chat-products">
                  {m.products.map((p) => (
                    <Link key={p.id} to={`/products/${p.id}`} onClick={onClose}>
                      <img
                        src={p.image || '/assets/products/vitamin-c.svg'}
                        alt=""
                      />
                      <span>
                        {p.name}
                        <strong>{money(p.price)}</strong>
                      </span>
                      <ArrowUpRight size={14} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="chat-bubble assistant typing">
              <i />
              <i />
              <i />
            </div>
          )}
        </div>
      )}
      <div className="chat-bottom">
        <button className="chat-handoff" onClick={handoff} disabled={busy}>
          <Headphones size={14} /> Kết nối dược sĩ
        </button>
        {config?.chatbotEnabled !== false && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(message);
            }}
          >
            <input
              aria-label="Nội dung tư vấn"
              placeholder="Chia sẻ điều bạn cần hỗ trợ…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={busy || !message.trim()}
              aria-label="Gửi tin nhắn"
            >
              <Send size={18} />
            </button>
          </form>
        )}
        <small>Thông tin tham khảo, không thay thế bác sĩ hoặc dược sĩ.</small>
      </div>
    </section>
  );
}

function Footer() {
  const { setChatOpen } = useApp();
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <LogoIcon size={37} />
            </span>
            <span>
              <small>NHÀ THUỐC</small>
              <strong>
                an tâm<span>.</span>
              </strong>
            </span>
          </Link>
          <p>
            Chăm sóc tận tâm.
            <br />
            An tâm mỗi ngày.
          </p>
          <span className="footer-made">
            <HeartPulse size={15} /> Đồng hành cùng sức khỏe gia đình
          </span>
        </div>
        <div>
          <h3>Khám phá An Tâm</h3>
          <Link to="/products">Tất cả sản phẩm</Link>
          <Link to="/products?prescription=false">Thuốc không kê đơn</Link>
          <Link to="/chat">Trợ lý thông tin sức khỏe</Link>
        </div>
        <div>
          <h3>Chúng tôi hỗ trợ bạn</h3>
          <Link to="/orders">Theo dõi đơn hàng</Link>
          <Link to="/account">Tài khoản của tôi</Link>
          <button onClick={() => setChatOpen(true)}>
            Hướng dẫn mua hàng & đổi trả
          </button>
        </div>
        <div className="footer-contact">
          <h3>Luôn sẵn sàng lắng nghe</h3>
          <p>
            Cần hỗ trợ chọn lựa?
            <br />
            Hãy trao đổi cùng An Tâm.
          </p>
          <button className="footer-consult" onClick={() => setChatOpen(true)}>
            <MessageCircle size={17} /> Bắt đầu trò chuyện{' '}
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 An Tâm · Đồ án chuyên ngành, Nhóm 11</span>
        <span>
          Hệ thống trình diễn · Dữ liệu mẫu · Không giao dịch tiền thật
        </span>
        <span className="footer-leaf">
          <Leaf size={16} /> Care, thoughtfully.
        </span>
      </div>
    </footer>
  );
}
