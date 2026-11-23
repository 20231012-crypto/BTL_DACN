/**
 * Admin Users & Permissions View.
 */
import React from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { PERMISSION_LABELS, adminLabel } from '../../models/constants.js';
import { count, list, searchScore } from '../../models/formatters.js';
import Pagination from '../components/Pagination.jsx';
import { Badge, FilterChips, KpiGrid, Table } from './adminUi.jsx';

export default function AdminUsersView({
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
      adminLabel(u.role),
      adminLabel(u.jobTitle),
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
                  {u.jobTitle && <small>{adminLabel(u.jobTitle)}</small>}
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
