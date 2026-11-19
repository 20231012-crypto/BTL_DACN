import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Boxes,
  Check,
  Clock,
  Download,
  Eye,
  LoaderCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { searchScore } from '../../shared/search.js';
import Pagination from './Pagination.jsx';
import { dateTime } from './lib.js';
import {
  AUDIT_LABELS,
  Badge,
  CheckField,
  ENTITY_LABELS,
  Field,
  FilterChips,
  KpiGrid,
  PERMISSION_LABELS,
  Table,
  count,
  formatAuditDetail,
  label,
  list,
  vnDate,
} from './adminUi.jsx';

export function AdminUsers({
  rows,
  currentUser,
  query,
  setQuery,
  filter,
  setFilter,
  page,
  setPage,
  onInvite,
  onEditUser,
}) {
  const all = list(rows);
  const adminCount = all.filter((u) => u.role === 'admin').length;
  const staffCount = all.filter((u) => u.role === 'staff').length;
  const customerCount = all.filter((u) => u.role === 'customer').length;
  const inactiveCount = all.filter((u) => !u.active).length;
  const unverifiedCount = all.filter((u) => !u.verified).length;

  const kpiCards = [
    {
      key: 'all',
      label: 'Tổng tài khoản',
      value: count(all.length),
      sub: `${count(all.filter((u) => u.active).length)} đang hoạt động`,
      Icon: Users,
      tone: 'tone-0',
      active: !filter,
      onClick: () => setFilter(''),
    },
    {
      key: 'admin',
      label: 'Quản trị viên',
      value: count(adminCount),
      sub: 'Toàn quyền điều hành hệ thống',
      Icon: ShieldCheck,
      tone: 'tone-3',
      active: filter === 'admin',
      onClick: () => setFilter(filter === 'admin' ? '' : 'admin'),
    },
    {
      key: 'staff',
      label: 'Nhân viên nhà thuốc',
      value: count(staffCount),
      sub: 'Dược sĩ, bán hàng, thủ kho',
      Icon: UserCheck,
      tone: 'tone-1',
      active: filter === 'staff',
      onClick: () => setFilter(filter === 'staff' ? '' : 'staff'),
    },
    {
      key: 'customer',
      label: 'Khách hàng',
      value: count(customerCount),
      sub: 'Tài khoản mua sắm & tư vấn',
      Icon: Users,
      tone: 'tone-0',
      active: filter === 'customer',
      onClick: () => setFilter(filter === 'customer' ? '' : 'customer'),
    },
    {
      key: 'attention',
      label: 'Chờ kích hoạt / Bị khóa',
      value: count(unverifiedCount + inactiveCount),
      sub: `${count(unverifiedCount)} chờ kích hoạt · ${count(inactiveCount)} đang khóa`,
      Icon: AlertTriangle,
      tone: 'tone-2',
      active: filter === 'attention',
      onClick: () => setFilter(filter === 'attention' ? '' : 'attention'),
    },
  ];

  const filteredRows = all.filter((u) => {
    if (filter === 'customer' && u.role !== 'customer') return false;
    if (filter === 'staff' && u.role !== 'staff') return false;
    if (filter === 'admin' && u.role !== 'admin') return false;
    if (filter === 'active' && !u.active) return false;
    if (filter === 'inactive' && u.active) return false;
    if (filter === 'unverified' && u.verified) return false;
    if (filter === 'attention' && u.active && u.verified) return false;
    if (!query) return true;
    const hay = [
      u.name,
      u.email,
      u.phone,
      label(u.role),
      label(u.jobTitle),
      `#${u.id}`,
    ]
      .filter(Boolean)
      .join(' ');
    return searchScore(hay, query) > 0;
  });

  const perPage = 15;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const visible = filteredRows.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  return (
    <>
      <KpiGrid cards={kpiCards} />
      <section className="adm-panel">
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { key: '', label: 'Tất cả', count: all.length },
            { key: 'admin', label: 'Quản trị viên', count: adminCount },
            { key: 'staff', label: 'Nhân viên', count: staffCount },
            { key: 'customer', label: 'Khách hàng', count: customerCount },
            { key: 'inactive', label: 'Đang khóa', count: inactiveCount },
            { key: 'unverified', label: 'Chờ kích hoạt', count: unverifiedCount },
          ]}
        />
        <div className="adm-toolbar">
          <div className="adm-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm họ tên, email, số điện thoại, chức danh..."
              aria-label="Tìm tài khoản"
            />
          </div>
          <div className="adm-toolbar-right">
            {(query || filter) && (
              <button
                type="button"
                className="adm-btn"
                onClick={() => {
                  setQuery('');
                  setFilter('');
                }}
              >
                <X size={15} />
                Đặt lại
              </button>
            )}
            <button
              type="button"
              className="adm-btn primary"
              onClick={() => onInvite({ jobTitle: 'sales' })}
            >
              <Plus size={17} />
              Thêm nhân viên
            </button>
          </div>
        </div>

        <Table
          columns={[
            'Người dùng',
            'Liên hệ',
            'Vai trò & Chức danh',
            'Phân quyền',
            'Xác thực & Trạng thái',
            '',
          ]}
          rows={visible}
          empty="Không tìm thấy tài khoản nào phù hợp"
        >
          {visible.map((u) => {
            const perms = Array.isArray(u.permissions) ? u.permissions : [];
            const permTooltip = perms
              .map((p) => PERMISSION_LABELS[p] || p)
              .join(', ');
            return (
              <tr key={u.id}>
                <td>
                  <div className="adm-person">
                    <span>{u.name?.slice(0, 1) || 'A'}</span>
                    <div>
                      <div className="adm-prod-name-row">
                        <strong>{u.name}</strong>
                        {u.id === currentUser?.id && (
                          <span className="adm-mini-pill ok">Bạn</span>
                        )}
                      </div>
                      <small>ID #{u.id}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span>{u.email}</span>
                  <small>{u.phone || 'Chưa cập nhật SĐT'}</small>
                </td>
                <td>
                  <Badge value={u.role} />
                  {u.jobTitle && <small>{label(u.jobTitle)}</small>}
                </td>
                <td>
                  {u.role === 'customer' ? (
                    <span className="adm-muted-text">Tài khoản mua hàng</span>
                  ) : (
                    <div title={permTooltip}>
                      <strong>{perms.length} quyền</strong>
                      <small>
                        {perms
                          .slice(0, 2)
                          .map((p) => PERMISSION_LABELS[p] || p)
                          .join(', ')}
                        {perms.length > 2 ? ` +${perms.length - 2}` : ''}
                      </small>
                    </div>
                  )}
                </td>
                <td>
                  <div className="adm-status-stack">
                    <Badge value={u.active ? 'active' : 'inactive'}>
                      {u.active ? 'Hoạt động' : 'Đã khóa'}
                    </Badge>
                    <Badge value={u.verified ? 'verified' : 'unverified'} />
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    className="adm-btn small"
                    onClick={() => onEditUser(u)}
                  >
                    <ShieldCheck size={14} />
                    Phân quyền / Sửa
                  </button>
                </td>
              </tr>
            );
          })}
        </Table>
        <Pagination
          page={currentPage}
          totalItems={filteredRows.length}
          perPage={perPage}
          onChange={setPage}
          className="adm-pagination"
          noun="tài khoản"
        />
      </section>
    </>
  );
}

