/**
 * Admin System Audit Log View.
 */
import React from 'react';
import {
  Activity,
  Clock,
  Eye,
  ScrollText,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';
import { AUDIT_LABELS, ENTITY_LABELS } from '../../models/constants.js';
import {
  count,
  dateTime,
  formatAuditDetail,
  list,
  searchScore,
  vnDate,
  vnDay,
} from '../../models/formatters.js';
import Pagination from '../components/Pagination.jsx';
import { KpiGrid, Table } from './adminUi.jsx';

export default function AdminAuditView({
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
  const todayCount = all.filter((a) => vnDay(a.createdAt) === todayStr).length;
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
            const entityTitle =
              ENTITY_LABELS[a.entity] || a.entity || 'Hệ thống';
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
