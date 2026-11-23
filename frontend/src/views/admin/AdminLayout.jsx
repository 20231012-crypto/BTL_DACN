/**
 * Admin Layout Shell View powered by useAdminController.
 */
import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Check,
  ChevronRight,
  ClipboardCheck,
  Layers,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  RefreshCw,
  ScrollText,
  Settings,
  ShoppingBag,
  Tags,
  TicketPercent,
  Users,
  X,
} from 'lucide-react';
import { ADMIN_SUBTITLES, adminLabel } from '../../models/constants.js';
import { fmtDate, money, paymentShortLabel, safeJson } from '../../models/formatters.js';
import { useAdminController } from '../../controllers/admin/useAdminController.js';
import { LogoIcon } from '../components/Logo.jsx';
import AdminAuditView from './AdminAuditView.jsx';
import AdminCatalogEntitiesView from './AdminCatalogEntitiesView.jsx';
import AdminChatbotView from './AdminChatbotView.jsx';
import AdminCombosView from './AdminCombosView.jsx';
import AdminDashboardView from './AdminDashboardView.jsx';
import AdminInventoryView from './AdminInventoryView.jsx';
import AdminModals from './AdminModals.jsx';
import AdminOrdersView from './AdminOrdersView.jsx';
import AdminPrescriptionsView from './AdminPrescriptionsView.jsx';
import AdminProductsView from './AdminProductsView.jsx';
import AdminPromotionsView from './AdminPromotionsView.jsx';
import AdminReportsView from './AdminReportsView.jsx';
import AdminSettingsView from './AdminSettingsView.jsx';
import AdminUsersView from './AdminUsersView.jsx';
import { Badge, Table } from './adminUi.jsx';
import '../../styles/admin.css';

const ADMIN_NAV = [
  ['dashboard', LayoutDashboard, 'Tổng quan'],
  ['orders', ShoppingBag, 'Đơn hàng'],
  ['prescriptions', ClipboardCheck, 'Duyệt đơn thuốc'],
  ['products', Package, 'Sản phẩm'],
  ['combos', Layers, 'Combo sản phẩm'],
  ['inventory', Boxes, 'Kho & lô thuốc'],
  ['catalog', Tags, 'Danh mục & đối tác'],
  ['promotions', TicketPercent, 'Khuyến mãi'],
  ['users', Users, 'Tài khoản', true],
  ['chatbot', MessageSquare, 'Tư vấn & chatbot'],
  ['reports', BarChart3, 'Thống kê báo cáo'],
  ['settings', Settings, 'Cấu hình', true],
  ['audit', ScrollText, 'Nhật ký hệ thống', true],
];
const ADMIN_TITLES = Object.fromEntries(
  ADMIN_NAV.map(([key, , name]) => [key, name]),
);