const EDITABLE_KEYS = [
  'storeName',
  'shippingFee',
  'freeShippingThreshold',
  'lowStockThreshold',
  'expiryWarningDays',
  'returnWindowDays',
  'otpTtlMinutes',
  'paymentTimeoutMinutes',
  'chatbotEnabled',
];

export function AdminSettings({
  data,
  form,
  saving,
  isAdmin,
  hasPermission,
  onChange,
  onReset,
  onSubmit,
  onOpenBackup,
  onOpenRestore,
}) {
  const dirty = useMemo(
    () =>
      EDITABLE_KEYS.some((key) => {
        if (key === 'chatbotEnabled') return !!form[key] !== !!data?.[key];
        return String(form[key] ?? '') !== String(data?.[key] ?? '');
      }),
    [data, form],
  );

  const handleSubmit = (e) => {
    const payload = {
      storeName: form.storeName,
      shippingFee: Number(form.shippingFee || 0),
      freeShippingThreshold: Number(form.freeShippingThreshold || 0),
      lowStockThreshold: Number(form.lowStockThreshold || 0),
      expiryWarningDays: Number(form.expiryWarningDays || 0),
      returnWindowDays: Number(form.returnWindowDays || 0),
      otpTtlMinutes: Number(form.otpTtlMinutes || 1),
      paymentTimeoutMinutes: Number(form.paymentTimeoutMinutes || 1),
      chatbotEnabled: !!form.chatbotEnabled,
    };
    onSubmit(e, payload);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="adm-settings-groups">
        <section className="adm-panel adm-settings-card">
          <div className="adm-panel-head">
            <div>
              <h3>Cửa hàng & Chính sách giao hàng</h3>
              <p>Tên hiển thị trên hóa đơn và biểu phí vận chuyển mặc định</p>
            </div>
            <span className="adm-stat-icon tone-0">
              <Store size={19} />
            </span>
          </div>
          <div className="adm-form-grid">
            <Field
              label="Tên nhà thuốc"
              name="storeName"
              value={form.storeName}
              onChange={onChange}
              required
              wide
              maxLength={100}
            />
            <Field
              label="Phí giao hàng mặc định (đ)"
              name="shippingFee"
              type="number"
              min={0}
              max={100000000}
              value={form.shippingFee}
              onChange={onChange}
              required
            />
            <Field
              label="Miễn phí giao hàng từ (đ)"
              name="freeShippingThreshold"
              type="number"
              min={0}
              max={100000000}
              value={form.freeShippingThreshold}
              onChange={onChange}
              required
            />
          </div>
        </section>

        <section className="adm-panel adm-settings-card">
          <div className="adm-panel-head">
            <div>
              <h3>Kho hàng & Chính sách đổi trả</h3>
              <p>Ngưỡng cảnh báo tồn kho, cận hạn và thời gian đổi trả khách hàng</p>
            </div>
            <span className="adm-stat-icon tone-1">
              <Boxes size={19} />
            </span>
          </div>
          <div className="adm-form-grid">
            <Field
              label="Ngưỡng tồn kho thấp (đơn vị)"
              name="lowStockThreshold"
              type="number"
              min={0}
              max={3650}
              value={form.lowStockThreshold}
              onChange={onChange}
              required
              hint="Sản phẩm có tồn khả dụng nhỏ hơn ngưỡng này sẽ vào danh sách cảnh báo."
            />
            <Field
              label="Cảnh báo hạn dùng trước (ngày)"
              name="expiryWarningDays"
              type="number"
              min={0}
              max={3650}
              value={form.expiryWarningDays}
              onChange={onChange}
              required
              hint="Lô thuốc sắp hết hạn trong khoảng ngày này sẽ được cảnh báo sớm."
            />
            <Field
              label="Thời hạn gửi yêu cầu đổi trả (ngày)"
              name="returnWindowDays"
              type="number"
              min={0}
              max={3650}
              value={form.returnWindowDays}
              onChange={onChange}
              required
              wide
              hint="Số ngày kể từ khi giao thành công khách được phép gửi yêu cầu đổi trả."
            />
          </div>
        </section>

        <section className="adm-panel adm-settings-card">
          <div className="adm-panel-head">
            <div>
              <h3>Bảo mật, Thanh toán & Trợ lý AI</h3>
              <p>Thời hạn mã OTP, giữ chỗ đơn hàng thanh toán trực tuyến và chatbot</p>
            </div>
            <span className="adm-stat-icon tone-3">
              <ShieldCheck size={19} />
            </span>
          </div>
          <div className="adm-form-grid">
            <Field
              label="Thời hạn hiệu lực OTP (phút)"
              name="otpTtlMinutes"
              type="number"
              min={1}
              max={3650}
              value={form.otpTtlMinutes}
              onChange={onChange}
              required
            />
            <Field
              label="Thời hạn thanh toán đơn trực tuyến (phút)"
              name="paymentTimeoutMinutes"
              type="number"
              min={1}
              max={3650}
              value={form.paymentTimeoutMinutes}
              onChange={onChange}
              required
            />
          </div>
          <div className="adm-settings-toggle-box">
            <CheckField
              label="Bật trợ lý tư vấn Chatbot AI trên cửa hàng"
              name="chatbotEnabled"
              value={form.chatbotEnabled}
              onChange={onChange}
              hint="Khi bật, khách hàng có thể trò chuyện với trợ lý AI theo cơ sở tri thức và quy tắc an toàn đã duyệt."
            />
          </div>
        </section>

        <section className="adm-panel adm-settings-card">
          <div className="adm-panel-head">
            <div>
              <h3>Dịch vụ tích hợp & Sao lưu hệ thống</h3>
              <p>Cấu hình khóa kết nối được thiết lập an toàn tại biến môi trường máy chủ</p>
            </div>
            <span className="adm-stat-icon tone-2">
              <Settings size={19} />
            </span>
          </div>
          <div className="adm-integration-state">
            <span>Môi trường thử nghiệm (Demo OTP / Thanh toán)</span>
            <Badge value={data?.demoMode ? 'active' : 'inactive'}>
              {data?.demoMode ? 'Đang bật' : 'Đã tắt'}
            </Badge>
          </div>
          <div className="adm-integration-list">
            {[
              ['Google Gemini AI', data?.geminiConfigured],
              ['Cổng thanh toán VNPay', data?.paymentConfigured],
              ['Đăng nhập Google OAuth', data?.googleConfigured],
              ['Gửi Email / SMTP OTP', data?.smtpConfigured ?? data?.emailConfigured],
            ].map(([name, configured]) => (
              <div key={name}>
                <span>{name}</span>
                <Badge value={configured ? 'active' : 'inactive'}>
                  {configured ? 'Đã cấu hình' : 'Chưa cấu hình'}
                </Badge>
              </div>
            ))}
          </div>
          <div className="adm-integration-meta">
            <span>
              Kênh thanh toán mặc định:{' '}
              <strong>
                {data?.paymentProvider === 'vnpay'
                  ? 'VNPay'
                  : data?.paymentProvider === 'demo'
                    ? 'Mô phỏng trình diễn'
                    : 'COD / Chuyển khoản'}
              </strong>
            </span>
            <span>
              Giới hạn tải tệp đơn thuốc:{' '}
              <strong>{data?.maxUploadMb || 5} MB</strong>
            </span>
          </div>
          {isAdmin && hasPermission('backup') && (
            <div className="adm-backup-actions">
              <button
                type="button"
                className="adm-btn"
                onClick={onOpenBackup}
              >
                <Download size={16} />
                Tải bản sao lưu mã hóa
              </button>
              <button
                type="button"
                className="adm-btn"
                onClick={onOpenRestore}
              >
                <RefreshCw size={16} />
                Phục hồi dữ liệu
              </button>
            </div>
          )}
        </section>
      </div>

      <div className="adm-settings-footer">
        <div className="adm-settings-footer-status">
          {dirty ? (
            <span className="adm-dirty-pill">Có thay đổi chưa lưu</span>
          ) : (
            <span>Thay đổi cấu hình được ghi nhận tự động vào nhật ký hệ thống.</span>
          )}
        </div>
        <div className="adm-settings-footer-actions">
          {dirty && (
            <button
              type="button"
              className="adm-btn"
              onClick={onReset}
              disabled={saving}
            >
              <RotateCcw size={15} />
              Khôi phục lại
            </button>
          )}
          <button className="adm-btn primary" disabled={saving || !dirty} type="submit">
            {saving ? (
              <LoaderCircle size={17} className="adm-spin" />
            ) : (
              <Check size={17} />
            )}
            Lưu cấu hình
          </button>
        </div>
      </div>
    </form>
  );
}

