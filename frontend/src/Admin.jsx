import React, { useEffect, useId, useRef, useState } from 'react';
import { searchScore } from '../../shared/search.js';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  ClipboardCheck,
  Boxes,
  Users,
  TicketPercent,
  MessageSquare,
  Settings,
  ScrollText,
  ArrowUpRight,
  Search,
  Plus,
  X,
  Check,
  ChevronRight,
  ArrowLeft,
  LogOut,
  Menu,
  LoaderCircle,
  Download,
  AlertTriangle,
  Pencil,
  Trash2,
  RefreshCw,
  Building2,
  Tags,
  ExternalLink,
  Eye,
  ShieldCheck,
  Pill,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Layers,
  Activity,
  BarChart3,
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import { LogoIcon } from './Logo.jsx';
import SupportChat from './SupportChat.jsx';
import Pagination from './Pagination.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AdminOrders, {
  CreateOrderContent,
  OrderDetailContent,
} from './AdminOrders.jsx';
import {
  VIEW_PERMISSION,
  ORDER_STATES,
  ORDER_NEXT,
  RETURN_GOODS_NEXT,
  RETURN_GOODS_ACTION,
  label,
  list,
  fmtDate,
  safeJson,
  text,
  count,
  vnDate,
  paymentLabel,
  paymentShortLabel,
  deltaInfo,
  Badge,
  Empty,
  Table,
  ReportChart,
} from './adminUi.jsx';
import { api, money, dateTime } from './lib.js';
import './admin.css';