export default function AdminLayout({ user, onExit, onLogout, config }) {
  const c = useAdminController({ user, onLogout, navItems: ADMIN_NAV });

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
              <button className="adm-code" onClick={() => c.orderDetail(o)}>
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
                onClick={() => c.orderDetail(o)}
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

  const views = {
    dashboard: () => (
      <AdminDashboardView
        data={c.data}
        dashDays={c.dashDays}
        refreshing={c.dashRefreshing}
        onChangeDays={c.changeDashDays}
        onNavigate={c.go}
        orderTable={orderTable}
        hasPermission={c.hasPermission}
        isAdmin={c.isAdmin}
      />
    ),
    orders: () => (
      <AdminOrdersView
        orders={c.data}
        requests={c.orderRequests}
        returnGoods={c.returnGoods}
        tab={c.tab}
        setTab={c.setTab}
        query={c.query}
        setQuery={c.setQuery}
        filter={c.filter}
        setFilter={c.setFilter}
        page={c.page}
        setPage={c.setPage}
        onOpenOrder={c.orderDetail}
        onOpenRequest={(r) => c.open('request', r)}
        onOpenReturnGoods={(g) => c.open('returnGoods', g)}
        onOpenPrescription={c.openPrescriptionById}
        onOpenCreateOrder={() => c.open('createOrder', {})}
        onReload={c.load}
        notify={c.notify}
        hasPermission={c.hasPermission}
      />
    ),
    prescriptions: () => (
      <AdminPrescriptionsView
        rows={c.data}
        query={c.query}
        setQuery={c.setQuery}
        filter={c.filter}
        setFilter={c.setFilter}
        page={c.page}
        setPage={c.setPage}
        onOpenPrescription={(rx) => c.open('prescription', rx)}
        onOpenOrder={c.orderDetail}
      />
    ),
    products: () => (
      <AdminProductsView
        rows={c.data}
        categories={c.categories}
        query={c.query}
        setQuery={c.setQuery}
        filter={c.filter}
        setFilter={c.setFilter}
        page={c.page}
        setPage={c.setPage}
        lowStockThreshold={config?.lowStockThreshold || 15}
        canManageInventory={c.hasPermission('inventory')}
        onOpenProduct={(item) => c.open('product', item)}
        onOpenReceipt={c.openReceiptModal}
        onOpenDelete={(item) => c.open('delete', item)}
        onToggleActive={c.toggleActive}
      />
    ),
    combos: () => (
      <AdminCombosView
        rows={c.data}
        query={c.query}
        setQuery={c.setQuery}
        filter={c.filter}
        setFilter={c.setFilter}
        page={c.page}
        setPage={c.setPage}
        onOpenCombo={(item) => c.open('combo', item)}
        onOpenDelete={(item) => c.open('delete', item)}
        onToggleActive={c.toggleActive}
      />
    ),
    inventory: () => (
      <AdminInventoryView
        data={c.data}
        tab={c.tab}
        setTab={c.setTab}
        query={c.query}
        setQuery={c.setQuery}
        page={c.page}
        setPage={c.setPage}
        lowStockThreshold={config?.lowStockThreshold || 15}
        onOpenReceipt={c.openReceiptModal}
        onOpenAdjustment={(item) => c.open('adjustment', item)}
      />
    ),
    catalog: () => (
      <AdminCatalogEntitiesView
        rows={c.data}
        tab={c.tab}
        setTab={c.setTab}
        query={c.query}
        setQuery={c.setQuery}
        filter={c.filter}
        setFilter={c.setFilter}
        page={c.page}
        setPage={c.setPage}
        onOpenCatalog={(item) => c.open('catalog', item)}
        onOpenDelete={(item) => c.open('delete', item)}
        onToggleActive={c.toggleActive}
      />
    ),
    promotions: () => (
      <AdminPromotionsView
        rows={c.data}
        query={c.query}
        setQuery={c.setQuery}
        filter={c.filter}
        setFilter={c.setFilter}
        page={c.page}
        setPage={c.setPage}
        onOpenPromotion={(item) => c.open('promotion', item)}
        onOpenDelete={(item) => c.open('delete', item)}
        onToggleActive={c.toggleActive}
      />
    ),
    users: () => (
      <AdminUsersView
        rows={c.data}
        currentUser={user}
        query={c.query}
        setQuery={c.setQuery}
        filter={c.filter}
        setFilter={c.setFilter}
        page={c.page}
        setPage={c.setPage}
        onInvite={(defaults) => c.open('invite', defaults)}
        onEditUser={(u) => c.open('user', u)}
      />
    ),
    chatbot: () => (
      <AdminChatbotView
        data={c.data}
        tab={c.tab}
        setTab={c.setTab}
        query={c.query}
        setQuery={c.setQuery}
        filter={c.filter}
        setFilter={c.setFilter}
        page={c.page}
        setPage={c.setPage}
        hasPermission={c.hasPermission}
        canReviewKnowledge={c.canReviewKnowledge}
        onOpenSupport={c.supportDetail}
        onOpenKnowledge={(item) => c.open('knowledge', item)}
        onOpenKnowledgeReview={(item) => c.open('knowledgeReview', item)}
        onOpenRule={(item) => c.open('rule', item)}
        onOpenDelete={(item) => c.open('delete', item)}
        onToggleActive={c.toggleActive}
      />
    ),
    reports: () => (
      <AdminReportsView
        data={c.data}
        range={c.range}
        setRange={c.setRange}
        onApplyPreset={c.applyReportsPreset}
        onReload={c.load}
        hasPermission={c.hasPermission}
        onNavigate={c.go}
      />
    ),
    settings: () => (
      <AdminSettingsView
        data={c.data}
        form={c.form}
        saving={c.saving}
        isAdmin={c.isAdmin}
        hasPermission={c.hasPermission}
        onChange={c.change}
        onReset={() => c.setForm(c.data || {})}
        onSubmit={(e, payload) =>
          c.submit(e, '/admin/settings', 'PATCH', payload)
        }
        onOpenBackup={() => c.open('backup', { passphrase: '' })}
        onOpenRestore={() => c.open('restore', { confirm: '' })}
      />
    ),
    audit: () => (
      <AdminAuditView
        rows={c.data}
        query={c.query}
        setQuery={c.setQuery}
        filter={c.filter}
        setFilter={c.setFilter}
        page={c.page}
        setPage={c.setPage}
        onOpenDetail={(record) => c.open('auditDetail', record)}
      />
    ),
  };

  return (
    <div className="at-admin">
      <aside className={`adm-sidebar ${c.menuOpen ? 'is-open' : ''}`}>
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
          {c.allowedNav.map(([key, Icon, title]) => {
            const badgeCount = c.navCounts
              ? key === 'orders'
                ? (c.navCounts.waitingConfirmOrders || 0) +
                  (c.navCounts.pendingRequests?.total || 0)
                : key === 'prescriptions'
                  ? c.navCounts.pendingPrescriptions || 0
                  : key === 'inventory'
                    ? (c.navCounts.expiredBatches || 0) +
                      (c.navCounts.expiringBatches || 0) +
                      (c.navCounts.lowStockProducts || 0)
                    : key === 'chatbot'
                      ? c.navCounts.openSupport || 0
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
                className={c.view === key ? 'active' : ''}
                onClick={() => c.go(key)}
                title={badgeTitle}
              >
                <Icon size={19} />
                <span>{title}</span>
                {badgeCount > 0 ? (
                  <span className="adm-nav-badge" title={badgeTitle}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                ) : (
                  c.view === key && <span className="adm-nav-dot" />
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
                {user?.jobTitle
                  ? adminLabel(user.jobTitle)
                  : adminLabel(user?.role)}
              </small>
            </div>
            <button onClick={onLogout} aria-label="Đăng xuất">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {c.menuOpen && (
        <div
          className="adm-mobile-shade"
          onClick={() => c.setMenuOpen(false)}
        />
      )}
      <div className="adm-main">
        <header className="adm-topbar">
          <div className="adm-breadcrumb">
            <button
              className="adm-icon-btn adm-mobile-menu"
              onClick={() => c.setMenuOpen(true)}
              aria-label="Mở danh mục"
            >
              <Menu size={21} />
            </button>
            <span>Không gian quản trị</span>
            <ChevronRight size={14} />
            <strong>{ADMIN_TITLES[c.view]}</strong>
          </div>
          <div className="adm-topbar-right">
            <span className="adm-online">
              <i />
              Hệ thống đang hoạt động
            </span>
            <span className="adm-avatar">
              {user?.name?.slice(0, 1) || 'A'}
            </span>
          </div>
        </header>
        <main className="adm-content">
          <div className="adm-page-head">
            <div>
              <div className="adm-eyebrow">
                AN TÂM /{' '}
                {c.isAdmin
                  ? 'QUẢN TRỊ VIÊN'
                  : adminLabel(user?.jobTitle || 'staff').toUpperCase()}
              </div>
              <h1>{ADMIN_TITLES[c.view]}</h1>
              <p>
                {c.view === 'dashboard'
                  ? `Chào ${user?.name || 'bạn'}, theo dõi toàn cảnh vận hành và số liệu nhà thuốc theo thời gian thực.`
                  : ADMIN_SUBTITLES[c.view] ||
                    'Quản lý dữ liệu và hoạt động của nhà thuốc.'}
              </p>
            </div>
            <button
              className="adm-btn"
              onClick={() => c.load()}
              disabled={c.loading}
            >
              <RefreshCw size={16} className={c.loading ? 'adm-spin' : ''} />
              <span>Làm mới</span>
            </button>
          </div>
          {c.error ? (
            <div className="adm-error">
              <AlertTriangle size={22} />
              <div>
                <strong>Không tải được dữ liệu</strong>
                <p>{c.error}</p>
              </div>
              <button className="adm-btn" onClick={() => c.load()}>
                Thử lại
              </button>
            </div>
          ) : c.loading ? (
            <div className="adm-loading">
              <LoaderCircle size={30} className="adm-spin" />
              <p>Đang tải dữ liệu nhà thuốc...</p>
            </div>
          ) : (
            (views[c.view] || views.dashboard)()
          )}
          <footer className="adm-footer">
            <span>© {new Date().getFullYear()} Nhà thuốc An Tâm</span>
            <span>Sức khỏe của bạn, sự tận tâm của chúng tôi.</span>
          </footer>
        </main>
      </div>
      <AdminModals c={c} user={user} config={config} />
      {c.toast && (
        <div className={`adm-toast ${c.toast.type}`} role="status">
          {c.toast.type === 'error' ? (
            <AlertTriangle size={20} />
          ) : (
            <Check size={20} />
          )}
          <span>{c.toast.message}</span>
          <button onClick={c.clearToast} aria-label="Đóng thông báo">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