const vnDayOf = (iso) => {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
};

export function AdminAudit({
  rows,
  query,
  setQuery,
  filter,
  setFilter,
  page,
  setPage,
  onOpenDetail,
}) {
  const all = list(rows);
  const todayStr = vnDate(0);
  const todayCount = all.filter((a) => vnDayOf(a.createdAt) === todayStr).length;
  const orderRxCount = all.filter((a) =>
    ['order', 'prescription', 'request', 'return_goods', 'payment'].includes(
      a.entity,
    ),
  ).length;
  const systemOpsCount = all.length - orderRxCount;
  const entityOptions = [...new Set(all.map((a) => a.entity).filter(Boolean))];

  const kpiCards = [
    {
      key: 'all',
      label: 'Tổng bản ghi gần nhất',
      value: count(all.length),
      sub: 'Giới hạn tối đa 500 dòng mới nhất',
      Icon: ScrollText,
      tone: 'tone-0',
      active: !filter,
      onClick: () => setFilter(''),
    },
    {
      key: 'today',
      label: 'Phát sinh hôm nay',
      value: count(todayCount),
      sub: `Ngày ${todayStr.split('-').reverse().join('/')}`,
      Icon: Clock,
      tone: 'tone-1',
    },
    {
      key: 'orders',
      label: 'Đơn hàng & Đơn thuốc',
      value: count(orderRxCount),
      sub: 'Xử lý đơn, duyệt toa, đổi trả',
      Icon: ShoppingBag,
      tone: 'tone-3',
      active: filter === 'order',
      onClick: () => setFilter(filter === 'order' ? '' : 'order'),
    },
    {
      key: 'ops',
      label: 'Kho, Danh mục & Hệ thống',
      value: count(systemOpsCount),
      sub: 'Nhập kho, sản phẩm, phân quyền',
      Icon: Activity,
      tone: 'tone-2',
    },
  ];

  const filteredRows = all.filter((a) => {
    if (filter && a.entity !== filter) return false;
    if (!query) return true;
    const actionLabel = AUDIT_LABELS[a.action] || '';
    const entityLabel = ENTITY_LABELS[a.entity] || '';
    const detailText = formatAuditDetail(a.detail);
    const hay = [
      a.userName,
      a.actorName,
      a.email,
      a.action,
      actionLabel,
      a.entity,
      entityLabel,
      a.entityId,
      detailText,
    ]
      .filter(Boolean)
      .join(' ');
    return searchScore(hay, query) > 0;
  });

  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const visible = filteredRows.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  return (
    <>
      <KpiGrid cards={kpiCards} />
      <section className="adm-panel">
        <div className="adm-toolbar">
          <div className="adm-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm người thực hiện, hành động, đối tượng, chi tiết..."
              aria-label="Tìm nhật ký hệ thống"
            />
          </div>
          <div className="adm-toolbar-right">
            <select
              className="adm-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Lọc theo đối tượng"
            >
              <option value="">Tất cả đối tượng</option>
              {entityOptions.map((ent) => (
                <option key={ent} value={ent}>
                  {ENTITY_LABELS[ent] || ent}
                </option>
              ))}
            </select>
            {(query || filter) && (
              <button
                type="button"
                className="adm-btn"
                onClick={() => {
                  setQuery('');
                  setFilter('');
                }}
              >
                <X size={15} />
                Đặt lại
              </button>
            )}
          </div>
        </div>

        <Table
          columns={[
            'Thời gian',
            'Người thực hiện',
            'Hành động',
            'Đối tượng',
            'Chi tiết',
            '',
          ]}
          rows={visible}
          empty="Chưa có bản ghi nhật ký phù hợp"
        >
          {visible.map((a, i) => {
            const actionTitle = AUDIT_LABELS[a.action] || a.action;
            const entityTitle = ENTITY_LABELS[a.entity] || a.entity || 'Hệ thống';
            const detailSummary = formatAuditDetail(a.detail);
            const hasDetailPayload = Boolean(
              a.detail && String(a.detail).trim() !== '',
            );
            return (
              <tr key={a.id || i}>
                <td>{dateTime(a.createdAt)}</td>
                <td>
                  <strong>
                    {a.userName || a.actorName || a.email || 'Hệ thống'}
                  </strong>
                  {a.userId && <small>ID #{a.userId}</small>}
                </td>
                <td className="adm-cell-wrap">
                  <strong>{actionTitle}</strong>
                  <small>
                    <code>{a.action}</code>
                  </small>
                </td>
                <td>
                  <span className="adm-entity-tag">{entityTitle}</span>
                  {a.entityId && <small>#{a.entityId}</small>}
                </td>
                <td className="adm-cell-wrap" title={detailSummary}>
                  <span className="adm-clamp-2">{detailSummary}</span>
                </td>
                <td>
                  {hasDetailPayload && (
                    <button
                      type="button"
                      className="adm-btn small"
                      onClick={() => onOpenDetail(a)}
                    >
                      <Eye size={14} />
                      Xem
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
        <Pagination
          page={currentPage}
          totalItems={filteredRows.length}
          perPage={perPage}
          onChange={setPage}
          className="adm-pagination"
          noun="bản ghi"
        />
      </section>
    </>
  );
}