const NAV = [
  ['dashboard', LayoutDashboard, 'Tổng quan'],
  ['orders', ShoppingBag, 'Đơn hàng'],
  ['prescriptions', ClipboardCheck, 'Duyệt đơn thuốc'],
  ['products', Package, 'Sản phẩm'],
  ['inventory', Boxes, 'Kho & lô thuốc'],
  ['catalog', Tags, 'Danh mục & đối tác'],
  ['promotions', TicketPercent, 'Khuyến mãi'],
  ['users', Users, 'Tài khoản', true],
  ['chatbot', MessageSquare, 'Tư vấn & chatbot'],
  ['reports', LayoutDashboard, 'Thống kê báo cáo'],
  ['settings', Settings, 'Cấu hình', true],
  ['audit', ScrollText, 'Nhật ký hệ thống', true],
];
const TITLES = Object.fromEntries(NAV.map(([key, , name]) => [key, name]));
function Field({
  label: fieldLabel,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  children,
  ...props
}) {
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
            {...Object.fromEntries(
              Object.entries(props).filter(([k]) => k !== 'wide'),
            )}
          />
        ) : (
          <input
            name={name}
            value={value ?? ''}
            onChange={onChange}
            type={type}
            required={required}
            {...Object.fromEntries(
              Object.entries(props).filter(([k]) => k !== 'wide'),
            )}
          />
        ))}
    </label>
  );
}
function CheckField({ name, value, onChange, label: fieldLabel }) {
  return (
    <label className="adm-check">
      <input
        type="checkbox"
        name={name}
        checked={!!value}
        onChange={onChange}
      />
      <span>{fieldLabel}</span>
    </label>
  );
}
function Modal({ title, children, onClose, wide = false }) {
  const panel = useRef(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
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
        const els = controls(),
          first = els[0],
          last = els.at(-1);
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
          <button className="adm-icon-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

const STATUS_BUCKETS = [
  ['Hoàn tất (đã giao)', ['delivered'], '#2d7a55'],
  [
    'Đang xử lý & giao',
    ['pending', 'pending_payment', 'pending_prescription', 'confirmed', 'packing', 'shipping'],
    '#4c86b6',
  ],
  ['Giao thất bại / Trả hàng', ['delivery_failed', 'returned'], '#d0943b'],
  ['Đã hủy', ['cancelled'], '#cf6a5e'],
];

function StatusDonut({ breakdown = [], totalOrders = 0 }) {
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
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#eef3ec" strokeWidth="14" />
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
          const share = totalOrders ? ((g.orders / totalOrders) * 100).toFixed(1) : '0.0';
          return (
            <div key={g.name} className="adm-rp-legend-row">
              <span className="adm-rp-legend-dot" style={{ background: g.color }} />
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

export default function Admin({ user, onExit, onLogout, config }) {
  const searchId = useId();
  const hasPermission = (permission) => user?.permissions?.includes(permission);
  const canReviewKnowledge = hasPermission('prescriptions');
  const allowedNav = NAV.filter(
    ([key, , , adminOnly]) =>
      (!adminOnly || user?.role === 'admin') &&
      (hasPermission(VIEW_PERMISSION[key]) ||
        (key === 'chatbot' && hasPermission('knowledge'))),
  );
  const [view, setView] = useState(() => allowedNav[0]?.[0] || 'dashboard');
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [toast, setToast] = useState(null);
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState(''),
    [modal, setModal] = useState(null),
    [form, setForm] = useState({}),
    [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]),
    [categories, setCategories] = useState([]),
    [suppliers, setSuppliers] = useState([]),
    [manufacturers, setManufacturers] = useState([]),
    [orderRequests, setOrderRequests] = useState([]),
    [returnGoods, setReturnGoods] = useState([]);
  const [tab, setTab] = useState('categories'),
    [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [range, setRange] = useState({ from: '', to: '' });
  const [dashDays, setDashDays] = useState(7);
  const [dashRefreshing, setDashRefreshing] = useState(false);
  const isAdmin = user?.role === 'admin';
  useEffect(() => {
    setPage(1);
  }, [view, tab, query, filter]);
  const notify = (message, type = 'success') => {
    setToast({ message, type });
  };
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  const go = (next, opts = {}) => {
    const defaultTab =
      next === 'chatbot'
        ? hasPermission('support')
          ? 'support'
          : 'knowledge'
        : next === 'inventory'
          ? 'batches'
          : next === 'orders'
            ? 'orders'
            : 'categories';
    setView(next);
    setQuery(opts.query || '');
    setFilter(opts.filter || '');
    setTab(opts.tab || defaultTab);
    setData(null);
    setMenuOpen(false);
  };
  const load = async (
    silent = false,
    customRange = range,
    customDashDays = dashDays,
  ) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      let result;
      if (view === 'orders') {
        const [ordersRes, reqRes, returnsRes] = await Promise.all([
          api('/admin/orders'),
          api('/admin/requests'),
          api('/admin/return-goods'),
        ]);
        result = ordersRes;
        setOrderRequests(list(reqRes));
        setReturnGoods(list(returnsRes));
      } else if (view === 'catalog') result = await api(`/admin/${tab}`);
      else if (view === 'chatbot')
        result = await api(
          `/admin/${tab === 'knowledge' ? 'knowledge' : tab === 'rules' ? 'safety-rules' : 'support'}`,
        );
      else if (view === 'reports')
        result = await api(
          `/admin/reports?${new URLSearchParams(Object.fromEntries(Object.entries(customRange).filter(([, v]) => v)))}`,
        );
      else if (view === 'dashboard')
        result = await api(`/admin/dashboard?days=${customDashDays}`);
      else result = await api(`/admin/${view}`);
      setData(result);
      if (view === 'products' || view === 'inventory') {
        const [p, c, s, m] = await Promise.all([
          api('/admin/products'),
          api('/admin/categories'),
          api('/admin/suppliers'),
          api('/admin/manufacturers'),
        ]);
        setProducts(list(p));
        setCategories(list(c));
        setSuppliers(list(s));
        setManufacturers(list(m));
      }
      if (view === 'settings') setForm(result || {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  const changeDashDays = async (nextDays) => {
    setDashDays(nextDays);
    setDashRefreshing(true);
    try {
      await load(true, range, nextDays);
    } finally {
      setDashRefreshing(false);
    }
  };
  useEffect(() => {
    load(view === 'orders' && Array.isArray(data));
  }, [view, tab]);
  // Danh sách yêu cầu hỗ trợ tự làm mới để dược sĩ thấy yêu cầu tư vấn mới.
  useEffect(() => {
    if (view !== 'chatbot' || tab !== 'support' || modal) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) load(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [view, tab, modal]);
  const change = (e) =>
    setForm((f) => ({
      ...f,
      [e.target.name]:
        e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));
  const open = (type, item = {}, extraForm = {}) => {
    const prepared = { ...item, ...extraForm };
    for (const k of ['startDate', 'endDate', 'manufacturedAt', 'expiresAt'])
      if (prepared[k]) prepared[k] = String(prepared[k]).slice(0, 10);
    if (Array.isArray(prepared.keywords))
      prepared.keywords = prepared.keywords.join(', ');
    if (type === 'order' && prepared.bankAmount === undefined && item.total)
      prepared.bankAmount = item.total;
    setForm(prepared);
    setModal({ type, data: item });
  };
  const close = () => {
    if (saving) return;
    setModal(null);
    if (view === 'settings') setForm(data || {});
  };
  const submit = async (e, path, method = 'POST', payload = form) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await api(path, { method, body: payload });
      setModal(null);
      notify('Đã lưu thay đổi thành công.');
      await load(true);
      return true;
    } catch (err) {
      notify(err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };
  const filtered = (rows) =>
    list(rows).filter(
      (item) =>
        (!query ||
          Object.values(item).some(
            (v) =>
              typeof v === 'string' &&
              searchScore(v, query) > 0,
          )) &&
        (!filter ||
          item.status === filter ||
          item.role === filter ||
          (filter === 'rx' && item.prescriptionRequired) ||
          (filter === 'otc' && !item.prescriptionRequired) ||
          (filter === 'active' && item.active) ||
          (filter === 'inactive' && !item.active)),
    );
  const orderDetail = async (order, extraForm = {}) => {
    try {
      const details = await api(`/admin/orders/${order.id}`);
      open('order', details, extraForm);
    } catch {
      open('order', order, extraForm);
    }
  };
  const openPrescriptionById = async (prescriptionId) => {
    try {
      const rxs = list(await api('/admin/prescriptions'));
      const rx = rxs.find((r) => r.id === prescriptionId);
      if (rx) open('prescription', rx);
      else notify('Không tìm thấy đơn thuốc.', 'error');
    } catch (e) {
      notify(e.message, 'error');
    }
  };
  const supportDetail = async (item) => {
    try {
      const messages = await api(`/admin/support/${item.id}/messages`);
      open('support', { ...item, messages: list(messages) });
    } catch (e) {
      notify(e.message, 'error');
    }
  };
  const toolBar = (placeholder, children, action) => (
    <div className="adm-toolbar">
      <div className="adm-search">
        <Search size={17} />
        <input
          list={searchId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        <datalist id={searchId}>{filtered(data).slice(0, 8).map((item, index) => {
          const title = item.name || item.title || item.code || item.customerName;
          return title ? <option value={title} key={index} /> : null;
        })}</datalist>
      </div>
      <div className="adm-toolbar-right">
        {children}
        {action}
      </div>
    </div>
  );
  const selectFilter = (
    options,
    placeholder = 'Tất cả trạng thái',
    labelFn = label,
  ) => (
    <select
      className="adm-select"
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((v) => (
        <option key={v} value={v}>
          {labelFn(v)}
        </option>
      ))}
    </select>
  );
  const addButton = (title, type, defaults = {}) => (
    <button className="adm-btn primary" onClick={() => open(type, defaults)}>
      <Plus size={17} />
      {title}
    </button>
  );
  const actions = (item, type) => (
    <div className="adm-row-actions">
      <button
        className="adm-icon-btn"
        aria-label={`Sửa ${item.name || item.title || item.code || ''}`}
        onClick={() => open(type, item)}
      >
        <Pencil size={16} />
      </button>
      <button
        className="adm-icon-btn danger"
        aria-label={`Xóa ${item.name || item.title || item.code || ''}`}
        onClick={() =>
          open('delete', {
            ...item,
            resource:
              type === 'product'
                ? 'products'
                : type === 'knowledge'
                  ? 'knowledge'
                  : type === 'promotion'
                    ? 'promotions'
                    : tab,
          })
        }
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  const orderTable = (orders) => (
    <Table
      columns={[
        'Đơn hàng',
        'Khách hàng',
        'Ngày tạo',
        'Tổng tiền',
        'Thanh toán',
        'Trạng thái',
        '',
      ]}
      rows={orders}
    >
      {orders.map((o) => {
        const hasPendingReq = o.requests?.some((r) => r.status === 'pending');
        return (
          <tr key={o.id}>
            <td>
              <button className="adm-code" onClick={() => orderDetail(o)}>
                {o.code}
              </button>
              <small>
                {o.itemCount || o.items?.length || '—'} sản phẩm
                {o.prescriptionId ? ` · Kê đơn #${o.prescriptionId}` : ''}
                {hasPendingReq ? ' · Có yêu cầu' : ''}
              </small>
            </td>
            <td>
              <strong>
                {o.userName ||
                  o.customerName ||
                  safeJson(o.address, {}).recipient ||
                  'Khách hàng'}
              </strong>
              <small>
                {o.phone ||
                  safeJson(o.address, {}).phone ||
                  o.email ||
                  ''}
              </small>
            </td>
            <td>{fmtDate(o.createdAt)}</td>
            <td className="adm-amount">{money(o.total)}</td>
            <td>
              <Badge value={o.paymentStatus} />
              {o.paymentMethod && (
                <small>{paymentShortLabel(o.paymentMethod)}</small>
              )}
            </td>
            <td>
              <Badge value={o.status} />
            </td>
            <td>
              <button
                className="adm-icon-btn"
                onClick={() => orderDetail(o)}
                aria-label="Xem đơn hàng"
              >
                <ChevronRight size={18} />
              </button>
            </td>
          </tr>
        );
      })}
    </Table>
  );
  const dashboard = () => (
    <AdminDashboard
      data={data}
      dashDays={dashDays}
      refreshing={dashRefreshing}
      onChangeDays={changeDashDays}
      onNavigate={go}
      orderTable={orderTable}
      hasPermission={hasPermission}
      isAdmin={isAdmin}
    />
  );
  const ordersView = () => (
    <AdminOrders
      orders={data}
      requests={orderRequests}
      returnGoods={returnGoods}
      tab={tab}
      setTab={setTab}
      query={query}
      setQuery={setQuery}
      filter={filter}
      setFilter={setFilter}
      page={page}
      setPage={setPage}
      onOpenOrder={orderDetail}
      onOpenRequest={(r) => open('request', r)}
      onOpenReturnGoods={(g) => open('returnGoods', g)}
      onOpenPrescription={openPrescriptionById}
      onOpenCreateOrder={() => open('createOrder', {})}
      onReload={load}
      notify={notify}
      hasPermission={hasPermission}
    />
  );
  const prescriptionsView = () => (
    <>
      <div className="adm-info-banner">
        <ShieldCheck size={21} />
        <div>
          <strong>Kiểm duyệt bởi dược sĩ</strong>
          <p>
            Kiểm tra tệp đơn thuốc và ghi rõ lý do khi từ chối. Tệp chỉ được xem
            bởi người có quyền.
          </p>
        </div>
      </div>
      <section className="adm-panel">
        {toolBar(
          'Tìm đơn thuốc, khách hàng...',
          selectFilter(
            ['pending', 'partial', 'approved', 'rejected'],
            'Tất cả trạng thái',
            (v) => (v === 'pending' ? 'Chờ duyệt' : label(v)),
          ),
        )}
        <Table
          columns={[
            'Đơn thuốc',
            'Khách hàng',
            'Đơn hàng',
            'Ngày gửi',
            'Trạng thái',
            'Thao tác',
          ]}
          rows={filtered(data)}
        >
          {filtered(data).map((rx) => (
            <tr key={rx.id}>
              <td>
                <strong>Đơn thuốc #{rx.id}</strong>
                <small>
                  {rx.originalName || rx.fileName || 'Tệp đính kèm'}
                </small>
              </td>
              <td>
                {rx.customerName || rx.userName || rx.name || 'Khách hàng'}
              </td>
              <td>{rx.orderCode || 'Chưa gắn đơn hàng'}</td>
              <td>{fmtDate(rx.createdAt)}</td>
              <td>
                <Badge value={rx.status}>
                  {rx.status === 'pending' ? 'Chờ duyệt' : undefined}
                </Badge>
              </td>
              <td>
                <button
                  className="adm-btn small"
                  onClick={() => open('prescription', rx)}
                >
                  <Eye size={15} />
                  Kiểm tra
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
  const productsView = () => {
    const rows = filtered(data);
    const totalPages = Math.max(1, Math.ceil(rows.length / 9));
    const currentPage = Math.min(page, totalPages);
    const visible = rows.slice((currentPage - 1) * 9, currentPage * 9);
    return (
      <section className="adm-panel">
        {toolBar(
          'Tên thuốc, hoạt chất, nhà sản xuất...',
          selectFilter(['otc', 'rx'], 'Tất cả loại sản phẩm'),
          addButton('Thêm sản phẩm', 'product', {
            unit: 'Hộp',
            price: 0,
            categoryId: categories[0]?.id,
            prescriptionRequired: false,
            active: true,
          }),
        )}
        <Table
          columns={[
            'Sản phẩm',
            'Danh mục',
            'Giá bán',
            'Tồn khả dụng',
            'Phân loại',
            'Hiển thị',
            '',
          ]}
          rows={visible}
        >
          {visible.map((p) => (
            <tr key={p.id}>
              <td>
                <div className="adm-product-cell">
                  <div className="adm-product-thumb">
                    {p.image?.startsWith('/') || p.image?.startsWith('http') ? (
                      <img
                        src={p.image}
                        alt=""
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Pill size={22} />
                    )}
                  </div>
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.manufacturer || p.ingredient || `SP-${p.id}`}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                {p.categoryName ||
                  categories.find((c) => c.id === p.categoryId)?.name ||
                  '—'}
              </td>
              <td>
                <strong>{money(p.price)}</strong>
                <small>/ {p.unit}</small>
              </td>
              <td>
                <span className={`adm-stock ${p.stock < 10 ? 'low' : ''}`}>
                  {count(p.stock)}
                </span>
              </td>
              <td>
                <Badge
                  value={
                    p.prescriptionRequired ? 'pending_prescription' : 'active'
                  }
                >
                  {p.prescriptionRequired ? 'Kê đơn' : 'Không kê đơn'}
                </Badge>
              </td>
              <td>
                <Badge value={p.active === false ? 'inactive' : 'active'}>
                  {p.active === false ? 'Đã ẩn' : 'Đang bán'}
                </Badge>
              </td>
              <td>{actions(p, 'product')}</td>
            </tr>
          ))}
        </Table>
        <Pagination
          page={currentPage}
          totalItems={rows.length}
          perPage={9}
          onChange={setPage}
          className="adm-pagination"
          noun="sản phẩm"
        />
      </section>
    );
  };
  const inventoryView = () => {
    const invKey = tab === 'alerts' ? 'alerts' : tab === 'movements' ? 'movements' : 'batches';
    const invRows = filtered(data?.[invKey]);
    const invTotalPages = Math.max(1, Math.ceil(invRows.length / 12));
    const invPage = Math.min(page, invTotalPages);
    const invVisible = invRows.slice((invPage - 1) * 12, invPage * 12);
    const invNoun = tab === 'alerts' ? 'cảnh báo' : tab === 'movements' ? 'biến động' : 'lô thuốc';
    return (
      <>
        <div className="adm-inventory-summary">
          <div className="adm-mini-stat">
            <Boxes size={22} />
            <div>
              <strong>{count(data?.batches?.length)}</strong>
              <span>Lô thuốc đang quản lý</span>
            </div>
          </div>
          <div className="adm-mini-stat warning">
            <AlertTriangle size={22} />
            <div>
              <strong>
                {count(data?.alerts?.filter((a) => a.type === 'expiring').length)}
              </strong>
              <span>Lô sắp hết hạn</span>
            </div>
          </div>
          <div className="adm-mini-stat danger">
            <Package size={22} />
            <div>
              <strong>
                {count(
                  data?.alerts?.filter((a) => a.type === 'low_stock').length,
                )}
              </strong>
              <span>Sản phẩm sắp hết</span>
            </div>
          </div>
        </div>
        <section className="adm-panel">
          <div className="adm-tabs">
            {[
              ['batches', 'Danh sách lô thuốc'],
              ['alerts', 'Cảnh báo tồn kho'],
              ['movements', 'Lịch sử biến động'],
            ].map(([key, title]) => (
              <button
                className={tab === key ? 'active' : ''}
                key={key}
                onClick={() => setTab(key)}
              >
                {title}
                {key === 'alerts' && !!data?.alerts?.length && (
                  <span>{data.alerts.length}</span>
                )}
              </button>
            ))}
          </div>
          {toolBar(
            'Tìm thuốc, mã lô...',
            null,
            addButton('Nhập kho', 'receipt', {
              supplierId: suppliers[0]?.id,
              productId: products[0]?.id,
              quantity: 1,
              cost: 0,
              batchNumber: '',
              manufacturedAt: new Date().toISOString().slice(0, 10),
              expiresAt: '',
            }),
          )}
          {tab === 'alerts' ? (
            <Table
              columns={['Mức cảnh báo', 'Sản phẩm', 'Tồn kho', 'Hạn dùng']}
              rows={invVisible}
            >
              {invVisible.map((a, i) => (
                <tr key={i}>
                  <td>
                    <Badge value={a.type} />
                  </td>
                  <td>
                    <strong>{a.productName}</strong>
                    <small>{a.batchNumber || `Mã SP: ${a.productId}`}</small>
                  </td>
                  <td>{count(a.quantity)}</td>
                  <td>{fmtDate(a.expiresAt)}</td>
                </tr>
              ))}
            </Table>
          ) : tab === 'movements' ? (
            <Table
              columns={[
                'Thời gian',
                'Sản phẩm / Lô',
                'Loại giao dịch',
                'Số lượng',
                'Lý do',
              ]}
              rows={invVisible}
            >
              {invVisible.map((m) => (
                <tr key={m.id}>
                  <td>{dateTime(m.createdAt)}</td>
                  <td>
                    <strong>{m.productName}</strong>
                    <small>{m.batchNumber}</small>
                  </td>
                  <td>
                    <Badge value={m.type} />
                  </td>
                  <td
                    className={Number(m.quantity) < 0 ? 'adm-red' : 'adm-green'}
                  >
                    {Number(m.quantity) > 0 ? '+' : ''}
                    {count(m.quantity)}
                  </td>
                  <td>{m.reason}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <Table
              columns={[
                'Sản phẩm / Mã lô',
                'Hạn sử dụng',
                'Tồn thực tế',
                'Đang giữ',
                'Khả dụng',
                'Trạng thái',
                '',
              ]}
              rows={invVisible}
            >
              {invVisible.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.productName}</strong>
                    <small>{b.batchNumber}</small>
                  </td>
                  <td>{fmtDate(b.expiresAt)}</td>
                  <td>{count(b.quantity)}</td>
                  <td>{count(b.reserved)}</td>
                  <td>
                    <strong>
                      {count(b.available ?? b.quantity - b.reserved)}
                    </strong>
                  </td>
                  <td>
                    <Badge value={b.status || 'available'} />
                  </td>
                  <td>
                    <button
                      className="adm-btn small"
                      onClick={() =>
                        open('adjustment', {
                          batchId: b.id,
                          productName: b.productName,
                          batchNumber: b.batchNumber,
                          quantity: 0,
                          reason: '',
                        })
                      }
                    >
                      Điều chỉnh
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
          <Pagination
            page={invPage}
            totalItems={invRows.length}
            perPage={12}
            onChange={setPage}
            className="adm-pagination"
            noun={invNoun}
          />
        </section>
      </>
    );
  };
  const catalogView = () => (
    <section className="adm-panel">
      <div className="adm-tabs">
        {[
          ['categories', 'Danh mục'],
          ['suppliers', 'Nhà cung cấp'],
          ['manufacturers', 'Nhà sản xuất'],
        ].map(([k, t]) => (
          <button
            key={k}
            className={tab === k ? 'active' : ''}
            onClick={() => {
              setTab(k);
              setQuery('');
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {toolBar(
        'Tìm kiếm theo tên...',
        null,
        addButton(
          `Thêm ${tab === 'categories' ? 'danh mục' : tab === 'suppliers' ? 'nhà cung cấp' : 'nhà sản xuất'}`,
          'catalog',
          { active: true },
        ),
      )}
      <Table
        columns={
          tab === 'categories'
            ? ['Danh mục', 'Mã danh mục', 'Mô tả', 'Trạng thái', '']
            : tab === 'suppliers'
              ? ['Nhà cung cấp', 'Liên hệ', 'Địa chỉ', 'Trạng thái', '']
              : ['Nhà sản xuất', 'Quốc gia', 'Trạng thái', '']
        }
        rows={filtered(data)}
      >
        {filtered(data).map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.name}</strong>
            </td>
            {tab === 'categories' ? (
              <>
                <td>
                  <code>{item.slug}</code>
                </td>
                <td className="adm-truncate">{text(item.description)}</td>
              </>
            ) : tab === 'suppliers' ? (
              <>
                <td>
                  {text(item.phone)}
                  <small>{item.email}</small>
                </td>
                <td>{text(item.address)}</td>
              </>
            ) : (
              <td>{text(item.country)}</td>
            )}
            <td>
              <Badge value={item.active === false ? 'inactive' : 'active'} />
            </td>
            <td>{actions(item, 'catalog')}</td>
          </tr>
        ))}
      </Table>
    </section>
  );
  const promotionsView = () => (
    <section className="adm-panel">
      {toolBar(
        'Tìm mã hoặc tên khuyến mãi...',
        selectFilter(['active', 'inactive']),
        addButton('Tạo khuyến mãi', 'promotion', {
          type: 'percent',
          value: 10,
          minOrder: 0,
          maxDiscount: 0,
          usageLimit: 100,
          startDate: new Date().toISOString().slice(0, 10),
          endDate: '',
          active: true,
        }),
      )}
      <Table
        columns={[
          'Khuyến mãi',
          'Giảm giá',
          'Điều kiện',
          'Thời gian',
          'Lượt dùng',
          'Trạng thái',
          '',
        ]}
        rows={filtered(data)}
      >
        {filtered(data).map((p) => (
          <tr key={p.id}>
            <td>
              <strong>{p.code}</strong>
              <small>{p.name}</small>
            </td>
            <td className="adm-green">
              <strong>
                {p.type === 'percent' ? `${p.value}%` : money(p.value)}
              </strong>
              {!!p.maxDiscount && <small>Tối đa {money(p.maxDiscount)}</small>}
            </td>
            <td>Từ {money(p.minOrder)}</td>
            <td>
              {fmtDate(p.startDate)}
              <small>đến {fmtDate(p.endDate)}</small>
            </td>
            <td>
              {p.usedCount || 0} / {p.usageLimit || '∞'}
            </td>
            <td>
              <Badge value={p.active ? 'active' : 'inactive'} />
            </td>
            <td>{actions(p, 'promotion')}</td>
          </tr>
        ))}
      </Table>
    </section>
  );
  const usersView = () => (
    <section className="adm-panel">
      {toolBar(
        'Tìm theo tên, email, số điện thoại...',
        selectFilter(
          ['customer', 'staff', 'admin', 'active', 'inactive'],
          'Tất cả tài khoản',
        ),
        addButton('Thêm nhân viên', 'invite', { jobTitle: 'sales' }),
      )}
      <Table
        columns={[
          'Người dùng',
          'Liên hệ',
          'Vai trò',
          'Chức danh',
          'Trạng thái',
          '',
        ]}
        rows={filtered(data)}
      >
        {filtered(data).map((u) => (
          <tr key={u.id}>
            <td>
              <div className="adm-person">
                <span>{u.name?.slice(0, 1)}</span>
                <div>
                  <strong>{u.name}</strong>
                  <small>
                    #{u.id}
                    {u.id === user.id ? ' · Tài khoản của bạn' : ''}
                  </small>
                </div>
              </div>
            </td>
            <td>
              {u.email}
              <small>{u.phone}</small>
            </td>
            <td>
              <Badge value={u.role} />
            </td>
            <td>{label(u.jobTitle)}</td>
            <td>
              <Badge value={u.active ? 'active' : 'inactive'} />
              {!u.verified && <small>Chờ kích hoạt</small>}
            </td>
            <td>
              <button className="adm-btn small" onClick={() => open('user', u)}>
                <ShieldCheck size={14} />
                Chỉnh sửa
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </section>
  );
  const chatbotView = () => (
    <section className="adm-panel">
      <div className="adm-tabs">
        {hasPermission('support') && (
          <button
            className={tab === 'support' ? 'active' : ''}
            onClick={() => {
              setTab('support');
              setFilter('');
            }}
          >
            Yêu cầu hỗ trợ
          </button>
        )}
        {(hasPermission('knowledge') || canReviewKnowledge) && (
          <>
            <button
              className={tab === 'knowledge' ? 'active' : ''}
              onClick={() => {
                setTab('knowledge');
                setFilter('');
              }}
            >
              Cơ sở tri thức
            </button>
            {hasPermission('knowledge') && (
              <button
                className={tab === 'rules' ? 'active' : ''}
                onClick={() => {
                  setTab('rules');
                  setFilter('');
                }}
              >
                Quy tắc an toàn
              </button>
            )}
          </>
        )}
      </div>
      {toolBar(
        tab === 'support'
          ? 'Tìm nội dung hỗ trợ...'
          : 'Tìm tiêu đề, từ khóa...',
        tab === 'support'
          ? selectFilter(
              ['pending', 'in_progress', 'resolved'],
              'Tất cả trạng thái',
              (v) => (v === 'pending' ? 'Chờ hỗ trợ' : label(v)),
            )
          : null,
        tab === 'knowledge' && hasPermission('knowledge')
          ? addButton('Thêm tri thức', 'knowledge', { active: true })
          : null,
      )}
      {tab === 'knowledge' ? (
        <Table
          columns={['Nội dung tri thức', 'Từ khóa', 'Trạng thái', '']}
          rows={filtered(data)}
        >
          {filtered(data).map((k) => (
            <tr key={k.id}>
              <td>
                <strong>{k.title}</strong>
                <small className="adm-truncate">{k.content}</small>
              </td>
              <td className="adm-truncate">
                {Array.isArray(k.keywords) ? k.keywords.join(', ') : k.keywords}
              </td>
              <td>
                <Badge
                  value={
                    k.active && k.reviewedAt
                      ? 'active'
                      : k.active
                        ? 'pending'
                        : 'inactive'
                  }
                >
                  {k.active && !k.reviewedAt
                    ? 'Chờ dược sĩ rà soát'
                    : undefined}
                </Badge>
              </td>
              <td>
                {hasPermission('knowledge') && actions(k, 'knowledge')}
                {canReviewKnowledge && k.active && !k.reviewedAt && (
                  <button
                    className="adm-btn small"
                    onClick={() => open('knowledgeReview', k)}
                  >
                    Rà soát
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      ) : tab === 'rules' ? (
        <>
          <div className="adm-info-banner adm-rules-note">
            <ShieldCheck size={20} />
            <p>
              Chatbot kiểm tra từ khóa và quy tắc an toàn trước khi trả lời. Nội
              dung rủi ro được hướng dẫn liên hệ chuyên môn.
            </p>
          </div>
          <Table
            columns={[
              'Quy tắc',
              'Từ khóa cảnh báo',
              'Phản hồi',
              'Trạng thái',
              '',
            ]}
            rows={filtered(data)}
          >
            {filtered(data).map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.name}</strong>
                </td>
                <td className="adm-truncate">
                  {Array.isArray(r.keywords)
                    ? r.keywords.join(', ')
                    : r.keywords}
                </td>
                <td className="adm-truncate">{r.response}</td>
                <td>
                  <Badge value={r.active ? 'active' : 'inactive'} />
                </td>
                <td>
                  <button
                    className="adm-icon-btn"
                    onClick={() => open('rule', r)}
                    aria-label={`Sửa quy tắc ${r.name}`}
                  >
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        </>
      ) : (
        <Table
          columns={[
            'Khách hàng',
            'Nội dung yêu cầu',
            'Ngày tạo',
            'Trạng thái',
            '',
          ]}
          rows={filtered(data)}
        >
          {filtered(data).map((s) => (
            <tr key={s.id}>
              <td>
                <strong>{s.userName || s.customerName || 'Khách hàng'}</strong>
                <small>Hội thoại #{s.sessionId}</small>
              </td>
              <td className="adm-truncate">
                {s.message || s.reason || 'Cần dược sĩ hỗ trợ'}
              </td>
              <td>{fmtDate(s.createdAt)}</td>
              <td>
                <Badge value={s.status} />
              </td>
              <td>
                <button
                  className="adm-btn small"
                  onClick={() => supportDetail(s)}
                >
                  <MessageSquare size={14} />
                  Hỗ trợ
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </section>
  );
  const reportsView = () => {
    const activeFrom = range.from || data?.from || '';
    const activeTo = range.to || data?.to || '';
    const applyPreset = (fromVal, toVal) => {
      const next = { from: fromVal, to: toVal };
      setRange(next);
      load(false, next);
    };
    const todayIso = vnDate(0);
    const presets = [
      ['7 ngày', vnDate(-6), todayIso],
      ['14 ngày', vnDate(-13), todayIso],
      ['30 ngày', vnDate(-29), todayIso],
      ['Tháng này', `${todayIso.slice(0, 8)}01`, todayIso],
    ];
    const revDelta = deltaInfo(data?.revenue, data?.previous?.revenue);
    const ordDelta = deltaInfo(data?.orderCount, data?.previous?.orderCount);
    const cancelDelta = deltaInfo(
      data?.cancellationRate,
      data?.previous?.cancellationRate,
      true,
    );
    const alertTotal =
      (data?.inventory?.lowStockCount || 0) +
      (data?.inventory?.expiringCount || 0) +
      (data?.inventory?.expiredCount || 0);
    const kpiCards = [
      {
        title: 'Doanh thu thuần trong kỳ',
        value: money(data?.revenue),
        Icon: Wallet,
        tone: 'tone-0',
        badge: revDelta.text,
        badgeTone: revDelta.tone,
        dir: revDelta.dir,
        sub: `Tiền hàng ${money(data?.grossRevenue)} · Giảm giá ${money(data?.totalDiscount)}${data?.refundTotal > 0 ? ` · Hoàn ${money(data?.refundTotal)}` : ''}`,
      },
      {
        title: 'Tổng đơn hàng',
        value: count(data?.orderCount),
        Icon: ShoppingBag,
        tone: 'tone-1',
        badge: ordDelta.text,
        badgeTone: ordDelta.tone,
        dir: ordDelta.dir,
        sub: `${count(data?.completedOrders)} hoàn tất · TB ${money(data?.averageOrder)}/đơn`,
      },
      {
        title: 'Tỷ lệ hủy đơn',
        value: `${Number(data?.cancellationRate || 0).toFixed(1)}%`,
        Icon: AlertTriangle,
        tone: 'tone-2',
        badge: `Hoàn tất ${Number(data?.completionRate || 0).toFixed(1)}%`,
        badgeTone:
          Number(data?.cancellationRate || 0) > 25
            ? 'down'
            : Number(data?.completionRate || 0) >= 60
              ? 'up'
              : 'flat',
        dir: cancelDelta.dir,
        sub: `${count(data?.cancelledOrders)} đơn hủy / ${count(data?.orderCount)} đơn trong kỳ`,
      },
      {
        title: 'Tồn kho khả dụng',
        value: count(data?.inventory?.sellable),
        Icon: Boxes,
        tone: 'tone-3',
        badge: alertTotal > 0 ? `${count(alertTotal)} cảnh báo kho` : 'Kho ổn định',
        badgeTone: alertTotal > 0 ? 'warn' : 'up',
        dir: 'flat',
        sub: `Giá trị vốn ${money(data?.inventory?.value)} · Giữ ${count(data?.inventory?.reserved)}`,
      },
    ];
    const topProducts = list(data?.topProducts);
    const paymentList = list(data?.paymentBreakdown);
    const categoryList = list(data?.categoryBreakdown);
    const topRevSum = Math.max(
      1,
      Number(data?.grossRevenue) ||
        categoryList.reduce((n, c) => n + (Number(c.revenue) || 0), 0) ||
        topProducts.reduce((n, p) => n + (Number(p.revenue) || 0), 0),
    );
    const maxCatRev = Math.max(1, ...categoryList.map((c) => Number(c.revenue) || 0));
    const hasPayRev = paymentList.some((m) => (Number(m.revenue) || 0) > 0);
    const maxPayMetric = Math.max(
      1,
      ...paymentList.map((m) => (hasPayRev ? Number(m.revenue) || 0 : Number(m.orders) || 0)),
    );
    const alerts = list(data?.inventoryAlerts);
    const exportParams = new URLSearchParams(
      Object.fromEntries(
        Object.entries({ from: activeFrom, to: activeTo }).filter(([, v]) => v),
      ),
    );

    return (
      <div className="adm-rp">
        <form
          className="adm-rp-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            load(false, { from: activeFrom, to: activeTo });
          }}
        >
          <div className="adm-rp-title-block">
            <div className="adm-rp-eyebrow">
              <BarChart3 size={14} />
              <span>BÁO CÁO & PHÂN TÍCH KINH DOANH</span>
            </div>
            <h3>Hiệu quả vận hành Nhà thuốc An Tâm</h3>
            <p>
              <Calendar size={13} />
              <span>
                Kỳ báo cáo: <strong>{fmtDate(data?.from || activeFrom)}</strong> →{' '}
                <strong>{fmtDate(data?.to || activeTo)}</strong>
                {data?.spanDays ? ` (${data.spanDays} ngày)` : ''}
              </span>
            </p>
          </div>

          <div className="adm-rp-controls">
            <div className="adm-rp-presets" role="group" aria-label="Chọn nhanh khoảng ngày">
              {presets.map(([name, f, t]) => {
                const active = activeFrom === f && activeTo === t;
                return (
                  <button
                    key={name}
                    type="button"
                    className={`adm-rp-preset ${active ? 'active' : ''}`}
                    onClick={() => applyPreset(f, t)}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            <div className="adm-rp-dates">
              <label>
                Từ ngày
                <input
                  aria-label="Từ ngày"
                  type="date"
                  value={activeFrom}
                  onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                />
              </label>
              <label>
                Đến ngày
                <input
                  aria-label="Đến ngày"
                  type="date"
                  value={activeTo}
                  onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                />
              </label>
              <button className="adm-btn primary" type="submit">
                Xem báo cáo
              </button>
              <a
                className="adm-btn"
                href={`/api/admin/reports/export?${exportParams}`}
                download
              >
                <Download size={15} />
                Xuất CSV
              </a>
            </div>
          </div>
        </form>

        <div className="adm-rp-kpis">
          {kpiCards.map(({ title, value, Icon, tone, badge, badgeTone, dir, sub }) => (
            <article className="adm-rp-kpi" key={title}>
              <div className="adm-rp-kpi-top">
                <span>{title}</span>
                <span className={`adm-stat-icon ${tone}`}>
                  <Icon size={19} />
                </span>
              </div>
              <strong>{value}</strong>
              <div className="adm-rp-kpi-meta">
                <span className={`adm-rp-delta is-${badgeTone}`}>
                  {dir === 'up' && <TrendingUp size={12} />}
                  {dir === 'down' && <TrendingDown size={12} />}
                  {badge}
                </span>
              </div>
              <small>{sub}</small>
            </article>
          ))}
        </div>

        <div className="adm-rp-main-grid">
          <section className="adm-panel">
            <div className="adm-panel-head">
              <div>
                <h3>Xu hướng doanh thu & đơn hàng</h3>
                <p>Theo dõi biến động thu tiền và lượng đơn phát sinh từng ngày</p>
              </div>
              <span className="adm-soft-label">Kỳ {data?.spanDays || 30} ngày</span>
            </div>
            <ReportChart data={data?.dailyRevenue || []} />
          </section>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <div>
                <h3>Cơ cấu trạng thái đơn</h3>
                <p>Tỷ trọng đơn hoàn tất, đang xử lý và hủy trong kỳ</p>
              </div>
              <span className="adm-soft-label">{count(data?.orderCount)} đơn</span>
            </div>
            <StatusDonut
              breakdown={data?.statusBreakdown || []}
              totalOrders={data?.orderCount || 0}
            />
          </section>
        </div>

        <div className="adm-rp-grid-3">
          <section className="adm-panel adm-rp-subpanel">
            <div className="adm-panel-head">
              <div>
                <h3>Kênh thanh toán</h3>
                <p>Phân bổ đơn hàng và dòng tiền theo phương thức</p>
              </div>
              <span className="adm-stat-icon tone-1">
                <CreditCard size={17} />
              </span>
            </div>
            <div className="adm-rp-bars-list">
              {paymentList.length ? (
                paymentList.map((m) => {
                  const metricVal = hasPayRev ? Number(m.revenue) || 0 : Number(m.orders) || 0;
                  const pct = metricVal > 0 ? Math.max(2, (metricVal / maxPayMetric) * 100) : 0;
                  return (
                    <div className="adm-rp-bar-row" key={m.method}>
                      <div className="adm-rp-bar-head">
                        <strong>{paymentLabel(m.method)}</strong>
                        <span>{money(m.revenue)}</span>
                      </div>
                      <div className="adm-rp-progress">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <small>
                        {count(m.orders)} đơn phát sinh · {count(m.completedOrders)} đơn thu tiền
                      </small>
                    </div>
                  );
                })
              ) : (
                <Empty title="Chưa có giao dịch trong kỳ" />
              )}
            </div>
          </section>

          <section className="adm-panel adm-rp-subpanel">
            <div className="adm-panel-head">
              <div>
                <h3>Doanh thu theo danh mục</h3>
                <p>Nhóm sản phẩm đóng góp doanh thu cao nhất</p>
              </div>
              <span className="adm-stat-icon">
                <Layers size={17} />
              </span>
            </div>
            <div className="adm-rp-bars-list">
              {categoryList.length ? (
                categoryList.slice(0, 6).map((c) => {
                  const rev = Number(c.revenue) || 0;
                  const pct = rev > 0 ? Math.max(2, (rev / maxCatRev) * 100) : 0;
                  return (
                    <div className="adm-rp-bar-row" key={c.id || c.name}>
                      <div className="adm-rp-bar-head">
                        <strong>{c.name}</strong>
                        <span>{money(c.revenue)}</span>
                      </div>
                      <div className="adm-rp-progress is-teal">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <small>
                        Đã bán {count(c.quantity)} sản phẩm · {count(c.orderCount)} đơn hàng
                      </small>
                    </div>
                  );
                })
              ) : (
                <Empty
                  title="Chưa có doanh thu danh mục"
                  description="Dữ liệu sẽ hiển thị khi có đơn hàng giao thành công và thanh toán."
                />
              )}
            </div>
          </section>

          <section className="adm-panel adm-rp-subpanel">
            <div className="adm-panel-head">
              <div>
                <h3>Vận hành dược sĩ & tư vấn</h3>
                <p>Đơn thuốc, chatbot và chăm sóc khách hàng trong kỳ</p>
              </div>
              <span className="adm-stat-icon tone-3">
                <Activity size={17} />
              </span>
            </div>
            <div className="adm-rp-ops-list">
              <div>
                <span>Đơn thuốc gửi trong kỳ</span>
                <strong>{count(data?.prescriptionStats?.total)}</strong>
                <small>
                  Duyệt {count(data?.prescriptionStats?.approved)} · Chờ{' '}
                  {count(data?.prescriptionStats?.pending)} · Từ chối{' '}
                  {count(data?.prescriptionStats?.rejected)}
                </small>
              </div>
              <div>
                <span>Phiên hỏi đáp Chatbot</span>
                <strong>{count(data?.chatCount)}</strong>
                <small>Tổng cuộc hội thoại tạo mới trong kỳ</small>
              </div>
              <div>
                <span>Yêu cầu tư vấn dược sĩ</span>
                <strong>{count(data?.handoffCount)}</strong>
                <small>Khách cần dược sĩ hỗ trợ trực tiếp</small>
              </div>
              <div>
                <span>Khách hàng hoạt động</span>
                <strong>{count(data?.customerCount)}</strong>
                <small>Phí vận chuyển đã thu: {money(data?.totalShipping)}</small>
              </div>
            </div>
          </section>
        </div>

        <div className="adm-rp-bottom-grid">
          <section className="adm-panel">
            <div className="adm-panel-head">
              <div>
                <h3>Top sản phẩm bán chạy</h3>
                <p>Xếp hạng theo tiền hàng ({money(data?.grossRevenue)}) và tỷ trọng đóng góp</p>
              </div>
              <span className="adm-soft-label">Top {topProducts.length}</span>
            </div>
            <Table
              columns={['Hạng & Sản phẩm', 'SL bán', 'Doanh thu', 'Tỷ trọng']}
              rows={topProducts}
              empty="Chưa có sản phẩm bán hoàn tất trong khoảng thời gian này"
            >
              {topProducts.map((p, i) => {
                const share = Math.min(
                  100,
                  Math.round(((Number(p.revenue) || 0) / topRevSum) * 100),
                );
                return (
                  <tr key={p.id || i}>
                    <td>
                      <div className="adm-rp-prod-cell">
                        <span className={`adm-rp-medal is-top-${i + 1}`}>
                          {i + 1}
                        </span>
                        {p.image ? (
                          <img
                            src={p.image}
                            alt=""
                            className="adm-rp-prod-thumb"
                          />
                        ) : (
                          <span className="adm-rp-prod-fallback">
                            <Pill size={14} />
                          </span>
                        )}
                        <div>
                          <strong>{p.name}</strong>
                          <small>
                            {[p.categoryName, p.unit].filter(Boolean).join(' · ')}
                            {p.orderCount ? ` · ${count(p.orderCount)} đơn` : ''}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{count(p.quantity)}</td>
                    <td className="adm-amount">{money(p.revenue)}</td>
                    <td>
                      <div className="adm-rp-share">
                        <div className="adm-rp-progress">
                          <span style={{ width: `${share > 0 ? Math.max(2, share) : 0}%` }} />
                        </div>
                        <span>{share}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </Table>
          </section>

          <section className="adm-panel adm-rp-alerts-panel">
            <div className="adm-panel-head">
              <div>
                <h3>Sức khỏe kho & Cảnh báo</h3>
                <p>Theo dõi lô thuốc hết hạn, sắp hết hạn và sắp hết hàng</p>
              </div>
              {hasPermission('inventory') && (
                <button
                  type="button"
                  className="adm-btn"
                  onClick={() => go('inventory', { tab: 'alerts' })}
                >
                  Xem kho
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
            <div className="adm-rp-alert-pills">
              <span className="adm-badge is-expired">
                Hết hạn: {count(data?.inventory?.expiredCount)}
              </span>
              <span className="adm-badge is-expiring">
                Sắp hết hạn: {count(data?.inventory?.expiringCount)}
              </span>
              <span className="adm-badge is-low_stock">
                Sắp hết hàng: {count(data?.inventory?.lowStockCount)}
              </span>
            </div>
            <div className="adm-rp-alert-list">
              {alerts.length ? (
                alerts.map((a, idx) => (
                  <div
                    key={`${a.type}-${a.productId}-${a.batchId || idx}`}
                    className="adm-rp-alert-row"
                  >
                    <div>
                      <strong>{a.productName}</strong>
                      <small>
                        {a.batchNumber ? `Lô ${a.batchNumber} · ` : ''}
                        {a.expiresAt ? `HSD ${fmtDate(a.expiresAt)} · ` : ''}
                        SL: {count(a.quantity)}
                      </small>
                    </div>
                    <Badge value={a.type} />
                  </div>
                ))
              ) : (
                <div className="adm-rp-all-good">
                  <CheckCircle2 size={22} />
                  <div>
                    <strong>Kho hàng an toàn</strong>
                    <p>Không có lô hết hạn hay sản phẩm dưới ngưỡng cảnh báo.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  };
  const settingsView = () => (
    <form
      onSubmit={(e) =>
        submit(
          e,
          '/admin/settings',
          'PATCH',
          Object.fromEntries(
            Object.entries(form).map(([k, v]) => [
              k,
              typeof data?.[k] === 'number' ? Number(v) : v,
            ]),
          ),
        )
      }
    >
      <div className="adm-settings-layout">
        <section className="adm-panel adm-settings-card">
          <div className="adm-panel-head">
            <div>
              <h3>Thông tin & vận hành</h3>
              <p>Thiết lập áp dụng cho toàn bộ hệ thống</p>
            </div>
            <Settings size={21} />
          </div>
          <div className="adm-form-grid">
            {[
              ['storeName', 'Tên nhà thuốc', 'text'],
              ['shippingFee', 'Phí giao hàng mặc định (đ)', 'number'],
              ['freeShippingThreshold', 'Miễn phí giao hàng từ (đ)', 'number'],
              ['lowStockThreshold', 'Ngưỡng tồn kho thấp', 'number'],
              ['expiryWarningDays', 'Cảnh báo hạn dùng trước (ngày)', 'number'],
              ['otpTtlMinutes', 'Thời hạn OTP (phút)', 'number'],
              ['paymentTimeoutMinutes', 'Thời hạn thanh toán (phút)', 'number'],
            ]
              .filter(([k]) => k in form)
              .map(([k, t, type]) => (
                <Field
                  key={k}
                  label={t}
                  name={k}
                  value={form[k]}
                  type={type}
                  min={type === 'number' ? 0 : undefined}
                  onChange={change}
                />
              ))}
          </div>
          {Object.keys(form)
            .filter(
              (k) =>
                ![
                  'storeName',
                  'shippingFee',
                  'freeShippingThreshold',
                  'lowStockThreshold',
                  'expiryWarningDays',
                  'otpTtlMinutes',
                  'paymentTimeoutMinutes',
                  'chatbotEnabled',
                  'demoMode',
                  'geminiConfigured',
                  'paymentConfigured',
                  'emailConfigured',
                  'smtpConfigured',
                  'otpMode',
                  'paymentProvider',
                  'maxUploadMb',
                ].includes(k) && typeof form[k] !== 'object',
            )
            .map((k) =>
              typeof form[k] === 'boolean' ? (
                <CheckField
                  key={k}
                  label={
                    k === 'returnWindowDays'
                      ? 'Thời hạn gửi yêu cầu đổi trả (ngày)'
                      : k
                  }
                  name={k}
                  value={form[k]}
                  onChange={change}
                />
              ) : (
                <Field
                  key={k}
                  label={
                    k === 'returnWindowDays'
                      ? 'Thời hạn gửi yêu cầu đổi trả (ngày)'
                      : k
                  }
                  name={k}
                  value={form[k]}
                  onChange={change}
                />
              ),
            )}
        </section>
        <section className="adm-panel adm-settings-card">
          <div className="adm-panel-head">
            <div>
              <h3>Dịch vụ tích hợp</h3>
              <p>Khóa dịch vụ được cấu hình tại máy chủ</p>
            </div>
            <ShieldCheck size={21} />
          </div>
          {'chatbotEnabled' in form && (
            <CheckField
              label="Bật trợ lý tư vấn chatbot"
              name="chatbotEnabled"
              value={form.chatbotEnabled}
              onChange={change}
            />
          )}
          {'demoMode' in form && (
            <div className="adm-integration-state">
              <span>Thanh toán và OTP thử nghiệm</span>
              <Badge value={form.demoMode ? 'active' : 'inactive'}>
                {form.demoMode ? 'Đang bật' : 'Đã tắt'}
              </Badge>
            </div>
          )}
          <div className="adm-info-banner compact">
            <AlertTriangle size={18} />
            <p>
              Chế độ demo phục vụ trình diễn đồ án. Tích hợp thực cần khóa riêng
              trong cấu hình môi trường máy chủ.
            </p>
          </div>
          <div className="adm-integration-list">
            {[
              ['Google Gemini', form.geminiConfigured],
              ['VNPay Sandbox', form.paymentConfigured],
              ['Đăng nhập Google', form.googleConfigured],
              ['Email / OTP', form.smtpConfigured ?? form.emailConfigured],
            ].map(([n, v]) => (
              <div key={n}>
                <span>{n}</span>
                <Badge value={v ? 'active' : 'inactive'}>
                  {v ? 'Đã cấu hình' : 'Chưa cấu hình'}
                </Badge>
              </div>
            ))}
          </div>
          {isAdmin && hasPermission('backup') && (
            <div className="adm-backup-actions">
              <button
                type="button"
                className="adm-btn"
                onClick={() => open('backup', { passphrase: '' })}
              >
                <Download size={16} />
                Tải bản sao lưu
              </button>
              <button
                type="button"
                className="adm-btn"
                onClick={() => open('restore', { confirm: '' })}
              >
                <RefreshCw size={16} />
                Phục hồi dữ liệu
              </button>
            </div>
          )}
        </section>
      </div>
      <div className="adm-settings-footer">
        <span>Thay đổi cấu hình được ghi vào nhật ký hệ thống.</span>
        <button className="adm-btn primary" disabled={saving} type="submit">
          {saving ? (
            <LoaderCircle size={17} className="adm-spin" />
          ) : (
            <Check size={17} />
          )}
          Lưu cấu hình
        </button>
      </div>
    </form>
  );
  const auditView = () => (
    <section className="adm-panel">
      {toolBar('Tìm người thực hiện, hành động...')}
      <Table
        columns={[
          'Thời gian',
          'Người thực hiện',
          'Hành động',
          'Đối tượng',
          'Chi tiết',
        ]}
        rows={filtered(data)}
      >
        {filtered(data).map((a, i) => (
          <tr key={a.id || i}>
            <td>{dateTime(a.createdAt)}</td>
            <td>
              <strong>
                {a.userName || a.actorName || a.email || `#${a.userId || ''}`}
              </strong>
            </td>
            <td>
              <code>{a.action}</code>
            </td>
            <td>
              {a.entity || a.targetType || a.resource || '—'}{' '}
              {a.entityId || a.targetId || ''}
            </td>
            <td
              className="adm-truncate"
              title={
                typeof a.details === 'object'
                  ? JSON.stringify(a.details)
                  : a.details
              }
            >
              {typeof a.details === 'object'
                ? JSON.stringify(a.details)
                : a.details || a.detail || a.description || '—'}
            </td>
          </tr>
        ))}
      </Table>
    </section>
  );

  const modalContent = () => {
    if (!modal) return null;
    const { type, data: item } = modal;
    const edit = !!item.id;
    const footer = (saveLabel = 'Lưu thay đổi') => (
      <div className="adm-modal-footer">
        <button type="button" className="adm-btn" onClick={close}>
          Đóng
        </button>
        <button className="adm-btn primary" disabled={saving} type="submit">
          {saving ? (
            <LoaderCircle className="adm-spin" size={16} />
          ) : (
            <Check size={16} />
          )}{' '}
          {saveLabel}
        </button>
      </div>
    );
    const fields = (defs) =>
      defs.map(([name, title, type = 'text', required = false, extra = {}]) => (
        <Field
          key={name}
          name={name}
          label={title}
          type={type}
          value={form[name]}
          onChange={change}
          required={required}
          {...extra}
        />
      ));
    if (type === 'delete')
      return (
        <Modal title="Xác nhận xóa dữ liệu" onClose={close}>
          <form
            onSubmit={(e) =>
              submit(e, `/admin/${item.resource}/${item.id}`, 'DELETE')
            }
          >
            <div className="adm-modal-body">
              <div className="adm-info-banner danger">
                <AlertTriangle size={22} />
                <p>
                  Bạn muốn xóa{' '}
                  <strong>
                    {item.name ||
                      item.title ||
                      item.code ||
                      `bản ghi #${item.id}`}
                  </strong>
                  ? Dữ liệu đã tham gia giao dịch có thể chỉ được ẩn để bảo toàn
                  lịch sử.
                </p>
              </div>
            </div>
            {footer('Xác nhận xóa')}
          </form>
        </Modal>
      );
    if (type === 'product')
      return (
        <Modal
          title={edit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
          onClose={close}
          wide
        >
          <form
            onSubmit={(e) =>
              submit(
                e,
                `/admin/products${edit ? `/${item.id}` : ''}`,
                edit ? 'PATCH' : 'POST',
                {
                  ...form,
                  price: Number(form.price),
                  oldPrice: Number(form.oldPrice) || 0,
                  categoryId: Number(form.categoryId),
                  manufacturerId: form.manufacturerId
                    ? Number(form.manufacturerId)
                    : null,
                },
              )
            }
          >
            <div className="adm-modal-body adm-form-grid">
              {fields([
                ['name', 'Tên sản phẩm', 'text', true, { wide: true }],
                ['slug', 'Mã đường dẫn (để trống để tự tạo)'],
                ['unit', 'Đơn vị bán', 'text', true],
                ['price', 'Giá bán (đ)', 'number', true, { min: 0 }],
                ['oldPrice', 'Giá niêm yết (đ)', 'number', false, { min: 0 }],
              ])}
              <Field label="Danh mục" required>
                <select
                  name="categoryId"
                  value={form.categoryId || ''}
                  onChange={change}
                  required
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nhà sản xuất">
                <select
                  name="manufacturerId"
                  value={form.manufacturerId || ''}
                  onChange={change}
                >
                  <option value="">Chọn nhà sản xuất</option>
                  {manufacturers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              {fields([
                [
                  'ingredient',
                  'Thành phần / hoạt chất',
                  'text',
                  false,
                  { wide: true },
                ],
                ['image', 'Đường dẫn ảnh', 'text', false, { wide: true }],
                [
                  'description',
                  'Mô tả sản phẩm',
                  'textarea',
                  false,
                  { wide: true },
                ],
                [
                  'usage',
                  'Thông tin sử dụng',
                  'textarea',
                  false,
                  { wide: true },
                ],
                [
                  'warning',
                  'Cảnh báo, lưu ý',
                  'textarea',
                  false,
                  { wide: true },
                ],
              ])}
              <CheckField
                name="prescriptionRequired"
                label="Sản phẩm cần đơn thuốc"
                value={form.prescriptionRequired}
                onChange={change}
              />
              <CheckField
                name="featured"
                label="Sản phẩm nổi bật"
                value={form.featured}
                onChange={change}
              />
              <CheckField
                name="active"
                label="Hiển thị trên cửa hàng"
                value={form.active !== false}
                onChange={change}
              />
            </div>
            {footer(edit ? 'Lưu sản phẩm' : 'Tạo sản phẩm')}
          </form>
        </Modal>
      );
    if (type === 'catalog')
      return (
        <Modal
          title={`${edit ? 'Chỉnh sửa' : 'Thêm'} ${tab === 'categories' ? 'danh mục' : tab === 'suppliers' ? 'nhà cung cấp' : 'nhà sản xuất'}`}
          onClose={close}
        >
          <form
            onSubmit={(e) =>
              submit(
                e,
                `/admin/${tab}${edit ? `/${item.id}` : ''}`,
                edit ? 'PATCH' : 'POST',
              )
            }
          >
            <div className="adm-modal-body adm-form-grid">
              {fields([
                ['name', 'Tên', 'text', true, { wide: true }],
                ...(tab === 'categories'
                  ? [
                      ['slug', 'Mã danh mục'],
                      [
                        'description',
                        'Mô tả',
                        'textarea',
                        false,
                        { wide: true },
                      ],
                    ]
                  : tab === 'suppliers'
                    ? [
                        ['phone', 'Số điện thoại'],
                        ['email', 'Email', 'email'],
                        ['address', 'Địa chỉ', 'text', false, { wide: true }],
                      ]
                    : [['country', 'Quốc gia']]),
              ])}
              <CheckField
                name="active"
                value={form.active}
                onChange={change}
                label="Đang hoạt động"
              />
            </div>
            {footer()}
          </form>
        </Modal>
      );
    if (type === 'promotion')
      return (
        <Modal
          title={edit ? 'Chỉnh sửa khuyến mãi' : 'Tạo khuyến mãi'}
          onClose={close}
        >
          <form
            onSubmit={(e) =>
              submit(
                e,
                `/admin/promotions${edit ? `/${item.id}` : ''}`,
                edit ? 'PATCH' : 'POST',
                {
                  ...form,
                  ...Object.fromEntries(
                    ['value', 'minOrder', 'maxDiscount', 'usageLimit'].map(
                      (k) => [k, Number(form[k]) || 0],
                    ),
                  ),
                },
              )
            }
          >
            <div className="adm-modal-body adm-form-grid">
              {fields([
                ['code', 'Mã giảm giá', 'text', true],
                ['name', 'Tên khuyến mãi', 'text', true],
              ])}
              <Field label="Hình thức giảm">
                <select
                  name="type"
                  value={form.type || 'percent'}
                  onChange={change}
                >
                  <option value="percent">Theo phần trăm (%)</option>
                  <option value="fixed">Số tiền cố định (đ)</option>
                </select>
              </Field>
              {fields([
                [
                  'value',
                  form.type === 'percent'
                    ? 'Phần trăm giảm (%)'
                    : 'Số tiền giảm (đ)',
                  'number',
                  true,
                  { min: 0, max: form.type === 'percent' ? 100 : undefined },
                ],
                [
                  'minOrder',
                  'Giá trị đơn tối thiểu (đ)',
                  'number',
                  false,
                  { min: 0 },
                ],
                [
                  'maxDiscount',
                  'Giảm tối đa (đ, 0: không giới hạn)',
                  'number',
                  false,
                  { min: 0 },
                ],
                [
                  'usageLimit',
                  'Giới hạn lượt dùng',
                  'number',
                  false,
                  { min: 0 },
                ],
                ['startDate', 'Bắt đầu', 'date', true],
                ['endDate', 'Kết thúc', 'date', true],
              ])}
              <CheckField
                label="Kích hoạt khuyến mãi"
                name="active"
                value={form.active}
                onChange={change}
              />
            </div>
            {footer()}
          </form>
        </Modal>
      );
    if (type === 'receipt')
      return (
        <Modal title="Nhập kho theo lô" onClose={close}>
          <form
            onSubmit={(e) =>
              submit(e, '/admin/inventory/receipts', 'POST', {
                supplierId: Number(form.supplierId),
                items: [
                  {
                    productId: Number(form.productId),
                    batchNumber: form.batchNumber,
                    quantity: Number(form.quantity),
                    cost: Number(form.cost),
                    manufacturedAt: form.manufacturedAt,
                    expiresAt: form.expiresAt,
                  },
                ],
              })
            }
          >
            <div className="adm-modal-body">
              <div className="adm-info-banner compact">
                <Boxes size={18} />
                <p>
                  Không nhập lô đã hết hạn. Hàng xuất bán được ưu tiên theo hạn
                  dùng gần nhất (FEFO).
                </p>
              </div>
              <div className="adm-form-grid">
                <Field label="Nhà cung cấp" required wide>
                  <select
                    name="supplierId"
                    value={form.supplierId || ''}
                    onChange={change}
                    required
                  >
                    <option value="">Chọn nhà cung cấp</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Sản phẩm" required wide>
                  <select
                    name="productId"
                    value={form.productId || ''}
                    onChange={change}
                    required
                  >
                    <option value="">Chọn sản phẩm</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {fields([
                  ['batchNumber', 'Mã lô', 'text', true],
                  [
                    'quantity',
                    'Số lượng nhập',
                    'number',
                    true,
                    { min: 1, step: 1 },
                  ],
                  ['cost', 'Đơn giá nhập (đ)', 'number', true, { min: 0 }],
                  ['manufacturedAt', 'Ngày sản xuất', 'date', true],
                  ['expiresAt', 'Hạn sử dụng', 'date', true],
                ])}
              </div>
            </div>
            {footer('Xác nhận nhập kho')}
          </form>
        </Modal>
      );
    if (type === 'adjustment')
      return (
        <Modal title="Điều chỉnh tồn kho" onClose={close}>
          <form
            onSubmit={(e) =>
              submit(e, '/admin/inventory/adjustments', 'POST', {
                batchId: item.batchId,
                quantity: Number(form.quantity),
                reason: form.reason,
              })
            }
          >
            <div className="adm-modal-body">
              <p className="adm-form-intro">
                <strong>{item.productName}</strong>
                <br />
                Lô: {item.batchNumber}
              </p>
              {fields([
                [
                  'quantity',
                  'Số lượng thay đổi (+ tăng, − giảm)',
                  'number',
                  true,
                  { step: 1 },
                ],
                ['reason', 'Lý do điều chỉnh', 'textarea', true],
              ])}
            </div>
            {footer('Xác nhận điều chỉnh')}
          </form>
        </Modal>
      );
    if (type === 'invite')
      return (
        <Modal title="Thêm nhân viên" onClose={close}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                const invitation = await api('/admin/users', {
                  method: 'POST',
                  body: form,
                });
                await load(true);
                setModal({ type: 'invited', data: invitation });
              } catch (error) {
                notify(error.message, 'error');
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="adm-modal-body">
              {fields([
                ['name', 'Họ tên', 'text', true],
                ['email', 'Email nhận mã kích hoạt', 'email', true],
                ['phone', 'Số điện thoại', 'tel', false],
              ])}
              <Field label="Chức danh" required>
                <select
                  name="jobTitle"
                  value={form.jobTitle}
                  onChange={change}
                  required
                >
                  {['pharmacist', 'sales', 'warehouse'].map((title) => (
                    <option key={title} value={title}>
                      {label(title)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {footer('Tạo tài khoản')}
          </form>
        </Modal>
      );
    if (type === 'invited')
      return (
        <Modal title="Đã tạo tài khoản nhân viên" onClose={close}>
          <div className="adm-modal-body">
            <p>
              Nhân viên {item.user.name} cần nhập mã kích hoạt và đặt mật khẩu
              để đăng nhập.
            </p>
            {item.demoCode ? (
              <p>
                Mã kích hoạt demo <strong>{item.demoCode}</strong>
              </p>
            ) : (
              <p>Đã gửi mã đến {item.user.email}.</p>
            )}
            <a
              className="adm-btn"
              href={`/verify?email=${encodeURIComponent(item.user.email)}&invite=1`}
              target="_blank"
              rel="noreferrer"
            >
              Mở trang kích hoạt <ArrowUpRight size={15} />
            </a>
          </div>
        </Modal>
      );
    if (type === 'user')
      return (
        <Modal title="Chỉnh sửa tài khoản" onClose={close}>
          <form
            onSubmit={(e) =>
              submit(e, `/admin/users/${item.id}`, 'PATCH', {
                role: form.role,
                name: form.name,
                phone: form.phone,
                active: form.active,
                reason: form.reason,
                jobTitle: form.role === 'staff' ? form.jobTitle : null,
                permissions:
                  form.role !== 'customer' && Array.isArray(form.permissions)
                    ? form.permissions.filter(
                        (code) =>
                          code !== 'prescriptions' ||
                          form.jobTitle === 'pharmacist',
                      )
                    : [],
              })
            }
          >
            <div className="adm-modal-body">
              <div className="adm-profile-summary">
                <span>{item.name?.[0]}</span>
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.email}</p>
                </div>
              </div>
              {fields([
                ['name', 'Họ tên', 'text', true],
                ['phone', 'Số điện thoại', 'tel', false],
              ])}
              <Field label="Vai trò">
                <select name="role" value={form.role} onChange={change}>
                  {['customer', 'staff', 'admin'].map((r) => (
                    <option key={r} value={r}>
                      {label(r)}
                    </option>
                  ))}
                </select>
              </Field>
              {form.role === 'staff' && (
                <Field label="Chức danh">
                  <select
                    name="jobTitle"
                    value={form.jobTitle || 'sales'}
                    onChange={change}
                  >
                    {['pharmacist', 'sales', 'warehouse'].map((r) => (
                      <option key={r} value={r}>
                        {label(r)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {form.role !== 'customer' && (
                <div className="adm-permission-box">
                  <h3>Quyền thực hiện chức năng</h3>
                  <p>
                    Quyền kiểm duyệt chỉ có hiệu lực khi chức danh là dược sĩ.
                  </p>
                  <div className="adm-permission-grid">
                    {Object.entries({
                      catalog: 'Quản lý sản phẩm',
                      inventory: 'Quản lý kho',
                      orders: 'Xử lý đơn hàng',
                      prescriptions: 'Duyệt đơn thuốc',
                      promotions: 'Quản lý khuyến mãi',
                      reports: 'Xem báo cáo',
                      support: 'Hỗ trợ khách hàng',
                      users: 'Quản trị tài khoản',
                      settings: 'Cấu hình hệ thống',
                      knowledge: 'Tri thức chatbot',
                      audit: 'Nhật ký hệ thống',
                      backup: 'Sao lưu dữ liệu',
                    }).map(([key, title]) => (
                      <label className="adm-check" key={key}>
                        <input
                          type="checkbox"
                          disabled={
                            key === 'prescriptions' &&
                            form.jobTitle !== 'pharmacist'
                          }
                          checked={
                            Array.isArray(form.permissions) &&
                            form.permissions.includes(key)
                          }
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              permissions: e.target.checked
                                ? [...(f.permissions || []), key]
                                : (f.permissions || []).filter(
                                    (p) => p !== key,
                                  ),
                            }))
                          }
                        />
                        <span>{title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <CheckField
                label="Tài khoản được hoạt động"
                name="active"
                value={form.active}
                onChange={change}
              />
              {!form.active &&
                item.active &&
                fields([
                  [
                    'reason',
                    'Lý do khóa tài khoản',
                    'textarea',
                    true,
                    { minLength: 5, maxLength: 500 },
                  ],
                ])}
              <div className="adm-info-banner compact">
                <ShieldCheck size={18} />
                <p>
                  Chỉ nhân viên có chức danh dược sĩ và quyền kiểm duyệt được
                  duyệt đơn thuốc. Hệ thống bảo vệ tài khoản quản trị cuối cùng.
                </p>
              </div>
            </div>
            {footer('Cập nhật quyền')}
          </form>
        </Modal>
      );
    if (type === 'rule')
      return (
        <Modal title="Chỉnh sửa quy tắc an toàn" onClose={close}>
          <form
            onSubmit={(e) =>
              submit(e, `/admin/safety-rules/${item.id}`, 'PATCH', {
                ...form,
                keywords: String(form.keywords || '')
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean),
              })
            }
          >
            <div className="adm-modal-body">
              {fields([
                ['name', 'Tên quy tắc', 'text', true],
                [
                  'keywords',
                  'Từ khóa cảnh báo, phân cách bằng dấu phẩy',
                  'textarea',
                  true,
                ],
                [
                  'pattern',
                  'Nhóm quy tắc / biểu thức nhận diện',
                  'text',
                  false,
                ],
                ['response', 'Nội dung phản hồi an toàn', 'textarea', true],
              ])}
              <CheckField
                label="Kích hoạt quy tắc"
                name="active"
                value={form.active}
                onChange={change}
              />
            </div>
            {footer('Lưu quy tắc')}
          </form>
        </Modal>
      );
    if (type === 'knowledgeReview')
      return (
        <Modal title="Rà soát tri thức" onClose={close}>
          <form
            onSubmit={(e) =>
              submit(e, `/admin/knowledge/${item.id}/review`, 'POST', {})
            }
          >
            <div className="adm-modal-body">
              <h3>{item.title}</h3>
              <p>{item.content}</p>
              <p>Nguồn tham khảo · {item.source || 'Chưa bổ sung'}</p>
              <CheckField
                name="checkedSource"
                label="Đã đối chiếu nguồn và nội dung"
                value={form.checkedSource}
                onChange={change}
              />
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn" onClick={close}>
                Đóng
              </button>
              <button
                type="submit"
                className="adm-btn primary"
                disabled={saving || !item.source || !form.checkedSource}
              >
                Duyệt tri thức
              </button>
            </div>
          </form>
        </Modal>
      );
    if (type === 'knowledge')
      return (
        <Modal
          title={edit ? 'Chỉnh sửa tri thức' : 'Thêm tri thức chatbot'}
          onClose={close}
        >
          <form
            onSubmit={(e) =>
              submit(
                e,
                `/admin/knowledge${edit ? `/${item.id}` : ''}`,
                edit ? 'PATCH' : 'POST',
              )
            }
          >
            <div className="adm-modal-body">
              {fields([
                ['title', 'Tiêu đề', 'text', true],
                ['source', 'Nguồn tham khảo', 'text', true],
                ['keywords', 'Từ khóa, phân cách bằng dấu phẩy', 'text', true],
                ['content', 'Nội dung trả lời', 'textarea', true],
              ])}
              <CheckField
                label="Cho phép chatbot sử dụng"
                name="active"
                value={form.active}
                onChange={change}
              />
            </div>
            {footer()}
          </form>
        </Modal>
      );
    if (type === 'support')
      return (
        <Modal title="Tư vấn khách hàng" onClose={close} wide>
          <SupportChat
            key={item.id}
            item={item}
            notify={notify}
            onChanged={() => load(true)}
          />
        </Modal>
      );
    if (type === 'prescription')
      return (
        <Modal title={`Kiểm duyệt đơn thuốc #${item.id}`} onClose={close} wide>
          <form
            onSubmit={(e) =>
              submit(e, `/admin/prescriptions/${item.id}`, 'PATCH', {
                status: form.status,
                note: form.note,
                productIds: form.productIds,
              })
            }
          >
            <div className="adm-modal-body">
              <div className="adm-rx-header">
                <div>
                  <strong>
                    {item.userName || item.customerName || 'Khách hàng'}
                  </strong>
                  <small>{fmtDate(item.createdAt)}</small>
                </div>
                <Badge value={item.status} />
                <a
                  className="adm-btn small"
                  href={`/api/prescriptions/${item.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={14} />
                  Mở tệp gốc
                </a>
              </div>
              <div className="adm-rx-preview">
                {(item.mimeType || '').includes('pdf') ||
                /\.pdf$/i.test(item.originalName || item.fileName || '') ? (
                  <iframe
                    title="Nội dung đơn thuốc"
                    src={`/api/prescriptions/${item.id}/file`}
                  />
                ) : (
                  <img
                    alt="Đơn thuốc của khách hàng"
                    src={`/api/prescriptions/${item.id}/file`}
                  />
                )}
              </div>
              {item.items?.length > 0 && (
                <Table
                  columns={['Thuốc kê đơn cần đối chiếu', 'Số lượng']}
                  rows={item.items}
                >
                  {item.items.map((product) => (
                    <tr key={product.productId}>
                      <td>
                        {form.status === 'partial' &&
                        item.status === 'pending' ? (
                          <label className="adm-check">
                            <input
                              type="checkbox"
                              checked={
                                form.productIds?.includes(product.productId) ||
                                false
                              }
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setForm((current) => ({
                                  ...current,
                                  productIds: checked
                                    ? [
                                        ...(current.productIds || []),
                                        product.productId,
                                      ]
                                    : current.productIds.filter(
                                        (id) => id !== product.productId,
                                      ),
                                }));
                              }}
                            />
                            <span>{product.name}</span>
                          </label>
                        ) : (
                          <strong>{product.name}</strong>
                        )}
                      </td>
                      <td>
                        {product.quantity} · {product.unit}
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
              {item.status === 'pending' &&
              item.orderStatus === 'pending_prescription' ? (
                <>
                  <Field label="Kết quả kiểm duyệt" required>
                    <select
                      name="status"
                      value={form.status === 'pending' ? '' : form.status}
                      onChange={change}
                      required
                    >
                      <option value="">Chọn kết quả</option>
                      <option value="approved">Duyệt đơn thuốc</option>
                      {item.items?.length > 1 && (
                        <option value="partial">Duyệt một phần</option>
                      )}
                      <option value="rejected">Từ chối đơn thuốc</option>
                    </select>
                  </Field>
                  {fields([
                    [
                      'note',
                      'Ghi chú / lý do từ chối',
                      'textarea',
                      ['rejected', 'partial'].includes(form.status),
                    ],
                  ])}
                </>
              ) : (
                <div className="adm-info-banner compact">
                  <ClipboardCheck size={18} />
                  <p>
                    {item.note ||
                      item.reviewNote ||
                      (item.status === 'pending'
                        ? 'Đơn hàng đã rời bước duyệt đơn thuốc.'
                        : 'Đơn thuốc đã được kiểm duyệt.')}
                  </p>
                </div>
              )}
            </div>
            {item.status === 'pending' &&
            item.orderStatus === 'pending_prescription' ? (
              footer('Lưu kết quả kiểm duyệt')
            ) : (
              <div className="adm-modal-footer">
                <button type="button" className="adm-btn" onClick={close}>
                  Đóng
                </button>
              </div>
            )}
          </form>
        </Modal>
      );
    if (type === 'backup')
      return (
        <Modal title="Tạo bản sao lưu mã hóa" onClose={close}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                const backup = await api('/admin/backup', {
                  method: 'POST',
                  body: { passphrase: form.passphrase },
                });
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(backup)], {
                    type: 'application/json',
                  }),
                );
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = `antam-backup-${new Date().toISOString().slice(0, 10)}.json`;
                anchor.click();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
                setModal(null);
                setForm(data || {});
                notify('Đã tạo bản sao lưu mã hóa.');
              } catch (error) {
                notify(error.message, 'error');
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="adm-modal-body">
              <p>
                Dùng cùng cụm mật khẩu khi phục hồi. Lưu thư mục tệp đơn thuốc
                riêng trên máy chủ.
              </p>
              {fields([
                [
                  'passphrase',
                  'Cụm mật khẩu sao lưu',
                  'password',
                  true,
                  {
                    minLength: 12,
                    maxLength: 256,
                    autoComplete: 'new-password',
                  },
                ],
              ])}
            </div>
            {footer('Tải bản sao lưu')}
          </form>
        </Modal>
      );
    if (type === 'restore')
      return (
        <Modal title="Phục hồi dữ liệu từ bản sao lưu" onClose={close}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                await api('/admin/backup/restore', {
                  method: 'POST',
                  body: {
                    confirm: form.confirm,
                    backup: form.backup,
                    passphrase: form.passphrase,
                  },
                });
                setModal(null);
                notify('Đã phục hồi dữ liệu. Vui lòng đăng nhập lại.');
                onLogout();
              } catch (err) {
                notify(err.message, 'error');
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="adm-modal-body">
              <div className="adm-info-banner danger">
                <AlertTriangle size={22} />
                <p>
                  Thao tác này thay thế cơ sở dữ liệu hiện tại bằng bản sao lưu.
                  Phiên đăng nhập sẽ kết thúc. Tệp đơn thuốc cần được sao lưu và
                  phục hồi riêng tại máy chủ.
                </p>
              </div>
              <label className="adm-field">
                <span>Bản sao lưu JSON</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  required
                  onChange={async (e) => {
                    try {
                      const file = e.target.files[0];
                      if (!file) return;
                      const backup = JSON.parse(await file.text());
                      setForm((f) => ({ ...f, backup }));
                    } catch {
                      notify('Không đọc được tệp JSON.', 'error');
                      setForm((f) => ({ ...f, backup: null }));
                    }
                  }}
                />
              </label>
              {fields([
                [
                  'passphrase',
                  'Cụm mật khẩu sao lưu',
                  'password',
                  true,
                  { minLength: 12, maxLength: 256, autoComplete: 'off' },
                ],
              ])}
              <Field
                label="Nhập RESTORE_ANTAM để xác nhận"
                name="confirm"
                value={form.confirm}
                onChange={change}
                pattern="RESTORE_ANTAM"
                required
              />
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn" onClick={close}>
                Đóng
              </button>
              <button
                type="submit"
                className="adm-btn primary"
                disabled={
                  saving ||
                  !form.backup ||
                  !form.passphrase ||
                  form.confirm !== 'RESTORE_ANTAM'
                }
              >
                {saving ? (
                  <LoaderCircle className="adm-spin" size={16} />
                ) : (
                  <RefreshCw size={16} />
                )}
                Phục hồi dữ liệu
              </button>
            </div>
          </form>
        </Modal>
      );
    if (type === 'returnGoods') {
      const next = RETURN_GOODS_NEXT[item.status] || [];
      return (
        <Modal title={`Hàng trả về · ${item.orderCode}`} onClose={close}>
          <form
            onSubmit={(e) =>
              submit(e, `/admin/return-goods/${item.id}`, 'PATCH', {
                status: form.nextStatus,
                carrier: form.carrier,
                trackingCode: form.trackingCode,
                note: form.note,
                sealed: !!form.sealed,
              })
            }
          >
            <div className="adm-modal-body">
              <div className="adm-message-preview">
                <strong>
                  {item.orderCode} · {item.userName}
                  {item.userPhone ? ` · ${item.userPhone}` : ''}
                </strong>
                <p>Lý do trả hàng: {item.reason}</p>
                <Badge value={`return_${item.status}`} />
                <ul className="adm-return-items">
                  {(item.items || []).map((product) => (
                    <li key={product.productId}>
                      {product.name} × {product.quantity} {product.unit}
                    </li>
                  ))}
                </ul>
                <div className="adm-return-timeline">
                  {item.trackingCode && (
                    <span>
                      Vận đơn: {item.trackingCode}
                      {item.carrier ? ` (${item.carrier})` : ''}
                    </span>
                  )}
                  {item.receivedAt && (
                    <span>Nhận hàng: {dateTime(item.receivedAt)}</span>
                  )}
                  {item.inspectedAt && (
                    <span>
                      Kiểm hàng: {dateTime(item.inspectedAt)}
                      {item.handlerName ? ` · ${item.handlerName}` : ''}
                    </span>
                  )}
                  {item.note && <span>Ghi chú: {item.note}</span>}
                </div>
              </div>
              {next.length > 0 ? (
                <>
                  <Field label="Cập nhật trạng thái" required>
                    <select
                      name="nextStatus"
                      value={form.nextStatus || ''}
                      onChange={change}
                      required
                    >
                      <option value="">Chọn bước tiếp theo</option>
                      {next.map((v) => (
                        <option key={v} value={v}>
                          {RETURN_GOODS_ACTION[v]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {form.nextStatus === 'in_transit' &&
                    fields([
                      ['carrier', 'Đơn vị vận chuyển'],
                      ['trackingCode', 'Mã vận đơn', 'text', true],
                    ])}
                  {form.nextStatus === 'restocked' && (
                    <CheckField
                      label="Thuốc còn niêm phong và được bảo quản đúng"
                      name="sealed"
                      value={form.sealed}
                      onChange={change}
                    />
                  )}
                  {fields([
                    [
                      'note',
                      form.nextStatus === 'discarded'
                        ? 'Lý do loại bỏ'
                        : 'Ghi chú (không bắt buộc)',
                      'textarea',
                      form.nextStatus === 'discarded',
                    ],
                  ])}
                </>
              ) : (
                <div className="adm-info-banner compact">
                  <ClipboardCheck size={18} />
                  <p>Hàng trả về đã xử lý xong, không thể thay đổi thêm.</p>
                </div>
              )}
            </div>
            {next.length > 0 ? (
              footer('Cập nhật')
            ) : (
              <div className="adm-modal-footer">
                <button type="button" className="adm-btn" onClick={close}>
                  Đóng
                </button>
              </div>
            )}
          </form>
        </Modal>
      );
    }
    // Yêu cầu đổi trả đã duyệt nhưng hàng chưa về thì chưa được hoàn tiền.
    const waitingGoods =
      item.type === 'return' &&
      ['awaiting', 'in_transit'].includes(item.returnGoodsStatus);
    if (type === 'request')
      return (
        <Modal
          title={`Xử lý yêu cầu ${label(item.type).toLowerCase()}`}
          onClose={close}
        >
          <form
            onSubmit={(e) => {
              if (item.status === 'approved')
                submit(e, `/admin/requests/${item.id}/refund`, 'POST', {
                  amount: Number(form.amount) || item.total,
                  confirmedCash: !!form.confirmedCash,
                  confirmedTransfer: !!form.confirmedTransfer,
                  refundReference: form.refundReference || '',
                });
              else
                submit(e, `/admin/requests/${item.id}`, 'PATCH', {
                  status: form.status,
                  reply: form.reply,
                  restock: !!form.restock,
                  sealed: !!form.sealed,
                  storeFault: !!form.storeFault,
                });
            }}
          >
            <div className="adm-modal-body">
              <div className="adm-message-preview">
                <div className="adm-ord-req-head">
                  <strong>
                    {item.orderCode} · {item.userName}
                  </strong>
                  <button
                    type="button"
                    className="adm-text-btn"
                    onClick={() => orderDetail({ id: item.orderId, code: item.orderCode })}
                  >
                    Xem đơn hàng <ArrowUpRight size={14} />
                  </button>
                </div>
                <p>{item.reason}</p>
                <Badge value={item.status} />
                {item.returnGoodsStatus && (
                  <Badge value={`return_${item.returnGoodsStatus}`} />
                )}
                {item.evidenceAvailable && (
                  <a
                    className="adm-text-btn"
                    href={`/api/orders/${item.orderId}/requests/${item.id}/evidence`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Xem ảnh đổi trả <ExternalLink size={15} />
                  </a>
                )}
              </div>
              {item.status === 'pending' ? (
                <>
                  <Field label="Kết quả xử lý" required>
                    <select
                      name="status"
                      value={form.status === 'pending' ? '' : form.status}
                      onChange={change}
                      required
                    >
                      <option value="">Chọn kết quả</option>
                      <option value="approved">Chấp nhận yêu cầu</option>
                      <option value="rejected">Từ chối yêu cầu</option>
                    </select>
                  </Field>
                  {fields([
                    [
                      'reply',
                      'Phản hồi / lý do xử lý',
                      'textarea',
                      form.status === 'rejected',
                    ],
                  ])}
                  {item.type === 'return' && form.status === 'approved' && (
                    <>
                      <CheckField
                        label="Thuốc còn niêm phong và được bảo quản đúng"
                        name="sealed"
                        value={form.sealed}
                        onChange={change}
                      />
                      <CheckField
                        label="Chấp nhận đổi trả do lỗi từ nhà thuốc"
                        name="storeFault"
                        value={form.storeFault}
                        onChange={change}
                      />
                      <CheckField
                        label="Đã nhận và kiểm hàng, nhập lại kho ngay"
                        name="restock"
                        value={form.restock}
                        onChange={change}
                      />
                      <p className="field-help">
                        Nếu chưa nhận được hàng, để trống ô trên: yêu cầu sẽ
                        được theo dõi ở tab Hàng trả về cho đến khi kiểm hàng.
                      </p>
                    </>
                  )}
                </>
              ) : waitingGoods && item.status === 'approved' ? (
                <div className="adm-info-banner compact">
                  <AlertTriangle size={18} />
                  <p>
                    Chờ nhận hàng trả về trước khi hoàn tiền. Cập nhật trạng
                    thái ở tab Hàng trả về khi nhà thuốc đã nhận hàng.
                  </p>
                </div>
              ) : item.status === 'approved' &&
                ['paid', 'refund_pending'].includes(item.paymentStatus) &&
                ['cancelled', 'returned'].includes(item.orderStatus) &&
                !item.refundAmount ? (
                <>
                  <div className="adm-info-banner compact">
                    <AlertTriangle size={18} />
                    <p>
                      {item.paymentMethod === 'vnpay'
                        ? 'Hoàn tiền qua cổng VNPay Sandbox.'
                        : config?.demoMode
                          ? 'Ghi nhận hoàn tiền trong môi trường trình diễn.'
                          : 'Nhập số tiền đã hoàn cho khách hàng.'}
                    </p>
                  </div>
                  <Field
                    label={`Số tiền hoàn (tối đa ${money(item.total)})`}
                    name="amount"
                    type="number"
                    min="1"
                    max={item.total}
                    value={form.amount ?? item.total}
                    onChange={change}
                    required
                  />
                  {item.paymentMethod === 'cod' && !config?.demoMode && (
                    <CheckField
                      label="Đã hoàn tiền mặt cho khách"
                      name="confirmedCash"
                      value={form.confirmedCash}
                      onChange={change}
                    />
                  )}
                  {item.paymentMethod === 'bank_transfer' && (
                    <>
                      <Field
                        label="Mã giao dịch hoàn tiền"
                        name="refundReference"
                        value={form.refundReference || ''}
                        onChange={change}
                        minLength={6}
                        required
                      />
                      <CheckField
                        label="Đã hoàn tiền chuyển khoản cho khách"
                        name="confirmedTransfer"
                        value={form.confirmedTransfer}
                        onChange={change}
                      />
                    </>
                  )}
                </>
              ) : (
                <div className="adm-info-banner compact">
                  <ClipboardCheck size={18} />
                  <p>
                    {item.reply || 'Yêu cầu đã được xử lý.'}
                    {item.refundAmount > 0
                      ? ` Đã hoàn ${money(item.refundAmount)}.`
                      : ''}
                  </p>
                </div>
              )}
            </div>
            {item.status === 'pending' ? (
              footer('Lưu kết quả')
            ) : waitingGoods && item.status === 'approved' ? (
              <div className="adm-modal-footer">
                <button type="button" className="adm-btn" onClick={close}>
                  Đóng
                </button>
              </div>
            ) : item.status === 'approved' &&
              ['paid', 'refund_pending'].includes(item.paymentStatus) &&
              ['cancelled', 'returned'].includes(item.orderStatus) &&
              !item.refundAmount ? (
              footer('Xác nhận hoàn tiền')
            ) : (
              <div className="adm-modal-footer">
                <button type="button" className="adm-btn" onClick={close}>
                  Đóng
                </button>
              </div>
            )}
          </form>
        </Modal>
      );
    if (type === 'createOrder')
      return (
        <Modal title="Tạo đơn hàng hộ khách" onClose={close} wide>
          <CreateOrderContent
            config={config}
            onClose={close}
            notify={notify}
            onCreated={async (created) => {
              await load(true);
              open('order', created);
            }}
          />
        </Modal>
      );
    if (type === 'order')
      return (
        <Modal title={`Đơn hàng ${item.code}`} onClose={close} wide>
          <OrderDetailContent
            item={item}
            form={form}
            setForm={setForm}
            change={change}
            saving={saving}
            setSaving={setSaving}
            onClose={close}
            notify={notify}
            hasPermission={hasPermission}
            onOpenPrescription={openPrescriptionById}
            onOpenRequest={(r) => open('request', r)}
            onOrderUpdated={async (updated) => {
              setModal({ type: 'order', data: updated });
              setForm((prev) => ({
                ...prev,
                nextStatus: '',
                statusNote: '',
                collected: false,
              }));
              await load(true);
            }}
            onBankReconcile={(event) =>
              submit(event, `/admin/orders/${item.id}/bank-transfer`, 'POST', {
                amount: form.bankAmount,
                reference: form.bankReference,
                confirmed: !!form.bankConfirmed,
              })
            }
            onSubmitStatus={(e) =>
              submit(e, `/admin/orders/${item.id}/status`, 'PATCH', {
                status: form.nextStatus,
                collected: !!form.collected,
                note: form.statusNote,
                shippingCarrier: form.shippingCarrier,
                trackingCode: form.trackingCode,
              })
            }
          />
        </Modal>
      );
    return null;
  };

  return (
    <div className="at-admin">
      <aside className={`adm-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <button className="adm-brand" onClick={onExit}>
          <span className="adm-brand-icon">
            <LogoIcon size={39} />
          </span>
          <span>
            an tâm<small>QUẢN TRỊ NHÀ THUỐC</small>
          </span>
        </button>
        <div className="adm-side-label">KHÔNG GIAN LÀM VIỆC</div>
        <nav>
          {allowedNav.map(([key, Icon, title]) => (
            <button
              key={key}
              className={view === key ? 'active' : ''}
              onClick={() => go(key)}
            >
              <Icon size={19} />
              <span>{title}</span>
              {view === key && <span className="adm-nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-bottom">
          <button onClick={onExit}>
            <ArrowLeft size={17} />
            Về cửa hàng
            <ArrowUpRight size={15} />
          </button>
          <div className="adm-user">
            <span>{user?.name?.slice(0, 1) || 'M'}</span>
            <div>
              <strong>{user?.name || 'Nhân viên'}</strong>
              <small>{label(user?.role)}</small>
            </div>
            <button onClick={onLogout} aria-label="Đăng xuất">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {menuOpen && (
        <div className="adm-mobile-shade" onClick={() => setMenuOpen(false)} />
      )}
      <div className="adm-main">
        <header className="adm-topbar">
          <div className="adm-breadcrumb">
            <button
              className="adm-icon-btn adm-mobile-menu"
              onClick={() => setMenuOpen(true)}
              aria-label="Mở danh mục"
            >
              <Menu size={21} />
            </button>
            <span>Không gian quản trị</span>
            <ChevronRight size={14} />
            <strong>{TITLES[view]}</strong>
          </div>
          <div className="adm-topbar-right">
            <span className="adm-online">
              <i />
              Hệ thống đang hoạt động
            </span>
            <span className="adm-avatar">{user?.name?.slice(0, 1) || 'M'}</span>
          </div>
        </header>
        <main className="adm-content">
          <div className="adm-page-head">
            <div>
              <div className="adm-eyebrow">
                AN TÂM / {isAdmin ? 'QUẢN TRỊ VIÊN' : 'NHÂN VIÊN'}
              </div>
              <h1>{TITLES[view]}</h1>
              <p>
                {view === 'dashboard'
                  ? `Chào ${user?.name || 'bạn'}, theo dõi toàn cảnh vận hành và số liệu nhà thuốc theo thời gian thực.`
                  : view === 'orders'
                    ? 'Quản lý đơn hàng xuyên suốt từ tiếp nhận đến giao thành công.'
                    : view === 'products'
                      ? 'Thông tin sản phẩm chính xác, rõ ràng và luôn được cập nhật.'
                      : view === 'inventory'
                        ? 'Kiểm soát số lượng, lô thuốc và hạn sử dụng tại một nơi.'
                        : view === 'prescriptions'
                          ? 'Đảm bảo mỗi đơn thuốc được kiểm tra đúng chuyên môn.'
                          : 'Quản lý dữ liệu và hoạt động của nhà thuốc.'}
              </p>
            </div>
            <button
              className="adm-btn"
              onClick={() => load()}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'adm-spin' : ''} />
              <span>Làm mới</span>
            </button>
          </div>
          {error ? (
            <div className="adm-error">
              <AlertTriangle size={22} />
              <div>
                <strong>Không tải được dữ liệu</strong>
                <p>{error}</p>
              </div>
              <button className="adm-btn" onClick={() => load()}>
                Thử lại
              </button>
            </div>
          ) : loading ? (
            <div className="adm-loading">
              <LoaderCircle size={30} className="adm-spin" />
              <p>Đang tải dữ liệu nhà thuốc...</p>
            </div>
          ) : (
            (
              {
                dashboard: dashboard,
                orders: ordersView,
                prescriptions: prescriptionsView,
                products: productsView,
                inventory: inventoryView,
                catalog: catalogView,
                promotions: promotionsView,
                users: usersView,
                chatbot: chatbotView,
                reports: reportsView,
                settings: settingsView,
                audit: auditView,
              }[view] || dashboard
            )()
          )}
          <footer className="adm-footer">
            <span>© {new Date().getFullYear()} Nhà thuốc An Tâm</span>
            <span>Sức khỏe của bạn, sự tận tâm của chúng tôi.</span>
          </footer>
        </main>
      </div>
      {modalContent()}
      {toast && (
        <div className={`adm-toast ${toast.type}`} role="status">
          {toast.type === 'error' ? (
            <AlertTriangle size={20} />
          ) : (
            <Check size={20} />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Đóng thông báo">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
