import React, { useEffect, useRef, useState } from 'react';
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
  Plus,
  X,
  Check,
  ChevronRight,
  ArrowLeft,
  LogOut,
  Menu,
  LoaderCircle,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Tags,
  ExternalLink,
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
  Download,
} from 'lucide-react';
import { LogoIcon } from './Logo.jsx';
import SupportChat from './SupportChat.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AdminOrders, {
  CreateOrderContent,
  OrderDetailContent,
} from './AdminOrders.jsx';
import {
  AdminChatbot,
  AdminInventory,
  AdminPrescriptions,
} from './AdminPharmacyOps.jsx';
import {
  AdminCatalogEntities,
  AdminProducts,
  AdminPromotions,
} from './AdminCatalog.jsx';
import { AdminAudit, AdminSettings, AdminUsers } from './AdminSystem.jsx';
import {
  AUDIT_LABELS,
  CheckField,
  DEFAULT_ROLE_PERMISSIONS,
  ENTITY_LABELS,
  Field,
  Modal,
  PERMISSION_LABELS,
  VIEW_PERMISSION,
  RETURN_GOODS_NEXT,
  RETURN_GOODS_ACTION,
  formatAuditDetail,
  label,
  list,
  fmtDate,
  safeJson,
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
  ['reports', BarChart3, 'Thống kê báo cáo'],
  ['settings', Settings, 'Cấu hình', true],
  ['audit', ScrollText, 'Nhật ký hệ thống', true],
];
const TITLES = Object.fromEntries(NAV.map(([key, , name]) => [key, name]));
const SUBTITLES = {
  orders:
    'Quản lý đơn hàng xuyên suốt từ tiếp nhận, kiểm hàng đến giao thành công.',
  prescriptions:
    'Đảm bảo mỗi đơn thuốc kê đơn được kiểm tra đúng chuyên môn dược sĩ.',
  products:
    'Quản lý thông tin, giá bán, tồn kho và hiển thị danh mục sản phẩm.',
  inventory: 'Kiểm soát tồn kho theo lô, hạn dùng FEFO và lịch sử xuất nhập.',
  catalog: 'Quản lý danh mục thuốc, nhà cung cấp và nhà sản xuất đối tác.',
  promotions: 'Thiết lập mã giảm giá, hạn mức sử dụng và thời gian hiệu lực.',
  users: 'Quản lý tài khoản khách hàng, nhân sự và phân quyền theo chức danh.',
  chatbot:
    'Tiếp nhận tư vấn trực tuyến, duyệt tri thức y khoa và quy tắc an toàn.',
  reports:
    'Theo dõi doanh thu, cơ cấu đơn hàng, sản phẩm bán chạy và cảnh báo kho.',
  settings:
    'Thiết lập thông số vận hành, chính sách đổi trả, tích hợp và sao lưu.',
  audit:
    'Tra cứu chi tiết lịch sử thao tác quản trị và thay đổi dữ liệu hệ thống.',
};

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
  const hasPermission = (permission) => user?.permissions?.includes(permission);
  const canReviewKnowledge = hasPermission('prescriptions');
  const allowedNav = NAV.filter(
    ([key, , , adminOnly]) =>
      (!adminOnly || user?.role === 'admin') &&
      (hasPermission(VIEW_PERMISSION[key]) ||
        (key === 'chatbot' &&
          (hasPermission('knowledge') || canReviewKnowledge))),
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
  const [navCounts, setNavCounts] = useState(null);
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
  const refreshNavCounts = async () => {
    if (!hasPermission('reports')) return;
    try {
      const overview = await api('/admin/dashboard?days=7');
      if (overview?.queues) setNavCounts(overview.queues);
    } catch {
      // Bỏ qua nếu không tải được số đếm tổng quan.
    }
  };
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
      if (view === 'dashboard' && result?.queues) setNavCounts(result.queues);
      if (view === 'products' || view === 'inventory') {
        const safeGet = (path) => api(path).catch(() => []);
        const [p, c, s, m] = await Promise.all([
          safeGet('/admin/products'),
          hasPermission('catalog') ? safeGet('/admin/categories') : Promise.resolve([]),
          safeGet('/admin/suppliers'),
          hasPermission('catalog') ? safeGet('/admin/manufacturers') : Promise.resolve([]),
        ]);
        setProducts(list(p));
        if (hasPermission('catalog')) {
          setCategories(list(c));
          setManufacturers(list(m));
        }
        setSuppliers(list(s));
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
    const keepSilent =
      (view === 'orders' && Array.isArray(data)) ||
      (view === 'inventory' && Boolean(data?.batches));
    load(keepSilent);
  }, [view, tab]);
  useEffect(() => {
    if (view !== 'dashboard') refreshNavCounts();
  }, [view]);
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
    if (type === 'prescription')
      prepared.productIds = Array.isArray(item.approvedProductIds)
        ? [...item.approvedProductIds]
        : [];
    setForm(prepared);
    setModal({ type, data: item });
  };
  const openReceiptModal = async (prefill = {}) => {
    let prodList = products;
    let supList = suppliers;
    if (!prodList.length || !supList.length) {
      try {
        const [p, s] = await Promise.all([
          api('/admin/products'),
          api('/admin/suppliers'),
        ]);
        prodList = list(p);
        supList = list(s);
        setProducts(prodList);
        setSuppliers(supList);
      } catch {
        // Sẽ hiển thị danh sách trống nếu không tải được.
      }
    }
    const activeSupplier =
      supList.find((s) => s.active !== false)?.id || supList[0]?.id || '';
    const firstProductId = prefill.productId || prodList[0]?.id || '';
    open('receipt', prefill, {
      supplierId: prefill.supplierId || activeSupplier,
      items: [
        {
          productId: firstProductId,
          batchNumber: '',
          quantity: 10,
          cost: '',
          manufacturedAt: vnDate(0),
          expiresAt: vnDate(365),
        },
      ],
    });
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
      await Promise.all([
        load(true),
        view !== 'dashboard' ? refreshNavCounts() : Promise.resolve(),
      ]);
      return true;
    } catch (err) {
      notify(err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };
  const toggleActive = async (resource, item, nextActive) => {
    setSaving(true);
    try {
      await api(`/admin/${resource}/${item.id}`, {
        method: 'PATCH',
        body: { active: nextActive },
      });
      notify(
        nextActive ? 'Đã kích hoạt lại thành công.' : 'Đã cập nhật trạng thái.',
      );
      await Promise.all([
        load(true),
        view !== 'dashboard' ? refreshNavCounts() : Promise.resolve(),
      ]);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };
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
    <AdminPrescriptions
      rows={data}
      query={query}
      setQuery={setQuery}
      filter={filter}
      setFilter={setFilter}
      page={page}
      setPage={setPage}
      onOpenPrescription={(rx) => open('prescription', rx)}
      onOpenOrder={orderDetail}
    />
  );
  const productsView = () => (
    <AdminProducts
      rows={data}
      categories={categories}
      query={query}
      setQuery={setQuery}
      filter={filter}
      setFilter={setFilter}
      page={page}
      setPage={setPage}
      lowStockThreshold={config?.lowStockThreshold || 15}
      canManageInventory={hasPermission('inventory')}
      onOpenProduct={(item) => open('product', item)}
      onOpenReceipt={openReceiptModal}
      onOpenDelete={(item) => open('delete', item)}
      onToggleActive={toggleActive}
    />
  );
  const inventoryView = () => (
    <AdminInventory
      data={data}
      tab={tab}
      setTab={setTab}
      query={query}
      setQuery={setQuery}
      page={page}
      setPage={setPage}
      lowStockThreshold={config?.lowStockThreshold || 15}
      onOpenReceipt={openReceiptModal}
      onOpenAdjustment={(item) => open('adjustment', item)}
    />
  );
  const catalogView = () => (
    <AdminCatalogEntities
      rows={data}
      tab={tab}
      setTab={setTab}
      query={query}
      setQuery={setQuery}
      filter={filter}
      setFilter={setFilter}
      page={page}
      setPage={setPage}
      onOpenCatalog={(item) => open('catalog', item)}
      onOpenDelete={(item) => open('delete', item)}
      onToggleActive={toggleActive}
    />
  );
  const promotionsView = () => (
    <AdminPromotions
      rows={data}
      query={query}
      setQuery={setQuery}
      filter={filter}
      setFilter={setFilter}
      page={page}
      setPage={setPage}
      onOpenPromotion={(item) => open('promotion', item)}
      onOpenDelete={(item) => open('delete', item)}
      onToggleActive={toggleActive}
    />
  );
  const usersView = () => (
    <AdminUsers
      rows={data}
      currentUser={user}
      query={query}
      setQuery={setQuery}
      filter={filter}
      setFilter={setFilter}
      page={page}
      setPage={setPage}
      onInvite={(defaults) => open('invite', defaults)}
      onEditUser={(u) => open('user', u)}
    />
  );
  const chatbotView = () => (
    <AdminChatbot
      data={data}
      tab={tab}
      setTab={setTab}
      query={query}
      setQuery={setQuery}
      filter={filter}
      setFilter={setFilter}
      page={page}
      setPage={setPage}
      hasPermission={hasPermission}
      canReviewKnowledge={canReviewKnowledge}
      onOpenSupport={supportDetail}
      onOpenKnowledge={(item) => open('knowledge', item)}
      onOpenKnowledgeReview={(item) => open('knowledgeReview', item)}
      onOpenRule={(item) => open('rule', item)}
      onOpenDelete={(item) => open('delete', item)}
      onToggleActive={toggleActive}
    />
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
    <AdminSettings
      data={data}
      form={form}
      saving={saving}
      isAdmin={isAdmin}
      hasPermission={hasPermission}
      onChange={change}
      onReset={() => setForm(data || {})}
      onSubmit={(e, payload) => submit(e, '/admin/settings', 'PATCH', payload)}
      onOpenBackup={() => open('backup', { passphrase: '' })}
      onOpenRestore={() => open('restore', { confirm: '' })}
    />
  );
  const auditView = () => (
    <AdminAudit
      rows={data}
      query={query}
      setQuery={setQuery}
      filter={filter}
      setFilter={setFilter}
      page={page}
      setPage={setPage}
      onOpenDetail={(record) => open('auditDetail', record)}
    />
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
        <Modal title="Xác nhận ngừng hoạt động / ẩn dữ liệu" onClose={close}>
          <form
            onSubmit={(e) =>
              submit(e, `/admin/${item.resource}/${item.id}`, 'DELETE')
            }
          >
            <div className="adm-modal-body">
              <div className="adm-info-banner danger">
                <AlertTriangle size={22} />
                <p>
                  Bạn muốn ngừng hoạt động / ẩn{' '}
                  <strong>
                    {item.name ||
                      item.title ||
                      item.code ||
                      `bản ghi #${item.id}`}
                  </strong>
                  ? Dữ liệu lịch sử giao dịch vẫn được bảo toàn và bạn có thể
                  kích hoạt lại bất cứ lúc nào.
                </p>
              </div>
            </div>
            {footer('Xác nhận ngừng')}
          </form>
        </Modal>
      );
    if (type === 'product') {
      const numPrice = Number(form.price || 0);
      const numOldPrice = Number(form.oldPrice || 0);
      const discountPreview =
        numOldPrice > numPrice && numPrice > 0
          ? Math.round(((numOldPrice - numPrice) / numOldPrice) * 100)
          : 0;
      const oldPriceInvalid = numOldPrice > 0 && numOldPrice <= numPrice;
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
                  oldPrice:
                    Number(form.oldPrice) > 0 ? Number(form.oldPrice) : null,
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
                ['price', 'Giá bán (đ)', 'number', true, { min: 1 }],
                [
                  'oldPrice',
                  'Giá niêm yết (đ, bỏ trống nếu không giảm)',
                  'number',
                  false,
                  { min: 0 },
                ],
              ])}
              {(discountPreview > 0 || oldPriceInvalid) && (
                <div
                  className={`adm-field is-wide adm-inline-note ${oldPriceInvalid ? 'is-warn' : 'is-ok'}`}
                >
                  {oldPriceInvalid
                    ? 'Lưu ý: Giá niêm yết nên lớn hơn giá bán để hiển thị phần trăm giảm giá hợp lệ.'
                    : `Hiển thị giảm ${discountPreview}% so với giá niêm yết (${money(numOldPrice)} → ${money(numPrice)}).`}
                </div>
              )}
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
                [
                  'image',
                  'Đường dẫn ảnh (/assets/... hoặc https://...)',
                  'text',
                  false,
                  { wide: true },
                ],
              ])}
              {form.image && (
                <div className="adm-field is-wide">
                  <div className="adm-img-preview">
                    <img
                      src={form.image}
                      alt="Xem trước ảnh sản phẩm"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div>
                      <strong>Xem trước hình ảnh</strong>
                      <small>{form.image}</small>
                    </div>
                  </div>
                </div>
              )}
              {fields([
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
    }
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
    if (type === 'promotion') {
      const invalidDates =
        form.startDate && form.endDate && form.startDate > form.endDate;
      const minLimit = edit ? Math.max(1, Number(item.usedCount || 1)) : 1;
      return (
        <Modal
          title={edit ? 'Chỉnh sửa khuyến mãi' : 'Tạo khuyến mãi mới'}
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
                  code: String(form.code || '').trim().toUpperCase(),
                  value: Number(form.value),
                  minOrder: Number(form.minOrder) || 0,
                  maxDiscount:
                    Number(form.maxDiscount) > 0
                      ? Number(form.maxDiscount)
                      : null,
                  usageLimit: Number(form.usageLimit) || 100,
                },
              )
            }
          >
            <div className="adm-modal-body adm-form-grid">
              {fields([
                [
                  'code',
                  'Mã giảm giá (chữ in hoa, số, _, -)',
                  'text',
                  true,
                  { style: { textTransform: 'uppercase' } },
                ],
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
                  { min: 1, max: form.type === 'percent' ? 100 : undefined },
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
                  'Giảm tối đa (đ, bỏ trống hoặc 0: không giới hạn)',
                  'number',
                  false,
                  { min: 0 },
                ],
                [
                  'usageLimit',
                  'Giới hạn lượt dùng',
                  'number',
                  true,
                  { min: minLimit },
                ],
                ['startDate', 'Bắt đầu', 'date', true],
                ['endDate', 'Kết thúc', 'date', true],
              ])}
              {invalidDates && (
                <div className="adm-field is-wide adm-inline-note is-warn">
                  Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.
                </div>
              )}
              <CheckField
                label="Kích hoạt khuyến mãi"
                name="active"
                value={form.active}
                onChange={change}
              />
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn" onClick={close}>
                Đóng
              </button>
              <button
                className="adm-btn primary"
                disabled={saving || invalidDates}
                type="submit"
              >
                {saving ? (
                  <LoaderCircle className="adm-spin" size={16} />
                ) : (
                  <Check size={16} />
                )}{' '}
                {edit ? 'Lưu khuyến mãi' : 'Tạo khuyến mãi'}
              </button>
            </div>
          </form>
        </Modal>
      );
    }
    if (type === 'receipt') {
      const todayVn = vnDate(0);
      const activeSuppliers = suppliers.filter((s) => s.active !== false);
      const rows = Array.isArray(form.items) && form.items.length
        ? form.items
        : [
            {
              productId: products[0]?.id || '',
              batchNumber: '',
              quantity: 10,
              cost: '',
              manufacturedAt: todayVn,
              expiresAt: vnDate(365),
            },
          ];
      const updateRow = (idx, key, value) =>
        setForm((f) => ({
          ...f,
          items: rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
        }));
      const addRow = () =>
        setForm((f) => ({
          ...f,
          items: [
            ...rows,
            {
              productId: products[0]?.id || '',
              batchNumber: '',
              quantity: 10,
              cost: '',
              manufacturedAt: todayVn,
              expiresAt: vnDate(365),
            },
          ],
        }));
      const removeRow = (idx) =>
        setForm((f) => ({
          ...f,
          items: rows.filter((_, i) => i !== idx),
        }));
      const receiptTotal = rows.reduce(
        (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.cost) || 0),
        0,
      );
      const hasDateIssue = rows.some(
        (r) =>
          (r.manufacturedAt && r.manufacturedAt > todayVn) ||
          (r.expiresAt && r.expiresAt <= todayVn) ||
          (r.manufacturedAt && r.expiresAt && r.manufacturedAt >= r.expiresAt),
      );
      return (
        <Modal title="Nhập kho theo lô (nhiều mặt hàng)" onClose={close} wide>
          <form
            onSubmit={(e) =>
              submit(e, '/admin/inventory/receipts', 'POST', {
                supplierId: Number(form.supplierId),
                items: rows.map((r) => ({
                  productId: Number(r.productId),
                  batchNumber: String(r.batchNumber || '').trim(),
                  quantity: Number(r.quantity),
                  cost: Number(r.cost || 0),
                  manufacturedAt: r.manufacturedAt,
                  expiresAt: r.expiresAt,
                })),
              })
            }
          >
            <div className="adm-modal-body">
              <div className="adm-info-banner compact">
                <Boxes size={18} />
                <p>
                  Không nhập lô đã hết hạn. Hàng xuất bán tự động ưu tiên theo
                  hạn dùng gần nhất (FEFO).
                </p>
              </div>
              <Field label="Nhà cung cấp" required>
                <select
                  name="supplierId"
                  value={form.supplierId || ''}
                  onChange={change}
                  required
                >
                  <option value="">Chọn nhà cung cấp</option>
                  {activeSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="adm-receipt-rows">
                {rows.map((row, idx) => (
                  <div className="adm-receipt-row" key={idx}>
                    <div className="adm-receipt-row-head">
                      <strong>Dòng lô #{idx + 1}</strong>
                      <div className="adm-receipt-row-right">
                        <span>
                          Thành tiền:{' '}
                          <b>
                            {money(
                              (Number(row.quantity) || 0) *
                                (Number(row.cost) || 0),
                            )}
                          </b>
                        </span>
                        {rows.length > 1 && (
                          <button
                            type="button"
                            className="adm-icon-btn danger"
                            onClick={() => removeRow(idx)}
                            aria-label={`Xóa dòng ${idx + 1}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="adm-form-grid">
                      <Field label="Sản phẩm" required wide>
                        <select
                          value={row.productId || ''}
                          onChange={(e) =>
                            updateRow(idx, 'productId', e.target.value)
                          }
                          required
                        >
                          <option value="">Chọn sản phẩm</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.unit})
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field
                        label="Mã lô"
                        value={row.batchNumber}
                        onChange={(e) =>
                          updateRow(idx, 'batchNumber', e.target.value)
                        }
                        placeholder="VD: LOT-2026-01"
                        required
                      />
                      <Field
                        label="Số lượng nhập"
                        type="number"
                        min={1}
                        step={1}
                        value={row.quantity}
                        onChange={(e) =>
                          updateRow(idx, 'quantity', e.target.value)
                        }
                        required
                      />
                      <Field
                        label="Đơn giá nhập (đ)"
                        type="number"
                        min={0}
                        value={row.cost}
                        onChange={(e) => updateRow(idx, 'cost', e.target.value)}
                        required
                      />
                      <Field
                        label="Ngày sản xuất"
                        type="date"
                        max={todayVn}
                        value={row.manufacturedAt}
                        onChange={(e) =>
                          updateRow(idx, 'manufacturedAt', e.target.value)
                        }
                        required
                      />
                      <Field
                        label="Hạn sử dụng"
                        type="date"
                        value={row.expiresAt}
                        onChange={(e) =>
                          updateRow(idx, 'expiresAt', e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="adm-receipt-bar">
                <button
                  type="button"
                  className="adm-btn"
                  onClick={addRow}
                  disabled={rows.length >= 100}
                >
                  <Plus size={15} />
                  Thêm dòng lô
                </button>
                <div className="adm-receipt-total">
                  <span>Tổng giá trị phiếu nhập ({rows.length} dòng)</span>
                  <strong>{money(receiptTotal)}</strong>
                </div>
              </div>
              {hasDateIssue && (
                <div className="adm-inline-note is-warn">
                  Kiểm tra lại ngày sản xuất (≤ hôm nay) và hạn sử dụng (&gt; hôm
                  nay và lớn hơn ngày sản xuất).
                </div>
              )}
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn" onClick={close}>
                Đóng
              </button>
              <button
                className="adm-btn primary"
                disabled={saving || hasDateIssue}
                type="submit"
              >
                {saving ? (
                  <LoaderCircle className="adm-spin" size={16} />
                ) : (
                  <Check size={16} />
                )}{' '}
                Xác nhận nhập kho
              </button>
            </div>
          </form>
        </Modal>
      );
    }
    if (type === 'adjustment') {
      const curQty = Number(item.currentQuantity ?? 0);
      const reserved = Number(item.reserved ?? 0);
      const delta = Number(form.quantity || 0);
      const nextQty = curQty + delta;
      const belowReserved = nextQty < reserved;
      const invalidDelta = !Number.isSafeInteger(delta) || delta === 0;
      const shortReason = String(form.reason || '').trim().length < 5;
      return (
        <Modal title="Điều chỉnh tồn kho lô" onClose={close}>
          <form
            onSubmit={(e) =>
              submit(e, '/admin/inventory/adjustments', 'POST', {
                batchId: item.batchId,
                quantity: delta,
                reason: form.reason,
              })
            }
          >
            <div className="adm-modal-body">
              <div className="adm-adjust-summary">
                <div>
                  <strong>{item.productName}</strong>
                  <small>
                    Lô {item.batchNumber}
                    {item.expiresAt ? ` · HSD ${fmtDate(item.expiresAt)}` : ''}
                  </small>
                </div>
                <div className="adm-adjust-nums">
                  <span>
                    Hiện có: <b>{count(curQty)}</b>
                  </span>
                  <span>
                    Đang giữ: <b>{count(reserved)}</b>
                  </span>
                  <span>
                    Sau điều chỉnh:{' '}
                    <b className={belowReserved ? 'adm-red' : 'adm-green'}>
                      {count(nextQty)}
                    </b>
                  </span>
                </div>
              </div>
              {fields([
                [
                  'quantity',
                  'Số lượng thay đổi (+ tăng, − giảm)',
                  'number',
                  true,
                  { step: 1 },
                ],
                [
                  'reason',
                  'Lý do điều chỉnh (tối thiểu 5 ký tự)',
                  'textarea',
                  true,
                  { minLength: 5 },
                ],
              ])}
              {belowReserved && (
                <div className="adm-inline-note is-warn">
                  Không thể giảm tồn xuống dưới số lượng đang giữ cho đơn (
                  {count(reserved)}).
                </div>
              )}
            </div>
            <div className="adm-modal-footer">
              <button type="button" className="adm-btn" onClick={close}>
                Đóng
              </button>
              <button
                className="adm-btn primary"
                disabled={saving || belowReserved || invalidDelta || shortReason}
                type="submit"
              >
                {saving ? (
                  <LoaderCircle className="adm-spin" size={16} />
                ) : (
                  <Check size={16} />
                )}{' '}
                Xác nhận điều chỉnh
              </button>
            </div>
          </form>
        </Modal>
      );
    }
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
    if (type === 'user') {
      const isSelf = item.id === user.id;
      const curPerms = Array.isArray(form.permissions) ? form.permissions : [];
      const applyDefaultPerms = (roleVal, titleVal) => {
        const presetKey =
          roleVal === 'admin'
            ? 'admin'
            : roleVal === 'staff'
              ? titleVal || 'sales'
              : 'customer';
        return [...(DEFAULT_ROLE_PERMISSIONS[presetKey] || [])];
      };
      return (
        <Modal title="Chỉnh sửa tài khoản & phân quyền" onClose={close}>
          <form
            onSubmit={(e) =>
              submit(e, `/admin/users/${item.id}`, 'PATCH', {
                role: form.role,
                name: form.name,
                phone: form.phone,
                active: isSelf ? true : form.active,
                reason: form.reason,
                jobTitle: form.role === 'staff' ? form.jobTitle || 'sales' : null,
                permissions:
                  form.role !== 'customer'
                    ? curPerms.filter(
                        (code) =>
                          code !== 'prescriptions' ||
                          (form.role === 'staff' &&
                            form.jobTitle === 'pharmacist'),
                      )
                    : [],
              })
            }
          >
            <div className="adm-modal-body">
              <div className="adm-profile-summary">
                <span>{item.name?.[0] || 'A'}</span>
                <div>
                  <strong>
                    {item.name}
                    {isSelf ? ' (Tài khoản của bạn)' : ''}
                  </strong>
                  <p>{item.email}</p>
                </div>
              </div>
              {fields([
                ['name', 'Họ tên', 'text', true],
                ['phone', 'Số điện thoại', 'tel', false],
              ])}
              <Field label="Vai trò">
                <select
                  name="role"
                  value={form.role}
                  disabled={isSelf}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setForm((f) => {
                      const nextTitle =
                        nextRole === 'staff' ? f.jobTitle || 'sales' : null;
                      const prevPerms = Array.isArray(f.permissions)
                        ? f.permissions
                        : [];
                      const nextPerms =
                        nextRole === 'customer'
                          ? []
                          : prevPerms.length === 0
                            ? applyDefaultPerms(nextRole, nextTitle)
                            : prevPerms.filter(
                                (p) =>
                                  p !== 'prescriptions' ||
                                  (nextRole === 'staff' &&
                                    nextTitle === 'pharmacist'),
                              );
                      return {
                        ...f,
                        role: nextRole,
                        jobTitle: nextTitle,
                        permissions: nextPerms,
                      };
                    });
                  }}
                >
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
                    onChange={(e) => {
                      const nextTitle = e.target.value;
                      setForm((f) => ({
                        ...f,
                        jobTitle: nextTitle,
                        permissions:
                          nextTitle === 'pharmacist'
                            ? f.permissions || []
                            : (f.permissions || []).filter(
                                (p) => p !== 'prescriptions',
                              ),
                      }));
                    }}
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
                  <div className="adm-permission-head">
                    <div>
                      <h3>Quyền thực hiện chức năng</h3>
                      <p>
                        Quyền duyệt đơn thuốc chỉ áp dụng khi chức danh là dược
                        sĩ.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="adm-btn small"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          permissions: applyDefaultPerms(f.role, f.jobTitle),
                        }))
                      }
                    >
                      Quyền mặc định
                    </button>
                  </div>
                  <div className="adm-permission-grid">
                    {Object.entries(PERMISSION_LABELS).map(([key, title]) => {
                      const lockedSelfUsers = isSelf && key === 'users';
                      const lockedRx =
                        key === 'prescriptions' &&
                        (form.role !== 'staff' ||
                          form.jobTitle !== 'pharmacist');
                      return (
                        <label
                          className={`adm-check ${lockedSelfUsers || lockedRx ? 'is-disabled' : ''}`}
                          key={key}
                        >
                          <input
                            type="checkbox"
                            disabled={lockedSelfUsers || lockedRx}
                            checked={curPerms.includes(key)}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                permissions: e.target.checked
                                  ? [...new Set([...(f.permissions || []), key])]
                                  : (f.permissions || []).filter(
                                      (p) => p !== key,
                                    ),
                              }))
                            }
                          />
                          <span>{title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <CheckField
                label="Tài khoản được hoạt động"
                name="active"
                value={form.active}
                disabled={isSelf}
                hint={
                  isSelf
                    ? 'Không thể tự khóa tài khoản quản trị đang đăng nhập.'
                    : undefined
                }
                onChange={change}
              />
              {!isSelf &&
                !form.active &&
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
            {footer('Cập nhật tài khoản')}
          </form>
        </Modal>
      );
    }
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
    if (type === 'prescription') {
      const canReview =
        item.status === 'pending' && item.orderStatus === 'pending_prescription';
      const rxItems = Array.isArray(item.items) ? item.items : [];
      const selectedIds = Array.isArray(form.productIds) ? form.productIds : [];
      const approvedIds = Array.isArray(item.approvedProductIds)
        ? item.approvedProductIds
        : [];
      const partialInvalid =
        form.status === 'partial' &&
        (selectedIds.length === 0 || selectedIds.length >= rxItems.length);
      return (
        <Modal title={`Kiểm duyệt đơn thuốc #${item.id}`} onClose={close} wide>
          <form
            onSubmit={(e) =>
              submit(e, `/admin/prescriptions/${item.id}`, 'PATCH', {
                status: form.status,
                note: form.note,
                productIds: selectedIds,
              })
            }
          >
            <div className="adm-modal-body">
              <div className="adm-rx-header">
                <div>
                  <strong>
                    {item.userName || item.customerName || 'Khách hàng'}
                    {item.userPhone ? ` · ${item.userPhone}` : ''}
                  </strong>
                  <small>
                    Tải lên {dateTime(item.createdAt)}
                    {item.orderTotal ? ` · Tổng đơn ${money(item.orderTotal)}` : ''}
                  </small>
                </div>
                <Badge value={item.status}>
                  {item.status === 'pending' ? 'Chờ duyệt' : undefined}
                </Badge>
                {item.orderId && (
                  <button
                    type="button"
                    className="adm-btn small"
                    onClick={() =>
                      orderDetail({ id: item.orderId, code: item.orderCode })
                    }
                  >
                    Đơn {item.orderCode || `#${item.orderId}`}
                    <ArrowUpRight size={14} />
                  </button>
                )}
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
              {rxItems.length > 0 && (
                <Table
                  columns={[
                    'Thuốc kê đơn cần đối chiếu',
                    'Số lượng',
                    ...(item.status === 'partial' ? ['Kết quả'] : []),
                  ]}
                  rows={rxItems}
                >
                  {rxItems.map((product) => (
                    <tr key={product.productId}>
                      <td>
                        {form.status === 'partial' && canReview ? (
                          <label className="adm-check">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(product.productId)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setForm((current) => {
                                  const prev = Array.isArray(current.productIds)
                                    ? current.productIds
                                    : [];
                                  return {
                                    ...current,
                                    productIds: checked
                                      ? [
                                          ...new Set([
                                            ...prev,
                                            product.productId,
                                          ]),
                                        ]
                                      : prev.filter(
                                          (id) => id !== product.productId,
                                        ),
                                  };
                                });
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
                      {item.status === 'partial' && (
                        <td>
                          <Badge
                            value={
                              approvedIds.includes(product.productId)
                                ? 'approved'
                                : 'rejected'
                            }
                          >
                            {approvedIds.includes(product.productId)
                              ? 'Được duyệt'
                              : 'Không duyệt'}
                          </Badge>
                        </td>
                      )}
                    </tr>
                  ))}
                </Table>
              )}
              {canReview ? (
                <>
                  <Field label="Kết quả kiểm duyệt" required>
                    <select
                      name="status"
                      value={form.status === 'pending' ? '' : form.status}
                      onChange={(e) => {
                        const nextStatus = e.target.value;
                        setForm((f) => ({
                          ...f,
                          status: nextStatus,
                          productIds:
                            nextStatus === 'partial'
                              ? Array.isArray(f.productIds)
                                ? f.productIds
                                : []
                              : f.productIds,
                        }));
                      }}
                      required
                    >
                      <option value="">Chọn kết quả</option>
                      <option value="approved">Duyệt toàn bộ đơn thuốc</option>
                      {rxItems.length > 1 && (
                        <option value="partial">Duyệt một phần</option>
                      )}
                      <option value="rejected">Từ chối đơn thuốc</option>
                    </select>
                  </Field>
                  { form.status === 'partial' && (
                    <div
                      className={`adm-inline-note ${partialInvalid ? 'is-warn' : 'is-ok'}`}
                    >
                      Đã chọn {selectedIds.length} / {rxItems.length} thuốc kê
                      đơn. Khi duyệt một phần, cần chọn ít nhất 1 và ít hơn toàn
                      bộ danh sách thuốc kê đơn.
                    </div>
                  )}
                  <div className="adm-quick-notes">
                    <span>Mẫu ghi chú GPP:</span>
                    {[
                      [
                        'Đúng chỉ định',
                        'Đơn thuốc hợp lệ, đã đối chiếu khớp hoạt chất, hàm lượng và số lượng chỉ định.',
                      ],
                      [
                        'Duyệt một phần',
                        'Chỉ duyệt thuốc có trong toa bác sĩ; các thuốc kê đơn còn lại chưa có chỉ định trên đơn.',
                      ],
                      [
                        'Ảnh mờ / thiếu thông tin',
                        'Ảnh đơn thuốc bị mờ hoặc thiếu chữ ký bác sĩ / ngày kê đơn. Vui lòng tải lại ảnh rõ nét.',
                      ],
                    ].map(([labelTxt, noteTxt]) => (
                      <button
                        key={labelTxt}
                        type="button"
                        className="adm-quick-chip"
                        onClick={() =>
                          setForm((f) => ({ ...f, note: noteTxt }))
                        }
                      >
                        {labelTxt}
                      </button>
                    ))}
                  </div>
                  {fields([
                    [
                      'note',
                      'Ghi chú / lý do từ chối (tối thiểu 5 ký tự nếu từ chối hoặc duyệt một phần)',
                      'textarea',
                      ['rejected', 'partial'].includes(form.status),
                    ],
                  ])}
                </>
              ) : (
                <div className="adm-info-banner compact">
                  <ClipboardCheck size={18} />
                  <p>
                    {item.reviewerName
                      ? `Người duyệt: ${item.reviewerName} (${dateTime(item.reviewedAt)}). `
                      : ''}
                    {item.note ||
                      item.reviewNote ||
                      (item.status === 'pending'
                        ? 'Đơn hàng đã rời bước duyệt đơn thuốc.'
                        : 'Đơn thuốc đã được kiểm duyệt.')}
                  </p>
                </div>
              )}
            </div>
            {canReview ? (
              <div className="adm-modal-footer">
                <button type="button" className="adm-btn" onClick={close}>
                  Đóng
                </button>
                <button
                  className="adm-btn primary"
                  disabled={saving || partialInvalid || !form.status || form.status === 'pending'}
                  type="submit"
                >
                  {saving ? (
                    <LoaderCircle className="adm-spin" size={16} />
                  ) : (
                    <Check size={16} />
                  )}{' '}
                  Lưu kết quả kiểm duyệt
                </button>
              </div>
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
    if (type === 'auditDetail') {
      let formattedDetail = String(item.detail || '');
      try {
        if (
          formattedDetail.trim().startsWith('{') ||
          formattedDetail.trim().startsWith('[')
        ) {
          formattedDetail = JSON.stringify(JSON.parse(formattedDetail), null, 2);
        }
      } catch {
        // Giữ nguyên chuỗi gốc nếu không phải JSON hợp lệ.
      }
      return (
        <Modal title="Chi tiết nhật ký hệ thống" onClose={close}>
          <div className="adm-modal-body">
            <div className="adm-audit-meta">
              <div>
                <span>Hành động</span>
                <strong>{AUDIT_LABELS[item.action] || item.action}</strong>
                <small>
                  <code>{item.action}</code>
                </small>
              </div>
              <div>
                <span>Thời gian</span>
                <strong>{dateTime(item.createdAt)}</strong>
              </div>
              <div>
                <span>Người thực hiện</span>
                <strong>
                  {item.userName || item.actorName || 'Hệ thống'}
                  {item.userId ? ` (#${item.userId})` : ''}
                </strong>
              </div>
              <div>
                <span>Đối tượng</span>
                <strong>
                  {ENTITY_LABELS[item.entity] || item.entity || 'Hệ thống'}
                  {item.entityId ? ` #${item.entityId}` : ''}
                </strong>
              </div>
            </div>
            <div className="adm-audit-summary">
              <span>Tóm tắt:</span> {formatAuditDetail(item.detail)}
            </div>
            <pre className="adm-audit-json">{formattedDetail || '—'}</pre>
          </div>
          <div className="adm-modal-footer">
            <button type="button" className="adm-btn" onClick={close}>
              Đóng
            </button>
          </div>
        </Modal>
      );
    }
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
                anchor.download = `antam-backup-${vnDate(0)}.json`;
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
          {allowedNav.map(([key, Icon, title]) => {
            const badgeCount = navCounts
              ? key === 'orders'
                ? (navCounts.waitingConfirmOrders || 0) +
                  (navCounts.pendingRequests?.total || 0)
                : key === 'prescriptions'
                  ? navCounts.pendingPrescriptions || 0
                  : key === 'inventory'
                    ? (navCounts.expiredBatches || 0) +
                      (navCounts.expiringBatches || 0) +
                      (navCounts.lowStockProducts || 0)
                    : key === 'chatbot'
                      ? navCounts.openSupport || 0
                      : 0
              : 0;
            const badgeTitle =
              badgeCount > 0
                ? key === 'orders'
                  ? `${badgeCount} đơn hàng / yêu cầu chờ xử lý`
                  : key === 'prescriptions'
                    ? `${badgeCount} đơn thuốc chờ dược sĩ kiểm duyệt`
                    : key === 'inventory'
                      ? `${badgeCount} cảnh báo kho cần xử lý (hết hạn, sắp hết hạn, sắp hết hàng)`
                      : key === 'chatbot'
                        ? `${badgeCount} yêu cầu tư vấn dược sĩ đang mở`
                        : undefined
                : undefined;
            return (
              <button
                key={key}
                className={view === key ? 'active' : ''}
                onClick={() => go(key)}
                title={badgeTitle}
              >
                <Icon size={19} />
                <span>{title}</span>
                {badgeCount > 0 ? (
                  <span className="adm-nav-badge" title={badgeTitle}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                ) : (
                  view === key && <span className="adm-nav-dot" />
                )}
              </button>
            );
          })}
        </nav>
        <div className="adm-sidebar-bottom">
          <button onClick={onExit}>
            <ArrowLeft size={17} />
            Về cửa hàng
            <ArrowUpRight size={15} />
          </button>
          <div className="adm-user">
            <span>{user?.name?.slice(0, 1) || 'A'}</span>
            <div>
              <strong>{user?.name || 'Nhân viên'}</strong>
              <small>
                {user?.jobTitle ? label(user.jobTitle) : label(user?.role)}
              </small>
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
            <span className="adm-avatar">{user?.name?.slice(0, 1) || 'A'}</span>
          </div>
        </header>
        <main className="adm-content">
          <div className="adm-page-head">
            <div>
              <div className="adm-eyebrow">
                AN TÂM / {isAdmin ? 'QUẢN TRỊ VIÊN' : label(user?.jobTitle || 'staff').toUpperCase()}
              </div>
              <h1>{TITLES[view]}</h1>
              <p>
                {view === 'dashboard'
                  ? `Chào ${user?.name || 'bạn'}, theo dõi toàn cảnh vận hành và số liệu nhà thuốc theo thời gian thực.`
                  : SUBTITLES[view] ||
                    'Quản lý dữ liệu và hoạt động của nhà thuốc.'}
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
